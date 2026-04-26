import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type AssetType = 'case' | 'data' | 'quote' | 'image' | 'video' | 'template';

export interface Asset {
  id: string;
  title: string;
  type: AssetType;
  category: string | null;
  description: string | null;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  tags: string[];
  source: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetInput {
  title: string;
  type: AssetType;
  category?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  tags?: string[];
  source?: string;
  is_active?: boolean;
}

export interface UpdateAssetInput {
  title?: string;
  type?: AssetType;
  category?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  tags?: string[];
  source?: string;
  is_active?: boolean;
}

export interface AssetListParams {
  page?: number;
  pageSize?: number;
  type?: AssetType;
  category?: string;
  tags?: string[];
  search?: string;
  is_active?: boolean;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssetStats {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  totalFileSize: number;
}

// ============================================
// API 函数
// ============================================
export const assetsApi = {
  /**
   * 获取素材列表
   */
  list: async (params?: AssetListParams): Promise<AssetListResponse> => {
    const response = await apiClient.get<{ success: true; data: AssetListResponse }>(
      '/assets',
      { params }
    );
    return response.data;
  },

  /**
   * 获取素材统计
   */
  getStats: async (): Promise<AssetStats> => {
    const response = await apiClient.get<{ success: true; data: AssetStats }>(
      '/assets/stats'
    );
    return response.data;
  },

  /**
   * 获取素材详情
   */
  getById: async (id: string): Promise<Asset> => {
    const response = await apiClient.get<{ success: true; data: { asset: Asset } }>(
      `/assets/${id}`
    );
    return response.data.asset;
  },

  /**
   * 创建素材
   */
  create: async (input: CreateAssetInput): Promise<Asset> => {
    const response = await apiClient.post<{ success: true; data: { asset: Asset } }>(
      '/assets',
      input
    );
    return response.data.data.asset;
  },

  /**
   * 更新素材
   */
  update: async (id: string, input: UpdateAssetInput): Promise<Asset> => {
    const response = await apiClient.put<{ success: true; data: { asset: Asset } }>(
      `/assets/${id}`,
      input
    );
    return response.data.data.asset;
  },

  /**
   * 删除素材
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/assets/${id}`
    );
  },

  /**
   * 搜索素材
   */
  search: async (query: string, limit?: number): Promise<Asset[]> => {
    const response = await apiClient.get<{ success: true; data: { assets: Asset[] } }>(
      '/assets/search',
      { params: { q: query, limit } }
    );
    return response.data.assets;
  },
};
