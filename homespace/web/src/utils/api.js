import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
