import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { knowledgeBaseDocumentService } from '../services/knowledgeBaseDocumentService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const knowledgeBasesRouter: Router = Router();

/**
 * 验证中间件 - 创建知识库
 */
const createBaseSchema = Joi.object({
  group_id: Joi.string().uuid().optional(),
  name: Joi.string().required().max(255),
  description: Joi.string().allow('').optional(),
  type: Joi.string().valid('manual', 'ai_generated', 'imported').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

/**
 * 验证中间件 - 更新知识库
 */
const updateBaseSchema = Joi.object({
  group_id: Joi.string().uuid().optional(),
  name: Joi.string().max(255).optional(),
  description: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  is_active: Joi.boolean().optional(),
});

/**
 * GET /api/v1/knowledge-bases - 获取知识库列表
 */
knowledgeBasesRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      group_id,
      type,
      is_active,
      search,
    } = req.query;

    const result = await knowledgeBaseService.list({
      group_id: group_id as string,
      type: type as 'manual' | 'ai_generated' | 'imported' | undefined,
      is_active: is_active ? is_active === 'true' : undefined,
      search: search as string,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Fetch knowledge bases error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BASES_ERROR',
        message: error.message || '获取知识库列表失败',
      },
    });
  }
});

/**
 * GET /api/v1/knowledge-bases/:id - 获取知识库详情
 */
knowledgeBasesRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const base = await knowledgeBaseService.findById(id);

    if (!base) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BASE_NOT_FOUND',
          message: '知识库不存在',
        },
      });
    }

    res.json({
      success: true,
      data: { base },
    });
  } catch (error: any) {
    console.error('Fetch knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BASE_ERROR',
        message: error.message || '获取知识库详情失败',
      },
    });
  }
});

/**
 * POST /api/v1/knowledge-bases - 创建知识库
 */
knowledgeBasesRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 验证请求数据
    const { error, value } = createBaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || '请求数据验证失败',
        },
      });
    }

    const base = await knowledgeBaseService.create(value, req.userId);

    res.status(201).json({
      success: true,
      data: { base },
    });
  } catch (error: any) {
    console.error('Create knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_BASE_ERROR',
        message: error.message || '创建知识库失败',
      },
    });
  }
});

/**
 * PUT /api/v1/knowledge-bases/:id - 更新知识库
 */
knowledgeBasesRouter.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 验证请求数据
    const { error, value } = updateBaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || '请求数据验证失败',
        },
      });
    }

    const base = await knowledgeBaseService.update(id, value);

    if (!base) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BASE_NOT_FOUND',
          message: '知识库不存在',
        },
      });
    }

    res.json({
      success: true,
      data: { base },
    });
  } catch (error: any) {
    console.error('Update knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_BASE_ERROR',
        message: error.message || '更新知识库失败',
      },
    });
  }
});

/**
 * DELETE /api/v1/knowledge-bases/:id - 删除知识库
 */
knowledgeBasesRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const success = await knowledgeBaseService.delete(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BASE_NOT_FOUND',
          message: '知识库不存在',
        },
      });
    }

    res.json({
      success: true,
      data: { message: '删除成功' },
    });
  } catch (error: any) {
    console.error('Delete knowledge base error:', error);

    // 特殊错误处理：知识库下有文档
    if (error.message && error.message.includes('还有文档')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BASE_NOT_EMPTY',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_BASE_ERROR',
        message: error.message || '删除知识库失败',
      },
    });
  }
});

/**
 * GET /api/v1/knowledge-bases/:id/documents - 获取知识库的文档列表
 */
knowledgeBasesRouter.get('/:id/documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page, pageSize, source_type, status, search } = req.query;

    // 验证知识库是否存在
    const base = await knowledgeBaseService.findById(id);
    if (!base) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BASE_NOT_FOUND',
          message: '知识库不存在',
        },
      });
    }

    const result = await knowledgeBaseDocumentService.listByKnowledgeBase(id, {
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      source_type: source_type as string,
      status: status as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: {
        ...result,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
      },
    });
  } catch (error: any) {
    console.error('Fetch documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_DOCUMENTS_ERROR',
        message: error.message || '获取文档列表失败',
      },
    });
  }
});
