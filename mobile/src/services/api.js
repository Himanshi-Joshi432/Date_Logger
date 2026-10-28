// Default to your deployed production backend, or local IP if developing locally
export const API_BASE_URL = 'https://date-logger.singlehq.me';

/**
 * Upload multipart FormData using React Native's native XMLHttpRequest
 * to avoid Expo WinterCG fetch "Unsupported FormDataPart implementation" errors.
 */
function uploadFormData(url, formData, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 120000; // 2 minutes timeout for photo uploads

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    // Do NOT set Content-Type header - React Native's XMLHttpRequest sets multipart/form-data boundary automatically.

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = { message: xhr.responseText };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.message || `Request failed with status ${xhr.status}`));
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
export async function apiRequest(endpoint, { method = 'GET', body, token, isFormData = false } = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  if (isFormData) {
    return uploadFormData(url, body, token);
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

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
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

  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  checkHealth: () => apiRequest('/intro'),
};

export const postAPI = {
  getPosts: (token) => apiRequest('/api/post/posts', { token }),

  getPostById: (id, token) => apiRequest(`/api/post/${id}`, { token }),

  createPost: (formData, token) =>
    apiRequest('/api/post/add', {
      method: 'POST',
      body: formData,
      token,
      isFormData: true,
    }),

  deletePost: (id, token) =>
    apiRequest(`/api/post/delete/${id}`, {
      method: 'DELETE',
      token,
    }),
};
