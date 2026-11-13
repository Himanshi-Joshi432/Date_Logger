const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

let onUnauthorizedCallback = null;

/** Registers a handler run whenever an authenticated request comes back 401 (e.g. expired token). */
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
 * Common fetch wrapper that automatically attaches the auth token and handles errors.
 */
export async function apiRequest(endpoint, { method = 'GET', body, token, isFormData = false } = {}) {
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && token && onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }

  if (!response.ok) {
    throw new Error(data.message || friendlyStatusMessage(response.status));
  }

  return data;
}

export const authAPI = {
  login: (email, password) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  }),
  register: (email, password) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password }
  }),
  me: (token) => apiRequest('/api/auth/me', { token }),
  deleteAccount: (password, token) => apiRequest('/api/auth/delete-account', {
    method: 'POST',
    body: { password },
    token
  }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  checkHealth: () => apiRequest('/intro')
};

export const postAPI = {
  getPosts: (token) => apiRequest('/api/post/posts', { token }),
  getPostById: (id, token) => apiRequest(`/api/post/${id}`, { token }),
  createPost: (formData, token) => apiRequest('/api/post/add', {
    method: 'POST',
    body: formData,
    token,
    isFormData: true
  }),
  updatePost: (id, data, token) => apiRequest(`/api/post/${id}`, {
    method: 'PUT',
    body: data,
    token,
    isFormData: typeof FormData !== 'undefined' && data instanceof FormData
  }),
  deletePost: (id, token) => apiRequest(`/api/post/delete/${id}`, {
    method: 'DELETE',
    token
  })
};
