import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, update } from '../utils/db';
import { googleSearchService } from './googleSearchService';
import { knowledgeSearchService } from './knowledgeSearchService';
import { topicService } from './topicService';
import { hybridSearchService } from './hybridSearchService';
import { KEYWORD_RESEARCH_CHANNELS, getChannelBatches, ResearchChannel } from '../config/researchChannels';

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

// 调研任务接口
export interface ResearchTask {
  id: string;
  keyword_id: string;
  keyword: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  current_batch: number;
  total_batches: number;
  results: ResearchResult[];
  knowledge_searched: boolean;
  knowledge_results?: any[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// 调研状态接口
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

/**
 * 关键词调研服务
 * 实现10+渠道分批次调研功能
 */
export class KeywordResearchService {
  /**
   * 创建调研任务
   */
  async createTask(keywordId: string, keyword: string): Promise<ResearchTask> {
    const id = uuidv4();
    const channels = KEYWORD_RESEARCH_CHANNELS;
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
      `INSERT INTO keyword_research_tasks (id, keyword_id, keyword, status, current_batch, total_batches, results, knowledge_searched, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        keywordId,
        keyword,
        'pending',
        0,
        batches.length,
        JSON.stringify(results),
        false,
      ]
    );

    const task = await this.getTaskById(id);
    return task!;
  }

  /**
   * 获取任务详情
   */
  async getTaskById(taskId: string): Promise<ResearchTask | null> {
    const result = await queryOne<any>(
      'SELECT * FROM keyword_research_tasks WHERE id = ?',
      [taskId]
    );

    if (!result) return null;

    return {
      ...result,
      results: typeof result.results === 'string' ? JSON.parse(result.results || '[]') : (result.results || []),
      knowledge_results: result.knowledge_results ? (typeof result.knowledge_results === 'string' ? JSON.parse(result.knowledge_results) : result.knowledge_results) : null,
    };
  }

  /**
   * 根据关键词ID获取最新任务
   */
  async getLatestTaskByKeywordId(keywordId: string): Promise<ResearchTask | null> {
    const result = await queryOne<any>(
      'SELECT * FROM keyword_research_tasks WHERE keyword_id = ? ORDER BY created_at DESC LIMIT 1',
      [keywordId]
    );

    if (!result) return null;

    return {
      ...result,
      results: typeof result.results === 'string' ? JSON.parse(result.results || '[]') : (result.results || []),
      knowledge_results: result.knowledge_results ? (typeof result.knowledge_results === 'string' ? JSON.parse(result.knowledge_results) : result.knowledge_results) : null,
    };
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: string, updates: Partial<ResearchTask>): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'results' || key === 'knowledge_results') {
        updateFields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (key === 'completed_at') {
        // 对于时间戳字段，使用 NOW() 函数
        updateFields.push(`${key} = NOW()`);
      } else {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    updateFields.push('updated_at = NOW()');
    values.push(taskId);

    await query(
      `UPDATE keyword_research_tasks SET ${updateFields.join(', ')} WHERE id = ?`,
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
  async executeTask(taskId: string, onProgress?: (progress: ResearchProgress) => void): Promise<ResearchTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 更新状态为进行中
    await this.updateTaskStatus(taskId, { status: 'in_progress' });

    const channels = KEYWORD_RESEARCH_CHANNELS;
    const batches = getChannelBatches(channels, 5);

    let completedCount = 0;
    const totalCount = channels.length;

    try {
      // 分批次执行调研
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        // 并行执行当前批次的渠道
        await Promise.all(
          batch.map(channel => this.processChannel(taskId, channel, task.keyword))
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
      await this.searchKnowledge(taskId, task.keyword);

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
    keyword: string
  ): Promise<void> {
    try {
      console.log(`[KeywordResearch] Starting channel: ${channel.name} (${channel.id}) for keyword: ${keyword}`);

      // 更新状态为处理中
      await this.updateChannelResult(taskId, channel.id, {
        status: 'processing',
        started_at: new Date().toISOString(),
      });

      // 使用混合搜索服务
      const searchResponse = await hybridSearchService.search(keyword, channel.id, {
        maxResults: 15,
        includeFullContent: false,
        cacheResults: true,
      });

      const results = searchResponse.results;
      const resultCount = results.length;

      // 记录搜索方法用于调试
      console.log(`[KeywordResearch] Channel ${channel.name} used ${searchResponse.method} (${resultCount} results)`);

      // 保存结果
      await this.updateChannelResult(taskId, channel.id, {
        status: 'completed',
        result_count: resultCount,
        results,
        completed_at: new Date().toISOString(),
      });

      console.log(`[KeywordResearch] Channel ${channel.name} completed successfully`);
    } catch (error: any) {
      // 标记失败
      console.error(`[KeywordResearch] Channel ${channel.name} failed:`, error.message);
      console.error(`[KeywordResearch] Error stack:`, error.stack);
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
  private async searchEngines(keyword: string, channelId: string): Promise<any[]> {
    const response = await googleSearchService.search({ q: keyword, num: 15 });
    return response.items || [];
  }

  /**
   * 社交媒体类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchSocial(keyword: string, channelId: string): Promise<any[]> {
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
      const response = await googleSearchService.search({ q: `site:${site} ${keyword}`, num: 15 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 电商类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchEcommerce(keyword: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'amazon_search': 'amazon.com',
      'ebay_search': 'ebay.com',
      'shopify_search': 'myshopify.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${keyword}`, num: 15 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 论坛类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchForum(keyword: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'reddit_search': 'reddit.com',
      'medium_search': 'medium.com',
      'discord_search': 'discord.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${keyword}`, num: 12 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 问答类渠道 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchQA(keyword: string, channelId: string): Promise<any[]> {
    const siteMap: Record<string, string> = {
      'quora_search': 'quora.com',
      'stack_overflow': 'stackoverflow.com',
    };

    const site = siteMap[channelId];
    if (site) {
      const response = await googleSearchService.search({ q: `site:${site} ${keyword}`, num: 12 });
      return response.items || [];
    }

    return [];
  }

  /**
   * 通用搜索 (已废弃，使用processChannel中的hybridSearchService)
   */
  private async searchGeneric(keyword: string, channelId: string): Promise<any[]> {
    const response = await googleSearchService.search({ q: keyword, num: 15 });
    return response.items || [];
  }

  /**
   * 模拟Google Trends数据
   */
  private async simulateGoogleTrends(keyword: string): Promise<any[]> {
    return [{
      title: `${keyword} - 趋势分析`,
      url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`,
      snippet: `搜索趋势数据 - 请手动查看Google Trends获取详细信息`,
      source: 'google_trends',
    }];
  }

  /**
   * 获取Google推荐词
   */
  private async getGoogleSuggestions(keyword: string): Promise<any[]> {
    try {
      const response = await googleSearchService.search({ q: keyword });
      return (response.items || []).slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  /**
   * 搜索知识库
   */
  private async searchKnowledge(taskId: string, keyword: string): Promise<void> {
    try {
      const results = await knowledgeSearchService.semanticSearch(keyword, {
        limit: 20,
      });

      await this.updateTaskStatus(taskId, {
        knowledge_searched: true,
        knowledge_results: results,
      });
    } catch (error) {
      console.error('Knowledge search failed:', error);
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
    task: ResearchTask,
    completedCount: number,
    totalCount: number
  ): ResearchProgress {
    const completedChannels = task.results.filter(r => r.status === 'completed');
    const currentChannel = task.results.find(r => r.status === 'processing');

    return {
      task_id: task.id,
      keyword: task.keyword,
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
  async getProgress(taskId: string): Promise<ResearchProgress | null> {
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
   * 从调研结果生成话题
   */
  async generateTopicsFromResearch(taskId: string, options: {
    maxTopics?: number;
    targetCustomer?: string;
  } = {}): Promise<any[]> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'completed') {
      throw new Error('Research task not completed yet');
    }

    // 分析所有调研结果
    const allResults = task.results.flatMap(r => r.results);
    const knowledgeResults = task.knowledge_results || [];

    // 生成话题
    const suggestedTopics = await this.analyzeAndGenerateTopics(
      task.keyword,
      allResults,
      knowledgeResults,
      options
    );

    // 保存生成的话题
    const createdTopics = [];
    for (const topicData of suggestedTopics) {
      try {
        const topic = await topicService.create({
          title: topicData.title,
          description: topicData.description,
          topic_type: topicData.topic_type || 'insight',
          target_customer: (topicData.target_customer as any) || 'startup',
          priority: (topicData.priority as any) || 'B',
          estimated_effort: topicData.estimated_effort || 5,
        }, 'system'); // 使用 system 作为创建者
        createdTopics.push(topic);
      } catch (error) {
        console.error('Failed to create topic:', error);
      }
    }

    return createdTopics;
  }

  /**
   * 分析调研结果并生成话题
   */
  private async analyzeAndGenerateTopics(
    keyword: string,
    researchResults: any[],
    knowledgeResults: any[],
    options: { maxTopics?: number; targetCustomer?: string }
  ): Promise<any[]> {
    // 基于调研结果生成话题
    const topics: any[] = [];

    // 1. 从搜索结果中提取常见主题
    const themes = this.extractCommonThemes(researchResults);

    // 2. 基于关键词和主题生成话题
    for (const theme of themes.slice(0, options.maxTopics || 5)) {
      topics.push({
        title: `${keyword} - ${theme}`,
        description: `基于"${keyword}"的调研结果生成的${theme}相关话题`,
        topic_type: 'insight',
        target_customer: options.targetCustomer || 'startup',
        priority: 'B',
        estimated_effort: 5,
        source: 'keyword_research',
      });
    }

    // 3. 如果没有足够的主题，添加通用话题
    if (topics.length < 3) {
      topics.push(
        {
          title: `${keyword} 深度解析`,
          description: `对${keyword}进行深入分析和探讨`,
          topic_type: 'insight',
          target_customer: 'startup',
          priority: 'B',
          estimated_effort: 7,
        },
        {
          title: `${keyword} 实践指南`,
          description: `${keyword}的实践操作指南和最佳实践`,
          topic_type: 'tutorial',
          target_customer: 'experienced',
          priority: 'B',
          estimated_effort: 8,
        }
      );
    }

    return topics;
  }

  /**
   * 从搜索结果中提取常见主题
   */
  private extractCommonThemes(results: any[]): string[] {
    const themes = new Set<string>();

    for (const result of results) {
      if (result.snippet) {
        // 简单的关键词提取
        const keywords = result.snippet.split(/\s+/).filter((w: string) => w.length > 3);
        keywords.slice(0, 3).forEach((k: string) => themes.add(k));
      }
    }

    return Array.from(themes).slice(0, 10);
  }
}

// 导出单例
export const keywordResearchService = new KeywordResearchService();
