import apiClient from './client';

const adminService = {
  getPendingListings: async (params = {}) => {
    const response = await apiClient.get('/admin/listings/pending', { params });
    return response.data;
  },

  verifyListing: async (id, decision, reason = '') => {
    const approved =
      typeof decision === 'string' ? decision === 'approve' : Boolean(decision);
    const payload = { approved };
    if (!approved && typeof reason === 'string' && reason.trim()) {
      payload.reason = reason.trim();
    }

    const response = await apiClient.patch(`/admin/listings/${id}/verify`, payload);
    return response.data;
  },

  moderateListing: async (id, action, reason = '') => {
    const payload = { action };
    if (typeof reason === 'string' && reason.trim()) {
      payload.reason = reason.trim();
    }
    const response = await apiClient.patch(`/admin/listings/${id}/moderate`, payload);
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await apiClient.patch(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  getAnalytics: async (period = '30d') => {
    const response = await apiClient.get('/admin/analytics', { params: { period } });
    return response.data;
  },

  getLogs: async (params = {}) => {
    const response = await apiClient.get('/admin/logs', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  }
};

export default adminService;
