import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Hàm gọi API Login
      login: async (username, password) => {
        try {
          const res = await api.post('/auth/login', { username, password });
          
          set({ 
            token: res.data.token || res.data, 
            isAuthenticated: true,
            user: { username } // Lưu tạm username
          });
          
          return { success: true };
        } catch (error) {
          // Bắt lỗi từ server
          return { error: error.response?.data?.message || 'Tài khoản hoặc Mật khẩu không đúng!' };
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'vsec-auth-storage', // Key lưu vào LocalStorage
    }
  )
);

export default useAuthStore;
