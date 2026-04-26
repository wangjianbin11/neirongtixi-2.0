import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, update, remove } from '../utils/db';
import { Topic, CreateTopicInput, UpdateTopicInput } from '../models/types';

/**
 * 话题服务
 */
export class TopicService {
  /**
   * 创建话题
   */
  async create(input: CreateTopicInput, userId: string): Promise<Topic> {
    const id = uuidv4();
    const {
      title,
      title_en,
      description,
      topic_type,
      target_customer,
      priority = 'B',
      estimated_effort = 1,
    } = input;

    await query(
      `INSERT INTO topics (id, title, title_en, description, topic_type, target_customer, priority, estimated_effort, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, title_en ?? null, description, topic_type, target_customer, priority, estimated_effort, userId]
    );

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找话题
   */
  async findById(id: string): Promise<Topic | null> {
    return await queryOne<Topic>(
      'SELECT * FROM topics WHERE id = ?',
      [id]
    );
  }

  /**
   * 更新话题
   */
  async update(id: string, input: UpdateTopicInput): Promise<Topic | null> {
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
      `UPDATE topics
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除话题
   */
  async delete(id: string): Promise<boolean> {
    const result = await remove(
      'DELETE FROM topics WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 获取话题列表
   */
  async list(options: {
    limit?: number;
    offset?: number;
    topic_type?: string;
    priority?: string;
    target_customer?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{ topics: Topic[]; total: number }> {
    const { limit = 50, offset = 0, topic_type, priority, target_customer, status, search } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (topic_type) {
      conditions.push(`topic_type = ?`);
      params.push(topic_type);
    }

    if (priority) {
      conditions.push(`priority = ?`);
      params.push(priority);
    }

    if (target_customer) {
      conditions.push(`target_customer = ?`);
      params.push(target_customer);
    }

    if (status) {
      conditions.push(`status = ?`);
      params.push(status);
    }

    if (search) {
      conditions.push(`title LIKE ?`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM topics ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 获取列表
    const topics = await query<Topic>(
      `SELECT * FROM topics
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      topics,
      total,
    };
  }

  /**
   * 获取话题统计
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    byTargetCustomer: Record<string, number>;
  }> {
    // 总数
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM topics');
    const total = totalResult?.count || 0;

    // 按类型统计
    const typeResult = await query<{ topic_type: string; count: number }>(
      'SELECT topic_type, COUNT(*) as count FROM topics GROUP BY topic_type'
    );
    const byType: Record<string, number> = {};
    typeResult.forEach((row) => {
      byType[row.topic_type] = row.count;
    });

    // 按优先级统计
    const priorityResult = await query<{ priority: string; count: number }>(
      'SELECT priority, COUNT(*) as count FROM topics GROUP BY priority'
    );
    const byPriority: Record<string, number> = {};
    priorityResult.forEach((row) => {
      byPriority[row.priority] = row.count;
    });

    // 按状态统计
    const statusResult = await query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM topics GROUP BY status'
    );
    const byStatus: Record<string, number> = {};
    statusResult.forEach((row) => {
      byStatus[row.status] = row.count;
    });

    // 按目标客户统计
    const customerResult = await query<{ target_customer: string; count: number }>(
      "SELECT target_customer, COUNT(*) as count FROM topics WHERE target_customer IS NOT NULL GROUP BY target_customer"
    );
    const byTargetCustomer: Record<string, number> = {};
    customerResult.forEach((row) => {
      byTargetCustomer[row.target_customer] = row.count;
    });

    return {
      total,
      byType,
      byPriority,
      byStatus,
      byTargetCustomer,
    };
  }

  /**
   * 更新话题状态
   */
  async updateStatus(id: string, status: string): Promise<Topic | null> {
    await query(
      `UPDATE topics
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, id]
    );

    return this.findById(id);
  }

  /**
   * 搜索话题
   */
  async search(queryStr: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ topics: Topic[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const searchTerm = `%${queryStr}%`;

    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM topics
       WHERE title LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm]
    );
    const total = countResult?.count || 0;

    const topics = await query<Topic>(
      `SELECT * FROM topics
       WHERE title LIKE ? OR description LIKE ?
       ORDER BY priority DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, limit, offset]
    );

    return {
      topics,
      total,
    };
  }

  /**
   * 批量创建话题
   */
  async bulkCreate(topics: CreateTopicInput[], userId: string): Promise<Topic[]> {
    const created: Topic[] = [];

    for (const topic of topics) {
      const result = await this.create(topic, userId);
      created.push(result);
    }

    return created;
  }

  /**
   * 批量删除话题
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
   * 批量更新话题
   */
  async bulkUpdate(ids: string[], updates: UpdateTopicInput): Promise<Topic[]> {
    const updated: Topic[] = [];

    for (const id of ids) {
      const result = await this.update(id, updates);
      if (result) {
        updated.push(result);
      }
    }

    return updated;
  }

  /**
   * 批量更新话题状态
   */
  async bulkUpdateStatus(ids: string[], status: string): Promise<Topic[]> {
    const updated: Topic[] = [];

    for (const id of ids) {
      const result = await this.updateStatus(id, status);
      if (result) {
        updated.push(result);
      }
    }

    return updated;
  }
}

// 导出单例
export const topicService = new TopicService();
