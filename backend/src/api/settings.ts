import { Router, Response } from 'express';
import { settingsService } from '../services/settingsService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const settingsRouter: Router = Router();

/**
 * GET /api/v1/settings - 获取所有设置（管理员）
 */
settingsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getAll();

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get settings',
      },
    });
  }
});

/**
 * GET /api/v1/settings/public - 获取公开设置
 */
settingsRouter.get('/public', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getPublic();

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get public settings',
      },
    });
  }
});

/**
 * GET /api/v1/settings/general - 获取通用设置
 */
settingsRouter.get('/general', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getGeneralSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get general settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get general settings',
      },
    });
  }
});

/**
 * PUT /api/v1/settings/general - 更新通用设置（管理员）
 */
settingsRouter.put('/general', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { siteName, siteUrl, language, timezone } = req.body;

    await settingsService.updateGeneralSettings({
      siteName,
      siteUrl,
      language,
      timezone,
    });

    const updatedSettings = await settingsService.getGeneralSettings();

    res.json({
      success: true,
      data: {
        settings: updatedSettings,
        message: 'General settings updated successfully',
      },
    });
  } catch (error) {
    console.error('Update general settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update general settings',
      },
    });
  }
});

/**
 * GET /api/v1/settings/notifications - 获取通知设置
 */
settingsRouter.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getNotificationSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get notification settings',
      },
    });
  }
});

/**
 * PUT /api/v1/settings/notifications - 更新通知设置（管理员）
 */
settingsRouter.put('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { emailEnabled, pushEnabled, smsEnabled, contentPublished, publishFailed, systemUpdates } = req.body;

    await settingsService.updateNotificationSettings({
      emailEnabled,
      pushEnabled,
      smsEnabled,
      contentPublished,
      publishFailed,
      systemUpdates,
    });

    const updatedSettings = await settingsService.getNotificationSettings();

    res.json({
      success: true,
      data: {
        settings: updatedSettings,
        message: 'Notification settings updated successfully',
      },
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update notification settings',
      },
    });
  }
});

/**
 * GET /api/v1/settings/ai - 获取AI设置
 */
settingsRouter.get('/ai', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getAISettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get AI settings',
      },
    });
  }
});

/**
 * PUT /api/v1/settings/ai - 更新AI设置（管理员）
 */
settingsRouter.put('/ai', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { provider, model, maxTokens, temperature } = req.body;

    await settingsService.updateAISettings({
      provider,
      model,
      maxTokens,
      temperature,
    });

    const updatedSettings = await settingsService.getAISettings();

    res.json({
      success: true,
      data: {
        settings: updatedSettings,
        message: 'AI settings updated successfully',
      },
    });
  } catch (error) {
    console.error('Update AI settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update AI settings',
      },
    });
  }
});

/**
 * GET /api/v1/settings/publish - 获取发布设置
 */
settingsRouter.get('/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getPublishSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get publish settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get publish settings',
      },
    });
  }
});

/**
 * PUT /api/v1/settings/publish - 更新发布设置（管理员）
 */
settingsRouter.put('/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { autoPublish, retryAttempts, retryDelay, queuePaused } = req.body;

    await settingsService.updatePublishSettings({
      autoPublish,
      retryAttempts,
      retryDelay,
      queuePaused,
    });

    const updatedSettings = await settingsService.getPublishSettings();

    res.json({
      success: true,
      data: {
        settings: updatedSettings,
        message: 'Publish settings updated successfully',
      },
    });
  } catch (error) {
    console.error('Update publish settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update publish settings',
      },
    });
  }
});

/**
 * POST /api/v1/settings/test-connection - 测试连接
 */
settingsRouter.post('/test-connection', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body;

    if (type === 'database') {
      const success = await settingsService.testDatabaseConnection();
      return res.json({
        success,
        data: {
          message: success ? 'Database connection successful' : 'Database connection failed',
        },
      });
    }

    if (type === 'redis') {
      const success = await settingsService.testRedisConnection();
      return res.json({
        success,
        data: {
          message: success ? 'Redis connection successful' : 'Redis connection failed',
        },
      });
    }

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TYPE',
        message: 'Invalid connection type. Use "database" or "redis".',
      },
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to test connection',
      },
    });
  }
});
