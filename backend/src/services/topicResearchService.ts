import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, update } from '../utils/db';
import { googleSearchService } from './googleSearchService';
import { knowledgeSearchService } from './knowledgeSearchService';
import { hybridSearchService } from './hybridSearchService';
import { TOPIC_RESEARCH_CHANNELS, getChannelBatches, ResearchChannel } from '../config/researchChannels';

// 调研结果接口
export interface ResearchResult {
  channel_id: string;
  channel_name: string;
  channel_name_en: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_count: number;
  results: any[];
  error?: string;
  started_at?: string;
  completed_at?: string;
}

// 话题调研任务接口
export interface TopicResearchTask {
  id: string;
  topic_id: string;
  topic_title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  current_batch: number;
  total_batches: number;
  results: ResearchResult[];
  knowledge_searched: boolean;
  knowledge_results?: any[];
  platform_candidates?: PlatformCandidate[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// 调研进度接口
export interface TopicResearchProgress {
  task_id: string;
  topic: string;
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

// 平台候选接口
export interface PlatformCandidate {
  platform: string;
  platform_name: string;
  suitability_score: number; // 0-100
  reasons: string[];
  content_suggestions: string[];
  estimated_effort: 'low' | 'medium' | 'high';
  competition_level: 'low' | 'medium' | 'high';
}

/**
 * 话题调研服务
 * 实现20+渠道分批次调研功能
 */
export class TopicResearchService {
  /**
   * 创建调研任务
   */
  async createTask(topicId: string, topicTitle: string): Promise<TopicResearchTask> {
    const id = uuidv4();
    const channels = TOPIC_RESEARCH_CHANNELS;
    const batches = getChannelBatches(channels, 5); // 每批5个渠道

    // 初始化调研结果
    const results: ResearchResult[] = channels.map(ch => ({
      channel_id: ch.id,
      channel_name: ch.name,
      channel_name_en: ch.nameEn,
      status: 'pending',
      result_count: 0,
      results: [],
    }));

    await query(
      `INSERT INTO topic_research_tasks (id, topic_id, topic_title, status, current_batch, total_batches, results, knowledge_searched, platform_candidates, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        topicId,
        topicTitle,
        'pending',
        0,
        batches.length,
        JSON.stringify(results),
        false,
        JSON.stringify([]),
      ]
    );

    const task = await this.getTaskById(id);
    return task!;
  }

  /**
   * 获取任务详情
   */
  async getTaskById(taskId: string): Promise<TopicResearchTask | null> {
    const result = await queryOne<any>(
      'SELECT * FROM topic_research_tasks WHERE id = ?',
      [taskId]
    );

    if (!result) return null;

    return {
      ...result,
      results: typeof result.results === 'string' ? JSON.parse(result.results || '[]') : (result.results || []),
      knowledge_results: result.knowledge_results ? (typeof result.knowledge_results === 'string' ? JSON.parse(result.knowledge_results) : result.knowledge_results) : null,
      platform_candidates: result.platform_candidates ? (typeof result.platform_candidates === 'string' ? JSON.parse(result.platform_candidates) : result.platform_candidates) : [],
    };
  }

  /**
   * 根据话题ID获取最新任务
   */
  async getLatestTaskByTopicId(topicId: string): Promise<TopicResearchTask | null> {
    const result = await queryOne<any>(
      'SELECT * FROM topic_research_tasks WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1',
      [topicId]
    );

    if (!result) return null;

    return {
      ...result,
      results: typeof result.results === 'string' ? JSON.parse(result.results || '[]') : (result.results || []),
      knowledge_results: result.knowledge_results ? (typeof result.knowledge_results === 'string' ? JSON.parse(result.knowledge_results) : result.knowledge_results) : null,
      platform_candidates: result.platform_candidates ? (typeof result.platform_candidates === 'string' ? JSON.parse(result.platform_candidates) : result.platform_candidates) : [],
    };
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, updates: Partial<TopicResearchTask>): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'results' || key === 'knowledge_results' || key === 'platform_candidates') {
        updateFields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    updateFields.push('updated_at = NOW()');
    values.push(taskId);

    await query(
      `UPDATE topic_research_tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 更新单个渠道的调研结果
   */
  async updateChannelResult(
    taskId: string,
    channelId: string,
    result: Partial<ResearchResult>
  ): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) return;

    const channelResults = task.results.map(r => {
      if (r.channel_id === channelId) {
        return { ...r, ...result };
      }
      return r;
    });

    await this.updateTaskStatus(taskId, { results: channelResults });
  }

  /**
   * 执行调研任务
   */
  async executeTask(taskId: string, onProgress?: (progress: TopicResearchProgress) => void): Promise<TopicResearchTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 更新状态为进行中
    await this.updateTaskStatus(taskId, { status: 'in_progress' });

    const channels = TOPIC_RESEARCH_CHANNELS;
    const batches = getChannelBatches(channels, 5);

    let completedCount = 0;
    const totalCount = channels.length;

    try {
      // 分批次执行调研
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        // 并行执行当前批次的渠道
        await Promise.all(
          batch.map(channel => this.processChannel(taskId, channel, task.topic_title))
        );

        completedCount += batch.length;

        // 更新进度
        await this.updateTaskStatus(taskId, {
          current_batch: batchIndex + 1,
        });

        // 通知进度
        if (onProgress) {
          const progress = this.calculateProgress(task, completedCount, totalCount);
          onProgress(progress);
        }
      }

      // 所有渠道完成，搜索知识库
      await this.searchKnowledge(taskId, task.topic_title);

      // 生成平台候选列表
      const platformCandidates = await this.generatePlatformCandidates(task);
      await this.updateTaskStatus(taskId, { platform_candidates: platformCandidates });

      // 标记任务完成
      await this.updateTaskStatus(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      const completedTask = await this.getTaskById(taskId);
      if (!completedTask) {
        throw new Error('Failed to retrieve completed task');
      }
      return completedTask;
    } catch (error: any) {
      // 标记任务失败
      await this.updateTaskStatus(taskId, {
        status: 'failed',
      });
      throw error;
    }
  }

  /**
   * 处理单个渠道的调研
   */
  private async processChannel(
    taskId: string,
    channel: ResearchChannel,
    topicTitle: string
  ): Promise<void> {
    try {
      // 更新状态为处理中
      await this.updateChannelResult(taskId, channel.id, {
        status: 'processing',
        started_at: new Date().toISOString(),
      });

      // 使用混合搜索服务
      const searchResponse = await hybridSearchService.search(topicTitle, channel.id, {
        maxResults: 15,
        includeFullContent: false,
        cacheResults: true,
      });

      const results = searchResponse.results;
      const resultCount = results.length;

      // 记录搜索方法用于调试
      console.log(`[TopicResearch] Channel ${channel.name} used ${searchResponse.method} (${resultCount} results)`);

      // 保存结果
      await this.updateChannelResult(taskId, channel.id, {
        status: 'completed',
        result_count: resultCount,
        results,
        completed_at: new Date().toISOString(),
      });
    } catch (error: any) {
      // 标记失败
      console.error(`[TopicResearch] Channel ${channel.name} failed:`, error.message);
      await this.updateChannelResult(taskId, channel.id, {
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      });
    }
  }

  /**
   * 搜索引擎类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchEngines(topic: string, channelId: string): Promise<any[]> {
    switch (channelId) {
      case 'google_search':
        const response1 = await googleSearchService.search({ q: topic, num: 15 });
        return response1.items || [];
      case 'bing_search':
        const response2 = await googleSearchService.search({ q: topic, num: 12 });
        return response2.items || [];
      case 'baidu_search':
        const response3 = await googleSearchService.search({ q: topic, num: 12 });
        return response3.items || [];
      case 'duckduckgo_search':
        // DuckDuckGo 暂用 Google 代替
        const response4 = await googleSearchService.search({ q: topic, num: 10 });
        return response4.items || [];
      default:
        const response5 = await googleSearchService.search({ q: topic, num: 15 });
        return response5.items || [];
    }
  }

  /**
   * 社交媒体类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchSocial(topic: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'youtube_search': 'youtube.com',
      'tiktok_search': 'tiktok.com',
      'instagram_search': 'instagram.com',
      'linkedin_search': 'linkedin.com',
      'twitter_search': 'twitter.com',
      'pinterest_search': 'pinterest.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${topic}`, num: 15 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 电商类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchEcommerce(topic: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'amazon_search': 'amazon.com',
      'ebay_search': 'ebay.com',
      'shopify_search': 'myshopify.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${topic}`, num: 15 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 论坛类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchForum(topic: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'reddit_search': 'reddit.com',
      'medium_search': 'medium.com',
      'discord_search': 'discord.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${topic}`, num: 12 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 问答类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchQA(topic: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'quora_search': 'quora.com',
      'stack_overflow': 'stackoverflow.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${topic}`, num: 12 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 新闻类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchNews(topic: string, channelId: string): Promise<any[]> {
    switch (channelId) {
      case 'google_news':
        const response1 = await googleSearchService.search({ q: topic + ' news', num: 10 });
        return response1.items || [];
      case 'techcrunch_search':
        const response2 = await googleSearchService.search({ q: `site:techcrunch.com ${topic}`, num: 8 });
        return response2.items || [];
      default:
        const response3 = await googleSearchService.search({ q: topic + ' news', num: 10 });
        return response3.items || [];
    }
  }

  /**
   * 通用搜索 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchGeneric(topic: string, channelId: string): Promise<any[]> {
    const response = await googleSearchService.search({ q: topic, num: 15 });
    return response.items || [];
  }

  /**
   * 搜索知识库
   */
  private async searchKnowledge(taskId: string, topic: string): Promise<void> {
    try {
      const results = await knowledgeSearchService.semanticSearch(topic, {
        limit: 30,
      });

      await this.updateTaskStatus(taskId, {
        knowledge_searched: true,
        knowledge_results: results,
      });
    } catch (error) {
      console.error('Knowledge search failed:', error);
      // 知识库搜索失败不影响主任务
      await this.updateTaskStatus(taskId, {
        knowledge_searched: true,
        knowledge_results: [],
      });
    }
  }

  /**
   * 计算进度
   */
  private calculateProgress(
    task: TopicResearchTask,
    completedCount: number,
    totalCount: number
  ): TopicResearchProgress {
    const completedChannels = task.results.filter(r => r.status === 'completed');
    const currentChannel = task.results.find(r => r.status === 'processing');

    return {
      task_id: task.id,
      topic: task.topic_title,
      status: task.status,
      progress: Math.round((completedCount / totalCount) * 100),
      current_channel: currentChannel?.channel_name || '',
      completed_channels: completedCount,
      total_channels: totalCount,
      results_summary: {
        total_results: task.results.reduce((sum, r) => sum + r.result_count, 0),
        by_channel: task.results.reduce((acc, r) => {
          acc[r.channel_name] = r.result_count;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  /**
   * 获取调研进度
   */
  async getProgress(taskId: string): Promise<TopicResearchProgress | null> {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const completedCount = task.results.filter(r => r.status === 'completed').length;
    const totalCount = task.results.length;

    return this.calculateProgress(task, completedCount, totalCount);
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, {
      status: 'cancelled',
    });
  }

  /**
   * 生成平台候选列表
   * 基于调研结果分析适合发布的内容平台
   */
  private async generatePlatformCandidates(task: TopicResearchTask): Promise<PlatformCandidate[]> {
    const candidates: PlatformCandidate[] = [];
    const allResults = task.results.flatMap(r => r.results);

    // 分析各平台的结果数量和质量
    const platformScores: Record<string, { count: number; quality: number }> = {};

    for (const result of task.results) {
      const platform = this.mapChannelToPlatform(result.channel_id);
      if (!platform) continue;

      if (!platformScores[platform]) {
        platformScores[platform] = { count: 0, quality: 0 };
      }

      platformScores[platform].count += result.result_count;
      // 根据结果数量计算质量分数
      platformScores[platform].quality += Math.min(result.result_count * 2, 20);
    }

    // 生成候选平台
    const platforms = [
      {
        id: 'youtube',
        name: 'YouTube',
        channels: ['youtube_search'],
        contentTypes: ['视频脚本', '教程视频', '解说视频'],
      },
      {
        id: 'blog',
        name: '博客',
        channels: ['google_search', 'bing_search', 'medium_search'],
        contentTypes: ['深度文章', '教程指南', '案例分析'],
      },
      {
        id: 'twitter',
        name: 'Twitter/X',
        channels: ['twitter_search'],
        contentTypes: ['推文系列', '热点评论', '观点表达'],
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        channels: ['linkedin_search'],
        contentTypes: ['专业文章', '职场洞察', '行业分析'],
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        channels: ['tiktok_search'],
        contentTypes: ['短视频脚本', '快节奏内容', '热点追踪'],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        channels: ['instagram_search'],
        contentTypes: ['图片配文', '短视频', '轮播图内容'],
      },
      {
        id: 'pinterest',
        name: 'Pinterest',
        channels: ['pinterest_search'],
        contentTypes: ['图文教程', '灵感合集', '步骤指南'],
      },
      {
        id: 'reddit',
        name: 'Reddit',
        channels: ['reddit_search'],
        contentTypes: ['社区讨论', '问答内容', '深度分析'],
      },
      {
        id: 'quora',
        name: 'Quora',
        channels: ['quora_search'],
        contentTypes: ['问答文章', '知识分享', '专家解答'],
      },
    ];

    for (const platform of platforms) {
      const score = platformScores[platform.id];
      if (!score) continue;

      const suitabilityScore = Math.min(score.quality, 100);
      const competitionLevel = this.assessCompetition(platform.id, score.count);
      const estimatedEffort = this.assessEffort(platform.id);

      candidates.push({
        platform: platform.id,
        platform_name: platform.name,
        suitability_score: suitabilityScore,
        reasons: this.generateReasons(platform.id, score.count, task.topic_title),
        content_suggestions: platform.contentTypes,
        estimated_effort: estimatedEffort,
        competition_level: competitionLevel,
      });
    }

    // 按适配度排序
    candidates.sort((a, b) => b.suitability_score - a.suitability_score);

    return candidates.slice(0, 8); // 返回前8个最佳平台
  }

  /**
   * 将渠道ID映射到平台ID
   */
  private mapChannelToPlatform(channelId: string): string | null {
    const mapping: Record<string, string> = {
      'youtube_search': 'youtube',
      'tiktok_search': 'tiktok',
      'instagram_search': 'instagram',
      'linkedin_search': 'linkedin',
      'twitter_search': 'twitter',
      'pinterest_search': 'pinterest',
      'reddit_search': 'reddit',
      'quora_search': 'quora',
      'google_search': 'blog',
      'bing_search': 'blog',
      'medium_search': 'blog',
      'baidu_search': 'blog',
    };
    return mapping[channelId] || null;
  }

  /**
   * 评估竞争程度
   */
  private assessCompetition(platform: string, resultCount: number): 'low' | 'medium' | 'high' {
    if (resultCount < 50) return 'low';
    if (resultCount < 150) return 'medium';
    return 'high';
  }

  /**
   * 评估制作难度
   */
  private assessEffort(platform: string): 'low' | 'medium' | 'high' {
    const efforts: Record<string, 'low' | 'medium' | 'high'> = {
      'twitter': 'low',
      'instagram': 'low',
      'pinterest': 'medium',
      'linkedin': 'medium',
      'blog': 'high',
      'youtube': 'high',
      'tiktok': 'medium',
      'reddit': 'medium',
      'quora': 'medium',
    };
    return efforts[platform] || 'medium';
  }

  /**
   * 生成推荐理由
   */
  private generateReasons(platform: string, resultCount: number, topic: string): string[] {
    const reasons: string[] = [];

    if (resultCount > 100) {
      reasons.push(`该平台上有大量关于"${topic}"的相关内容，表明用户兴趣浓厚`);
    } else if (resultCount > 50) {
      reasons.push(`该平台上关于"${topic}"的内容适中，竞争不会过于激烈`);
    } else {
      reasons.push(`该平台上关于"${topic}"的内容较少，有机会成为先行者`);
    }

    switch (platform) {
      case 'youtube':
        reasons.push('视频形式可以生动展示复杂概念');
        reasons.push('YouTube是搜索引擎之一，可获得持续流量');
        break;
      case 'blog':
        reasons.push('文章形式适合深度分析和SEO优化');
        reasons.push('便于建立专业权威形象');
        break;
      case 'twitter':
        reasons.push('可以快速传播和引发讨论');
        reasons.push('适合建立个人品牌和影响力');
        break;
      case 'linkedin':
        reasons.push('适合专业内容和企业决策者');
        reasons.push('有助于B2B业务拓展');
        break;
      case 'tiktok':
        reasons.push('年轻用户群体活跃');
        reasons.push('病毒式传播潜力大');
        break;
    }

    return reasons.slice(0, 3);
  }

  /**
   * 获取平台候选列表
   */
  async getPlatformCandidates(taskId: string): Promise<PlatformCandidate[]> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'completed') {
      throw new Error('Research task not completed yet');
    }

    return task.platform_candidates || [];
  }
}

// 导出单例
export const topicResearchService = new TopicResearchService();
