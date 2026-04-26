import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import {
  KnowledgeBaseDocument,
  CreateKnowledgeBaseDocumentInput,
  UpdateKnowledgeBaseDocumentInput
} from '../models/types';
import { knowledgeBaseService } from './knowledgeBaseService';

/**
 * 知识库文档服务
 */
export class KnowledgeBaseDocumentService {
  /**
   * 创建文档
   */
  async create(input: CreateKnowledgeBaseDocumentInput, userId?: string): Promise<KnowledgeBaseDocument> {
    const id = uuidv4();
    const {
      knowledge_base_id,
      title,
      content,
      source_type,
      source_url,
      file_path,
    } = input;

    // 计算字数
    const word_count = content ? content.length : 0;

    await query(
      `INSERT INTO knowledge_base_documents
       (id, knowledge_base_id, title, content, source_type, source_url, file_path, word_count, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, knowledge_base_id, title, content || null, source_type, source_url || null, file_path || null, word_count, userId || null]
    );

    // 更新知识库的文档数量
    await knowledgeBaseService.updateDocumentCount(knowledge_base_id);

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找文档
   */
  async findById(id: string): Promise<KnowledgeBaseDocument | null> {
    const result = await queryOne<any>(
      'SELECT * FROM knowledge_base_documents WHERE id = ?',
      [id]
    );
    if (!result) return null;

    return {
      id: result.id,
      knowledge_base_id: result.knowledge_base_id,
      title: result.title,
      content: result.content,
      source_type: result.source_type,
      source_url: result.source_url,
      file_path: result.file_path,
      file_size: result.file_size,
      file_mime_type: result.file_mime_type,
      word_count: result.word_count,
      current_version_id: result.current_version_id,
      status: result.status,
      created_by: result.created_by,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * 更新文档
   */
  async update(id: string, input: UpdateKnowledgeBaseDocumentInput): Promise<KnowledgeBaseDocument | null> {
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

    // 更新字数
    if (input.content !== undefined) {
      updates.push('word_count = ?');
      values.push(input.content.length);
    }

    values.push(id);

    await query(
      `UPDATE knowledge_base_documents SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除文档
   */
  async delete(id: string): Promise<boolean> {
    // 先获取文档信息，用于更新知识库文档数量
    const doc = await this.findById(id);
    if (!doc) return false;

    const result = await remove(
      'DELETE FROM knowledge_base_documents WHERE id = ?',
      [id]
    );

    if (result > 0) {
      // 更新知识库的文档数量
      await knowledgeBaseService.updateDocumentCount(doc.knowledge_base_id);
    }

    return result > 0;
  }

  /**
   * 获取知识库的文档列表
   */
  async listByKnowledgeBase(knowledgeBaseId: string, options: {
    page?: number;
    pageSize?: number;
    source_type?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{ documents: KnowledgeBaseDocument[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      source_type,
      status,
      search,
    } = options;

    const conditions: string[] = ['knowledge_base_id = ?'];
    const params: any[] = [knowledgeBaseId];
    const offset = (page - 1) * pageSize;

    if (source_type) {
      conditions.push('source_type = ?');
      params.push(source_type);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // 获取总数
    const countResult = await queryOne<any>(
      `SELECT COUNT(*) as count FROM knowledge_base_documents WHERE ${whereClause}`,
      params
    );

    // 获取列表
    const documents = await query<any>(
      `SELECT * FROM knowledge_base_documents WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      documents: documents.map(d => ({
        id: d.id,
        knowledge_base_id: d.knowledge_base_id,
        title: d.title,
        content: d.content,
        source_type: d.source_type,
        source_url: d.source_url,
        file_path: d.file_path,
        file_size: d.file_size,
        file_mime_type: d.file_mime_type,
        word_count: d.word_count,
        current_version_id: d.current_version_id,
        status: d.status,
        created_by: d.created_by,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
      total: countResult?.count || 0,
    };
  }

  /**
   * 批量创建文档
   */
  async bulkCreate(items: CreateKnowledgeBaseDocumentInput[], userId?: string): Promise<KnowledgeBaseDocument[]> {
    const created: KnowledgeBaseDocument[] = [];

    for (const item of items) {
      const doc = await this.create(item, userId);
      created.push(doc);
    }

    return created;
  }

  /**
   * 搜索文档内容
   */
  async searchContent(searchQuery: string, options?: {
    knowledge_base_id?: string;
    limit?: number;
  }): Promise<{ documents: KnowledgeBaseDocument[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    const limit = options?.limit || 20;

    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);

    if (options?.knowledge_base_id) {
      conditions.push('knowledge_base_id = ?');
      params.push(options.knowledge_base_id);
    }

    const whereClause = conditions.join(' AND ');

    // 获取总数
    const countResult = await queryOne<any>(
      `SELECT COUNT(*) as count FROM knowledge_base_documents WHERE ${whereClause}`,
      params
    );

    // 获取列表
    const documents = await query<any>(
      `SELECT * FROM knowledge_base_documents WHERE ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      [...params, limit]
    );

    return {
      documents: documents.map((d: any) => ({
        id: d.id,
        knowledge_base_id: d.knowledge_base_id,
        title: d.title,
        content: d.content,
        source_type: d.source_type,
        source_url: d.source_url,
        file_path: d.file_path,
        file_size: d.file_size,
        file_mime_type: d.file_mime_type,
        word_count: d.word_count,
        current_version_id: d.current_version_id,
        status: d.status,
        created_by: d.created_by,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
      total: countResult?.count || 0,
    };
  }
}

// 导出单例
export const knowledgeBaseDocumentService = new KnowledgeBaseDocumentService();
