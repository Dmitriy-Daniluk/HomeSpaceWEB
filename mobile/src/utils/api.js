import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ORIGIN, API_URL, STORAGE_KEYS } from './constants';
import { emitAuthExpired } from './authEvents';

const isRelativeUploadPath = (value) => typeof value === 'string' && value.startsWith('/uploads/');
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const resolveFamilyId = (data) => data?.familyId ?? data?.family_id ?? null;
const withFamilyParams = (data, config = {}) => {
  const familyId = resolveFamilyId(data);
  if (!familyId) {
    return config;
  }

  return {
    ...config,
    params: {
      ...(config.params || {}),
      familyId,
    },
  };
};

const resolveApiAssetUrl = (value) => {
  if (!isRelativeUploadPath(value) || !API_ORIGIN) {
    return value;
  }
  return `${API_ORIGIN}${value}`;
};

const normalizeResponseData = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeResponseData);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeResponseData(entryValue)])
    );
  }

  return resolveApiAssetUrl(value);
};

const api = axios.create({
  baseURL: API_URL || undefined,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    if (!API_URL) {
      return Promise.reject(new Error('EXPO_PUBLIC_API_URL is not configured. Set it in mobile/.env.'));
    }

    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    response.data = normalizeResponseData(response.data);
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      emitAuthExpired();
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (fullName, email, password) => api.post('/auth/register', { fullName, email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { currentPassword: oldPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};

export const tasks = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data, withFamilyParams(data)),
  update: (id, data) => api.put(`/tasks/${id}`, data, withFamilyParams(data)),
  delete: (id) => api.delete(`/tasks/${id}`),
  changeStatus: (id, status) => api.put(`/tasks/${id}`, { status }),
  addAttachment: (id, formData) => {
    formData.append('relatedTaskId', id);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAttachment: (taskId, attachmentId) => api.delete(`/files/${attachmentId}`),
};

export const budget = {
  getTransactions: (params) => api.get('/budget', { params }),
  getTransaction: (id) => api.get(`/budget/${id}`),
  createTransaction: (data) => api.post('/budget', data, withFamilyParams(data)),
  updateTransaction: (id, data) => api.put(`/budget/${id}`, data, withFamilyParams(data)),
  deleteTransaction: (id) => api.delete(`/budget/${id}`),
  getSummary: (params) => api.get('/budget/stats', { params }),
  getCategories: () => api.get('/budget/categories'),
};

export const families = {
  getAll: () => api.get('/families'),
  getById: (id) => api.get(`/families/${id}`),
  create: (data) => api.post('/families', data),
  update: (id, data) => api.put(`/families/${id}`, data),
  delete: (id) => api.delete(`/families/${id}`),
  getMembers: (id) => api.get(`/families/${id}`),
  inviteMember: (id, payload) => api.post(
    `/families/${id}/invite`,
    typeof payload === 'string' ? { email: payload } : payload
  ),
  removeMember: (familyId, memberId) => api.delete(`/families/${familyId}/member/${memberId}`),
  updateMemberRole: (familyId, memberId, data) => api.put(`/families/${familyId}/member/${memberId}/role`, data),
  getStats: (id) => api.get(`/families/${id}/overview`),
  getCustomRoles: (id) => api.get(`/families/${id}/roles`),
  createCustomRole: (id, data) => api.post(`/families/${id}/roles`, data),
  updateCustomRole: (familyId, roleId, data) => api.put(`/families/${familyId}/roles/${roleId}`, data),
  deleteCustomRole: (familyId, roleId) => api.delete(`/families/${familyId}/roles/${roleId}`),
  acceptInvite: (inviteCode) => api.post('/families/join', { inviteCode }),
};

export const files = {
  getAll: (params = {}) => {
    const { type, ...rest } = params;
    return api.get('/files', {
      params: {
        ...rest,
        ...(params.file_type || type ? { file_type: params.file_type || type } : {}),
      },
    });
  },
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
  updateLocation: (data) => api.post('/location/update', data),
  getLatestLocation: (userId) => api.get(`/location/latest/${userId}`),
  getGeofences: (familyId) => api.get(`/location/geofences/${familyId}`),
  createGeofence: (familyId, data) => api.post(`/location/geofences/${familyId}`, data),
  deleteGeofence: (id) => api.delete(`/location/geofences/${id}`),
};

export const chat = {
  getFamilies: () => api.get('/chat'),
  getMessages: (familyId) => api.get(`/chat/${familyId}`),
  sendMessage: (data) => api.post('/chat', data),
  updateMessage: (id, data) => api.put(`/chat/${id}`, data),
  deleteMessage: (id) => api.delete(`/chat/${id}`),
};

export const notifications = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export const support = {
  createTicket: (data) => api.post('/support', data),
  getTickets: () => api.get('/support/my'),
  getTicket: (id) => api.get(`/support/${id}`),
  addMessage: (id, data) => api.post(`/support/${id}/messages`, data),
};

export const feedback = {
  submit: (data) => api.post('/feedback', data),
};

export const analytics = {
  getProductivity: (params) => api.get('/analytics/productivity', { params }),
  exportData: (params) => api.get('/analytics/export', { params }),
};

export const subscription = {
  purchase: ({ plan = 'month', bank = 'СберБанк', sbpCode }) => api.post('/users/subscription', {
    plan,
    paymentMethod: 'mock_sbp',
    bank,
    sbpCode,
  }),
};

export default api;
