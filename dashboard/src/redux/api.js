import axios from 'axios';

const isLocal = import.meta.env.VITE_IS_LOCAL === 'true';

const api = axios.create({
  baseURL: isLocal ? import.meta.env.VITE_LOCAL_API_URL : '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth');
      localStorage.removeItem('admin_lastActivityTime');
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const host = isLocal ? import.meta.env.VITE_LOCAL_WS_URL : '/';
