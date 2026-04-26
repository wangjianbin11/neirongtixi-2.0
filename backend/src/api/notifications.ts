import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

export const notificationRouter: Router = Router();

/**
 * GET /api/v1/notifications - 获取通知列表
 */
notificationRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', unreadOnly = 'false' } = req.query;
    const userId = req.userId!;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      unreadOnly: unreadOnly === 'true',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATIONS_FETCH_ERROR',
        message: 'Failed to fetch notifications',
      },
    });
  }
});

/**
 * GET /api/v1/notifications/unread-count - 获取未读数量
 */
notificationRouter.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Fetch unread count error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UNREAD_COUNT_ERROR',
        message: 'Failed to fetch unread count',
      },
    });
  }
});

/**
 * POST /api/v1/notifications/:id/read - 标记为已读
 */
notificationRouter.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await notificationService.markAsRead(id, userId);

    res.json({
      success: true,
      data: { message: 'Notification marked as read' },
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Failed to mark notification as read',
      },
    });
  }
});

/**
 * POST /api/v1/notifications/read-all - 标记所有为已读
 */
notificationRouter.post('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_ALL_READ_ERROR',
        message: 'Failed to mark all notifications as read',
      },
    });
  }
});

/**
 * DELETE /api/v1/notifications/:id - 删除通知
 */
notificationRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      data: { message: 'Notification deleted' },
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_NOTIFICATION_ERROR',
        message: 'Failed to delete notification',
      },
    });
  }
});

/**
 * DELETE /api/v1/notifications/all - 删除所有通知
 */
notificationRouter.delete('/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await notificationService.deleteAllNotifications(userId);

    res.json({
      success: true,
      data: { message: 'All notifications deleted' },
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ALL_ERROR',
        message: 'Failed to delete all notifications',
      },
    });
  }
});
