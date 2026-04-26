import { googleSearchService } from './googleSearchService';
import { puppeteerSearchService } from './puppeteerSearchService';
import { youtubeApiService } from './youtubeApiService';
import { redditApiService } from './redditApiService';

/**
 * 搜索方法优先级
 */
export enum SearchMethod {
  API = 'api',           // 官方API (最快最准)
  CRAWLER = 'crawler',   // 爬虫抓取 (深度内容)
  GOOGLE = 'google',     // Google搜索 (兜底方案)
}

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;        // 数据来源
  method: SearchMethod;  // 使用的搜索方法
  publishedAt?: string;
  author?: string;
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  thumbnail?: string;
  tags?: string[];
  fullContent?: string;  // 爬虫获取的完整内容
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  query: string;
  channel: string;
  method: SearchMethod;
  results: SearchResultItem[];
  totalResults: number;
  searchTime: number;     // 毫秒
  cacheHit: boolean;
  quotaUsed: number;      // 使用的API配额
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  maxResults?: number;
  timeout?: number;
  method?: SearchMethod;           // 指定方法
  fallbackToGoogle?: boolean;      // 失败时是否回退到Google
  includeFullContent?: boolean;    // 是否获取完整内容
  cacheResults?: boolean;          // 是否缓存结果
}

/**
 * 渠道搜索能力配置
 */
interface ChannelCapability {
  primaryMethod: SearchMethod;
  secondaryMethod?: SearchMethod;
  supportsFullContent: boolean;
  supportsMetrics: boolean;
  costLevel: 'free' | 'low' | 'medium' | 'high';
}

/**
 * 混合搜索服务
 * 根据渠道特性自动选择最佳搜索方法
 */
export class HybridSearchService {
  // 渠道能力配置
  private channelCapabilities: Record<string, ChannelCapability> = {
    // YouTube - 官方API优先
    'youtube_search': {
      primaryMethod: SearchMethod.API,
      secondaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: true,
      supportsMetrics: true,
      costLevel: 'free',
    },
    // Reddit - 官方API优先
    'reddit_search': {
      primaryMethod: SearchMethod.API,
      secondaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: true,
      supportsMetrics: true,
      costLevel: 'free',
    },
    // TikTok - 仅爬虫
    'tiktok_search': {
      primaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: false,
      supportsMetrics: true,
      costLevel: 'low',
    },
    // Twitter - 仅爬虫
    'twitter_search': {
      primaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: false,
      supportsMetrics: true,
      costLevel: 'low',
    },
    // Instagram - 仅爬虫
    'instagram_search': {
      primaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: false,
      supportsMetrics: true,
      costLevel: 'low',
    },
    // LinkedIn - 仅爬虫
    'linkedin_search': {
      primaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'medium',
    },
    // Pinterest - 仅爬虫
    'pinterest_search': {
      primaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: false,
      supportsMetrics: true,
      costLevel: 'low',
    },
    // Quora - 仅爬虫
    'quora_search': {
      primaryMethod: SearchMethod.CRAWLER,
      secondaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: true,
      supportsMetrics: false,
      costLevel: 'low',
    },
    // Stack Overflow - 仅爬虫
    'stack_overflow': {
      primaryMethod: SearchMethod.CRAWLER,
      secondaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: true,
      supportsMetrics: true,
      costLevel: 'free',
    },
    // Medium - 仅爬虫
    'medium_search': {
      primaryMethod: SearchMethod.CRAWLER,
      supportsFullContent: true,
      supportsMetrics: false,
      costLevel: 'free',
    },
    // 通用搜索引擎 - Google
    'google_search': {
      primaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'medium',
    },
    'bing_search': {
      primaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'medium',
    },
    // 电商 - Google site搜索
    'amazon_search': {
      primaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'low',
    },
    'ebay_search': {
      primaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'low',
    },
    // 新闻 - Google
    'google_news': {
      primaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'low',
    },
    'techcrunch_search': {
      primaryMethod: SearchMethod.GOOGLE,
      supportsFullContent: false,
      supportsMetrics: false,
      costLevel: 'low',
    },
  };

  // 结果缓存
  private cache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 执行混合搜索
   */
  async search(
    query: string,
    channelId: string,
    config: SearchConfig = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const {
      maxResults = 15,
      timeout = 30000,
      method,
      fallbackToGoogle = true,
      includeFullContent = false,
      cacheResults = true,
    } = config;

    // 检查缓存
    const cacheKey = this.getCacheKey(query, channelId, maxResults);
    if (cacheResults) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`[HybridSearch] Cache hit for "${query}" on ${channelId}`);
        return { ...cached.data, cacheHit: true };
      }
    }

    console.log(`[HybridSearch] Searching "${query}" on ${channelId}`);

    try {
      // 获取渠道能力配置
      const capability = this.channelCapabilities[channelId] || {
        primaryMethod: SearchMethod.GOOGLE,
        supportsFullContent: false,
        supportsMetrics: false,
        costLevel: 'low',
      };

      // 确定搜索方法
      const searchMethod = method || capability.primaryMethod;

      // 执行搜索
      let results: SearchResultItem[] = [];
      let quotaUsed = 0;

      switch (searchMethod) {
        case SearchMethod.API:
          // 尝试官方API
          const apiResult = await this.searchWithAPI(query, channelId, maxResults);
          results = apiResult.results;
          quotaUsed = apiResult.quotaUsed;

          // 如果API失败且有备用方法，尝试备用
          if (results.length === 0 && capability.secondaryMethod && fallbackToGoogle) {
            console.log(`[HybridSearch] API failed, falling back to ${capability.secondaryMethod}`);
            const fallback = await this.searchWithBestMethod(query, channelId, maxResults, includeFullContent);
            results = fallback.results;
            quotaUsed += fallback.quotaUsed;
          }
          break;

        case SearchMethod.CRAWLER:
          results = await this.searchWithCrawler(query, channelId, maxResults, includeFullContent);
          break;

        case SearchMethod.GOOGLE:
          const googleResult = await this.searchWithGoogle(query, channelId, maxResults);
          results = googleResult.results;
          quotaUsed = googleResult.quotaUsed;
          break;

        default:
          // 自动选择最佳方法
          const bestResult = await this.searchWithBestMethod(query, channelId, maxResults, includeFullContent);
          results = bestResult.results;
          quotaUsed = bestResult.quotaUsed;
      }

      const searchTime = Date.now() - startTime;

      const response: SearchResponse = {
        query,
        channel: channelId,
        method: searchMethod,
        results,
        totalResults: results.length,
        searchTime,
        cacheHit: false,
        quotaUsed,
      };

      // 缓存结果
      if (cacheResults && results.length > 0) {
        this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
      }

      console.log(`[HybridSearch] Found ${results.length} results in ${searchTime}ms using ${searchMethod}`);

      return response;
    } catch (error: any) {
      console.error(`[HybridSearch] Error:`, error.message);

      // 失败时回退到Google
      if (fallbackToGoogle) {
        console.log(`[HybridSearch] Falling back to Google search`);
        const googleResult = await this.searchWithGoogle(query, channelId, maxResults);
        return {
          query,
          channel: channelId,
          method: SearchMethod.GOOGLE,
          results: googleResult.results,
          totalResults: googleResult.results.length,
          searchTime: Date.now() - startTime,
          cacheHit: false,
          quotaUsed: googleResult.quotaUsed,
        };
      }

      throw error;
    }
  }

  /**
   * 使用最佳方法搜索
   */
  private async searchWithBestMethod(
    query: string,
    channelId: string,
    maxResults: number,
    includeFullContent: boolean
  ): Promise<{ results: SearchResultItem[]; quotaUsed: number }> {
    const capability = this.channelCapabilities[channelId];

    // 尝试API
    if (capability.primaryMethod === SearchMethod.API) {
      try {
        return await this.searchWithAPI(query, channelId, maxResults);
      } catch (error) {
        console.log(`[HybridSearch] API unavailable, trying crawler`);
      }
    }

    // 尝试爬虫
    if (capability.primaryMethod === SearchMethod.CRAWLER || capability.secondaryMethod === SearchMethod.CRAWLER) {
      try {
        const results = await this.searchWithCrawler(query, channelId, maxResults, includeFullContent);
        if (results.length > 0) {
          return { results, quotaUsed: 0 };
        }
      } catch (error) {
        console.log(`[HybridSearch] Crawler failed, trying Google`);
      }
    }

    // 最后回退到Google
    return await this.searchWithGoogle(query, channelId, maxResults);
  }

  /**
   * 使用官方API搜索
   */
  private async searchWithAPI(
    query: string,
    channelId: string,
    maxResults: number
  ): Promise<{ results: SearchResultItem[]; quotaUsed: number }> {
    switch (channelId) {
      case 'youtube_search':
        return await youtubeApiService.search(query, maxResults);

      case 'reddit_search':
        return await redditApiService.search(query, maxResults);

      default:
        throw new Error(`No API available for channel: ${channelId}`);
    }
  }

  /**
   * 使用爬虫搜索
   */
  private async searchWithCrawler(
    query: string,
    channelId: string,
    maxResults: number,
    includeFullContent: boolean
  ): Promise<SearchResultItem[]> {
    return await puppeteerSearchService.search(query, channelId, maxResults, includeFullContent);
  }

  /**
   * 使用Google搜索
   */
  private async searchWithGoogle(
    query: string,
    channelId: string,
    maxResults: number
  ): Promise<{ results: SearchResultItem[]; quotaUsed: number }> {
    // 构建site查询
    const siteMap: Record<string, string> = {
      'youtube_search': 'youtube.com',
      'tiktok_search': 'tiktok.com',
      'instagram_search': 'instagram.com',
      'linkedin_search': 'linkedin.com',
      'twitter_search': 'twitter.com',
      'pinterest_search': 'pinterest.com',
      'reddit_search': 'reddit.com',
      'medium_search': 'medium.com',
      'quora_search': 'quora.com',
      'stack_overflow': 'stackoverflow.com',
      'amazon_search': 'amazon.com',
      'ebay_search': 'ebay.com',
      'techcrunch_search': 'techcrunch.com',
    };

    const site = siteMap[channelId];
    const searchQuery = site ? `site:${site} ${query}` : query;

    const response = await googleSearchService.search({ q: searchQuery, num: maxResults });

    const results: SearchResultItem[] = (response.items || []).map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'google',
      method: SearchMethod.GOOGLE,
    }));

    return { results, quotaUsed: 1 };
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(query: string, channel: string, maxResults: number): string {
    return `${channel}:${query}:${maxResults}`;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 导出单例
export const hybridSearchService = new HybridSearchService();
