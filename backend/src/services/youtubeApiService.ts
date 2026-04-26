import axios from 'axios';
import { config } from '../config';
import { SearchMethod, SearchResultItem } from './hybridSearchService';

/**
 * YouTube API 配置
 */
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * YouTube 视频搜索结果
 */
interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeSearchItem[];
}

/**
 * YouTube 搜索项
 */
interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

/**
 * YouTube 视频详情响应
 */
interface YouTubeVideoResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeVideoItem[];
}

/**
 * YouTube 视频详情项
 */
interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: string;
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    favoriteCount: string;
  };
  contentDetails?: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
  };
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: any;
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    defaultLanguage?: string;
  };
}

/**
 * YouTube API 服务
 */
export class YouTubeApiService {
  private apiKey: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = config.youtube?.apiKey || '';
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      console.warn('[YouTube API] No API key configured. Set YOUTUBE_API_KEY in .env');
    } else {
      console.log('[YouTube API] Initialized');
    }
  }

  /**
   * 搜索视频
   */
  async search(query: string, maxResults: number = 15): Promise<{ results: SearchResultItem[]; quotaUsed: number }> {
    if (!this.enabled) {
      throw new Error('YouTube API is not configured');
    }

    console.log(`[YouTube API] Searching: "${query}"`);

    try {
      // 搜索视频
      const searchUrl = `${YOUTUBE_API_BASE}/search`;
      const searchResponse = await axios.get<YouTubeSearchResponse>(searchUrl, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: Math.min(maxResults, 50),
          order: 'relevance',
        },
        timeout: 30000,
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return { results: [], quotaUsed: 100 };
      }

      // 获取视频ID列表
      const videoIds = searchResponse.data.items
        .map(item => item.id?.videoId)
        .filter(Boolean)
        .join(',');

      // 获取视频详情（包含统计数据）
      const videosResponse = await axios.get<YouTubeVideoResponse>(
        `${YOUTUBE_API_BASE}/videos`,
        {
          params: {
            key: this.apiKey,
            part: 'statistics,contentDetails,snippet',
            id: videoIds,
          },
          timeout: 30000,
        }
      );

      // 创建视频详情映射
      const videosMap = new Map<string, YouTubeVideoItem>();
      videosResponse.data.items?.forEach(video => {
        videosMap.set(video.id, video);
      });

      // 转换为统一格式
      const results: SearchResultItem[] = searchResponse.data.items.map(item => {
        const videoId = item.id?.videoId || '';
        const video = videosMap.get(videoId);
        const stats = video?.statistics;
        const details = video?.contentDetails;

        return {
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          snippet: item.snippet.description,
          source: 'youtube_api',
          method: SearchMethod.API,
          publishedAt: item.snippet.publishedAt,
          author: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.high?.url ||
                    item.snippet.thumbnails?.medium?.url ||
                    item.snippet.thumbnails?.default?.url,
          tags: video?.snippet?.tags,
          metrics: stats ? {
            views: parseInt(stats.viewCount) || 0,
            likes: parseInt(stats.likeCount) || 0,
            comments: parseInt(stats.commentCount) || 0,
          } : undefined,
        };
      });

      // 按观看量排序
      results.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));

      console.log(`[YouTube API] Found ${results.length} videos`);

      return { results, quotaUsed: 100 };
    } catch (error: any) {
      console.error('[YouTube API] Error:', error.response?.data || error.message);

      if (error.response?.status === 403) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      }

      throw error;
    }
  }

  /**
   * 获取频道信息
   */
  async getChannel(channelId: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('YouTube API is not configured');
    }

    const url = `${YOUTUBE_API_BASE}/channels`;
    const response = await axios.get(url, {
      params: {
        key: this.apiKey,
        part: 'snippet,statistics',
        id: channelId,
      },
      timeout: 30000,
    });

    return response.data;
  }

  /**
   * 获取视频评论
   */
  async getComments(videoId: string, maxResults: number = 20): Promise<string[]> {
    if (!this.enabled) {
      throw new Error('YouTube API is not configured');
    }

    const url = `${YOUTUBE_API_BASE}/commentThreads`;
    const response = await axios.get(url, {
      params: {
        key: this.apiKey,
        part: 'snippet',
        videoId: videoId,
        maxResults: Math.min(maxResults, 100),
        order: 'relevance',
      },
      timeout: 30000,
    });

    return response.data.items?.map((item: any) => {
      return item.snippet?.topLevelComment?.snippet?.textDisplay || '';
    }) || [];
  }

  /**
   * 搜索频道
   */
  async searchChannels(query: string, maxResults: number = 10): Promise<any[]> {
    if (!this.enabled) {
      throw new Error('YouTube API is not configured');
    }

    const url = `${YOUTUBE_API_BASE}/search`;
    const response = await axios.get(url, {
      params: {
        key: this.apiKey,
        part: 'snippet',
        q: query,
        type: 'channel',
        maxResults: Math.min(maxResults, 50),
      },
      timeout: 30000,
    });

    return response.data.items || [];
  }

  /**
   * 获取热门视频
   */
  async getTrending(regionCode: string = 'US', maxResults: number = 10): Promise<SearchResultItem[]> {
    if (!this.enabled) {
      throw new Error('YouTube API is not configured');
    }

    const url = `${YOUTUBE_API_BASE}/videos`;
    const response = await axios.get<YouTubeVideoResponse>(url, {
      params: {
        key: this.apiKey,
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode,
        maxResults: Math.min(maxResults, 50),
      },
      timeout: 30000,
    });

    return response.data.items?.map(item => ({
      title: item.snippet?.title || '',
      url: `https://www.youtube.com/watch?v=${item.id}`,
      snippet: item.snippet?.description || '',
      source: 'youtube_api',
      method: SearchMethod.API,
      publishedAt: item.snippet?.publishedAt,
      author: item.snippet?.channelTitle,
      thumbnail: item.snippet?.thumbnails?.high?.url,
      metrics: item.statistics ? {
        views: parseInt(item.statistics.viewCount) || 0,
        likes: parseInt(item.statistics.likeCount) || 0,
        comments: parseInt(item.statistics.commentCount) || 0,
      } : undefined,
    })) || [];
  }

  /**
   * 检查API是否可用
   */
  isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * 获取剩余配额估算
   * 注意：YouTube API每天10000个单位配额
   */
  getQuotaEstimate(): { used: number; remaining: number; resetIn: string } {
    // 这里只能估算，实际需要从API响应中获取
    const dailyQuota = 10000;
    return {
      used: 0,
      remaining: dailyQuota,
      resetIn: new Date(Date.now() + 86400000).toISOString(),
    };
  }
}

// 导出单例
export const youtubeApiService = new YouTubeApiService();
