import axios from 'axios';
import { config } from '../config';
import { SearchMethod, SearchResultItem } from './hybridSearchService';

/**
 * Reddit API 基础URL
 * Reddit使用公开API，不需要API key，但建议使用app注册
 */
const REDDIT_API_BASE = 'https://www.reddit.com';
const REDDIT_OAUTH_BASE = 'https://www.reddit.com';

/**
 * Reddit 帖子数据
 */
interface RedditPost {
  kind: string;
  data: {
    id: string;
    title: string;
    author: string;
    subreddit: string;
    selftext: string;
    url: string;
    permalink: string;
    created_utc: number;
    ups: number;
    downvotes: number;
    num_comments: number;
    score: number;
    over_18: boolean;
    is_self: boolean;
    thumbnail: string;
    link_flair_text?: string;
  };
}

/**
 * Reddit 搜索响应
 */
interface RedditSearchResponse {
  kind: string;
  data: {
    modhash: string;
    dist: number;
    children: RedditPost[];
    after?: string;
    before?: string;
  };
}

/**
 * Reddit 子reddit信息
 */
interface RedditSubredditInfo {
  kind: string;
  data: {
    subscribers: number;
    active_user_count: number;
    over18: boolean;
    title: string;
    public_description: string;
  };
}

/**
 * Reddit API 服务
 */
export class RedditApiService {
  private appId: string;
  private appSecret: string;
  private userAgent: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private enabled: boolean;

  constructor() {
    this.appId = config.reddit?.appId || '';
    this.appSecret = config.reddit?.appSecret || '';
    this.userAgent = config.reddit?.userAgent || 'ContentResearchSystem/1.0';

    // Reddit公开API不需要认证，但有限制
    this.enabled = true;

    console.log('[Reddit API] Initialized (public API mode)');
  }

  /**
   * 获取访问令牌（如果配置了app credentials）
   */
  private async getAccessToken(): Promise<string> {
    // 如果没有配置credentials，返回空（使用公开API）
    if (!this.appId || !this.appSecret) {
      return '';
    }

    // 检查现有token是否有效
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64');

      const response = await axios.post(
        `${REDDIT_OAUTH_BASE}/api/v1/access_token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.userAgent,
          },
          timeout: 10000,
        }
      );

      this.accessToken = response.data.access_token || '';
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken || '';
    } catch (error) {
      console.error('[Reddit API] Failed to get access token, using public API');
      return '';
    }
  }

  /**
   * 搜索帖子
   */
  async search(
    query: string,
    maxResults: number = 25,
    subreddit?: string
  ): Promise<{ results: SearchResultItem[]; quotaUsed: number }> {
    console.log(`[Reddit API] Searching: "${query}"${subreddit ? ` in r/${subreddit}` : ''}`);

    try {
      const token = await this.getAccessToken();

      // 构建搜索URL
      let searchPath = '/search.json';
      const params: Record<string, string> = {
        q: query,
        limit: Math.min(maxResults, 100).toString(),
        sort: 'relevance',
        t: 'all', // 时间范围: all, day, hour, month, week, year
      };

      // 如果指定了subreddit
      if (subreddit) {
        searchPath = `/r/${subreddit}/search.json`;
        params.restrict_sr = 'true';
      }

      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get<RedditSearchResponse>(
        `${REDDIT_API_BASE}${searchPath}`,
        {
          params,
          headers,
          timeout: 30000,
        }
      );

      if (!response.data.data.children || response.data.data.children.length === 0) {
        return { results: [], quotaUsed: 0 };
      }

      // 转换为统一格式
      const results: SearchResultItem[] = response.data.data.children
        .filter(post => !post.data.over_18) // 过滤NSFW内容
        .map(post => {
          const data = post.data;
          const url = data.url.startsWith('http') ? data.url : `${REDDIT_API_BASE}${data.url}`;
          const permalink = `${REDDIT_API_BASE}${data.permalink}`;

          return {
            title: data.title,
            url: permalink,
            snippet: data.selftext || url,
            source: 'reddit_api',
            method: SearchMethod.API,
            publishedAt: new Date(data.created_utc * 1000).toISOString(),
            author: data.author,
            metrics: {
              views: undefined,
              likes: data.ups,
              comments: data.num_comments,
              shares: data.score,
            },
            thumbnail: data.thumbnail && data.thumbnail !== 'self' && data.thumbnail !== 'default'
              ? data.thumbnail
              : undefined,
            tags: data.link_flair_text ? [data.link_flair_text] : undefined,
          };
        });

      console.log(`[Reddit API] Found ${results.length} posts`);

      return { results, quotaUsed: token ? 1 : 0 };
    } catch (error: any) {
      console.error('[Reddit API] Error:', error.response?.data || error.message);

      if (error.response?.status === 429) {
        throw new Error('Reddit API rate limit exceeded. Please try again later.');
      }

      throw error;
    }
  }

  /**
   * 获取帖子详情和评论
   */
  async getPostDetails(postId: string): Promise<{ post: any; comments: any[] }> {
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 获取帖子信息和评论
    const response = await axios.get(
      `${REDDIT_API_BASE}/comments/${postId}.json`,
      {
        headers,
        timeout: 30000,
      }
    );

    const post = response.data[0]?.data?.children[0]?.data;
    const comments = response.data[1]?.data?.children?.map((c: any) => c.data) || [];

    return { post, comments };
  }

  /**
   * 获取热门帖子
   */
  async getHot(
    subreddit: string = 'all',
    limit: number = 25
  ): Promise<SearchResultItem[]> {
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get(
      `${REDDIT_API_BASE}/r/${subreddit}/hot.json`,
      {
        params: { limit: Math.min(limit, 100) },
        headers,
        timeout: 30000,
      }
    );

    return response.data.data.children.map((item: RedditPost) => {
      const data = item.data;
      return {
        title: data.title,
        url: `${REDDIT_API_BASE}${data.permalink}`,
        snippet: data.selftext || data.url,
        source: 'reddit_api',
        method: SearchMethod.API,
        publishedAt: new Date(data.created_utc * 1000).toISOString(),
        author: data.author,
        metrics: {
          likes: data.ups,
          comments: data.num_comments,
        },
      };
    });
  }

  /**
   * 获取subreddit信息
   */
  async getSubredditInfo(subreddit: string): Promise<any> {
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get<RedditSubredditInfo>(
      `${REDDIT_API_BASE}/r/${subreddit}/about.json`,
      {
        headers,
        timeout: 10000,
      }
    );

    return response.data.data;
  }

  /**
   * 搜索多个subreddit
   */
  async searchMultipleSubreddits(
    query: string,
    subreddits: string[],
    maxResultsPerSubreddit: number = 10
  ): Promise<SearchResultItem[]> {
    const allResults: SearchResultItem[] = [];

    // 并行搜索多个subreddit
    const results = await Promise.allSettled(
      subreddits.map(sub =>
        this.search(query, maxResultsPerSubreddit, sub).then(r => r.results)
      )
    );

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    });

    // 按score排序
    allResults.sort((a, b) => (b.metrics?.shares || 0) - (a.metrics?.shares || 0));

    return allResults;
  }

  /**
   * 检查API是否可用
   */
  isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * 获取推荐subreddit列表
   */
  async getRecommendedSubreddits(query: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${REDDIT_API_BASE}/subreddits/search.json`,
        {
          params: { q: query, limit: 10 },
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000,
        }
      );

      return response.data.data.children.map((item: any) => item.data.display_name);
    } catch (error) {
      console.error('[Reddit API] Failed to get recommended subreddits');
      return [];
    }
  }

  /**
   * 获取热门subreddit列表
   */
  async getPopularSubreddits(limit: number = 50): Promise<Array<{name: string; subscribers: number}>> {
    try {
      const token = await this.getAccessToken();

      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(
        `${REDDIT_API_BASE}/subreddits/popular.json`,
        {
          params: { limit: Math.min(limit, 100) },
          headers,
          timeout: 15000,
        }
      );

      return response.data.data.children.map((item: any) => ({
        name: item.data.display_name,
        subscribers: item.data.subscribers,
      }));
    } catch (error) {
      console.error('[Reddit API] Failed to get popular subreddits');
      return [];
    }
  }
}

// 导出单例
export const redditApiService = new RedditApiService();
