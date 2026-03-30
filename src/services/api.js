import axios from 'axios';
import useAuthStore from '../stores/authStore';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Can be configured via .env later
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // Tự động nhúng token lấy từ Zustand (nếu có)
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tự động đẩy ra login nếu token hết hạn (401)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
