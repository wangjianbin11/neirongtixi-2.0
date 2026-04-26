import { apiClient } from './client';

/**
 * 通用设置
 */
export interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  language: string;
  timezone: string;
}

/**
 * 通知设置
 */
export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  contentPublished: boolean;
  publishFailed: boolean;
  systemUpdates: boolean;
}

/**
 * AI设置
 */
export interface AISettings {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * 发布设置
 */
export interface PublishSettings {
  autoPublish: boolean;
  retryAttempts: number;
  retryDelay: number;
  queuePaused: boolean;
}

/**
 * 系统设置API
 */
export const settingsApi = {
  /**
   * 获取所有设置（管理员）
   */
  getAll: async (): Promise<{ settings: any[] }> => {
    const response = await apiClient.get<{ settings: any[] }>('/settings');
    return response;
  },

  /**
   * 获取公开设置
   */
  getPublic: async (): Promise<{ settings: Record<string, any> }> => {
    const response = await apiClient.get<{ settings: Record<string, any> }>('/settings/public');
    return response;
  },

  /**
   * 获取通用设置
   */
  getGeneral: async (): Promise<GeneralSettings> => {
    const response = await apiClient.get<GeneralSettings>('/settings/general');
    return response;
  },

  /**
   * 更新通用设置
   */
  updateGeneral: async (settings: Partial<GeneralSettings>): Promise<{ settings: GeneralSettings; message: string }> => {
    const response = await apiClient.put<{ settings: GeneralSettings; message: string }>('/settings/general', settings);
    return response;
  },

  /**
   * 获取通知设置
   */
  getNotifications: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get<NotificationSettings>('/settings/notifications');
    return response;
  },

  /**
   * 更新通知设置
   */
  updateNotifications: async (settings: Partial<NotificationSettings>): Promise<{ settings: NotificationSettings; message: string }> => {
    const response = await apiClient.put<{ settings: NotificationSettings; message: string }>('/settings/notifications', settings);
    return response;
  },

  /**
   * 获取AI设置
   */
  getAI: async (): Promise<AISettings> => {
    const response = await apiClient.get<AISettings>('/settings/ai');
    return response;
  },

  /**
   * 更新AI设置
   */
  updateAI: async (settings: Partial<AISettings>): Promise<{ settings: AISettings; message: string }> => {
    const response = await apiClient.put<{ settings: AISettings; message: string }>('/settings/ai', settings);
    return response;
  },

  /**
   * 获取发布设置
   */
  getPublish: async (): Promise<PublishSettings> => {
    const response = await apiClient.get<PublishSettings>('/settings/publish');
    return response;
  },

  /**
   * 更新发布设置
   */
  updatePublish: async (settings: Partial<PublishSettings>): Promise<{ settings: PublishSettings; message: string }> => {
    const response = await apiClient.put<{ settings: PublishSettings; message: string }>('/settings/publish', settings);
    return response;
  },

  /**
   * 测试连接
   */
  testConnection: async (type: 'database' | 'redis' | 'ai'): Promise<{ success: boolean; data: { message: string } }> => {
    const response = await apiClient.post<{ success: boolean; data: { message: string } }>('/settings/test-connection', { type });
    return response;
  },
};
