import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import { Content, CreateContentInput, UpdateContentInput } from '../models/types';
import { aiService } from './aiService';

/**
 * 内容服务
 */
export class ContentService {
  /**
   * 创建内容
   */
  async create(input: CreateContentInput, userId: string, generatedBy?: string): Promise<Content> {
    const id = uuidv4();
    const {
      topic_id,
      title,
      title_en,
      content_type,
      platform,
      status = 'draft',
      content_text,
      content_text_en,
      content_metadata,
      generated_by_skill,
    } = input;

    await query(
      `INSERT INTO contents (id, topic_id, title, title_en, content_type, platform, status, content_text, content_text_en, content_metadata, generated_by_skill, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, topic_id ?? null, title, title_en ?? null, content_type, platform, status, content_text ?? null, content_text_en ?? null, content_metadata ?? null, generated_by_skill ?? null, userId]
    );

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找内容
   */
  async findById(id: string): Promise<Content | null> {
    return await queryOne<Content>(
      'SELECT * FROM contents WHERE id = ?',
      [id]
    );
  }

  /**
   * 更新内容
   */
  async update(id: string, input: UpdateContentInput): Promise<Content | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await query(
      `UPDATE contents
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除内容
   */
  async delete(id: string): Promise<boolean> {
    const result = await remove(
      'DELETE FROM contents WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 获取内容列表
   */
  async list(options: {
    limit?: number;
    offset?: number;
    content_type?: string;
    platform?: string;
    status?: string;
    topic_id?: string;
    search?: string;
  } = {}): Promise<{ contents: Content[]; total: number }> {
    const { limit = 50, offset = 0, content_type, platform, status, topic_id, search } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (content_type) {
      conditions.push(`content_type = ?`);
      params.push(content_type);
    }

    if (platform) {
      conditions.push(`platform = ?`);
      params.push(platform);
    }

    if (status) {
      conditions.push(`status = ?`);
      params.push(status);
    }

    if (topic_id) {
      conditions.push(`topic_id = ?`);
      params.push(topic_id);
    }

    if (search) {
      conditions.push(`title LIKE ?`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM contents ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 获取列表
    const contents = await query<Content>(
      `SELECT * FROM contents
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      contents,
      total,
    };
  }

  /**
   * 获取内容统计
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPlatform: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    // 总数
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contents');
    const total = totalResult?.count || 0;

    // 按类型统计
    const typeResult = await query<{ content_type: string; count: number }>(
      'SELECT content_type, COUNT(*) as count FROM contents GROUP BY content_type'
    );
    const byType: Record<string, number> = {};
    typeResult.forEach((row) => {
      byType[row.content_type] = row.count;
    });

    // 按平台统计
    const platformResult = await query<{ platform: string; count: number }>(
      'SELECT platform, COUNT(*) as count FROM contents GROUP BY platform'
    );
    const byPlatform: Record<string, number> = {};
    platformResult.forEach((row) => {
      byPlatform[row.platform] = row.count;
    });

    // 按状态统计
    const statusResult = await query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM contents GROUP BY status'
    );
    const byStatus: Record<string, number> = {};
    statusResult.forEach((row) => {
      byStatus[row.status] = row.count;
    });

    return {
      total,
      byType,
      byPlatform,
      byStatus,
    };
  }

  /**
   * 基于话题生成内容
   */
  async generateFromTopic(
    topicId: string,
    topicTitle: string,
    topicDescription: string | null,
    contentType: string,
    platform: string,
    targetCustomer: string,
    userId: string
  ): Promise<Content> {
    // 使用AI服务生成内容
    const aiResponse = await aiService.generateFromTopic(
      topicTitle,
      topicDescription,
      contentType,
      platform,
      targetCustomer
    );

    // 创建内容记录
    const content = await this.create(
      {
        topic_id: topicId,
        title: topicTitle,
        content_type: contentType as any,
        platform,
        status: 'draft',
        content_text: aiResponse.content,
        content_metadata: {
          aiModel: aiResponse.model,
          aiProvider: aiResponse.provider,
          tokensUsed: aiResponse.tokensUsed,
          generatedAt: new Date().toISOString(),
        },
      },
      userId,
      'ai-service'
    );

    return content;
  }

  /**
   * 更新内容状态
   */
  async updateStatus(id: string, status: string): Promise<Content | null> {
    await query(
      `UPDATE contents
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, id]
    );

    // 如果状态是published，更新published_at
    if (status === 'published') {
      await query(
        `UPDATE contents
         SET published_at = NOW()
         WHERE id = ?`,
        [id]
      );
    }

    return this.findById(id);
  }

  /**
   * 根据话题ID获取所有内容
   */
  async findByTopicId(topicId: string): Promise<Content[]> {
    return await query<Content>(
      'SELECT * FROM contents WHERE topic_id = ? ORDER BY created_at DESC',
      [topicId]
    );
  }

  /**
   * 批量创建内容
   */
  async bulkCreate(contents: CreateContentInput[], userId: string): Promise<Content[]> {
    const created: Content[] = [];

    for (const content of contents) {
      const result = await this.create(content, userId);
      created.push(result);
    }

    return created;
  }

  /**
   * 批量更新内容状态
   */
  async bulkUpdateStatus(ids: string[], status: string): Promise<Content[]> {
    const updated: Content[] = [];

    for (const id of ids) {
      const content = await this.updateStatus(id, status);
      if (content) {
        updated.push(content);
      }
    }

    return updated;
  }

  /**
   * 批量删除内容
   */
  async bulkDelete(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const result = await this.delete(id);
      if (result) count++;
    }
    return count;
  }

  /**
   * 批量更新内容
   */
  async bulkUpdate(ids: string[], updates: any): Promise<Content[]> {
    const updated: Content[] = [];

    for (const id of ids) {
      const result = await this.update(id, updates);
      if (result) {
        updated.push(result);
      }
    }

    return updated;
  }
}

// 导出单例
export const contentService = new ContentService();
