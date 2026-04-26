import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type PublishTaskStatus = 'pending' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface PublishTask {
  id: string;
  content_id: string;
  platform: string;
  status: PublishTaskStatus;
  scheduled_at: string | null;
  published_at: string | null;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePublishTaskInput {
  contentId: string;
  platform: string;
  scheduledAt?: string;
  publishOptions?: Record<string, any>;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface PublishTaskListParams {
  page?: number;
  pageSize?: number;
  status?: PublishTaskStatus;
  platform?: string;
}

export interface PublishTaskListResponse {
  tasks: PublishTask[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// API 函数
// ============================================
export const publishApi = {
  /**
   * 获取发布队列统计
   */
  getStats: async (): Promise<QueueStats> => {
    const response = await apiClient.get<{ success: true; data: QueueStats }>(
      '/publish/stats'
    );
    return response.data;
  },

  /**
   * 获取发布任务列表
   */
  getTasks: async (params?: PublishTaskListParams): Promise<PublishTaskListResponse> => {
    const response = await apiClient.get<{ success: true; data: PublishTaskListResponse }>(
      '/publish/tasks',
      { params }
    );
    return response.data;
  },

  /**
   * 创建发布任务
   */
  createTask: async (input: CreatePublishTaskInput): Promise<{ jobId: string; message: string }> => {
    const response = await apiClient.post<{ success: true; data: { jobId: string; message: string } }>(
      '/publish/tasks',
      input
    );
    return response.data.data;
  },

  /**
   * 重试发布任务
   */
  retryTask: async (id: string): Promise<{ jobId: string; message: string }> => {
    const response = await apiClient.post<{ success: true; data: { jobId: string; message: string } }>(
      `/publish/tasks/${id}/retry`
    );
    return response.data.data;
  },

  /**
   * 取消发布任务
   */
  cancelTask: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/publish/tasks/${id}`
    );
  },

  /**
   * 暂停发布队列
   */
  pauseQueue: async (): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string } }>(
      '/publish/queue/pause'
    );
  },

  /**
   * 恢复发布队列
   */
  resumeQueue: async (): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string } }>(
      '/publish/queue/resume'
    );
  },

  /**
   * 清空发布队列
   */
  clearQueue: async (): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string } }>(
      '/publish/queue/clear'
    );
  },
};
