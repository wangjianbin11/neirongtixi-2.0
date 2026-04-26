import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type ContentType = 'article' | 'video_script' | 'social_post' | 'forum_answer';
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export interface Content {
  id: string;
  topic_id: string | null;
  title: string;
  title_en?: string;
  content_type: ContentType;
  platform: string;
  status: ContentStatus;
  content_text: string | null;
  content_text_en?: string;
  content_metadata: Record<string, any> | null;
  generated_by_skill: string | null;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CreateContentInput {
  topic_id?: string | null;
  title: string;
  title_en?: string;
  content_type: ContentType;
  platform: string;
  status?: ContentStatus;
  content_text?: string;
  content_text_en?: string;
  content_metadata?: Record<string, any>;
  generated_by_skill?: string;
}

export interface UpdateContentInput {
  title?: string;
  title_en?: string;
  content_type?: ContentType;
  platform?: string;
  status?: ContentStatus;
  content_text?: string;
  content_text_en?: string;
  content_metadata?: Record<string, any>;
  reviewed_by?: string;
}

export interface ContentListParams {
  page?: number;
  pageSize?: number;
  content_type?: ContentType;
  platform?: string;
  status?: ContentStatus;
  topic_id?: string;
  search?: string;
}

export interface ContentListResponse {
  contents: Content[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContentStats {
  total: number;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface GenerateContentRequest {
  topic_id?: string;
  topic_title: string;
  topic_description?: string;
  content_type: ContentType;
  platform: string;
  target_customer: string;
}

// ============================================
// API 函数
// ============================================
export const contentsApi = {
  /**
   * 获取内容列表
   */
  list: async (params?: ContentListParams): Promise<ContentListResponse> => {
    const response = await apiClient.get<{ success: true; data: ContentListResponse }>(
      '/contents',
      params
    );
    return response.data;
  },

  /**
   * 获取内容统计
   */
  getStats: async (): Promise<ContentStats> => {
    const response = await apiClient.get<{ success: true; data: ContentStats }>(
      '/contents/stats'
    );
    return response.data;
  },

  /**
   * 获取内容详情
   */
  getById: async (id: string): Promise<Content> => {
    const response = await apiClient.get<{ success: true; data: { content: Content } }>(
      `/contents/${id}`
    );
    return response.data.content;
  },

  /**
   * 创建内容
   */
  create: async (input: CreateContentInput): Promise<Content> => {
    const response = await apiClient.post<{ success: true; data: { content: Content } }>(
      '/contents',
      input
    );
    return response.data.content;
  },

  /**
   * 更新内容
   */
  update: async (id: string, input: UpdateContentInput): Promise<Content> => {
    const response = await apiClient.put<{ success: true; data: { content: Content } }>(
      `/contents/${id}`,
      input
    );
    return response.data.content;
  },

  /**
   * 删除内容
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/contents/${id}`
    );
  },

  /**
   * AI生成内容
   */
  generate: async (request: GenerateContentRequest): Promise<Content> => {
    const response = await apiClient.post<{ success: true; data: { content: Content } }>(
      '/contents/generate',
      request
    );
    return response.data.content;
  },

  /**
   * 审核通过内容
   */
  approve: async (id: string): Promise<Content> => {
    const response = await apiClient.post<{ success: true; data: { content: Content } }>(
      `/contents/${id}/approve`,
      {}
    );
    return response.data.content;
  },

  /**
   * 发布内容
   */
  publish: async (id: string, options?: {
    platform?: string;
    scheduledAt?: string;
    publishOptions?: Record<string, any>;
  }): Promise<Content> => {
    const response = await apiClient.post<{ success: true; data: { content: Content; taskId?: string; message?: string } }>(
      `/contents/${id}/publish`,
      options || {}
    );
    return response.data.content;
  },

  /**
   * 根据话题获取内容
   */
  getByTopicId: async (topicId: string): Promise<Content[]> => {
    const response = await apiClient.get<{ success: true; data: { contents: Content[] } }>(
      `/contents/topic/${topicId}`
    );
    return response.data.contents;
  },

  /**
   * 批量导入内容
   */
  bulkCreate: async (contents: CreateContentInput[]): Promise<Content[]> => {
    const response = await apiClient.post<{ success: true; data: { contents: Content[]; count: number } }>(
      '/contents/batch',
      { contents }
    );
    return response.data.contents;
  },

  /**
   * 批量更新内容状态
   */
  bulkUpdateStatus: async (ids: string[], status: ContentStatus): Promise<Content[]> => {
    const response = await apiClient.post<{ success: true; data: { contents: Content[]; count: number } }>(
      '/contents/batch-update-status',
      { ids, status }
    );
    return response.data.contents;
  },

  /**
   * 批量删除内容
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string; count: number } }>(
      '/contents/bulk-delete',
      { ids }
    );
  },

  /**
   * 批量更新内容
   */
  bulkUpdate: async (ids: string[], updates: UpdateContentInput): Promise<Content[]> => {
    const response = await apiClient.post<{ success: true; data: { contents: Content[]; count: number } }>(
      '/contents/bulk-update',
      { ids, updates }
    );
    return response.data.contents;
  },

  /**
   * 批量批准内容
   */
  bulkApprove: async (ids: string[]): Promise<Content[]> => {
    const response = await apiClient.post<{ success: true; data: { contents: Content[]; count: number } }>(
      '/contents/bulk-approve',
      { ids }
    );
    return response.data.contents;
  },

  /**
   * 导出内容
   */
  export: async (params?: ContentListParams): Promise<Blob> => {
    const response = await apiClient.get('/contents/export', {
      params,
      responseType: 'blob',
    });
    return response as any;
  },

  /**
   * 获取导出模板
   */
  getExportTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/contents/export-template', {
      responseType: 'blob',
    });
    return response as any;
  },

  /**
   * 开始内容分析（异步）
   */
  startAnalysis: async (id: string) => {
    const response = await apiClient.post<{
      success: true;
      data: { content_id: string; message: string; note: string };
    }>(`/contents/${id}/analyze`);
    return response.data;
  },

  /**
   * 同步分析内容
   */
  analyzeSync: async (id: string) => {
    const response = await apiClient.post<{
      success: true;
      data: any;
    }>(`/contents/${id}/analyze-sync`);
    return response.data;
  },

  /**
   * 获取内容评分
   */
  getScore: async (id: string) => {
    const response = await apiClient.get<{
      success: true;
      data: any;
    }>(`/contents/${id}/score`);
    return response.data.data;
  },

  /**
   * 批量分析内容
   */
  batchAnalyze: async (ids: string[]) => {
    const response = await apiClient.post<{
      success: true;
      data: { message: string; count: number; note: string };
    }>(`/contents/batch-analyze`, { ids });
    return response.data.data;
  }
};
