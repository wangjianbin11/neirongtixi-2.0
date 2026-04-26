import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { contentService } from '../services/contentService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { contentScoringService } from '../services/contentScoringService';
import { publishQueueService } from '../services/publishQueueService';

export const contentsRouter: Router = Router();

/**
 * 验证中间件 - 创建内容
 */
const createContentSchema = Joi.object({
  topic_id: Joi.string().optional().allow(null),
  title: Joi.string().required(),
  content_type: Joi.string().valid('article', 'video_script', 'social_post', 'forum_answer').required(),
  platform: Joi.string().required(),
  status: Joi.string().valid('draft', 'review', 'approved', 'published', 'archived').optional(),
  content_text: Joi.string().optional().allow('', null),
  content_metadata: Joi.object().optional(),
  generated_by_skill: Joi.string().optional().allow('', null),
});

/**
 * 验证中间件 - 更新内容
 */
const updateContentSchema = Joi.object({
  title: Joi.string().optional(),
  content_type: Joi.string().valid('article', 'video_script', 'social_post', 'forum_answer').optional(),
  platform: Joi.string().optional(),
  status: Joi.string().valid('draft', 'review', 'approved', 'published', 'archived').optional(),
  content_text: Joi.string().optional().allow('', null),
  content_metadata: Joi.object().optional(),
  reviewed_by: Joi.string().optional().allow('', null),
});

/**
 * GET /api/v1/contents - 获取内容列表
 */
contentsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      content_type,
      platform,
      status,
      topic_id: topicId,
      search,
    } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const result = await contentService.list({
      limit,
      offset,
      content_type: content_type as string,
      platform: platform as string,
      status: status as string,
      topic_id: topicId as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: {
        contents: result.contents,
        total: result.total,
        page: parseInt(page as string),
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('Fetch contents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENTS_FETCH_ERROR',
        message: 'Failed to fetch contents',
      },
    });
  }
});

/**
 * GET /api/v1/contents/stats - 获取内容统计
 */
contentsRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await contentService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Fetch contents stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENTS_STATS_ERROR',
        message: 'Failed to fetch contents statistics',
      },
    });
  }
});

/**
 * POST /api/v1/contents - 创建内容
 */
contentsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 验证输入
    const { error, value } = createContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const content = await contentService.create(value, req.userId!);

    res.status(201).json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_CREATE_ERROR',
        message: 'Failed to create content',
      },
    });
  }
});

/**
 * POST /api/v1/contents/batch - 批量导入内容
 */
contentsRouter.post('/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contents } = req.body;

    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Contents array is required',
        },
      });
    }

    // 验证每个内容
    for (const content of contents) {
      const { error } = createContentSchema.validate(content);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid content data: ${error.details[0].message}`,
          },
        });
      }
    }

    const created = await contentService.bulkCreate(contents, req.userId!);

    res.status(201).json({
      success: true,
      data: {
        contents: created,
        count: created.length,
      },
    });
  } catch (error) {
    console.error('Batch import contents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_BATCH_IMPORT_ERROR',
        message: 'Failed to batch import contents',
      },
    });
  }
});

/**
 * POST /api/v1/contents/generate - AI生成内容
 */
contentsRouter.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      topic_id: topicId,
      topic_title: topicTitle,
      topic_description: topicDescription,
      content_type: contentType,
      platform,
      target_customer: targetCustomer,
    } = req.body;

    // 验证必填字段
    if (!topicTitle || !contentType || !platform || !targetCustomer) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: topic_title, content_type, platform, target_customer',
        },
      });
    }

    const content = await contentService.generateFromTopic(
      topicId || null,
      topicTitle,
      topicDescription || null,
      contentType,
      platform,
      targetCustomer,
      req.userId!
    );

    res.status(201).json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate content',
      },
    });
  }
});

/**
 * GET /api/v1/contents/:id - 获取内容详情
 */
contentsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const content = await contentService.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('Fetch content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_FETCH_ERROR',
        message: 'Failed to fetch content',
      },
    });
  }
});

/**
 * PUT /api/v1/contents/:id - 更新内容
 */
contentsRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证输入
    const { error, value } = updateContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const content = await contentService.update(id, value);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_UPDATE_ERROR',
        message: 'Failed to update content',
      },
    });
  }
});

/**
 * DELETE /api/v1/contents/:id - 删除内容
 */
contentsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await contentService.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Content deleted successfully' },
    });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_DELETE_ERROR',
        message: 'Failed to delete content',
      },
    });
  }
});

/**
 * POST /api/v1/contents/:id/approve - 审核通过内容
 */
contentsRouter.post('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const content = await contentService.updateStatus(id, 'approved');

    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('Approve content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_APPROVE_ERROR',
        message: 'Failed to approve content',
      },
    });
  }
});

/**
 * POST /api/v1/contents/:id/publish - 发布内容
 */
contentsRouter.post('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, scheduledAt, publishOptions } = req.body;

    // 验证必填字段
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Platform is required',
        },
      });
    }

    // 检查内容是否存在
    const content = await contentService.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    // 创建发布任务到队列
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;
    const job = await publishQueueService.addPublishJob({
      contentId: id,
      platform,
      scheduledAt: scheduledDate,
      publishOptions,
      userId: req.userId!,
    }, scheduledDate);

    // 更新内容状态为scheduled（如果设置了定时发布）
    if (scheduledAt) {
      await contentService.updateStatus(id, 'approved');
    }

    res.json({
      success: true,
      data: {
        content,
        taskId: job.id,
        message: scheduledAt
          ? `Content scheduled for publishing at ${scheduledAt}`
          : 'Content queued for publishing',
        platform,
        scheduledAt,
      },
    });
  } catch (error) {
    console.error('Publish content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_PUBLISH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish content',
      },
    });
  }
});

/**
 * GET /api/v1/contents/topic/:topicId - 根据话题获取所有内容
 */
contentsRouter.get('/topic/:topicId', authenticate, async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const contents = await contentService.findByTopicId(topicId);

    res.json({
      success: true,
      data: { contents },
    });
  } catch (error) {
    console.error('Fetch contents by topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENTS_FETCH_ERROR',
        message: 'Failed to fetch contents for topic',
      },
    });
  }
});

/**
 * POST /api/v1/contents/batch-update-status - 批量更新内容状态
 */
contentsRouter.post('/batch-update-status', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content IDs array is required',
        },
      });
    }

    const contents = await contentService.bulkUpdateStatus(ids, status);

    res.json({
      success: true,
      data: {
        contents,
        count: contents.length,
      },
    });
  } catch (error) {
    console.error('Batch update status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_BATCH_UPDATE_ERROR',
        message: 'Failed to batch update content status',
      },
    });
  }
});

/**
 * POST /api/v1/contents/bulk-delete - 批量删除内容
 */
contentsRouter.post('/bulk-delete', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content IDs array is required',
        },
      });
    }

    const count = await contentService.bulkDelete(ids);

    res.json({
      success: true,
      data: {
        message: `Successfully deleted ${count} contents`,
        count,
      },
    });
  } catch (error) {
    console.error('Bulk delete contents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_BULK_DELETE_ERROR',
        message: 'Failed to bulk delete contents',
      },
    });
  }
});

/**
 * POST /api/v1/contents/bulk-update - 批量更新内容
 */
contentsRouter.post('/bulk-update', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content IDs array is required',
        },
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Updates object is required',
        },
      });
    }

    const contents = await contentService.bulkUpdate(ids, updates);

    res.json({
      success: true,
      data: {
        contents,
        count: contents.length,
      },
    });
  } catch (error) {
    console.error('Bulk update contents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_BULK_UPDATE_ERROR',
        message: 'Failed to bulk update contents',
      },
    });
  }
});

/**
 * POST /api/v1/contents/bulk-approve - 批量批准内容
 */
contentsRouter.post('/bulk-approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content IDs array is required',
        },
      });
    }

    const contents = await contentService.bulkUpdateStatus(ids, 'approved');

    res.json({
      success: true,
      data: {
        contents,
        count: contents.length,
      },
    });
  } catch (error) {
    console.error('Bulk approve contents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_BULK_APPROVE_ERROR',
        message: 'Failed to bulk approve contents',
      },
    });
  }
});

/**
 * GET /api/v1/contents/export - 导出内容
 */
contentsRouter.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      content_type,
      platform,
      status,
      search,
    } = req.query;

    const contents = await contentService.list({
      limit: 10000,
      offset: 0,
      content_type: content_type as string,
      platform: platform as string,
      status: status as string,
      search: search as string,
    });

    // 转换为CSV格式
    const headers = ['标题', '类型', '平台', '状态', '内容预览', '创建时间'];
    const rows = contents.contents.map((c) => [
      c.title,
      c.content_type,
      c.platform,
      c.status,
      (c.content_text || '').substring(0, 100).replace(/"/g, '""').replace(/\n/g, ' '),
      c.created_at,
    ]);

    let csv = headers.join(',') + '\n';
    csv += rows.map((row) => `"${row.join('"","')}"`).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contents.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Export contents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_EXPORT_ERROR',
        message: 'Failed to export contents',
      },
    });
  }
});

/**
 * GET /api/v1/contents/export-template - 获取导出模板
 */
contentsRouter.get('/export-template', authenticate, async (req: Request, res: Response) => {
  try {
    const headers = ['标题', '内容类型', '平台', '状态', '内容正文'];
    const example = [
      'AI工具选择指南',
      'article',
      'wechat',
      'draft',
      '这是一篇关于如何选择AI工具的详细介绍文章...'
    ];

    let csv = headers.join(',') + '\n';
    csv += example.join(',');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contents_template.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Export template error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_EXPORT_ERROR',
        message: 'Failed to export template',
      },
    });
  }
});

/**
 * POST /api/v1/contents/:id/analyze - AI分析内容并生成E-E-A-T评分
 */
contentsRouter.post('/:id/analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查内容是否存在
    const content = await contentService.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    // 执行AI分析（异步执行，不阻塞响应）
    contentScoringService.analyzeContent(id)
      .then(result => {
        console.log('[Content Analysis Completed]', id, result.overall_score);
      })
      .catch(error => {
        console.error('[Content Analysis Failed]', id, error.message);
      });

    res.json({
      success: true,
      data: {
        content_id: id,
        message: 'Content analysis started successfully',
        note: 'Analysis is running in the background. Check back shortly for results.',
      },
    });
  } catch (error: any) {
    console.error('Start content analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_ANALYSIS_ERROR',
        message: error.message || 'Failed to start content analysis',
      },
    });
  }
});

/**
 * GET /api/v1/contents/:id/score - 获取内容评分结果
 */
contentsRouter.get('/:id/score', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scoreResult = await contentScoringService.getScoreByContentId(id);

    if (!scoreResult) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCORE_NOT_FOUND',
          message: 'No score found for this content. Please run analysis first.',
        },
      });
    }

    res.json({
      success: true,
      data: scoreResult,
    });
  } catch (error: any) {
    console.error('Get content score error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_SCORE_ERROR',
        message: error.message || 'Failed to get content score',
      },
    });
  }
});

/**
 * POST /api/v1/contents/:id/analyze-sync - 同步分析内容并返回结果
 */
contentsRouter.post('/:id/analyze-sync', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查内容是否存在
    const content = await contentService.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    // 同步执行分析
    const scoreResult = await contentScoringService.analyzeContent(id);

    res.json({
      success: true,
      data: scoreResult,
    });
  } catch (error: any) {
    console.error('Analyze content sync error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_ANALYSIS_SYNC_ERROR',
        message: error.message || 'Failed to analyze content',
      },
    });
  }
});

/**
 * POST /api/v1/contents/batch-analyze - 批量分析内容
 */
contentsRouter.post('/batch-analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content IDs array is required',
        },
      });
    }

    // 异步批量分析
    contentScoringService.batchAnalyze(ids)
      .then(results => {
        console.log('[Batch Content Analysis Completed]', results.length);
      })
      .catch(error => {
        console.error('[Batch Content Analysis Failed]', error.message);
      });

    res.json({
      success: true,
      data: {
        message: 'Batch analysis started successfully',
        count: ids.length,
        note: 'Analysis is running in the background.',
      },
    });
  } catch (error: any) {
    console.error('Start batch analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_ANALYSIS_ERROR',
        message: error.message || 'Failed to start batch analysis',
      },
    });
  }
});
