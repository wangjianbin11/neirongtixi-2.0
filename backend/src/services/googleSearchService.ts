import axios from 'axios';
import { config } from '../config';

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
 * Google搜索响应
 */
export interface GoogleSearchResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request?: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
    nextPage?: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
    previousPage?: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: GoogleSearchResult[];
}

/**
 * 搜索参数
 */
export interface SearchParams {
  q: string;              // 搜索关键词
  start?: number;         // 起始位置 (1, 11, 21, ...)
  num?: number;           // 每页结果数 (1-10, 默认10)
  cx?: string;            // 自定义搜索引擎ID
  lr?: string;            // 语言限制
  filter?: number;        // 是否过滤重复内容
  gl?: string;            // 地区
  safe?: string;          // 安全搜索级别
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
 * Google自定义搜索服务
 */
export class GoogleSearchService {
  private apiKey: string;
  private cx: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private maxResultsPerQuery = 10; // Google限制每页最多10个结果

  constructor() {
    this.apiKey = config.google.apiKey || '';
    this.cx = config.google.cseId || '';

    console.log('[Google Search Service] Initialized with:', {
      hasApiKey: !!this.apiKey,
      hasCseId: !!this.cx,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'none',
      cseId: this.cx,
    });

    if (!this.apiKey) {
      console.warn('⚠️ GOOGLE_API_KEY is not set in environment variables');
    }
    if (!this.cx) {
      console.warn('⚠️ GOOGLE_CSE_ID is not set in environment variables');
    }
  }

  /**
   * 执行单次搜索请求
   */
  async search(params: SearchParams): Promise<GoogleSearchResponse> {
    // 检查配置
    if (!this.apiKey || !this.cx) {
      throw new Error(
        'Google Search API 配置缺失。请在 .env 文件中设置 GOOGLE_API_KEY 和 GOOGLE_CSE_ID。\n' +
        '获取方式: https://developers.google.com/custom-search/v1/overview'
      );
    }

    console.log('[Google Search] Searching for:', params.q);

    try {
      const response = await axios.get<GoogleSearchResponse>(this.baseUrl, {
        params: {
          key: this.apiKey,
          cx: params.cx || this.cx,
          q: params.q,
          start: params.start || 1,
          num: params.num || this.maxResultsPerQuery,
          lr: params.lr,
          filter: params.filter,
          gl: params.gl,
          safe: params.safe || 'medium',
        },
        timeout: 30000, // 30秒超时
      });

      console.log('[Google Search] Success:', {
        resultsCount: response.data.items?.length || 0,
        totalResults: response.data.searchInformation?.totalResults,
      });

      return response.data;
    } catch (error: any) {
      console.error('[Google Search] Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
      });

      // 网络连接错误诊断
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        console.error('[Google Search] Network Error - Unable to connect to Google API');
        console.error('[Google Search] Possible causes:');
        console.error('  1. Firewall blocking network access');
        console.error('  2. Proxy configuration required');
        console.error('  3. DNS resolution failure');
        console.error('  4. Network connectivity issue');
        throw new Error(`Network Error: Cannot connect to Google API (${error.code}). Please check your network connection, firewall settings, or proxy configuration.`);
      }

      // TLS/SSL 错误
      if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
        console.error('[Google Search] SSL/TLS Certificate Error');
        throw new Error(`SSL Certificate Error: ${error.message}. Try updating Node.js or configuring SSL certificates.`);
      }

      if (error.response) {
        const errorMsg = error.response.data?.error?.message || error.message;
        const errorDetails = error.response.data?.error?.errors?.map((e: any) => e.reason).join(', ') || '';
        throw new Error(`Google Search API Error (${error.response.status}): ${errorMsg} ${errorDetails}`.trim());
      }

      // AggregateError (通常是网络问题)
      if (error.name === 'AggregateError') {
        throw new Error(`Network Error: Unable to reach Google API. This may be due to firewall, proxy, or network connectivity issues. Original error: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * 执行深度搜索（获取多页结果）
   * @param query 搜索关键词
   * @param maxPages 最大页数（默认10页，每页10个结果，共100个）
   * @param startingPage 起始页（默认第1页）
   */
  async deepSearch(
    query: string,
    maxPages: number = 10,
    startingPage: number = 1
  ): Promise<PaginatedSearchResults> {
    const allItems: GoogleSearchResult[] = [];
    let totalResults = 0;
    let searchTime = 0;
    let currentPage = startingPage;
    let hasNextPage = true;
    let error: Error | null = null;

    // 计算起始索引 (第1页=1, 第2页=11, 第3页=21, ...)
    const startIndex = (startingPage - 1) * this.maxResultsPerQuery + 1;

    try {
      // 逐页获取结果
      for (let page = 0; page < maxPages; page++) {
        const currentStart = startIndex + page * this.maxResultsPerQuery;

        const response = await this.search({
          q: query,
          start: currentStart,
          num: this.maxResultsPerQuery,
        });

        // 更新总数和搜索时间（使用第一次请求的值）
        if (page === 0) {
          totalResults = parseInt(response.searchInformation?.totalResults || '0');
          searchTime = response.searchInformation?.searchTime || 0;
        }

        // 添加结果项
        if (response.items && response.items.length > 0) {
          allItems.push(...response.items);
        }

        // 检查是否有下一页
        if (!response.queries.nextPage || response.items?.length === 0) {
          hasNextPage = false;
          break;
        }
      }

      // 计算总页数
      const totalPossiblePages = Math.min(Math.ceil(totalResults / this.maxResultsPerQuery), maxPages);

      return {
        query,
        totalResults,
        searchTime,
        items: allItems,
        currentPage: startingPage,
        totalPages: totalPossiblePages,
        itemsPerPage: this.maxResultsPerQuery,
        hasNextPage,
        hasPreviousPage: startingPage > 1,
      };
    } catch (err: any) {
      error = err;

      // 如果出错，返回已获取的结果
      return {
        query,
        totalResults: totalResults || 0,
        searchTime,
        items: allItems,
        currentPage: startingPage,
        totalPages: Math.ceil(allItems.length / this.maxResultsPerQuery),
        itemsPerPage: this.maxResultsPerQuery,
        hasNextPage: false,
        hasPreviousPage: startingPage > 1,
        error: error?.message || 'Search failed',
      };
    }
  }

  /**
   * 搜索单页结果
   */
  async searchPage(query: string, page: number = 1): Promise<PaginatedSearchResults> {
    const startIndex = (page - 1) * this.maxResultsPerQuery + 1;

    const response = await this.search({
      q: query,
      start: startIndex,
      num: this.maxResultsPerQuery,
    });

    const totalResults = parseInt(response.searchInformation?.totalResults || '0');
    const totalPages = Math.ceil(totalResults / this.maxResultsPerQuery);

    return {
      query,
      totalResults,
      searchTime: response.searchInformation?.searchTime || 0,
      items: response.items || [],
      currentPage: page,
      totalPages,
      itemsPerPage: this.maxResultsPerQuery,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * 获取多个关键词的搜索结果
   */
  async searchMultiple(keywords: string[], maxPages: number = 10): Promise<Map<string, PaginatedSearchResults>> {
    const results = new Map<string, PaginatedSearchResults>();

    // 使用Promise.all但限制并发数以避免API限流
    const concurrency = 3; // 同时最多3个请求
    for (let i = 0; i < keywords.length; i += concurrency) {
      const batch = keywords.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (keyword) => {
          try {
            const result = await this.deepSearch(keyword, maxPages);
            return { keyword, result };
          } catch (error) {
            console.error(`Failed to search for "${keyword}":`, error);
            return {
              keyword,
              result: {
                query: keyword,
                totalResults: 0,
                searchTime: 0,
                items: [],
                currentPage: 1,
                totalPages: 0,
                itemsPerPage: 10,
                hasNextPage: false,
                hasPreviousPage: false,
                error: 'Search failed',
              },
            };
          }
        })
      );

      batchResults.forEach(({ keyword, result }) => {
        results.set(keyword, result);
      });
    }

    return results;
  }

  /**
   * 提取搜索结果中的URL
   */
  extractUrls(results: GoogleSearchResult[]): string[] {
    return results.map(item => item.link).filter(url => url);
  }

  /**
   * 从搜索结果中提取域名
   */
  extractDomains(results: GoogleSearchResult[]): string[] {
    const domains = new Set<string>();
    results.forEach(item => {
      try {
        const url = new URL(item.link);
        domains.add(url.hostname);
      } catch {
        // 忽略无效URL
      }
    });
    return Array.from(domains);
  }

  /**
   * 测试网络连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          cx: this.cx,
          q: 'test',
          num: 1,
        },
        timeout: 10000,
      });
      const latency = Date.now() - startTime;
      return {
        success: true,
        message: `Connection successful (${latency}ms)`,
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message} (code: ${error.code || 'unknown'})`,
      };
    }
  }

  /**
   * 分析搜索结果
   */
  analyzeResults(results: GoogleSearchResult[]): {
    totalResults: number;
    uniqueDomains: number;
    domains: string[];
    averageTitleLength: number;
    resultsWithSnippets: number;
  } {
    const domains = this.extractDomains(results);
    const totalTitleLength = results.reduce((sum, item) => sum + item.title.length, 0);
    const resultsWithSnippets = results.filter(item => item.snippet && item.snippet.length > 0).length;

    return {
      totalResults: results.length,
      uniqueDomains: domains.length,
      domains: domains.sort(),
      averageTitleLength: results.length > 0 ? totalTitleLength / results.length : 0,
      resultsWithSnippets,
    };
  }
}

// 导出单例
export const googleSearchService = new GoogleSearchService();
