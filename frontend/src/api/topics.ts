import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type TopicType = 'tutorial' | 'qa' | 'case_study' | 'insight' | 'review' | 'comparison';
export type TopicPriority = 'S' | 'A' | 'B' | 'C';
export type TopicStatus = 'pending' | 'approved' | 'in_production' | 'completed' | 'published';
export type TargetCustomer = 'startup' | 'experienced' | 'team' | 'local';

export interface Topic {
  id: string;
  title: string;
  title_en?: string;
  description: string | null;
  topic_type: TopicType;
  target_customer: TargetCustomer;
  priority: TopicPriority;
  status: TopicStatus;
  estimated_effort: number;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CreateTopicInput {
  title: string;
  title_en?: string;
  description?: string;
  topic_type: TopicType;
  target_customer: TargetCustomer;
  priority?: TopicPriority;
  estimated_effort?: number;
}

export interface UpdateTopicInput {
  title?: string;
  title_en?: string;
  description?: string;
  topic_type?: TopicType;
  target_customer?: TargetCustomer;
  priority?: TopicPriority;
  status?: TopicStatus;
  estimated_effort?: number;
  assigned_to?: string;
}

export interface TopicListParams {
  page?: number;
  pageSize?: number;
  topic_type?: TopicType;
  priority?: TopicPriority;
  target_customer?: TargetCustomer;
  status?: TopicStatus;
  search?: string;
}

export interface TopicListResponse {
  topics: Topic[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TopicStats {
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byTargetCustomer: Record<string, number>;
}

export interface TopicSearchParams {
  query: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// 调研相关类型
// ============================================

export type SearchMethod = 'api' | 'crawler' | 'google';

export interface TopicResearchResultItem {
  channel_id: string;
  channel_name: string;
  channel_name_en: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_count: number;
  results: any[];
  method?: SearchMethod;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface TopicResearchTask {
  id: string;
  topic_id: string;
  topic_title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  current_batch: number;
  total_batches: number;
  results: TopicResearchResultItem[];
  knowledge_searched: boolean;
  knowledge_results?: any[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TopicResearchProgress {
  task_id: string;
  topic_title: string;
  status: string;
  progress: number; // 0-100
  current_channel: string;
  completed_channels: number;
  total_channels: number;
  results_summary: {
    total_results: number;
    by_channel: Record<string, number>;
  };
}

export interface TopicResearchStartResponse {
  task_id: string;
  topic_id: string;
  topic_title: string;
  status: string;
  message: string;
}

// ============================================
// API 函数
// ============================================
export const topicsApi = {
  /**
   * 获取话题列表
   */
  list: async (params?: TopicListParams): Promise<TopicListResponse> => {
    const response = await apiClient.get<{ success: true; data: TopicListResponse }>(
      '/topics',
      params
    );
    return response.data;
  },

  /**
   * 获取话题统计
   */
  getStats: async (): Promise<TopicStats> => {
    const response = await apiClient.get<{ success: true; data: TopicStats }>(
      '/topics/stats'
    );
    return response.data;
  },

  /**
   * 获取话题详情
   */
  getById: async (id: string): Promise<Topic> => {
    const response = await apiClient.get<{ success: true; data: { topic: Topic } }>(
      `/topics/${id}`
    );
    return response.data.topic;
  },

  /**
   * 创建话题
   */
  create: async (input: CreateTopicInput): Promise<Topic> => {
    const response = await apiClient.post<{ success: true; data: { topic: Topic } }>(
      '/topics',
      input
    );
    return response.data.topic;
  },

  /**
   * 更新话题
   */
  update: async (id: string, input: UpdateTopicInput): Promise<Topic> => {
    const response = await apiClient.put<{ success: true; data: { topic: Topic } }>(
      `/topics/${id}`,
      input
    );
    return response.data.topic;
  },

  /**
   * 删除话题
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/topics/${id}`
    );
  },

  /**
   * 批量导入话题
   */
  bulkCreate: async (topics: CreateTopicInput[]): Promise<Topic[]> => {
    const response = await apiClient.post<{ success: true; data: { topics: Topic[]; count: number } }>(
      '/topics/batch',
      { topics }
    );
    return response.data.topics;
  },

  /**
   * 搜索话题
   */
  search: async (params: TopicSearchParams): Promise<TopicListResponse> => {
    const response = await apiClient.post<{ success: true; data: TopicListResponse }>(
      '/topics/search',
      params
    );
    return response.data;
  },

  /**
   * 审核话题
   */
  approve: async (id: string): Promise<Topic> => {
    const response = await apiClient.post<{ success: true; data: { topic: Topic } }>(
      `/topics/${id}/approve`,
      {}
    );
    return response.data.topic;
  },

  /**
   * 拒绝话题
   */
  reject: async (id: string): Promise<Topic> => {
    const response = await apiClient.post<{ success: true; data: { topic: Topic } }>(
      `/topics/${id}/reject`,
      {}
    );
    return response.data.topic;
  },

  /**
   * 生成内容
   */
  generateContent: async (id: string, options: { platforms: any[]; skillCodes?: string[] }): Promise<any> => {
    const response = await apiClient.post<{ success: true; data: any }>(
      `/topics/${id}/generate-content`,
      options
    );
    return response.data;
  },

  /**
   * 批量删除话题
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string; count: number } }>(
      '/topics/bulk-delete',
      { ids }
    );
  },

  /**
   * 批量更新话题
   */
  bulkUpdate: async (ids: string[], updates: UpdateTopicInput): Promise<Topic[]> => {
    const response = await apiClient.post<{ success: true; data: { topics: Topic[]; count: number } }>(
      '/topics/bulk-update',
      { ids, updates }
    );
    return response.data.topics;
  },

  /**
   * 批量批准话题
   */
  bulkApprove: async (ids: string[]): Promise<Topic[]> => {
    const response = await apiClient.post<{ success: true; data: { topics: Topic[]; count: number } }>(
      '/topics/bulk-approve',
      { ids }
    );
    return response.data.topics;
  },

  /**
   * 批量拒绝话题
   */
  bulkReject: async (ids: string[]): Promise<Topic[]> => {
    const response = await apiClient.post<{ success: true; data: { topics: Topic[]; count: number } }>(
      '/topics/bulk-reject',
      { ids }
    );
    return response.data.topics;
  },

  /**
   * 导出话题
   */
  export: async (params?: TopicListParams): Promise<Blob> => {
    const response = await apiClient.get('/topics/export', {
      params,
      responseType: 'blob',
    });
    return response as any;
  },

  /**
   * 获取导出模板
   */
  getExportTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/topics/export-template', {
      responseType: 'blob',
    });
    return response as any;
  },

  /**
   * 开始话题调研
   */
  startResearch: async (id: string): Promise<TopicResearchStartResponse> => {
    const response = await apiClient.post<{
      success: true;
      data: TopicResearchStartResponse;
    }>(`/topics/${id}/research`);
    return response.data;
  },

  /**
   * 获取调研状态
   */
  getResearchStatus: async (id: string): Promise<TopicResearchTask> => {
    const response = await apiClient.get<{
      success: true;
      data: TopicResearchTask;
    }>(`/topics/${id}/research/status`);
    return response.data;
  },

  /**
   * 获取调研进度
   */
  getResearchProgress: async (id: string): Promise<TopicResearchProgress> => {
    const response = await apiClient.get<{
      success: true;
      data: TopicResearchProgress;
    }>(`/topics/${id}/research/progress`);
    return response.data;
  },

  /**
   * 获取调研结果
   */
  getResearchResults: async (id: string): Promise<TopicResearchTask> => {
    const response = await apiClient.get<{
      success: true;
      data: TopicResearchTask;
    }>(`/topics/${id}/research/results`);
    return response.data;
  },

  /**
   * 获取平台候选列表
   */
  getPlatformCandidates: async (id: string) => {
    const response = await apiClient.get<{
      success: true;
      data: any;
    }>(`/topics/${id}/research/platforms`);
    return response.data.platform_candidates;
  }
};
