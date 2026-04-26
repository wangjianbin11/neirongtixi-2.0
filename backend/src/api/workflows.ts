import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { workflowService } from '../services/workflowService';
import { getWorkflowExecutor } from '../services/workflowExecutor';
import { skillRegistry } from '../skills/skillRegistry';
import { authenticate, AuthRequest } from '../middleware/auth';

export const workflowsRouter: Router = Router();

/**
 * 验证中间件 - 创建工作流
 */
const createWorkflowSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().allow('').max(1000),
  category: Joi.string().valid('blog', 'social_media', 'video', 'report', 'custom', 'bilingual').optional(),
  is_template: Joi.boolean().optional(),
  nodes_json: Joi.array().items(Joi.object()).min(1).required(),
  default_params: Joi.object().optional(),
  estimated_time: Joi.number().integer().min(0).optional(),
  estimated_cost: Joi.number().min(0).optional(),
});

/**
 * 验证中间件 - 更新工作流
 */
const updateWorkflowSchema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string().allow('').max(1000),
  category: Joi.string().valid('blog', 'social_media', 'video', 'report', 'custom', 'bilingual'),
  nodes_json: Joi.array().items(Joi.object()).min(1),
  default_params: Joi.object(),
  estimated_time: Joi.number().integer().min(0),
  estimated_cost: Joi.number().min(0),
});

/**
 * 验证中间件 - 执行工作流
 */
const executeWorkflowSchema = Joi.object({
  workflow_id: Joi.string().required(),
  input_data: Joi.object().required(),
});

// ============================================
// 工作流CRUD
// ============================================

/**
 * GET /api/v1/workflows - 获取工作流列表
 */
workflowsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      category,
      is_template,
      search,
    } = req.query;

    const result = await workflowService.list({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      category: category as string,
      is_template: is_template === 'true' ? true : is_template === 'false' ? false : undefined,
      search: search as string,
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
      success: true,
      data: {
        workflows: result.workflows,
        total: result.total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    console.error('Fetch workflows error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOWS_FETCH_ERROR',
        message: 'Failed to fetch workflows',
      },
    });
  }
});

/**
 * GET /api/v1/workflows/templates - 获取模板列表
 */
workflowsRouter.get('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = await workflowService.getTemplates();

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error('Fetch templates error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATES_FETCH_ERROR',
        message: 'Failed to fetch templates',
      },
    });
  }
});

/**
 * GET /api/v1/workflows/skills - 获取技能列表
 */
workflowsRouter.get('/skills', authenticate, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let skills;
    if (category) {
      skills = skillRegistry.getByCategory(category as string);
    } else {
      skills = skillRegistry.getActive();
    }

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
 * POST /api/v1/workflows - 创建工作流
 */
workflowsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Workflow Create] Request body:', JSON.stringify(req.body, null, 2));
    const { error, value } = createWorkflowSchema.validate(req.body);
    if (error) {
      console.error('[Workflow Create] Validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const workflow = await workflowService.create(value, req.userId);
    console.log('[Workflow Create] Created workflow ID:', workflow.id);

    res.status(201).json({
      success: true,
      data: { workflow },
    });
  } catch (error) {
    console.error('[Workflow Create] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_CREATE_ERROR',
        message: 'Failed to create workflow',
      },
    });
  }
});

/**
 * GET /api/v1/workflows/:id - 获取工作流详情
 */
workflowsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await workflowService.findById(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    res.json({
      success: true,
      data: { workflow },
    });
  } catch (error) {
    console.error('Fetch workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_FETCH_ERROR',
        message: 'Failed to fetch workflow',
      },
    });
  }
});

/**
 * PUT /api/v1/workflows/:id - 更新工作流
 */
workflowsRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('[Workflow Update] ID:', id);
    console.log('[Workflow Update] Request body:', JSON.stringify(req.body, null, 2));
    const { error, value } = updateWorkflowSchema.validate(req.body);
    if (error) {
      console.error('[Workflow Update] Validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const workflow = await workflowService.update(id, value);

    if (!workflow) {
      console.error('[Workflow Update] Workflow not found:', id);
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    console.log('[Workflow Update] Updated successfully');
    res.json({
      success: true,
      data: { workflow },
    });
  } catch (error) {
    console.error('[Workflow Update] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_UPDATE_ERROR',
        message: 'Failed to update workflow',
      },
    });
  }
});

/**
 * DELETE /api/v1/workflows/:id - 删除工作流
 */
workflowsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await workflowService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Deleted successfully' },
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_DELETE_ERROR',
        message: 'Failed to delete workflow',
      },
    });
  }
});

/**
 * POST /api/v1/workflows/:id/duplicate - 复制工作流
 */
workflowsRouter.post('/:id/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await workflowService.duplicate(id, req.userId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found',
        },
      });
    }

    res.status(201).json({
      success: true,
      data: { workflow },
    });
  } catch (error) {
    console.error('Duplicate workflow error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_DUPLICATE_ERROR',
        message: 'Failed to duplicate workflow',
      },
    });
  }
});

// ============================================
// 执行相关
// ============================================

/**
 * POST /api/v1/workflows/:id/execute - 执行工作流
 */
workflowsRouter.post('/:id/execute', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { input_data } = req.body;

    console.log('[Workflow Execute] ===== EXECUTE REQUEST =====');
    console.log('[Workflow Execute] Workflow ID:', id);
    console.log('[Workflow Execute] Input data:', JSON.stringify(input_data));
    console.log('[Workflow Execute] Input data type:', typeof input_data);
    console.log('[Workflow Execute] Input data is null?:', input_data === null);
    console.log('[Workflow Execute] Input data is array?:', Array.isArray(input_data));

    if (!input_data || typeof input_data !== 'object' || Array.isArray(input_data)) {
      console.error('[Workflow Execute] Validation failed: input_data is invalid');
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'input_data is required and must be an object',
        },
      });
    }

    // 创建执行记录
    console.log('[Workflow Execute] Creating execution record...');
    const execution = await workflowService.createExecution(
      {
        workflow_id: id,
        input_data,
      },
      req.userId
    );
    console.log('[Workflow Execute] Execution created:', execution.id);

    // 获取执行器并异步执行
    const executor = getWorkflowExecutor();
    console.log('[Workflow Execute] Executor initialized?:', !!executor);
    if (!executor) {
      console.error('[Workflow Execute] Executor not initialized');
      return res.status(500).json({
        success: false,
        error: {
          code: 'EXECUTOR_NOT_INITIALIZED',
          message: 'Workflow executor not initialized',
        },
      });
    }

    // 异步执行（不等待完成）
    console.log('[Workflow Execute] Starting async execution...');
    executor.execute(execution.id, id, input_data, req.userId).catch(error => {
      console.error('[Workflow Execute] Async execution error:', error);
    });

    console.log('[Workflow Execute] Sending success response');
    res.json({
      success: true,
      data: {
        execution,
        message: 'Workflow execution started',
      },
    });
  } catch (error) {
    console.error('[Workflow Execute] Start workflow execution error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_EXECUTION_ERROR',
        message: 'Failed to start workflow execution',
      },
    });
  }
});

/**
 * GET /api/v1/workflows/executions - 获取执行列表
 */
workflowsRouter.get('/executions/list', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      status,
      workflow_id,
    } = req.query;

    const result = await workflowService.listExecutions({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string,
      workflow_id: workflow_id as string,
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
      success: true,
      data: {
        executions: result.executions,
        total: result.total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    console.error('Fetch executions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTIONS_FETCH_ERROR',
        message: 'Failed to fetch executions',
      },
    });
  }
});

/**
 * GET /api/v1/workflows/executions/:id - 获取执行详情
 */
workflowsRouter.get('/executions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const execution = await workflowService.findExecutionById(id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EXECUTION_NOT_FOUND',
          message: 'Execution not found',
        },
      });
    }

    // 获取执行日志
    const logs = await workflowService.getExecutionLogs(id);

    res.json({
      success: true,
      data: {
        execution,
        logs,
      },
    });
  } catch (error) {
    console.error('Fetch execution error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_FETCH_ERROR',
        message: 'Failed to fetch execution',
      },
    });
  }
});

/**
 * POST /api/v1/workflows/executions/:id/cancel - 取消执行
 */
workflowsRouter.post('/executions/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executor = getWorkflowExecutor();

    if (!executor) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'EXECUTOR_NOT_INITIALIZED',
          message: 'Workflow executor not initialized',
        },
      });
    }

    executor.cancel(id);

    res.json({
      success: true,
      data: { message: 'Cancellation requested' },
    });
  } catch (error) {
    console.error('Cancel execution error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_CANCEL_ERROR',
        message: 'Failed to cancel execution',
      },
    });
  }
});
