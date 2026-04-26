import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export interface ContentAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
  publishedThisMonth: number;
  publishedThisWeek: number;
  avgProductionTime: number;
}

export interface KeywordAnalytics {
  total: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byCompetition: Record<string, number>;
  topKeywords: Array<{
    keyword: string;
    searchVolume: number;
    competition: string;
  }>;
}

export interface TopicAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byTargetCustomer: Record<string, number>;
  approvalRate: number;
}

export interface PublishAnalytics {
  totalPublished: number;
  byPlatform: Record<string, number>;
  successRate: number;
  avgPublishTime: number;
  recentTrends: Array<{
    date: string;
    count: number;
  }>;
}

export interface OverallStats {
  contents: ContentAnalytics;
  keywords: KeywordAnalytics;
  topics: TopicAnalytics;
  publishes: PublishAnalytics;
}

// ============================================
// API 函数
// ============================================
export const analyticsApi = {
  /**
   * 获取整体统计数据
   */
  getOverallStats: async (): Promise<OverallStats> => {
    const response = await apiClient.get<{ success: true; data: OverallStats }>(
      '/analytics/overall'
    );
    return response.data;
  },

  /**
   * 获取内容分析数据
   */
  getContentAnalytics: async (): Promise<ContentAnalytics> => {
    const response = await apiClient.get<{ success: true; data: ContentAnalytics }>(
      '/analytics/contents'
    );
    return response.data;
  },

  /**
   * 获取关键词分析数据
   */
  getKeywordAnalytics: async (): Promise<KeywordAnalytics> => {
    const response = await apiClient.get<{ success: true; data: KeywordAnalytics }>(
      '/analytics/keywords'
    );
    return response.data;
  },

  /**
   * 获取话题分析数据
   */
  getTopicAnalytics: async (): Promise<TopicAnalytics> => {
    const response = await apiClient.get<{ success: true; data: TopicAnalytics }>(
      '/analytics/topics'
    );
    return response.data;
  },

  /**
   * 获取发布分析数据
   */
  getPublishAnalytics: async (): Promise<PublishAnalytics> => {
    const response = await apiClient.get<{ success: true; data: PublishAnalytics }>(
      '/analytics/publishes'
    );
    return response.data;
  },

  /**
   * 获取趋势数据
   */
  getTrends: async (period: 'week' | 'month' | 'quarter' = 'month'): Promise<any[]> => {
    const response = await apiClient.get<{ success: true; data: any[] }>(
      '/analytics/trends',
      { params: { period } }
    );
    return response.data;
  },
};
