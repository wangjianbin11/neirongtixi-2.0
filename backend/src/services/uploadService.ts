import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import fs from 'fs/promises';
import path from 'path';

/**
 * 文件信息接口
 */
interface FileInfo {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url: string;
  uploaded_by: string;
  created_at: Date;
}

/**
 * 上传服务
 */
export class UploadService {
  /**
   * 保存文件信息到数据库
   */
  async saveFileInfo(file: Express.Multer.File, userId: string): Promise<FileInfo> {
    const id = uuidv4();
    // 生成文件URL（相对路径）
    const fileUrl = `/uploads/${file.filename}`;

    await query(
      `INSERT INTO uploaded_files (id, filename, original_name, mime_type, size, path, url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, file.filename, file.originalname, file.mimetype, file.size, file.path, fileUrl, userId]
    );

    const result = await this.getFileInfo(id);
    return result!;
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(id: string): Promise<FileInfo | null> {
    return await queryOne<FileInfo>(
      'SELECT * FROM uploaded_files WHERE id = ?',
      [id]
    );
  }

  /**
   * 获取用户的文件列表
   */
  async getUserFiles(userId: string, options: { limit?: number; offset?: number } = {}): Promise<{
    files: FileInfo[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM uploaded_files WHERE uploaded_by = ?',
      [userId]
    );
    const total = countResult?.count || 0;

    // 获取列表
    const files = await query<FileInfo>(
      `SELECT * FROM uploaded_files
       WHERE uploaded_by = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      files,
      total,
    };
  }

  /**
   * 删除文件
   */
  async deleteFile(id: string, userId: string): Promise<boolean> {
    // 获取文件信息
    const file = await this.getFileInfo(id);
    if (!file) {
      return false;
    }

    // 验证权限
    if (file.uploaded_by !== userId) {
      throw new Error('没有权限删除此文件');
    }

    // 删除物理文件
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error('Failed to delete physical file:', error);
      // 继续删除数据库记录
    }

    // 删除数据库记录
    const result = await remove(
      'DELETE FROM uploaded_files WHERE id = ?',
      [id]
    );

    return result > 0;
  }

  /**
   * 获取文件统计
   */
  async getFileStats(userId?: string): Promise<{
    total: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    const whereClause = userId ? 'WHERE uploaded_by = ?' : '';
    const params = userId ? [userId] : [];

    // 总数统计
    const totalResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM uploaded_files ${whereClause}`,
      params
    );
    const total = totalResult?.count || 0;

    // 总大小统计
    const sizeResult = await queryOne<{ total_size: number }>(
      `SELECT COALESCE(SUM(size), 0) as total_size FROM uploaded_files ${whereClause}`,
      params
    );
    const totalSize = sizeResult?.total_size || 0;

    // 按类型统计
    const typeResult = await query<{ mime_type: string; count: number }>(
      `SELECT mime_type, COUNT(*) as count FROM uploaded_files ${whereClause} GROUP BY mime_type`,
      params
    );
    const byType: Record<string, number> = {};
    typeResult.forEach(row => {
      byType[row.mime_type] = row.count;
    });

    return {
      total,
      totalSize,
      byType,
    };
  }

  /**
   * 批量删除文件
   */
  async bulkDelete(ids: string[], userId: string): Promise<number> {
    let deletedCount = 0;

    for (const id of ids) {
      const deleted = await this.deleteFile(id, userId);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }
}

// 导出单例
export const uploadService = new UploadService();
