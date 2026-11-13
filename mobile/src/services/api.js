// Default to your deployed production backend, or local IP if developing locally
export const API_BASE_URL = 'https://date-logger.singlehq.me';

let onUnauthorizedCallback = null;

export function setOnUnauthorized(callback) {
  onUnauthorizedCallback = callback;
}

function friendlyStatusMessage(status) {
  if (status === 413) return 'Upload is too large. Try fewer or smaller photos.';
  if (status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  if (status === 502 || status === 503 || status === 504) return 'Server is unavailable right now. Please try again shortly.';
  return `Request failed with status ${status}`;
}

/**
 * Upload multipart FormData using React Native's native XMLHttpRequest
 * with progress tracking to avoid Expo WinterCG fetch limitations.
 */
function uploadFormData(url, formData, token, onProgress = null, method = 'POST') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = 180000; // 3 minutes timeout for high-res photo uploads

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      // Non-JSON bodies (e.g. an nginx HTML error page) are not shown to the user.
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        if (xhr.status === 401 && token && onUnauthorizedCallback) {
          try {
            onUnauthorizedCallback();
          } catch (e) {}
        }
        reject(new Error(data.message || friendlyStatusMessage(xhr.status)));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed. Please check your internet connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again.'));
    };

    xhr.send(formData);
  });
}

/**
 * Common API request wrapper
 */
export async function apiRequest(endpoint, { method = 'GET', body, token, isFormData = false, onProgress = null } = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  if (isFormData) {
    return uploadFormData(url, body, token, onProgress, method);
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  // Only an authenticated request failing means the session is over;
  // a 401 from the login form is just a wrong password.
  if (response.status === 401 && token && onUnauthorizedCallback) {
    try {
      onUnauthorizedCallback();
    } catch (e) {}
  }

  if (!response.ok) {
    const err = new Error(data.message || friendlyStatusMessage(response.status));
    err.status = response.status;
    throw err;
  }

  return data;
}

export const authAPI = {
  login: (email, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (email, password) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: { email, password },
    }),

  me: (token) => apiRequest('/api/auth/me', { token }),

  deleteAccount: (password, token) =>
    apiRequest('/api/auth/delete-account', { method: 'POST', body: { password }, token }),

  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  checkHealth: () => apiRequest('/intro'),
};

/** Partner linking: linked accounts share one journal and bucket list. */
export const coupleAPI = {
  get: (token) => apiRequest('/api/couple', { token }),
  createInvite: (token) => apiRequest('/api/couple/invite', { method: 'POST', token }),
  join: (code, token) => apiRequest('/api/couple/join', { method: 'POST', body: { code }, token }),
  unlink: (token) => apiRequest('/api/couple', { method: 'DELETE', token }),
};

/** Bucket-list ideas, shared with a linked partner. */
export const ideasAPI = {
  list: (token) => apiRequest('/api/ideas', { token }),
  create: (title, token) => apiRequest('/api/ideas', { method: 'POST', body: { title }, token }),
  importMany: (ideas, token) => apiRequest('/api/ideas', { method: 'POST', body: { ideas }, token }),
  update: (id, changes, token) => apiRequest(`/api/ideas/${id}`, { method: 'PATCH', body: changes, token }),
  remove: (id, token) => apiRequest(`/api/ideas/${id}`, { method: 'DELETE', token }),
};

export const PRIVACY_POLICY_URL = `${API_BASE_URL}/privacy`;

export const postAPI = {
  getPosts: (token) => apiRequest('/api/post/posts', { token }),

  getPostById: (id, token) => apiRequest(`/api/post/${id}`, { token }),

  createPost: (formData, token, onProgress = null) =>
    apiRequest('/api/post/add', {
      method: 'POST',
      body: formData,
      token,
      isFormData: true,
      onProgress,
    }),

  updatePost: (id, data, token, onProgress = null) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return apiRequest(`/api/post/${id}`, {
      method: 'PUT',
      body: data,
      token,
      isFormData: isForm,
      onProgress,
    });
  },

  deletePost: (id, token) =>
    apiRequest(`/api/post/delete/${id}`, {
      method: 'DELETE',
      token,
    }),
};
