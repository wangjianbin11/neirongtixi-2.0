import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import {
  Asset,
  CreateAssetInput,
  UpdateAssetInput,
  AssetListParams,
  AssetStats,
} from '../models/types';

/**
 * 素材服务
 */
export class AssetService {
  /**
   * 创建素材
   */
  async create(input: CreateAssetInput, userId: string): Promise<Asset> {
    const id = uuidv4();
    const {
      title,
      type,
      category,
      description,
      file_url,
      file_size,
      file_type,
      tags = [],
      source,
      is_active = true,
    } = input;

    await query(
      `INSERT INTO assets (id, title, type, category, description, file_url, file_size, file_type, tags, source, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, type, category, description, file_url, file_size, file_type, JSON.stringify(tags), source, is_active ? 1 : 0, userId]
    );

    const result = await this.findById(id);
    return result!;
  }

  /**
   * 根据ID查找素材
   */
  async findById(id: string): Promise<Asset | null> {
    return await queryOne<Asset>(
      'SELECT * FROM assets WHERE id = ?',
      [id]
    );
  }

  /**
   * 更新素材
   */
  async update(id: string, input: UpdateAssetInput): Promise<Asset | null> {
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
      `UPDATE assets
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除素材
   */
  async delete(id: string): Promise<boolean> {
    const result = await remove(
      'DELETE FROM assets WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 获取素材列表
   */
  async list(params: AssetListParams): Promise<{
    assets: Asset[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      type,
      category,
      tags,
      search,
      is_active,
    } = params;

    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (type) {
      conditions.push(`type = ?`);
      values.push(type);
    }

    if (category) {
      conditions.push(`category = ?`);
      values.push(category);
    }

    if (tags && tags.length > 0) {
      conditions.push(`JSON_CONTAINS(tags, ?)`);
      values.push(JSON.stringify(tags[0])); // 简化处理，MySQL数组搜索比较复杂
    }

    if (search) {
      conditions.push(`(title LIKE ? OR description LIKE ?)`);
      values.push(`%${search}%`, `%${search}%`);
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = ?`);
      values.push(is_active ? 1 : 0);
    }

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM assets WHERE ${conditions.join(' AND ')}`,
      values
    );
    const total = countResult?.count || 0;

    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const assets = await query<Asset>(
      `SELECT * FROM assets
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      assets,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取素材统计
   */
  async getStats(): Promise<AssetStats> {
    // 总数统计
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM assets WHERE is_active = 1');
    const total = totalResult?.count || 0;

    // 按类型统计
    const typeResult = await query<{ type: string; count: number }>(
      `SELECT type, COUNT(*) as count FROM assets WHERE is_active = 1 GROUP BY type`
    );
    const byType: Record<string, number> = {};
    typeResult.forEach(row => {
      byType[row.type] = row.count;
    });

    // 按分类统计
    const categoryResult = await query<{ category: string; count: number }>(
      `SELECT category, COUNT(*) as count FROM assets WHERE is_active = 1 AND category IS NOT NULL GROUP BY category`
    );
    const byCategory: Record<string, number> = {};
    categoryResult.forEach(row => {
      byCategory[row.category] = row.count;
    });

    // 文件大小统计
    const sizeResult = await queryOne<{ total_size: number }>(
      `SELECT COALESCE(SUM(file_size), 0) as total_size FROM assets WHERE is_active = 1 AND file_size IS NOT NULL`
    );
    const totalFileSize = sizeResult?.total_size || 0;

    return {
      total,
      byType,
      byCategory,
      totalFileSize,
    };
  }

  /**
   * 按标签搜索素材
   */
  async findByTags(tags: string[]): Promise<Asset[]> {
    // MySQL简化处理：搜索包含任一标签的素材
    const conditions = tags.map(() => 'JSON_CONTAINS(tags, ?)').join(' OR ');
    const values = tags.map(t => JSON.stringify(t));

    return await query<Asset>(
      `SELECT * FROM assets WHERE ${conditions} AND is_active = 1 ORDER BY created_at DESC`,
      values
    );
  }

  /**
   * 搜索素材
   */
  async search(queryStr: string, limit: number = 20): Promise<Asset[]> {
    const searchTerm = `%${queryStr}%`;
    return await query<Asset>(
      `SELECT * FROM assets
       WHERE is_active = 1
       AND (title LIKE ? OR description LIKE ? OR category LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, limit]
    );
  }
}

// 导出单例
export const assetService = new AssetService();
