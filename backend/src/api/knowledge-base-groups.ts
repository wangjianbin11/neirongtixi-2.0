import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { knowledgeBaseGroupService } from '../services/knowledgeBaseGroupService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const knowledgeBaseGroupsRouter: Router = Router();

/**
 * 验证中间件 - 创建分组
 */
const createGroupSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().allow('').optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: Joi.string().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
});

/**
 * 验证中间件 - 更新分组
 */
const updateGroupSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().allow('').optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: Joi.string().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
});

/**
 * GET /api/v1/knowledge-base-groups - 获取分组列表
 */
knowledgeBaseGroupsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;

    const result = await knowledgeBaseGroupService.list({
      search: search as string,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Fetch knowledge base groups error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_GROUPS_ERROR',
        message: error.message || '获取分组列表失败',
      },
    });
  }
});

/**
 * GET /api/v1/knowledge-base-groups/:id - 获取分组详情
 */
knowledgeBaseGroupsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const group = await knowledgeBaseGroupService.findById(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: '分组不存在',
        },
      });
    }

    // 获取分组下的知识库数量
    const baseCount = await knowledgeBaseGroupService.getBaseCount(id);

    res.json({
      success: true,
      data: {
        ...group,
        base_count: baseCount,
      },
    });
  } catch (error: any) {
    console.error('Fetch knowledge base group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_GROUP_ERROR',
        message: error.message || '获取分组详情失败',
      },
    });
  }
});

/**
 * POST /api/v1/knowledge-base-groups - 创建分组
 */
knowledgeBaseGroupsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 验证请求数据
    const { error, value } = createGroupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || '请求数据验证失败',
        },
      });
    }

    const group = await knowledgeBaseGroupService.create(value, req.userId);

    res.status(201).json({
      success: true,
      data: { group },
    });
  } catch (error: any) {
    console.error('Create knowledge base group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_GROUP_ERROR',
        message: error.message || '创建分组失败',
      },
    });
  }
});

/**
 * PUT /api/v1/knowledge-base-groups/:id - 更新分组
 */
knowledgeBaseGroupsRouter.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 验证请求数据
    const { error, value } = updateGroupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || '请求数据验证失败',
        },
      });
    }

    const group = await knowledgeBaseGroupService.update(id, value);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: '分组不存在',
        },
      });
    }

    res.json({
      success: true,
      data: { group },
    });
  } catch (error: any) {
    console.error('Update knowledge base group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_GROUP_ERROR',
        message: error.message || '更新分组失败',
      },
    });
  }
});

/**
 * DELETE /api/v1/knowledge-base-groups/:id - 删除分组
 */
knowledgeBaseGroupsRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const success = await knowledgeBaseGroupService.delete(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: '分组不存在',
        },
      });
    }

    res.json({
      success: true,
      data: { message: '删除成功' },
    });
  } catch (error: any) {
    console.error('Delete knowledge base group error:', error);

    // 特殊错误处理：分组下有知识库
    if (error.message && error.message.includes('还有知识库')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GROUP_NOT_EMPTY',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_GROUP_ERROR',
        message: error.message || '删除分组失败',
      },
    });
  }
});
