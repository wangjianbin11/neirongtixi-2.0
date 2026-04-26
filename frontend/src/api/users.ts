import { apiClient } from './client';

/**
 * 用户类型
 */
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  status?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

/**
 * 更新用户资料输入
 */
export interface UpdateProfileInput {
  email?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

/**
 * 用户API
 */
export const usersApi = {
  /**
   * 获取当前用户完整信息
   */
  getMe: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>('/users/me');
    return response;
  },

  /**
   * 更新当前用户资料
   */
  updateProfile: async (data: UpdateProfileInput): Promise<{ user: User; message: string }> => {
    const response = await apiClient.put<{ user: User; message: string }>('/users/me', data);
    return response;
  },

  /**
   * 获取指定用户信息
   */
  getById: async (id: string): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>(`/users/${id}`);
    return response;
  },

  /**
   * 更新指定用户信息（管理员）
   */
  updateUser: async (id: string, data: UpdateProfileInput): Promise<{ user: User; message: string }> => {
    const response = await apiClient.put<{ user: User; message: string }>(`/users/${id}`, data);
    return response;
  },

  /**
   * 获取用户列表（管理员）
   */
  list: async (params?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<{ users: User[]; total: number; limit: number; offset: number }> => {
    const response = await apiClient.get<{ users: User[]; total: number; limit: number; offset: number }>('/users', { params });
    return response;
  },
};
