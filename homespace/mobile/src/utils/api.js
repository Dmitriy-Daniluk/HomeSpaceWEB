import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from './constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (fullName, email, password) => api.post('/auth/register', { fullName, email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};

export const tasks = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  changeStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  addAttachment: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  removeAttachment: (taskId, attachmentId) => api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
};

export const budget = {
  getTransactions: (params) => api.get('/budget/transactions', { params }),
  getTransaction: (id) => api.get(`/budget/transactions/${id}`),
  createTransaction: (data) => api.post('/budget/transactions', data),
  updateTransaction: (id, data) => api.put(`/budget/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/budget/transactions/${id}`),
  getSummary: (params) => api.get('/budget/summary', { params }),
  getCategories: () => api.get('/budget/categories'),
};

export const families = {
  getAll: () => api.get('/families'),
  getById: (id) => api.get(`/families/${id}`),
  create: (data) => api.post('/families', data),
  update: (id, data) => api.put(`/families/${id}`, data),
  delete: (id) => api.delete(`/families/${id}`),
  getMembers: (id) => api.get(`/families/${id}/members`),
  inviteMember: (id, email) => api.post(`/families/${id}/invite`, { email }),
  removeMember: (familyId, memberId) => api.delete(`/families/${familyId}/members/${memberId}`),
  getStats: (id) => api.get(`/families/${id}/stats`),
  acceptInvite: (token) => api.post('/families/accept-invite', { token }),
};

export const files = {
  getAll: (params) => api.get('/files', { params }),
  upload: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/files/${id}`),
  download: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
};

export const passwords = {
  getAll: (params) => api.get('/passwords', { params }),
  getById: (id) => api.get(`/passwords/${id}`),
  create: (data) => api.post('/passwords', data),
  update: (id, data) => api.put(`/passwords/${id}`, data),
  delete: (id) => api.delete(`/passwords/${id}`),
};

export const location = {
  updateLocation: (data) => api.post('/location', data),
  getFamilyLocations: () => api.get('/location/family'),
  getGeofences: () => api.get('/location/geofences'),
  createGeofence: (data) => api.post('/location/geofences', data),
  deleteGeofence: (id) => api.delete(`/location/geofences/${id}`),
};

export const chat = {
  getMessages: (params) => api.get('/chat/messages', { params }),
  sendMessage: (data) => api.post('/chat/messages', data),
  markAsRead: (id) => api.patch(`/chat/messages/${id}/read`),
  getUnreadCount: () => api.get('/chat/unread-count'),
};

export const notifications = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export const support = {
  createTicket: (data) => api.post('/support/tickets', data),
  getTickets: () => api.get('/support/tickets'),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  addMessage: (id, data) => api.post(`/support/tickets/${id}/messages`, data),
};

export const analytics = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getTasksStats: (params) => api.get('/analytics/tasks', { params }),
  getBudgetStats: (params) => api.get('/analytics/budget', { params }),
  getActivityLog: (params) => api.get('/analytics/activity', { params }),
};

export default api;
