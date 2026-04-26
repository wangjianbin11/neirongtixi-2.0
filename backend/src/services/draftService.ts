import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, insert, update, remove } from '../utils/db';
import {
  Draft,
  CreateDraftInput,
  UpdateDraftInput,
  DraftListParams,
  DraftReviewInput,
} from '../models/types';

/**
 * 草稿服务
 */
export class DraftService {
  /**
   * 获取草稿列表
   */
  async list(params: DraftListParams = {}): Promise<{
    drafts: Draft[];
    total: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      status,
      content_type,
      platform,
      keyword_id,
      search,
    } = params;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (content_type) {
      whereConditions.push('content_type = ?');
      queryParams.push(content_type);
    }

    if (platform) {
      whereConditions.push('platform = ?');
      queryParams.push(platform);
    }

    if (keyword_id) {
      whereConditions.push('keyword_id = ?');
      queryParams.push(keyword_id);
    }

    if (search) {
      whereConditions.push('(title LIKE ? OR content_json LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM drafts ${whereClause}`,
      queryParams
    );
    const total = countResult?.count || 0;

    // 获取列表
    const drafts = await query<any>(
      `SELECT * FROM drafts ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 转换数据类型
    const typedDrafts: Draft[] = drafts.map((d: any) => ({
      ...d,
      content_json: typeof d.content_json === 'string'
        ? JSON.parse(d.content_json)
        : d.content_json,
      metadata: d.metadata
        ? (typeof d.metadata === 'string'
          ? JSON.parse(d.metadata)
          : d.metadata)
        : undefined,
    }));

    return { drafts: typedDrafts, total };
  }

  /**
   * 根据ID获取草稿
   */
  async findById(id: string): Promise<Draft | null> {
    const draft = await queryOne<any>(
      'SELECT * FROM drafts WHERE id = ?',
      [id]
    );

    if (!draft) return null;

    return {
      ...draft,
      content_json: typeof draft.content_json === 'string'
        ? JSON.parse(draft.content_json)
        : draft.content_json,
      metadata: draft.metadata
        ? (typeof draft.metadata === 'string'
          ? JSON.parse(draft.metadata)
          : draft.metadata)
        : undefined,
    };
  }

  /**
   * 创建草稿
   */
  async create(input: CreateDraftInput, userId?: string): Promise<Draft> {
    const id = uuidv4();
    const now = new Date();

    // 默认状态为draft
    const status: string = 'draft';

    const sql = `
      INSERT INTO drafts (
        id, execution_id, workflow_id, title, content_type,
        content_json, platform, keyword_id, topic_id,
        status, metadata, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id,
      input.execution_id || null,
      input.workflow_id || null,
      input.title,
      input.content_type,
      JSON.stringify(input.content_json),
      input.platform || null,
      input.keyword_id || null,
      input.topic_id || null,
      status,
      input.metadata ? JSON.stringify(input.metadata) : null,
      userId || null,
      now,
      now,
    ]);

    return (await this.findById(id))!;
  }

  /**
   * 批量创建草稿
   */
  async bulkCreate(inputs: CreateDraftInput[], userId?: string): Promise<Draft[]> {
    const created: Draft[] = [];

    for (const input of inputs) {
      const draft = await this.create(input, userId);
      created.push(draft);
    }

    return created;
  }

  /**
   * 更新草稿
   */
  async update(id: string, input: UpdateDraftInput): Promise<Draft | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }
    if (input.content_json !== undefined) {
      updates.push('content_json = ?');
      params.push(JSON.stringify(input.content_json));
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(id);

    await query(
      `UPDATE drafts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  /**
   * 删除草稿
   */
  async delete(id: string): Promise<boolean> {
    const result = await remove('DELETE FROM drafts WHERE id = ?', [id]);
    return result > 0;
  }

  /**
   * 批量删除草稿
   */
  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const result = await remove(
      `DELETE FROM drafts WHERE id IN (${placeholders})`,
      ids
    );

    return result;
  }

  /**
   * 提交审核
   */
  async submitForReview(id: string): Promise<Draft | null> {
    return this.update(id, { status: 'pending_review' });
  }

  /**
   * 审核草稿
   */
  async review(
    id: string,
    input: DraftReviewInput,
    reviewerId: string
  ): Promise<Draft | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    // 只能审核pending_review状态的草稿
    if (existing.status !== 'pending_review') {
      throw new Error('Draft is not pending review');
    }

    const now = new Date();

    await query(`
      UPDATE drafts
      SET status = ?, review_comment = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `, [input.status, input.comment || null, reviewerId, now, now, id]);

    return this.findById(id);
  }

  /**
   * 发布草稿
   */
  async publish(id: string): Promise<Draft | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    // 只能发布approved状态的草稿
    if (existing.status !== 'approved') {
      throw new Error('Draft is not approved');
    }

    const now = new Date();

    await query(`
      UPDATE drafts
      SET status = 'published', published_at = ?, updated_at = ?
      WHERE id = ?
    `, [now, now, id]);

    return this.findById(id);
  }

  /**
   * 根据执行ID获取草稿
   */
  async findByExecutionId(executionId: string): Promise<Draft[]> {
    const drafts = await query<any>(
      `SELECT * FROM drafts WHERE execution_id = ? ORDER BY created_at ASC`,
      [executionId]
    );

    return drafts.map((d: any) => ({
      ...d,
      content_json: typeof d.content_json === 'string'
        ? JSON.parse(d.content_json)
        : d.content_json,
      metadata: d.metadata
        ? (typeof d.metadata === 'string'
          ? JSON.parse(d.metadata)
          : d.metadata)
        : undefined,
    }));
  }

  /**
   * 获取待审核的草稿数量
   */
  async getPendingReviewCount(): Promise<number> {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM drafts WHERE status = 'pending_review'`
    );
    return result?.count || 0;
  }

  /**
   * 获取草稿统计
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    pendingReview: number;
  }> {
    // 总数
    const totalResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM drafts'
    );
    const total = totalResult?.count || 0;

    // 按状态统计
    const byStatusResult = await query(`
      SELECT status, COUNT(*) as count FROM drafts GROUP BY status
    `);
    const byStatus: Record<string, number> = {};
    for (const row of byStatusResult as any[]) {
      byStatus[row.status] = row.count;
    }

    // 按类型统计
    const byTypeResult = await query(`
      SELECT content_type, COUNT(*) as count FROM drafts GROUP BY content_type
    `);
    const byType: Record<string, number> = {};
    for (const row of byTypeResult as any[]) {
      byType[row.content_type] = row.count;
    }

    // 待审核数量
    const pendingReviewResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM drafts WHERE status = 'pending_review'`
    );
    const pendingReview = pendingReviewResult?.count || 0;

    return {
      total,
      byStatus,
      byType,
      pendingReview,
    };
  }
}

// 导出单例
export const draftService = new DraftService();
