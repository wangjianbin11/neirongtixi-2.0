import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import {
  KnowledgeBaseGroup,
  CreateKnowledgeBaseGroupInput,
  UpdateKnowledgeBaseGroupInput
} from '../models/types';

/**
 * 知识库分组服务
 */
export class KnowledgeBaseGroupService {
  /**
   * 创建分组
   */
  async create(input: CreateKnowledgeBaseGroupInput, userId?: string): Promise<KnowledgeBaseGroup> {
    const id = uuidv4();
    const {
      name,
      description,
      color = '#1890ff',
      icon,
      sort_order = 0,
    } = input;

    await query(
      `INSERT INTO knowledge_base_groups (id, name, description, color, icon, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, color, icon || null, sort_order, userId || null]
    );

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找分组
   */
  async findById(id: string): Promise<KnowledgeBaseGroup | null> {
    const result = await queryOne<any>(
      'SELECT * FROM knowledge_base_groups WHERE id = ?',
      [id]
    );
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      color: result.color,
      icon: result.icon,
      sort_order: result.sort_order,
      created_by: result.created_by,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * 更新分组
   */
  async update(id: string, input: UpdateKnowledgeBaseGroupInput): Promise<KnowledgeBaseGroup | null> {
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
      `UPDATE knowledge_base_groups SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除分组
   */
  async delete(id: string): Promise<boolean> {
    // 先检查分组下是否有知识库
    const bases = await queryOne(
      'SELECT COUNT(*) as count FROM knowledge_bases WHERE group_id = ?',
      [id]
    );

    if (bases && bases.count > 0) {
      throw new Error('该分组下还有知识库，无法删除');
    }

    const result = await remove(
      'DELETE FROM knowledge_base_groups WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 获取分组列表
   */
  async list(options?: {
    search?: string;
  }): Promise<{ groups: KnowledgeBaseGroup[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.search) {
      conditions.push('name LIKE ?');
      params.push(`%${options.search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<any>(
      `SELECT COUNT(*) as count FROM knowledge_base_groups ${whereClause}`,
      params
    );

    // 获取列表
    const groups = await query<any>(
      `SELECT * FROM knowledge_base_groups ${whereClause} ORDER BY sort_order ASC, created_at DESC`,
      params
    );

    return {
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        icon: g.icon,
        sort_order: g.sort_order,
        created_by: g.created_by,
        created_at: g.created_at,
        updated_at: g.updated_at,
      })),
      total: countResult?.count || 0,
    };
  }

  /**
   * 获取分组下的知识库数量
   */
  async getBaseCount(groupId: string): Promise<number> {
    const result = await queryOne<any>(
      'SELECT COUNT(*) as count FROM knowledge_bases WHERE group_id = ?',
      [groupId]
    );
    return result?.count || 0;
  }
}

// 导出单例
export const knowledgeBaseGroupService = new KnowledgeBaseGroupService();
