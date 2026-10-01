const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
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
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  checkHealth: () => apiRequest('/intro')
};

export const postAPI = {
  getPosts: (token) => apiRequest('/api/post/posts', { token }),
  createPost: (formData, token) => apiRequest('/api/post/add', {
    method: 'POST',
    body: formData,
    token,
    isFormData: true
  }),
  deletePost: (id, token) => apiRequest(`/api/post/delete/${id}`, {
    method: 'DELETE',
    token
  })
};
