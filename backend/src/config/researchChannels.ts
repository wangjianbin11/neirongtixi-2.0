/**
 * 调研渠道配置
 * 定义关键词调研和话题调研使用的渠道列表
 */

// 渠道类型
export type ChannelType = 'search' | 'social' | 'ecommerce' | 'forum' | 'qa' | 'news';

// 渠道接口
export interface ResearchChannel {
  id: string;
  name: string;
  nameEn: string;
  type: ChannelType;
  enabled: boolean;
  priority: number; // 调研优先级，数字越小越优先
  batchSize: number; // 每批次处理的数量
  description: string;
}

/**
 * 关键词调研渠道 (10+)
 * 用于关键词深度分析和竞品研究
 */
export const KEYWORD_RESEARCH_CHANNELS: ResearchChannel[] = [
  // 可访问的搜索引擎（优先使用）
  {
    id: 'bing_search',
    name: 'Bing搜索',
    nameEn: 'Bing Search',
    type: 'search',
    enabled: true,
    priority: 1,
    batchSize: 10,
    description: 'Bing搜索引擎结果分析'
  },
  // 社交媒体爬虫（不需要Google API）
  {
    id: 'tiktok_search',
    name: 'TikTok搜索',
    nameEn: 'TikTok Search',
    type: 'social',
    enabled: true,
    priority: 3,
    batchSize: 10,
    description: 'TikTok短视频内容分析'
  },
  {
    id: 'pinterest_search',
    name: 'Pinterest搜索',
    nameEn: 'Pinterest Search',
    type: 'social',
    enabled: true,
    priority: 4,
    batchSize: 8,
    description: 'Pinterest图片内容分析'
  },
  {
    id: 'linkedin_search',
    name: 'LinkedIn搜索',
    nameEn: 'LinkedIn Search',
    type: 'social',
    enabled: true,
    priority: 5,
    batchSize: 8,
    description: 'LinkedIn专业内容分析'
  },
  {
    id: 'reddit_search',
    name: 'Reddit搜索',
    nameEn: 'Reddit Search',
    type: 'forum',
    enabled: true,
    priority: 6,
    batchSize: 8,
    description: 'Reddit社区讨论分析'
  },
  {
    id: 'quora_search',
    name: 'Quora问答',
    nameEn: 'Quora Q&A',
    type: 'qa',
    enabled: true,
    priority: 7,
    batchSize: 8,
    description: 'Quora问答平台分析'
  },
  // 电商平台爬虫
  {
    id: 'amazon_search',
    name: 'Amazon搜索',
    nameEn: 'Amazon Search',
    type: 'ecommerce',
    enabled: true,
    priority: 8,
    batchSize: 10,
    description: 'Amazon商品搜索分析'
  },
  // Google相关渠道
  {
    id: 'google_search',
    name: 'Google搜索',
    nameEn: 'Google Search',
    type: 'search',
    enabled: true,
    priority: 1,
    batchSize: 10,
    description: 'Google搜索引擎结果分析'
  },
  {
    id: 'google_trends',
    name: 'Google趋势',
    nameEn: 'Google Trends',
    type: 'search',
    enabled: true,
    priority: 2,
    batchSize: 5,
    description: 'Google搜索趋势数据分析'
  },
  {
    id: 'google_suggest',
    name: 'Google推荐词',
    nameEn: 'Google Suggestions',
    type: 'search',
    enabled: true,
    priority: 3,
    batchSize: 10,
    description: 'Google自动推荐和相关搜索'
  },
  {
    id: 'youtube_search',
    name: 'YouTube搜索',
    nameEn: 'YouTube Search',
    type: 'search',
    enabled: true,
    priority: 4,
    batchSize: 10,
    description: 'YouTube视频内容分析'
  }
];

/**
 * 话题调研渠道 (20+)
 * 用于话题深度内容研究和素材收集
 */
export const TOPIC_RESEARCH_CHANNELS: ResearchChannel[] = [
  // 搜索引擎 (4个)
  {
    id: 'google_search',
    name: 'Google搜索',
    nameEn: 'Google Search',
    type: 'search',
    enabled: true,
    priority: 1,
    batchSize: 15,
    description: 'Google搜索引擎深度结果'
  },
  {
    id: 'bing_search',
    name: 'Bing搜索',
    nameEn: 'Bing Search',
    type: 'search',
    enabled: true,
    priority: 2,
    batchSize: 12,
    description: 'Bing搜索引擎结果'
  },
  {
    id: 'duckduckgo_search',
    name: 'DuckDuckGo搜索',
    nameEn: 'DuckDuckGo Search',
    type: 'search',
    enabled: true,
    priority: 4,
    batchSize: 10,
    description: 'DuckDuckGo隐私搜索结果'
  },
  // 社交媒体 (6个)
  {
    id: 'youtube_search',
    name: 'YouTube',
    nameEn: 'YouTube',
    type: 'social',
    enabled: true,
    priority: 5,
    batchSize: 15,
    description: 'YouTube视频内容分析'
  },
  {
    id: 'tiktok_search',
    name: 'TikTok',
    nameEn: 'TikTok',
    type: 'social',
    enabled: true,
    priority: 6,
    batchSize: 15,
    description: 'TikTok短视频内容'
  },
  {
    id: 'instagram_search',
    name: 'Instagram',
    nameEn: 'Instagram',
    type: 'social',
    enabled: true,
    priority: 7,
    batchSize: 12,
    description: 'Instagram图片/视频内容'
  },
  {
    id: 'linkedin_search',
    name: 'LinkedIn',
    nameEn: 'LinkedIn',
    type: 'social',
    enabled: true,
    priority: 8,
    batchSize: 10,
    description: 'LinkedIn专业文章'
  },
  {
    id: 'twitter_search',
    name: 'Twitter/X',
    nameEn: 'Twitter/X',
    type: 'social',
    enabled: true,
    priority: 9,
    batchSize: 15,
    description: 'Twitter推文内容'
  },
  {
    id: 'pinterest_search',
    name: 'Pinterest',
    nameEn: 'Pinterest',
    type: 'social',
    enabled: true,
    priority: 10,
    batchSize: 12,
    description: 'Pinterest图pin内容'
  },
  // 电商平台 (3个)
  {
    id: 'amazon_search',
    name: 'Amazon',
    nameEn: 'Amazon',
    type: 'ecommerce',
    enabled: true,
    priority: 11,
    batchSize: 15,
    description: 'Amazon商品和评论'
  },
  {
    id: 'ebay_search',
    name: 'eBay',
    nameEn: 'eBay',
    type: 'ecommerce',
    enabled: true,
    priority: 12,
    batchSize: 12,
    description: 'eBay商品信息'
  },
  {
    id: 'shopify_search',
    name: 'Shopify店铺',
    nameEn: 'Shopify Stores',
    type: 'ecommerce',
    enabled: true,
    priority: 13,
    batchSize: 10,
    description: 'Shopify独立店铺分析'
  },
  // 论坛社区 (5个)
  {
    id: 'reddit_search',
    name: 'Reddit',
    nameEn: 'Reddit',
    type: 'forum',
    enabled: true,
    priority: 14,
    batchSize: 12,
    description: 'Reddit社区讨论'
  },
  {
    id: 'quora_search',
    name: 'Quora',
    nameEn: 'Quora',
    type: 'qa',
    enabled: true,
    priority: 15,
    batchSize: 12,
    description: 'Quora问答内容'
  },
  {
    id: 'stack_overflow',
    name: 'Stack Overflow',
    nameEn: 'Stack Overflow',
    type: 'qa',
    enabled: true,
    priority: 16,
    batchSize: 10,
    description: 'Stack Overflow技术问答'
  },
  {
    id: 'medium_search',
    name: 'Medium',
    nameEn: 'Medium',
    type: 'forum',
    enabled: true,
    priority: 17,
    batchSize: 10,
    description: 'Medium深度文章'
  },
  {
    id: 'discord_search',
    name: 'Discord',
    nameEn: 'Discord',
    type: 'forum',
    enabled: true,
    priority: 18,
    batchSize: 8,
    description: 'Discord社群讨论'
  },
  // 新闻媒体 (2个)
  {
    id: 'google_news',
    name: 'Google新闻',
    nameEn: 'Google News',
    type: 'news',
    enabled: true,
    priority: 19,
    batchSize: 10,
    description: 'Google新闻聚合'
  },
  {
    id: 'techcrunch_search',
    name: 'TechCrunch',
    nameEn: 'TechCrunch',
    type: 'news',
    enabled: true,
    priority: 20,
    batchSize: 8,
    description: 'TechCrunch科技新闻'
  }
];

/**
 * 根据类型获取渠道
 */
export function getChannelsByType(
  channels: ResearchChannel[],
  type: ChannelType
): ResearchChannel[] {
  return channels.filter(ch => ch.type === type && ch.enabled);
}

/**
 * 获取启用的渠道
 */
export function getEnabledChannels(channels: ResearchChannel[]): ResearchChannel[] {
  return channels.filter(ch => ch.enabled).sort((a, b) => a.priority - b.priority);
}

/**
 * 分批获取渠道（用于分批次调研）
 */
export function getChannelBatches(
  channels: ResearchChannel[],
  batchSize: number = 5
): ResearchChannel[][] {
  const enabledChannels = getEnabledChannels(channels);
  const batches: ResearchChannel[][] = [];

  for (let i = 0; i < enabledChannels.length; i += batchSize) {
    batches.push(enabledChannels.slice(i, i + batchSize));
  }

  return batches;
}
