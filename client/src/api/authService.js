import apiClient from './client';

export const authService = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  googleAuth: ({ idToken, mode = 'login', role = 'tenant' }) =>
    apiClient.post('/auth/google', { idToken, mode, role }),
  register: (userData) => apiClient.post('/auth/register', userData),
  getMe: () => apiClient.get('/auth/me'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => apiClient.post(`/auth/reset-password/${token}`, { password }),
  logout: () => apiClient.post('/auth/logout'),
};
