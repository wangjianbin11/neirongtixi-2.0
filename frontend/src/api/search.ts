import { apiClient } from './client';

/**
 * Google搜索结果项
 */
export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  htmlTitle?: string;
  htmlSnippet?: string;
  cacheId?: string;
  fileFormat?: string;
  image?: {
    contextLink: string;
    height: number;
    width: number;
    byteSize: number;
    thumbnailLink: string;
    thumbnailHeight: number;
    thumbnailWidth: number;
  };
}

/**
 * 搜索结果（分页）
 */
export interface PaginatedSearchResults {
  query: string;
  totalResults: number;
  searchTime: number;
  items: GoogleSearchResult[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  error?: string;
}

/**
 * 搜索分析结果
 */
export interface SearchAnalysis {
  totalResults: number;
  uniqueDomains: number;
  domains: string[];
  averageTitleLength: number;
  resultsWithSnippets: number;
}

/**
 * 搜索参数
 */
export interface SearchParams {
  q: string;
  page?: number;
  maxPages?: number;
}

/**
 * 批量搜索响应
 */
export interface BatchSearchResponse {
  results: Record<string, PaginatedSearchResults>;
  total: number;
}

/**
 * URL列表响应
 */
export interface UrlsResponse {
  query: string;
  urls: string[];
  total: number;
  searchTime: number;
}

/**
 * 搜索API
 */
export const searchApi = {
  /**
   * 搜索（深度搜索，最多100个结果）
   */
  search: async (params: SearchParams): Promise<PaginatedSearchResults> => {
    const response = await apiClient.post<PaginatedSearchResults>('/search', {
      q: params.q,
      page: params.page || 1,
      maxPages: params.maxPages || 10,
    });
    return response;
  },

  /**
   * 搜索（单页，通过查询参数）
   */
  searchByQuery: async (query: string, page: number = 1): Promise<PaginatedSearchResults> => {
    const response = await apiClient.get<PaginatedSearchResults>('/search', {
      params: { q: query, page },
    });
    return response;
  },

  /**
   * 批量搜索多个关键词
   */
  batchSearch: async (keywords: string[], maxPages: number = 10): Promise<BatchSearchResponse> => {
    const response = await apiClient.post<BatchSearchResponse>('/search/batch', {
      keywords,
      maxPages,
    });
    return response;
  },

  /**
   * 分析搜索结果
   */
  analyze: async (query: string, maxPages: number = 10): Promise<{
    search: PaginatedSearchResults;
    analysis: SearchAnalysis;
  }> => {
    const response = await apiClient.post<{ search: PaginatedSearchResults; analysis: SearchAnalysis }>('/search/analyze', {
      q: query,
      maxPages,
    });
    return response;
  },

  /**
   * 获取搜索结果的URL列表
   */
  getUrls: async (query: string, maxPages: number = 10): Promise<UrlsResponse> => {
    const response = await apiClient.get<UrlsResponse>('/search/urls', {
      params: { q: query, maxPages },
    });
    return response;
  },
};
