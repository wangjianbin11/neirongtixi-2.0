import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, update, remove, insert } from '../utils/db';
import { Keyword, CreateKeywordInput, UpdateKeywordInput } from '../models/types';

/**
 * 关键词服务
 */
export class KeywordService {
  /**
   * 创建关键词
   */
  async create(input: CreateKeywordInput, userId: string): Promise<Keyword> {
    const id = uuidv4();
    const {
      keyword,
      category,
      search_volume = 0,
      competition = 'medium',
      intent = 'informational',
      priority = 'B',
      target_customer,
      scenes,
    } = input;

    await query(
      `INSERT INTO keywords (id, keyword, search_volume, kd_score, intent, asg_relevance, priority, source, notes, scenes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, keyword, search_volume, competition === 'low' ? 20 : competition === 'high' ? 80 : 50, intent, 5, priority, 'manual', null, JSON.stringify(scenes || [])]
    );

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找关键词
   */
  async findById(id: string): Promise<Keyword | null> {
    const result = await queryOne<any>(
      'SELECT * FROM keywords WHERE id = ?',
      [id]
    );
    if (!result) return null;

    // 转换数据类型
    return {
      ...result,
      kd_score: parseFloat(result.kd_score || 0),
      search_volume: parseInt(result.search_volume || 0),
      asg_relevance: parseInt(result.asg_relevance || 0),
      cpc: result.cpc ? parseFloat(result.cpc) : null,
      tags: result.tags ? (typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags) : [],
      scenes: result.scenes ? (typeof result.scenes === 'string' ? JSON.parse(result.scenes) : result.scenes) : [],
    };
  }

  /**
   * 更新关键词
   */
  async update(id: string, input: UpdateKeywordInput): Promise<Keyword | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        // Handle array fields that need JSON serialization
        if (key === 'scenes' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await query(
      `UPDATE keywords SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除关键词
   */
  async delete(id: string): Promise<boolean> {
    const result = await remove(
      'DELETE FROM keywords WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 获取关键词列表
   */
  async list(options: {
    limit?: number;
    offset?: number;
    status?: string;
    priority?: string;
    intent?: string;
    search?: string;
    category?: string;
    competition?: string;
    scenes?: string;
  } = {}): Promise<{ keywords: Keyword[]; total: number }> {
    const { limit = 50, offset = 0, status, priority, intent, search, category, competition, scenes } = options;

    console.log('[keywordService.list] Called with options:', { limit, offset, status, priority, intent, search, category, competition, scenes });

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (intent) {
      conditions.push('intent = ?');
      params.push(intent);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (competition) {
      conditions.push('competition = ?');
      params.push(competition);
    }

    if (scenes) {
      conditions.push('JSON_CONTAINS(scenes, JSON_QUOTE(?))');
      params.push(scenes);
    }

    if (search) {
      conditions.push('keyword LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM keywords ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 获取关键词列表
    const queryParams = [...params, limit, offset];
    console.log('[keywordService.list] SQL params:', queryParams);
    console.log('[keywordService.list] Query: LIMIT', limit, 'OFFSET', offset);

    const keywords = await query<any>(
      `SELECT * FROM keywords
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    console.log('[keywordService.list] Query result count:', keywords.length);
    if (keywords.length > 0) {
      console.log('[keywordService.list] First keyword:', keywords[0].keyword);
      console.log('[keywordService.list] Last keyword:', keywords[keywords.length - 1].keyword);
    }

    // 转换数据类型
    const typedKeywords = keywords.map((kw: any) => ({
      ...kw,
      kd_score: parseFloat(kw.kd_score || 0),
      search_volume: parseInt(kw.search_volume || 0),
      asg_relevance: parseInt(kw.asg_relevance || 0),
      cpc: kw.cpc ? parseFloat(kw.cpc) : null,
      tags: kw.tags ? (typeof kw.tags === 'string' ? JSON.parse(kw.tags) : kw.tags) : [],
      scenes: kw.scenes ? (typeof kw.scenes === 'string' ? JSON.parse(kw.scenes) : kw.scenes) : [],
    }));

    return {
      keywords: typedKeywords,
      total,
    };
  }

  /**
   * 搜索关键词
   */
  async search(queryStr: string, options: { limit?: number; offset?: number } = {}): Promise<{ keywords: Keyword[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const searchTerm = `%${queryStr}%`;

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM keywords WHERE keyword LIKE ?`,
      [searchTerm]
    );
    const total = countResult?.count || 0;

    // 获取关键词列表
    const keywords = await query<Keyword>(
      `SELECT * FROM keywords
       WHERE keyword LIKE ?
       ORDER BY search_volume DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, limit, offset]
    );

    return { keywords, total };
  }

  /**
   * 批量创建关键词
   */
  async bulkCreate(keywords: CreateKeywordInput[]): Promise<Keyword[]> {
    const created: Keyword[] = [];

    for (const kw of keywords) {
      const result = await this.create(kw, 'system');
      created.push(result);
    }

    return created;
  }

  /**
   * 批量更新关键词
   */
  async bulkUpdate(ids: string[], updates: UpdateKeywordInput): Promise<Keyword[]> {
    const updated: Keyword[] = [];

    for (const id of ids) {
      const result = await this.update(id, updates);
      if (result) {
        updated.push(result);
      }
    }

    return updated;
  }

  /**
   * 批量删除关键词
   */
  async bulkDelete(ids: string[]): Promise<number> {
    let count = 0;

    for (const id of ids) {
      const result = await this.delete(id);
      if (result) {
        count++;
      }
    }

    return count;
  }

  /**
   * 获取统计数据
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byTargetCustomer: Record<string, number>;
  }> {
    const [categoryResult, priorityResult, targetCustomerResult] = await Promise.all([
      query<{ category: string; count: number }>('SELECT category, COUNT(*) as count FROM keywords GROUP BY category'),
      query<{ priority: string; count: number }>('SELECT priority, COUNT(*) as count FROM keywords GROUP BY priority'),
      query<{ target_customer: string; count: number }>('SELECT target_customer, COUNT(*) as count FROM keywords GROUP BY target_customer'),
    ]);

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byTargetCustomer: Record<string, number> = {};

    categoryResult.forEach(row => { byCategory[row.category || 'uncategorized'] = row.count; });
    priorityResult.forEach(row => { byPriority[row.priority || 'unknown'] = row.count; });
    targetCustomerResult.forEach(row => { byTargetCustomer[row.target_customer || 'none'] = row.count; });

    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM keywords');
    const total = totalResult?.count || 0;

    return {
      total,
      byCategory,
      byPriority,
      byTargetCustomer,
    };
  }

  /**
   * 根据话题获取关联的关键词
   */
  async getByTopicId(topicId: string): Promise<Keyword[]> {
    return await query<Keyword>(
      `SELECT k.* FROM keywords k
       INNER JOIN topic_keywords tk ON k.id = tk.keyword_id
       WHERE tk.topic_id = ?
       ORDER BY tk.is_primary DESC, k.keyword`,
      [topicId]
    );
  }

  /**
   * 导出关键词为CSV
   */
  async exportToCSV(options: {
    status?: string;
    priority?: string;
  } = {}): Promise<string> {
    const { keywords } = await this.list({ ...options, limit: 10000 });

    const headers = ['keyword', 'search_volume', 'kd_score', 'intent', 'asg_relevance', 'priority', 'status', 'created_at', 'scenes'];
    const rows = keywords.map(k => [
      k.keyword,
      k.search_volume,
      k.kd_score,
      k.intent,
      k.asg_relevance,
      k.priority,
      k.status,
      k.created_at,
      k.scenes?.join(';') || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
  }

  /**
   * 根据关键词内容自动分类目标客户
   */
  private classifyTargetCustomer(keyword: string): 'C1-Entrepreneur' | 'C2-Experienced' | 'C3-TeamSeller' | 'C4-LocalToGlobal' | null {
    const kw = keyword.toLowerCase();

    // C4-LocalToGlobal: 全球化相关
    if (kw.includes('global') || kw.includes('international') || kw.includes('worldwide') ||
        kw.includes(' worldwide ') || kw.includes(' worldwide') ||
        kw.includes('international') || kw.includes('multi-country') ||
        kw.includes('cross-border') || kw.includes('global market')) {
      return 'C4-LocalToGlobal';
    }

    // C3-TeamSeller: 团队/代理相关
    if (kw.includes('team') || kw.includes('agency') || kw.includes('manage') ||
        kw.includes('outsource') || kw.includes('automation') || kw.includes('virtual assistant') ||
        kw.includes('hire') || kw.includes('staff') || kw.includes('delegation') ||
        kw.includes('scaling') || kw.includes('multiple stores') || kw.includes('portfolio')) {
      return 'C3-TeamSeller';
    }

    // C2-Experienced: 有经验卖家/进阶
    if (kw.includes('advanced') || kw.includes('scale') || kw.includes('grow') ||
        kw.includes('optimize') || kw.includes('strategy') || kw.includes('profit') ||
        kw.includes('increase sales') || kw.includes('conversion') || kw.includes('traffic') ||
        kw.includes('marketing') || kw.includes('ads') || kw.includes('facebook ads') ||
        kw.includes('google ads') || kw.includes('tiktok ads') || kw.includes('roi') ||
        kw.includes('a/b testing') || kw.includes('funnel') || kw.includes('retargeting') ||
        kw.includes('email marketing') || kw.includes('influencer') ||
        kw.includes('shopify plus') || kw.includes('enterprise') || kw.includes('pro')) {
      return 'C2-Experienced';
    }

    // C1-Entrepreneur: 创业者/新手
    if (kw.includes('beginner') || kw.includes('start') || kw.includes('newbie') ||
        kw.includes('guide') || kw.includes('tutorial') || kw.includes('how to') ||
        kw.includes('learn') || kw.includes('step by step') || kw.includes('for beginners') ||
        kw.includes('intro') || kw.includes('getting started') || kw.includes('basics') ||
        kw.includes('what is') || kw.includes('why') || kw.includes('dropship 101') ||
        kw.includes('complete course') || kw.includes('masterclass') || kw.includes('training') ||
        kw.includes('from scratch') || kw.includes('zero to') || kw.includes('build')) {
      return 'C1-Entrepreneur';
    }

    // 默认为 C1-Entrepreneur，因为大多数搜索关键词的用户是刚开始的
    return 'C1-Entrepreneur';
  }

  /**
   * 批量自动分类目标客户
   */
  async batchClassifyTargetCustomers(limit: number = 1000): Promise<{ updated: number; total: number }> {
    // 获取所有未分类的关键词
    const unclassifiedKeywords = await query<any>(
      `SELECT id, keyword FROM keywords
       WHERE target_customer IS NULL OR target_customer = ''
       LIMIT ?`,
      [limit]
    );

    let updated = 0;
    for (const kw of unclassifiedKeywords) {
      const targetCustomer = this.classifyTargetCustomer(kw.keyword);
      if (targetCustomer) {
        await query(
          'UPDATE keywords SET target_customer = ? WHERE id = ?',
          [targetCustomer, kw.id]
        );
        updated++;
      }
    }

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM keywords WHERE target_customer IS NULL OR target_customer = ""'
    );
    const total = countResult?.count || 0;

    return { updated, total };
  }
}

// 导出单例
export const keywordService = new KeywordService();
