import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { skillService } from '../services/skillService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const skillsRouter: Router = Router();

/**
 * GET /api/v1/skills - 获取技能模板列表
 */
skillsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { category, is_active } = req.query;

    const skills = await skillService.list({
      category: category as string,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
    });

    // 禁用缓存
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: { skills },
    });
  } catch (error) {
    console.error('Fetch skills error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILLS_FETCH_ERROR',
        message: 'Failed to fetch skills',
      },
    });
  }
});

/**
 * GET /api/v1/skills/stats - 获取技能统计
 */
skillsRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await skillService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Fetch skills stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILLS_STATS_ERROR',
        message: 'Failed to fetch skills statistics',
      },
    });
  }
});

/**
 * GET /api/v1/skills/search - 搜索技能
 */
skillsRouter.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
    }

    const skills = await skillService.search(q);

    res.json({
      success: true,
      data: { skills },
    });
  } catch (error) {
    console.error('Search skills error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILLS_SEARCH_ERROR',
        message: 'Failed to search skills',
      },
    });
  }
});

/**
 * GET /api/v1/skills/:code - 获取技能模板详情
 */
skillsRouter.get('/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const skill = await skillService.findByCode(code);

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      });
    }

    res.json({
      success: true,
      data: { skill },
    });
  } catch (error) {
    console.error('Fetch skill error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_FETCH_ERROR',
        message: 'Failed to fetch skill',
      },
    });
  }
});

/**
 * POST /api/v1/skills/:code/execute - 执行技能
 */
skillsRouter.post('/:code/execute', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const { inputData, options } = req.body;

    // 验证输入
    const schema = Joi.object({
      inputData: Joi.object().required(),
      options: Joi.object().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const result = await skillService.execute(
      code,
      inputData,
      {
        ...options,
        userId: req.userId,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Execute skill error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute skill',
      },
    });
  }
});

/**
 * GET /api/v1/skills/:code/executions - 获取技能执行历史
 */
skillsRouter.get('/:code/executions', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { page = '1', pageSize = '50' } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const executions = await skillService.getExecutions({
      skill_code: code,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        executions,
        page: parseInt(page as string),
        pageSize: limit,
        total: executions.length,
      },
    });
  } catch (error) {
    console.error('Fetch skill executions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_EXECUTIONS_FETCH_ERROR',
        message: 'Failed to fetch skill executions',
      },
    });
  }
});

/**
 * POST /api/v1/skills - 创建技能模板
 */
skillsRouter.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    // 验证输入
    const schema = Joi.object({
      code: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow('', null),
      category: Joi.string().valid('data_input', 'content_production', 'distribution', 'optimization', 'support').required(),
      prompt_template: Joi.string().required(),
      input_schema: Joi.object().required(),
      output_schema: Joi.object().required(),
      version: Joi.string().optional(),
      is_active: Joi.boolean().optional(),
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

    const skill = await skillService.create(value);

    res.status(201).json({
      success: true,
      data: { skill },
    });
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_CREATE_ERROR',
        message: 'Failed to create skill',
      },
    });
  }
});

/**
 * PUT /api/v1/skills/:code - 更新技能模板
 */
skillsRouter.put('/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // 验证输入
    const schema = Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().optional().allow('', null),
      category: Joi.string().valid('data_input', 'content_production', 'distribution', 'optimization', 'support').optional(),
      prompt_template: Joi.string().optional(),
      input_schema: Joi.object().optional(),
      output_schema: Joi.object().optional(),
      version: Joi.string().optional(),
      is_active: Joi.boolean().optional(),
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

    const skill = await skillService.update(code, value);

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      });
    }

    res.json({
      success: true,
      data: { skill },
    });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_UPDATE_ERROR',
        message: 'Failed to update skill',
      },
    });
  }
});

/**
 * DELETE /api/v1/skills/:code - 删除技能模板
 */
skillsRouter.delete('/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const deleted = await skillService.delete(code);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Skill deleted successfully' },
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_DELETE_ERROR',
        message: 'Failed to delete skill',
      },
    });
  }
});

/**
 * GET /api/v1/skills/executions/recent - 获取最近的执行记录
 */
skillsRouter.get('/executions/recent', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;

    const executions = await skillService.getExecutions({
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: { executions },
    });
  } catch (error) {
    console.error('Fetch recent executions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTIONS_FETCH_ERROR',
        message: 'Failed to fetch recent executions',
      },
    });
  }
});
