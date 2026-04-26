import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type KeywordCategory = 'core' | 'long_tail' | 'question' | 'guide' | 'comparison';
export type KeywordCompetition = 'low' | 'medium' | 'high';
export type KeywordIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type KeywordPriority = 'S' | 'A' | 'B' | 'C';
export type TargetCustomer = 'C1-Entrepreneur' | 'C2-Experienced' | 'C3-TeamSeller' | 'C4-LocalToGlobal';

/**
 * 场景分类枚举
 */
export type KeywordScene =
  | 'website'      // 网站
  | 'tiktok'       // TikTok
  | 'youtube'      // YouTube
  | 'twitter'      // X (Twitter)
  | 'instagram'    // Instagram
  | 'facebook'     // Facebook
  | 'amazon'       // 亚马逊
  | 'linkedin';    // LinkedIn

/**
 * 场景选项配置（供UI使用）
 */
export const KEYWORD_SCENES_OPTIONS: { value: KeywordScene; label: string }[] = [
  { value: 'website', label: '网站' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'amazon', label: '亚马逊' },
  { value: 'linkedin', label: 'LinkedIn' },
];

export interface Keyword {
  id: string;
  keyword: string;
  category: KeywordCategory;
  search_volume: number;
  competition: KeywordCompetition;
  intent: KeywordIntent;
  priority: KeywordPriority;
  target_customer: TargetCustomer | null;
  scenes?: KeywordScene[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKeywordInput {
  keyword: string;
  category: KeywordCategory;
  search_volume?: number;
  competition?: KeywordCompetition;
  intent?: KeywordIntent;
  priority?: KeywordPriority;
  target_customer?: TargetCustomer;
  scenes?: KeywordScene[];
}

export interface UpdateKeywordInput {
  keyword?: string;
  category?: KeywordCategory;
  search_volume?: number;
  competition?: KeywordCompetition;
  intent?: KeywordIntent;
  priority?: KeywordPriority;
  target_customer?: TargetCustomer;
  scenes?: KeywordScene[];
}

export interface KeywordListParams {
  page?: number;
  pageSize?: number;
  category?: KeywordCategory;
  priority?: KeywordPriority;
  target_customer?: TargetCustomer;
  competition?: KeywordCompetition;
  intent?: KeywordIntent;
  scenes?: KeywordScene;
  search?: string;
}

export interface KeywordListResponse {
  keywords: Keyword[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KeywordStats {
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byTargetCustomer: Record<string, number>;
}

export interface KeywordSearchParams {
  query: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// 调研相关类型
// ============================================

export type SearchMethod = 'api' | 'crawler' | 'google';

export interface ResearchResultItem {
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

export interface ResearchTask {
  id: string;
  keyword_id: string;
  keyword: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  current_batch: number;
  total_batches: number;
  results: ResearchResultItem[];
  knowledge_searched: boolean;
  knowledge_results?: any[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ResearchProgress {
  task_id: string;
  keyword: string;
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

export interface ResearchStartResponse {
  task_id: string;
  keyword_id: string;
  keyword: string;
  status: string;
  message: string;
}

// ============================================
// API 函数
// ============================================
export const keywordsApi = {
  /**
   * 获取关键词列表
   */
  list: async (params?: KeywordListParams): Promise<KeywordListResponse> => {
    try {
      const response = await apiClient.get<{ success: true; data: KeywordListResponse }>(
        '/keywords',
        params
      );
      if (response && response.success && response.data) {
        return response.data;
      }
      return { keywords: [], total: 0, page: 1, pageSize: 20 };
    } catch (error) {
      throw error;
    }
  },

  /**
   * 获取关键词统计
   */
  getStats: async (): Promise<KeywordStats> => {
    const response = await apiClient.get<{ success: true; data: KeywordStats }>(
      '/keywords/stats'
    );
    return response.data || {
      total: 0,
      byCategory: {},
      byPriority: {},
      byTargetCustomer: {},
    };
  },

  /**
   * 获取关键词详情
   */
  getById: async (id: string): Promise<Keyword> => {
    const response = await apiClient.get<{ success: true; data: { keyword: Keyword } }>(
      `/keywords/${id}`
    );
    return response.data.keyword;
  },

  /**
   * 创建关键词
   */
  create: async (input: CreateKeywordInput): Promise<Keyword> => {
    const response = await apiClient.post<{ success: true; data: { keyword: Keyword } }>(
      '/keywords',
      input
    );
    return response.data.data.keyword;
  },

  /**
   * 更新关键词
   */
  update: async (id: string, input: UpdateKeywordInput): Promise<Keyword> => {
    const response = await apiClient.put<{ success: true; data: { keyword: Keyword } }>(
      `/keywords/${id}`,
      input
    );
    return response.data.keyword;
  },

  /**
   * 删除关键词
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/keywords/${id}`
    );
  },

  /**
   * 批量导入关键词
   */
  bulkCreate: async (keywords: CreateKeywordInput[]): Promise<Keyword[]> => {
    const response = await apiClient.post<{ success: true; data: { keywords: Keyword[]; count: number } }>(
      '/keywords/batch',
      { keywords }
    );
    return response.data.data.keywords;
  },

  /**
   * 搜索关键词
   */
  search: async (params: KeywordSearchParams): Promise<KeywordListResponse> => {
    const response = await apiClient.post<{ success: true; data: KeywordListResponse }>(
      '/keywords/search',
      params
    );
    return response.data.data;
  },

  /**
   * 批量删除关键词
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.post<{ success: true; data: { message: string; count: number } }>(
      '/keywords/bulk-delete',
      { ids }
    );
  },

  /**
   * 批量更新关键词状态
   */
  bulkUpdate: async (ids: string[], updates: UpdateKeywordInput): Promise<Keyword[]> => {
    const response = await apiClient.post<{ success: true; data: { keywords: Keyword[]; count: number } }>(
      '/keywords/bulk-update',
      { ids, updates }
    );
    return response.data.keywords;
  },

  /**
   * 批量自动分类目标客户
   */
  classifyTargetCustomers: async (limit: number = 1000): Promise<{ updated: number; remaining: number }> => {
    const response = await apiClient.post<{ success: true; data: { message: string; updated: number; remaining: number } }>(
      '/keywords/classify-target-customers',
      { limit }
    );
    return {
      updated: response.data.updated,
      remaining: response.data.remaining,
    };
  },

  /**
   * 导出关键词
   */
  export: async (params?: KeywordListParams): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/keywords/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  /**
   * 获取导出模板
   */
  getExportTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/keywords/export-template', {
      responseType: 'blob',
    });
    return response;
  },

  /**
   * 开始关键词调研
   */
  startResearch: async (id: string, autoGenerateTopics: boolean = false): Promise<ResearchStartResponse> => {
    const response = await apiClient.post<{
      success: true;
      data: ResearchStartResponse;
    }>(`/keywords/${id}/research`, { autoGenerateTopics });
    return response.data;
  },

  /**
   * 获取调研状态
   */
  getResearchStatus: async (id: string): Promise<ResearchProgress> => {
    const response = await apiClient.get<{
      success: true;
      data: {
        has_research: boolean;
        task?: any;
        progress?: ResearchProgress;
      };
    }>(`/keywords/${id}/research/status`);
    const data = (response as any).data;
    if (data && data.progress) {
      return data.progress;
    }
    // 如果没有调研任务，返回一个空的进度对象
    return {
      task_id: '',
      keyword: '',
      status: 'pending',
      progress: 0,
      current_channel: '',
      completed_channels: 0,
      total_channels: 0,
      results_summary: {
        total_results: 0,
        by_channel: {},
      },
    };
  },

  /**
   * 获取调研结果
   */
  getResearchResults: async (id: string): Promise<ResearchTask> => {
    const response = await apiClient.get<{
      success: true;
      data: {
        task: ResearchTask;
        summary?: any;
      };
    }>(`/keywords/${id}/research/results`);
    const data = (response as any).data;
    return data?.task || null;
  },

  /**
   * 从调研结果生成话题
   */
  generateTopicsFromResearch: async (id: string, options?: { maxTopics?: number; targetCustomer?: string }): Promise<any[]> => {
    const response = await apiClient.post<{
      success: true;
      data: { topics: any[] };
    }>(`/keywords/${id}/research/generate-topics`, options || {});
    return (response as any).data.topics || [];
  },
};
