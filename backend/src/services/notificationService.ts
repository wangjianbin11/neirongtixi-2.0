import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';

/**
 * 通知服务
 */
export class NotificationService {
  /**
   * 创建通知
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const id = uuidv4();

    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, link, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.type, data.title, data.message, data.link || null, data.metadata ? JSON.stringify(data.metadata) : null]
    );

    const result = await queryOne(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );
    return result;
  }

  /**
   * 批量创建通知
   */
  async createBulk(data: {
    userIds: string[];
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<any[]> {
    const created: any[] = [];

    for (const userId of data.userIds) {
      const result = await this.create({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata,
      });
      created.push(result);
    }

    return created;
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(userId: string, options: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  } = {}): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const { page = 1, pageSize = 20, unreadOnly = false } = options;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['user_id = ?'];
    const params: any[] = [userId];

    if (unreadOnly) {
      conditions.push(`is_read = 0`);
    }

    const whereClause = conditions.join(' AND ');

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications WHERE ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 获取未读数
    const unreadResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    const unreadCount = unreadResult?.count || 0;

    // 获取列表
    const notifications = await query(
      `SELECT * FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return result?.count || 0;
  }

  /**
   * 标记为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    await query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    // 检查是否更新成功
    const result = await queryOne<{ is_read: number }>(
      'SELECT is_read FROM notifications WHERE id = ?',
      [notificationId]
    );
    return result?.is_read === 1;
  }

  /**
   * 标记所有为已读
   */
  async markAllAsRead(userId: string): Promise<void> {
    await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await remove(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return result > 0;
  }

  /**
   * 删除所有通知
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    await query(
      `DELETE FROM notifications WHERE user_id = ?`,
      [userId]
    );
  }

  /**
   * 清理旧通知（超过30天的已读通知）
   */
  async cleanupOldNotifications(): Promise<number> {
    const result = await remove(
      `DELETE FROM notifications
       WHERE read_at IS NOT NULL
       AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    return result;
  }

  /**
   * 创建内容相关通知
   */
  async notifyContentEvent(data: {
    userIds: string[];
    event: 'created' | 'approved' | 'published' | 'rejected';
    contentTitle: string;
    contentId: string;
  }): Promise<any[]> {
    const messages = {
      created: '新内容创建成功',
      approved: '内容已审核通过',
      published: '内容已发布',
      rejected: '内容审核未通过',
    };

    const types = {
      created: 'content_created',
      approved: 'content_approved',
      published: 'content_published',
      rejected: 'content_rejected',
    };

    return this.createBulk({
      userIds: data.userIds,
      type: types[data.event],
      title: messages[data.event],
      message: `《${data.contentTitle}》${messages[data.event]}`,
      link: `/contents/${data.contentId}`,
    });
  }

  /**
   * 创建发布相关通知
   */
  async notifyPublishEvent(data: {
    userIds: string[];
    event: 'success' | 'failed';
    platform: string;
    contentTitle: string;
  }): Promise<any[]> {
    const platformMap: Record<string, string> = {
      youtube: 'YouTube',
      tiktok: 'TikTok',
      blog: '博客',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      reddit: 'Reddit',
      quora: 'Quora',
    };

    if (data.event === 'success') {
      return this.createBulk({
        userIds: data.userIds,
        type: 'publish_success',
        title: '发布成功',
        message: `《${data.contentTitle}》已成功发布到${platformMap[data.platform] || data.platform}`,
      });
    } else {
      return this.createBulk({
        userIds: data.userIds,
        type: 'publish_failed',
        title: '发布失败',
        message: `《${data.contentTitle}》在${platformMap[data.platform] || data.platform}发布失败`,
      });
    }
  }
}

// 导出单例
export const notificationService = new NotificationService();
