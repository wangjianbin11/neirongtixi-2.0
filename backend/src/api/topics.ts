import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { topicService } from '../services/topicService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { knowledgeSearchService } from '../services/knowledgeSearchService';
import { topicResearchService } from '../services/topicResearchService';
import {
  sendResearchProgress,
  sendResearchComplete,
  sendResearchError,
  sendProgressUpdate,
} from '../services/socketService';
import { contentService } from '../services/contentService';

export const topicsRouter: Router = Router();

/**
 * 验证中间件 - 创建话题
 */
const createTopicSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow('', null),
  topic_type: Joi.string().valid('tutorial', 'qa', 'case_study', 'insight', 'review', 'comparison').required(),
  target_customer: Joi.string().valid('startup', 'experienced', 'team', 'local').required(),
  priority: Joi.string().valid('S', 'A', 'B', 'C').optional(),
  estimated_effort: Joi.number().min(1).max(10).optional(),
});

/**
 * 验证中间件 - 更新话题
 */
const updateTopicSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional().allow('', null),
  topic_type: Joi.string().valid('tutorial', 'qa', 'case_study', 'insight', 'review', 'comparison').optional(),
  target_customer: Joi.string().valid('startup', 'experienced', 'team', 'local').optional(),
  priority: Joi.string().valid('S', 'A', 'B', 'C').optional(),
  status: Joi.string().valid('pending', 'approved', 'in_production', 'completed', 'published').optional(),
  estimated_effort: Joi.number().min(1).max(10).optional(),
  assigned_to: Joi.string().optional().allow('', null),
});

/**
 * GET /api/v1/topics - 获取话题列表
 */
topicsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      topic_type,
      priority,
      target_customer: targetCustomer,
      status,
      search,
    } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const result = await topicService.list({
      limit,
      offset,
      topic_type: topic_type as string,
      priority: priority as string,
      target_customer: targetCustomer as string,
      status: status as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: {
        topics: result.topics,
        total: result.total,
        page: parseInt(page as string),
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('Fetch topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPICS_FETCH_ERROR',
        message: 'Failed to fetch topics',
      },
    });
  }
});

/**
 * GET /api/v1/topics/stats - 获取话题统计
 */
topicsRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await topicService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Fetch topics stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPICS_STATS_ERROR',
        message: 'Failed to fetch topics statistics',
      },
    });
  }
});

/**
 * POST /api/v1/topics - 创建话题
 */
topicsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 验证输入
    const { error, value } = createTopicSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const topic = await topicService.create(value, req.userId!);

    res.status(201).json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_CREATE_ERROR',
        message: 'Failed to create topic',
      },
    });
  }
});

/**
 * GET /api/v1/topics/:id - 获取话题详情
 */
topicsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topic = await topicService.findById(id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    res.json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    console.error('Fetch topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_FETCH_ERROR',
        message: 'Failed to fetch topic',
      },
    });
  }
});

/**
 * PUT /api/v1/topics/:id - 更新话题
 */
topicsRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证输入
    const { error, value } = updateTopicSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const topic = await topicService.update(id, value);

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    res.json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_UPDATE_ERROR',
        message: 'Failed to update topic',
      },
    });
  }
});

/**
 * DELETE /api/v1/topics/:id - 删除话题
 */
topicsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await topicService.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Topic deleted successfully' },
    });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_DELETE_ERROR',
        message: 'Failed to delete topic',
      },
    });
  }
});

/**
 * POST /api/v1/topics/:id/approve - 审核话题
 */
topicsRouter.post('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topic = await topicService.updateStatus(id, 'approved');

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    res.json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    console.error('Approve topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_APPROVE_ERROR',
        message: 'Failed to approve topic',
      },
    });
  }
});

/**
 * POST /api/v1/topics/:id/reject - 拒绝话题
 */
topicsRouter.post('/:id/reject', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topic = await topicService.updateStatus(id, 'pending');

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    res.json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    console.error('Reject topic error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_REJECT_ERROR',
        message: 'Failed to reject topic',
      },
    });
  }
});

/**
 * POST /api/v1/topics/batch - 批量导入话题
 */
topicsRouter.post('/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { topics } = req.body;

    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Topics array is required',
        },
      });
    }

    // 验证每个话题
    for (const topic of topics) {
      const { error } = createTopicSchema.validate(topic);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid topic data: ${error.details[0].message}`,
          },
        });
      }
    }

    const created = await topicService.bulkCreate(topics, req.userId!);

    res.status(201).json({
      success: true,
      data: {
        topics: created,
        count: created.length,
      },
    });
  } catch (error) {
    console.error('Batch import topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_BATCH_IMPORT_ERROR',
        message: 'Failed to batch import topics',
      },
    });
  }
});

/**
 * POST /api/v1/topics/search - 搜索话题
 */
topicsRouter.post('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, page = '1', pageSize = '20' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
    }

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const result = await topicService.search(query, { limit, offset });

    res.json({
      success: true,
      data: {
        topics: result.topics,
        total: result.total,
        query,
        page: parseInt(page as string),
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('Search topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_SEARCH_ERROR',
        message: 'Failed to search topics',
      },
    });
  }
});

/**
 * POST /api/v1/topics/:id/generate-content - 基于话题生成内容
 */
topicsRouter.post('/:id/generate-content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platforms, skillCodes } = req.body;

    // 验证输入
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Platforms array is required',
        },
      });
    }

    // 获取话题详情
    const topic = await topicService.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    // 异步生成内容（不阻塞响应）
    const userId = req.userId!;
    const generatedContents: any[] = [];

    // 发送进度更新
    sendProgressUpdate(userId, {
      type: 'content_generation',
      progress: 0,
      message: `开始为话题 "${topic.title}" 生成内容...`,
    });

    // 为每个平台生成内容
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const progress = Math.round((i / platforms.length) * 100);

      sendProgressUpdate(userId, {
        type: 'content_generation',
        progress,
        message: `正在为 ${platform.platform_name} 生成内容...`,
      });

      try {
        // 使用contentService生成内容
        const content = await contentService.generateFromTopic(
          id,
          topic.title,
          topic.description || null,
          platform.content_type || 'article',
          platform.platform,
          topic.target_customer,
          userId
        );

        generatedContents.push({
          platform: platform.platform,
          platform_name: platform.platform_name,
          content_id: content.id,
          content_title: content.title,
        });

        sendProgressUpdate(userId, {
          type: 'content_generation',
          progress: Math.round(((i + 1) / platforms.length) * 100),
          message: `${platform.platform_name} 内容生成完成`,
        });
      } catch (error: any) {
        sendProgressUpdate(userId, {
          type: 'content_generation',
          progress: Math.round(((i + 1) / platforms.length) * 100),
          message: `${platform.platform_name} 内容生成失败: ${error.message}`,
        });
      }
    }

    // 发送完成通知
    sendProgressUpdate(userId, {
      type: 'content_generation',
      progress: 100,
      message: `内容生成完成！共生成 ${generatedContents.length} 篇内容`,
    });

    res.json({
      success: true,
      data: {
        topic_id: id,
        topic_title: topic.title,
        message: 'Content generation started successfully',
        platforms_count: platforms.length,
        generated_contents: generatedContents,
      },
    });
  } catch (error: any) {
    console.error('Generate content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_GENERATION_ERROR',
        message: error.message || 'Failed to generate content',
      },
    });
  }
});

/**
 * POST /api/v1/topics/bulk-delete - 批量删除话题
 */
topicsRouter.post('/bulk-delete', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDs array is required',
        },
      });
    }

    const count = await topicService.bulkDelete(ids);

    res.json({
      success: true,
      data: {
        message: `Successfully deleted ${count} topics`,
        count,
      },
    });
  } catch (error) {
    console.error('Bulk delete topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_BULK_DELETE_ERROR',
        message: 'Failed to bulk delete topics',
      },
    });
  }
});

/**
 * POST /api/v1/topics/bulk-update - 批量更新话题
 */
topicsRouter.post('/bulk-update', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDs array is required',
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

    const topics = await topicService.bulkUpdate(ids, updates);

    res.json({
      success: true,
      data: {
        topics,
        count: topics.length,
      },
    });
  } catch (error) {
    console.error('Bulk update topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_BULK_UPDATE_ERROR',
        message: 'Failed to bulk update topics',
      },
    });
  }
});

/**
 * POST /api/v1/topics/bulk-approve - 批量批准话题
 */
topicsRouter.post('/bulk-approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDs array is required',
        },
      });
    }

    const topics = await topicService.bulkUpdateStatus(ids, 'approved');

    res.json({
      success: true,
      data: {
        topics,
        count: topics.length,
      },
    });
  } catch (error) {
    console.error('Bulk approve topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_BULK_APPROVE_ERROR',
        message: 'Failed to bulk approve topics',
      },
    });
  }
});

/**
 * POST /api/v1/topics/bulk-reject - 批量拒绝话题
 */
topicsRouter.post('/bulk-reject', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDs array is required',
        },
      });
    }

    const topics = await topicService.bulkUpdateStatus(ids, 'rejected');

    res.json({
      success: true,
      data: {
        topics,
        count: topics.length,
      },
    });
  } catch (error) {
    console.error('Bulk reject topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_BULK_REJECT_ERROR',
        message: 'Failed to bulk reject topics',
      },
    });
  }
});

/**
 * GET /api/v1/topics/export - 导出话题
 */
topicsRouter.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      topic_type,
      priority,
      target_customer: targetCustomer,
      status,
      search,
    } = req.query;

    const topics = await topicService.list({
      limit: 10000,
      offset: 0,
      topic_type: topic_type as string,
      priority: priority as string,
      target_customer: targetCustomer as string,
      status: status as string,
      search: search as string,
    });

    // 转换为CSV格式
    const headers = ['标题', '描述', '类型', '目标客户', '优先级', '状态', '预估工作量'];
    const rows = topics.topics.map((t) => [
      t.title,
      t.description || '',
      t.topic_type,
      t.target_customer,
      t.priority,
      t.status,
      t.estimated_effort || 0,
    ]);

    let csv = headers.join(',') + '\n';
    csv += rows.map((row) => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="topics.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Export topics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_EXPORT_ERROR',
        message: 'Failed to export topics',
      },
    });
  }
});

/**
 * GET /api/v1/topics/export-template - 获取导出模板
 */
topicsRouter.get('/export-template', authenticate, async (req: Request, res: Response) => {
  try {
    const headers = ['标题', '描述', '类型', '目标客户', '优先级', '预估工作量'];
    const example = [
      '如何选择合适的AI工具',
      '介绍选择AI工具时需要考虑的因素和方法',
      'tutorial',
      'startup',
      'A',
      '4'
    ];

    let csv = headers.join(',') + '\n';
    csv += example.join(',');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="topics_template.csv"');
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
 * POST /api/v1/topics/:id/research - 创建并执行话题调研任务
 */
topicsRouter.post('/:id/research', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 获取话题信息
    const topic = await topicService.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }

    // 检查是否已有进行中的任务
    const existingTask = await topicResearchService.getLatestTaskByTopicId(id);
    if (existingTask && (existingTask.status === 'in_progress' || existingTask.status === 'pending')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'RESEARCH_ALREADY_IN_PROGRESS',
          message: 'Research task is already in progress',
          data: {
            task_id: existingTask.id,
            status: existingTask.status,
          },
        },
      });
    }

    // 创建新的调研任务
    const task = await topicResearchService.createTask(id, topic.title);

    // 异步执行调研（不阻塞响应）
    const userId = req.userId!;
    topicResearchService.executeTask(task.id, async (progress) => {
      // 通过WebSocket发送进度更新
      sendResearchProgress(userId, task.id, progress);
    }).then(async (completedTask) => {
      // 调研完成，发送完成通知
      const totalResults = completedTask.results.reduce((sum, r) => sum + r.result_count, 0);
      const byChannel: Record<string, number> = {};
      completedTask.results.forEach(r => {
        byChannel[r.channel_name_en] = r.result_count;
      });

      sendResearchComplete(userId, task.id, {
        topic: completedTask.topic_title,
        total_results: totalResults,
        platform_candidates: completedTask.platform_candidates || [],
      });
    }).catch(async (error) => {
      // 调研失败，发送错误通知
      sendResearchError(userId, task.id, {
        message: error.message || 'Research failed',
      });
    });

    res.json({
      success: true,
      data: {
        task_id: task.id,
        topic_id: id,
        topic_title: topic.title,
        status: 'in_progress',
        message: 'Research task started successfully',
      },
    });
  } catch (error: any) {
    console.error('Create topic research task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_RESEARCH_CREATE_ERROR',
        message: error.message || 'Failed to create research task',
      },
    });
  }
});

/**
 * GET /api/v1/topics/:id/research/status - 获取话题调研状态
 */
topicsRouter.get('/:id/research/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await topicResearchService.getLatestTaskByTopicId(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESEARCH_TASK_NOT_FOUND',
          message: 'No research task found for this topic',
        },
      });
    }

    const progress = await topicResearchService.getProgress(task.id);

    res.json({
      success: true,
      data: {
        task_id: task.id,
        topic_id: id,
        status: task.status,
        progress: progress?.progress || 0,
        current_channel: progress?.current_channel || '',
        completed_channels: progress?.completed_channels || 0,
        total_channels: progress?.total_channels || 0,
        results_summary: progress?.results_summary || { total_results: 0, by_channel: {} },
        created_at: task.created_at,
        updated_at: task.updated_at,
        completed_at: task.completed_at,
      },
    });
  } catch (error: any) {
    console.error('Get topic research status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_RESEARCH_STATUS_ERROR',
        message: error.message || 'Failed to get research status',
      },
    });
  }
});

/**
 * GET /api/v1/topics/:id/research/results - 获取话题调研结果
 */
topicsRouter.get('/:id/research/results', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await topicResearchService.getLatestTaskByTopicId(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESEARCH_TASK_NOT_FOUND',
          message: 'No research task found for this topic',
        },
      });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'RESEARCH_NOT_COMPLETED',
          message: 'Research task has not been completed yet',
          data: {
            status: task.status,
          },
        },
      });
    }

    // 返回各渠道结果摘要
    const resultsSummary = task.results.map(r => ({
      channel_id: r.channel_id,
      channel_name: r.channel_name,
      channel_name_en: r.channel_name_en,
      result_count: r.result_count,
      preview: r.results.slice(0, 5), // 只返回前5条作为预览
    }));

    res.json({
      success: true,
      data: {
        task_id: task.id,
        topic_id: id,
        topic_title: task.topic_title,
        results_summary: resultsSummary,
        total_results: task.results.reduce((sum, r) => sum + r.result_count, 0),
        knowledge_results: task.knowledge_results || [],
        knowledge_count: task.knowledge_results?.length || 0,
        platform_candidates: task.platform_candidates || [],
        completed_at: task.completed_at,
      },
    });
  } catch (error: any) {
    console.error('Get topic research results error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOPIC_RESEARCH_RESULTS_ERROR',
        message: error.message || 'Failed to get research results',
      },
    });
  }
});

/**
 * GET /api/v1/topics/:id/research/platforms - 获取话题调研后的平台候选列表
 */
topicsRouter.get('/:id/research/platforms', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await topicResearchService.getLatestTaskByTopicId(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESEARCH_TASK_NOT_FOUND',
          message: 'No research task found for this topic',
        },
      });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'RESEARCH_NOT_COMPLETED',
          message: 'Research task has not been completed yet',
          data: {
            status: task.status,
          },
        },
      });
    }

    const candidates = await topicResearchService.getPlatformCandidates(task.id);

    res.json({
      success: true,
      data: {
        task_id: task.id,
        topic_id: id,
        topic_title: task.topic_title,
        platform_candidates: candidates,
      },
    });
  } catch (error: any) {
    console.error('Get platform candidates error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PLATFORM_CANDIDATES_ERROR',
        message: error.message || 'Failed to get platform candidates',
      },
    });
  }
});

/**
 * POST /api/v1/topics/:id/search-knowledge - 搜索话题相关知识
 */
topicsRouter.post('/:id/search-knowledge', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { knowledgeBaseIds, limit = 10, useSemantic = true } = req.body;

    // 获取话题信息
    const topic = await topicService.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        error: { message: '话题不存在' },
      });
    }

    // 构建搜索查询（标题+描述）
    const searchQuery = topic.description ? `${topic.title} ${topic.description}` : topic.title;

    // 使用话题文本搜索知识库
    let results;
    if (useSemantic && knowledgeSearchService.isAvailable()) {
      results = await knowledgeSearchService.semanticSearch(searchQuery, {
        knowledgeBaseIds,
        limit,
      });
    } else {
      results = await knowledgeSearchService.keywordSearch(searchQuery, {
        knowledgeBaseIds,
        limit,
      });
    }

    res.json({
      success: true,
      data: {
        topic: topic.title,
        query: searchQuery,
        results,
        method: useSemantic && knowledgeSearchService.isAvailable() ? 'semantic' : 'keyword',
        count: results.length,
      },
    });
  } catch (error: any) {
    console.error('搜索知识库失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '搜索知识库失败' },
    });
  }
});
