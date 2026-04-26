import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type NotificationType =
  | 'content_created'
  | 'content_approved'
  | 'content_published'
  | 'content_rejected'
  | 'publish_success'
  | 'publish_failed'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

// ============================================
// API 函数
// ============================================
export const notificationsApi = {
  /**
   * 获取通知列表
   */
  list: async (params?: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> => {
    const response = await apiClient.get<{ success: true; data: NotificationListResponse }>(
      '/notifications',
      { params }
    );
    return response.data;
  },

  /**
   * 获取未读数量
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const response = await apiClient.get<{ success: true; data: { count: number } }>(
        '/notifications/unread-count'
      );
      console.log('[getUnreadCount] Response:', response);
      // response 是 { success: true, data: { count: number } }
      // 返回 { count: number }
      return response || { count: 0 };
    } catch (error) {
      console.error('[getUnreadCount] Error:', error);
      throw error;
    }
  },

  /**
   * 标记为已读
   */
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string } }>(
      `/notifications/${id}/read`
    );
  },

  /**
   * 标记所有为已读
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string } }>(
      '/notifications/read-all'
    );
  },

  /**
   * 删除通知
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/notifications/${id}`
    );
  },

  /**
   * 删除所有通知
   */
  deleteAll: async (): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      '/notifications/all'
    );
  },
};
