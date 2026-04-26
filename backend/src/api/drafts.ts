import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { draftService } from '../services/draftService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const draftsRouter: Router = Router();

/**
 * 验证中间件 - 创建草稿
 */
const createDraftSchema = Joi.object({
  execution_id: Joi.string().optional(),
  workflow_id: Joi.string().optional(),
  title: Joi.string().required().max(500),
  content_type: Joi.string().valid(
    'blog',
    'social_xiaohongshu',
    'social_wechat',
    'social_douyin',
    'social_weibo',
    'social_linkedin',
    'video_script',
    'report'
  ).required(),
  content_json: Joi.object().required(),
  platform: Joi.string().max(50).optional(),
  keyword_id: Joi.string().optional(),
  topic_id: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

/**
 * 验证中间件 - 更新草稿
 */
const updateDraftSchema = Joi.object({
  title: Joi.string().max(500),
  content_json: Joi.object(),
  status: Joi.string().valid('draft', 'pending_review', 'approved', 'rejected', 'published'),
  review_comment: Joi.string().allow('').max(1000),
});

/**
 * 验证中间件 - 审核草稿
 */
const reviewDraftSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  comment: Joi.string().allow('').max(1000),
});

// ============================================
// 草稿CRUD
// ============================================

/**
 * GET /api/v1/drafts - 获取草稿列表
 */
draftsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      status,
      content_type,
      platform,
      keyword_id,
      search,
    } = req.query;

    const result = await draftService.list({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string,
      content_type: content_type as string,
      platform: platform as string,
      keyword_id: keyword_id as string,
      search: search as string,
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
      success: true,
      data: {
        drafts: result.drafts,
        total: result.total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    console.error('Fetch drafts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFTS_FETCH_ERROR',
        message: 'Failed to fetch drafts',
      },
    });
  }
});

/**
 * GET /api/v1/drafts/stats - 获取草稿统计
 */
draftsRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await draftService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Fetch drafts stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFTS_STATS_ERROR',
        message: 'Failed to fetch drafts statistics',
      },
    });
  }
});

/**
 * POST /api/v1/drafts - 创建草稿
 */
draftsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = createDraftSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const draft = await draftService.create(value, req.userId);

    res.status(201).json({
      success: true,
      data: { draft },
    });
  } catch (error) {
    console.error('Create draft error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_CREATE_ERROR',
        message: 'Failed to create draft',
      },
    });
  }
});

/**
 * POST /api/v1/drafts/bulk - 批量创建草稿
 */
draftsRouter.post('/bulk', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { drafts } = req.body;

    if (!Array.isArray(drafts)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Drafts must be an array',
        },
      });
    }

    // 验证每个草稿
    for (const draft of drafts) {
      const { error } = createDraftSchema.validate(draft);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
          },
        });
      }
    }

    const created = await draftService.bulkCreate(drafts, req.userId);

    res.status(201).json({
      success: true,
      data: { drafts: created, count: created.length },
    });
  } catch (error) {
    console.error('Bulk create drafts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFTS_BULK_CREATE_ERROR',
        message: 'Failed to bulk create drafts',
      },
    });
  }
});

/**
 * GET /api/v1/drafts/:id - 获取草稿详情
 */
draftsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await draftService.findById(id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: 'Draft not found',
        },
      });
    }

    res.json({
      success: true,
      data: { draft },
    });
  } catch (error) {
    console.error('Fetch draft error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_FETCH_ERROR',
        message: 'Failed to fetch draft',
      },
    });
  }
});

/**
 * PUT /api/v1/drafts/:id - 更新草稿
 */
draftsRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error, value } = updateDraftSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const draft = await draftService.update(id, value);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: 'Draft not found',
        },
      });
    }

    res.json({
      success: true,
      data: { draft },
    });
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_UPDATE_ERROR',
        message: 'Failed to update draft',
      },
    });
  }
});

/**
 * DELETE /api/v1/drafts/:id - 删除草稿
 */
draftsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await draftService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: 'Draft not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Deleted successfully' },
    });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_DELETE_ERROR',
        message: 'Failed to delete draft',
      },
    });
  }
});

/**
 * POST /api/v1/drafts/bulk-delete - 批量删除草稿
 */
draftsRouter.post('/bulk-delete', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDs must be an array',
        },
      });
    }

    const count = await draftService.bulkDelete(ids);

    res.json({
      success: true,
      data: { message: 'Deleted successfully', count },
    });
  } catch (error) {
    console.error('Bulk delete drafts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFTS_BULK_DELETE_ERROR',
        message: 'Failed to bulk delete drafts',
      },
    });
  }
});

// ============================================
// 审核流程
// ============================================

/**
 * POST /api/v1/drafts/:id/submit - 提交审核
 */
draftsRouter.post('/:id/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await draftService.submitForReview(id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: 'Draft not found',
        },
      });
    }

    res.json({
      success: true,
      data: { draft },
    });
  } catch (error) {
    console.error('Submit draft for review error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_SUBMIT_ERROR',
        message: 'Failed to submit draft for review',
      },
    });
  }
});

/**
 * POST /api/v1/drafts/:id/review - 审核草稿
 */
draftsRouter.post('/:id/review', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error, value } = reviewDraftSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const draft = await draftService.review(id, value, req.userId!);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: 'Draft not found',
        },
      });
    }

    res.json({
      success: true,
      data: { draft },
    });
  } catch (error) {
    console.error('Review draft error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_REVIEW_ERROR',
        message: error instanceof Error ? error.message : 'Failed to review draft',
      },
    });
  }
});

/**
 * POST /api/v1/drafts/:id/publish - 发布草稿
 */
draftsRouter.post('/:id/publish', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await draftService.publish(id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: 'Draft not found',
        },
      });
    }

    res.json({
      success: true,
      data: { draft },
    });
  } catch (error) {
    console.error('Publish draft error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFT_PUBLISH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish draft',
      },
    });
  }
});

/**
 * GET /api/v1/drafts/execution/:executionId - 获取执行产生的所有草稿
 */
draftsRouter.get('/execution/:executionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const drafts = await draftService.findByExecutionId(executionId);

    res.json({
      success: true,
      data: { drafts },
    });
  } catch (error) {
    console.error('Fetch drafts by execution error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DRAFTS_FETCH_ERROR',
        message: 'Failed to fetch drafts',
      },
    });
  }
});
