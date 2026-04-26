import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import {
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
  KnowledgeBaseListParams
} from '../models/types';

/**
 * 知识库服务
 */
export class KnowledgeBaseService {
  /**
   * 创建知识库
   */
  async create(input: CreateKnowledgeBaseInput, userId?: string): Promise<KnowledgeBase> {
    const id = uuidv4();
    const {
      group_id,
      name,
      description,
      type = 'manual',
      tags,
    } = input;

    await query(
      `INSERT INTO knowledge_bases (id, group_id, name, description, type, tags, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, true, ?)`,
      [id, group_id || null, name, description || null, type, tags ? JSON.stringify(tags) : null, userId || null]
    );

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找知识库
   */
  async findById(id: string): Promise<KnowledgeBase | null> {
    const result = await queryOne<any>(
      'SELECT * FROM knowledge_bases WHERE id = ?',
      [id]
    );
    if (!result) return null;

    return {
      id: result.id,
      group_id: result.group_id,
      name: result.name,
      description: result.description,
      type: result.type,
      tags: result.tags ? (typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags) : [],
      document_count: result.document_count,
      is_active: Boolean(result.is_active),
      created_by: result.created_by,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * 更新知识库
   */
  async update(id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBase | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'tags' && Array.isArray(value)) {
          updates.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await query(
      `UPDATE knowledge_bases SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除知识库
   */
  async delete(id: string): Promise<boolean> {
    // 先检查知识库下是否有文档
    const docs = await queryOne(
      'SELECT COUNT(*) as count FROM knowledge_base_documents WHERE knowledge_base_id = ?',
      [id]
    );

    if (docs && docs.count > 0) {
      throw new Error('该知识库下还有文档，无法删除');
    }

    const result = await remove(
      'DELETE FROM knowledge_bases WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 获取知识库列表
   */
  async list(options: KnowledgeBaseListParams = {}): Promise<{
    bases: KnowledgeBase[];
    total: number;
  }> {
    const {
      group_id,
      type,
      is_active,
      search,
      page = 1,
      pageSize = 20,
    } = options;

    const conditions: string[] = [];
    const params: any[] = [];
    const offset = (page - 1) * pageSize;

    if (group_id) {
      conditions.push('group_id = ?');
      params.push(group_id);
    }

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(is_active);
    }

    if (search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<any>(
      `SELECT COUNT(*) as count FROM knowledge_bases ${whereClause}`,
      params
    );

    // 获取列表
    const bases = await query<any>(
      `SELECT * FROM knowledge_bases ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      bases: bases.map(b => ({
        id: b.id,
        group_id: b.group_id,
        name: b.name,
        description: b.description,
        type: b.type,
        tags: b.tags ? (typeof b.tags === 'string' ? JSON.parse(b.tags) : b.tags) : [],
        document_count: b.document_count,
        is_active: Boolean(b.is_active),
        created_by: b.created_by,
        created_at: b.created_at,
        updated_at: b.updated_at,
      })),
      total: countResult?.count || 0,
    };
  }

  /**
   * 更新知识库的文档数量
   */
  async updateDocumentCount(baseId: string): Promise<void> {
    const result = await queryOne<any>(
      'SELECT COUNT(*) as count FROM knowledge_base_documents WHERE knowledge_base_id = ?',
      [baseId]
    );

    await query(
      'UPDATE knowledge_bases SET document_count = ? WHERE id = ?',
      [result?.count || 0, baseId]
    );
  }
}

// 导出单例
export const knowledgeBaseService = new KnowledgeBaseService();
