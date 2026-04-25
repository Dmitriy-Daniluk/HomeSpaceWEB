import axios from 'axios';

export const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getApiBaseUrl = () => api.defaults.baseURL || DEFAULT_API_URL;

export const getApiOrigin = () => {
  try {
    return new URL(getApiBaseUrl()).origin;
  } catch {
    return '';
  }
};

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error && !error.response.data.message) {
      error.response.data.message = error.response.data.error;
    }

    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('homespace:auth-expired'));

      const isAuthPage = ['/login', '/register', '/forgot-password'].includes(window.location.pathname);
      if (!isAuthPage) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
