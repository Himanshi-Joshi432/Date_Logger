// Default to your deployed production backend, or local IP if developing locally
export const API_BASE_URL = 'https://date-logger.singlehq.me';

/**
 * Common API request wrapper
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

  const url = `${API_BASE_URL}${endpoint}`;

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

