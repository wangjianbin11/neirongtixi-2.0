import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { publishQueueService } from '../services/publishQueueService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const publishRouter: Router = Router();

/**
 * GET /api/v1/publish/stats - 获取发布队列统计
 */
publishRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const queueStats = await publishQueueService.getQueueStats();

    res.json({
      success: true,
      data: queueStats,
    });
  } catch (error) {
    console.error('Fetch publish stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLISH_STATS_ERROR',
        message: 'Failed to fetch publish statistics',
      },
    });
  }
});

/**
 * GET /api/v1/publish/tasks - 获取发布任务列表
 */
publishRouter.get('/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20', status, platform } = req.query;

    const result = await publishQueueService.getPublishTasks({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string,
      platform: platform as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Fetch publish tasks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLISH_TASKS_FETCH_ERROR',
        message: 'Failed to fetch publish tasks',
      },
    });
  }
});

/**
 * POST /api/v1/publish/tasks - 创建发布任务
 */
publishRouter.post('/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, platform, scheduledAt, publishOptions } = req.body;

    // 验证输入
    const schema = Joi.object({
      contentId: Joi.string().required(),
      platform: Joi.string().valid('youtube', 'tiktok', 'blog', 'twitter', 'linkedin', 'reddit', 'quora').required(),
      scheduledAt: Joi.date().optional(),
      publishOptions: Joi.object().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    // 添加发布任务到队列
    const job = await publishQueueService.addPublishJob({
      contentId: value.contentId,
      platform: value.platform,
      scheduledAt: value.scheduledAt ? new Date(value.scheduledAt) : undefined,
      publishOptions: value.publishOptions,
      userId: req.userId!,
    }, value.scheduledAt ? new Date(value.scheduledAt) : undefined);

    res.status(201).json({
      success: true,
      data: {
        jobId: job.id,
        message: 'Publish task created successfully',
      },
    });
  } catch (error) {
    console.error('Create publish task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLISH_TASK_CREATE_ERROR',
        message: 'Failed to create publish task',
      },
    });
  }
});

/**
 * POST /api/v1/publish/tasks/:id/retry - 重试发布任务
 */
publishRouter.post('/tasks/:id/retry', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await publishQueueService.retryPublishJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Publish task not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        message: 'Publish task retry scheduled',
      },
    });
  } catch (error) {
    console.error('Retry publish task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLISH_TASK_RETRY_ERROR',
        message: 'Failed to retry publish task',
      },
    });
  }
});

/**
 * DELETE /api/v1/publish/tasks/:id - 取消发布任务
 */
publishRouter.delete('/tasks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cancelled = await publishQueueService.cancelPublishJob(id);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Publish task not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Publish task cancelled successfully' },
    });
  } catch (error) {
    console.error('Cancel publish task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLISH_TASK_CANCEL_ERROR',
        message: 'Failed to cancel publish task',
      },
    });
  }
});

/**
 * POST /api/v1/publish/queue/pause - 暂停发布队列
 */
publishRouter.post('/queue/pause', authenticate, async (req: Request, res: Response) => {
  try {
    await publishQueueService.pause();

    res.json({
      success: true,
      data: { message: 'Publish queue paused successfully' },
    });
  } catch (error) {
    console.error('Pause publish queue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_PAUSE_ERROR',
        message: 'Failed to pause publish queue',
      },
    });
  }
});

/**
 * POST /api/v1/publish/queue/resume - 恢复发布队列
 */
publishRouter.post('/queue/resume', authenticate, async (req: Request, res: Response) => {
  try {
    await publishQueueService.resume();

    res.json({
      success: true,
      data: { message: 'Publish queue resumed successfully' },
    });
  } catch (error) {
    console.error('Resume publish queue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_RESUME_ERROR',
        message: 'Failed to resume publish queue',
      },
    });
  }
});

/**
 * POST /api/v1/publish/queue/clear - 清空发布队列
 */
publishRouter.post('/queue/clear', authenticate, async (req: Request, res: Response) => {
  try {
    await publishQueueService.obliterate();

    res.json({
      success: true,
      data: { message: 'Publish queue cleared successfully' },
    });
  } catch (error) {
    console.error('Clear publish queue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_CLEAR_ERROR',
        message: 'Failed to clear publish queue',
      },
    });
  }
});
