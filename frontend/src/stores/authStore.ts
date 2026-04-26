import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, authApi } from '../api/auth';

/**
 * 认证状态
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

/**
 * 认证Store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * 登录
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          // 后端返回格式: { success: true, data: { user, accessToken, refreshToken } }
          const data = (response as any).data || response;
          const { user, accessToken, refreshToken } = data;

          // 保存到状态
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // 保存到localStorage
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * 注册
       */
      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register({
            username,
            email,
            password,
          });
          // 后端返回格式: { success: true, data: { user, accessToken, refreshToken } }
          const data = (response as any).data || response;
          const { user, accessToken, refreshToken } = data;

          // 保存到状态
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // 保存到localStorage
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * 登出
       */
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // 清除状态
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });

          // 清除localStorage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      },

      /**
       * 刷新用户信息
       */
      refreshUser: async () => {
        try {
          const response = await authApi.getCurrentUser();
          // 后端返回格式: { success: true, data: { user } }
          const data = (response as any).data || response;
          const { user } = data;

          set({ user });
          localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
          // 如果获取用户信息失败，清除认证状态
          get().logout();
          throw error;
        }
      },

      /**
       * 设置令牌
       */
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
