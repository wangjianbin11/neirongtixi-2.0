import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { keywordService } from '../services/keywordService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { knowledgeSearchService } from '../services/knowledgeSearchService';
import { keywordResearchService } from '../services/keywordResearchService';
import { topicService } from '../services/topicService';

export const keywordsRouter: Router = Router();

/**
 * 验证中间件 - 创建关键词
 */
const createKeywordSchema = Joi.object({
  keyword: Joi.string().required(),
  category: Joi.string().valid('core', 'long_tail', 'question', 'guide', 'comparison').optional(),
  search_volume: Joi.number().optional(),
  competition: Joi.string().valid('low', 'medium', 'high').optional(),
  intent: Joi.string().valid('informational', 'commercial', 'transactional', 'navigational').optional(),
  priority: Joi.string().valid('S', 'A', 'B', 'C').optional(),
  target_customer: Joi.string().valid('C1-Entrepreneur', 'C2-Experienced', 'C3-TeamSeller', 'C4-LocalToGlobal').optional(),
  scenes: Joi.array().items(Joi.string().valid('website', 'tiktok', 'youtube', 'twitter', 'instagram', 'facebook', 'amazon', 'linkedin')).optional(),
});

/**
 * 验证中间件 - 更新关键词
 */
const updateKeywordSchema = Joi.object({
  keyword: Joi.string().optional(),
  category: Joi.string().valid('core', 'long_tail', 'question', 'guide', 'comparison').optional(),
  search_volume: Joi.number().optional(),
  competition: Joi.string().valid('low', 'medium', 'high').optional(),
  intent: Joi.string().valid('informational', 'commercial', 'transactional', 'navigational').optional(),
  priority: Joi.string().valid('S', 'A', 'B', 'C').optional(),
  target_customer: Joi.string().valid('C1-Entrepreneur', 'C2-Experienced', 'C3-TeamSeller', 'C4-LocalToGlobal').optional(),
  scenes: Joi.array().items(Joi.string().valid('website', 'tiktok', 'youtube', 'twitter', 'instagram', 'facebook', 'amazon', 'linkedin')).optional(),
});

/**
 * GET /api/v1/keywords - 获取关键词列表
 */
keywordsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      category,
      priority,
      target_customer: targetCustomer,
      competition,
      intent,
      search,
      scenes,
    } = req.query;

    const pageInt = parseInt(page as string);
    const pageSizeInt = parseInt(pageSize as string);
    const limit = pageSizeInt;
    const offset = (pageInt - 1) * limit;

    console.log('[Keywords API] ===== PARAMS =====');
    console.log('[Keywords API] Raw req.query:', req.query);
    console.log('[Keywords API] Parsed params:', {
      page: page as string,
      pageInt,
      pageSize: pageSize as string,
      pageSizeInt,
      limit,
      offset,
    });
    console.log('[Keywords API] Calculated: offset = (page - 1) * limit =', offset);

    const result = await keywordService.list({
      limit,
      offset,
      category: category as string,
      priority: priority as string,
      competition: competition as string,
      intent: intent as string,
      scenes: scenes as string,
      search: search as string,
    });

    console.log('[Keywords API] Result:', {
      keywordsCount: result.keywords?.length || 0,
      total: result.total,
      firstKeyword: result.keywords?.[0]?.keyword,
      lastKeyword: result.keywords?.[result.keywords.length - 1]?.keyword,
    });

    // 禁用缓存
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      success: true,
      data: {
        keywords: result.keywords,
        total: result.total,
        page: parseInt(page as string),
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('Fetch keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORDS_FETCH_ERROR',
        message: 'Failed to fetch keywords',
      },
    });
  }
});

/**
 * GET /api/v1/keywords/stats - 获取关键词统计
 */
keywordsRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await keywordService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Fetch keywords stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORDS_STATS_ERROR',
        message: 'Failed to fetch keywords statistics',
      },
    });
  }
});

/**
 * POST /api/v1/keywords - 创建关键词
 */
keywordsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = createKeywordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const keyword = await keywordService.create(value, req.userId!);

    res.status(201).json({
      success: true,
      data: { keyword },
    });
  } catch (error) {
    console.error('Create keyword error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORD_CREATE_ERROR',
        message: 'Failed to create keyword',
      },
    });
  }
});

/**
 * POST /api/v1/keywords/batch - 批量创建关键词
 */
keywordsRouter.post('/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { keywords } = req.body;

    if (!Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Keywords must be an array',
        },
      });
    }

    // 验证每个关键词
    for (const kw of keywords) {
      const { error } = createKeywordSchema.validate(kw);
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

    const created = await keywordService.bulkCreate(keywords);

    res.status(201).json({
      success: true,
      data: { keywords: created, count: created.length },
    });
  } catch (error) {
    console.error('Bulk create keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORDS_BULK_CREATE_ERROR',
        message: 'Failed to bulk create keywords',
      },
    });
  }
});

/**
 * POST /api/v1/keywords/search - 搜索关键词
 */
keywordsRouter.post('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, page = '1', pageSize = '20' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query is required',
        },
      });
    }

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const result = await keywordService.search(query, { limit, offset });

    res.json({
      success: true,
      data: {
        keywords: result.keywords,
        total: result.total,
        page: parseInt(page as string),
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('Search keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORDS_SEARCH_ERROR',
        message: 'Failed to search keywords',
      },
    });
  }
});

/**
 * POST /api/v1/keywords/bulk-delete - 批量删除关键词
 */
keywordsRouter.post('/bulk-delete', authenticate, async (req: Request, res: Response) => {
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

    const count = await keywordService.bulkDelete(ids);

    res.json({
      success: true,
      data: { message: 'Deleted successfully', count },
    });
  } catch (error) {
    console.error('Bulk delete keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORDS_BULK_DELETE_ERROR',
        message: 'Failed to bulk delete keywords',
      },
    });
  }
});

/**
 * POST /api/v1/keywords/bulk-update - 批量更新关键词
 */
keywordsRouter.post('/bulk-update', authenticate, async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDs must be an array',
        },
      });
    }

    const { error } = updateKeywordSchema.validate(updates);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const updated = await keywordService.bulkUpdate(ids, updates);

    res.json({
      success: true,
      data: { keywords: updated, count: updated.length },
    });
  } catch (error) {
    console.error('Bulk update keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORDS_BULK_UPDATE_ERROR',
        message: 'Failed to bulk update keywords',
      },
    });
  }
});

/**
 * GET /api/v1/keywords/export - 导出关键词
 * 注意：必须在 /:id 路由之前定义
 */
keywordsRouter.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const { category, priority, search } = req.query;

    const keywords = await keywordService.list({
      limit: 10000,
      offset: 0,
      category: category as string,
      priority: priority as string,
      search: search as string,
    });

    // 生成CSV内容
    const headers = ['关键词', '搜索量', '难度分数', '意图', 'ASG相关性', '优先级', '状态', '创建时间', '场景'];
    const rows = keywords.keywords.map(k => [
      k.keyword,
      k.search_volume || 0,
      k.kd_score || 0,
      k.intent || '',
      k.asg_relevance || 0,
      k.priority || '',
      k.status || '',
      k.created_at || '',
      `"${(k.scenes || []).join(';')}"`,
    ]);

    let csv = headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="keywords.csv"');
    res.send('\uFEFF' + csv); // UTF-8 BOM
  } catch (error) {
    console.error('Export keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORD_EXPORT_ERROR',
        message: 'Failed to export keywords',
      },
    });
  }
});

/**
 * GET /api/v1/keywords/export-template - 获取导出模板
 * 注意：必须在 /:id 路由之前定义
 */
keywordsRouter.get('/export-template', authenticate, async (req: Request, res: Response) => {
  try {
    const headers = ['关键词', '分类', '搜索量', '竞争度', '意图', '优先级', '目标客户', '场景'];
    const example = ['AI工具推荐', 'core', '1000', 'medium', 'informational', 'A', 'C1-Entrepreneur', 'tiktok;youtube'];

    let csv = headers.join(',') + '\n' + example.join(',');

    // 禁用缓存
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="keywords_template.csv"');
    res.send('\uFEFF' + csv); // UTF-8 BOM
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
 * GET /api/v1/keywords/:id - 获取关键词详情
 * 注意：必须在所有具体路径（如 /export）之后定义
 */
keywordsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const keyword = await keywordService.findById(id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'KEYWORD_NOT_FOUND',
          message: 'Keyword not found',
        },
      });
    }

    res.json({
      success: true,
      data: { keyword },
    });
  } catch (error) {
    console.error('Fetch keyword error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORD_FETCH_ERROR',
        message: 'Failed to fetch keyword',
      },
    });
  }
});

/**
 * PUT /api/v1/keywords/:id - 更新关键词
 */
keywordsRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error, value } = updateKeywordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const keyword = await keywordService.update(id, value);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'KEYWORD_NOT_FOUND',
          message: 'Keyword not found',
        },
      });
    }

    res.json({
      success: true,
      data: { keyword },
    });
  } catch (error) {
    console.error('Update keyword error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORD_UPDATE_ERROR',
        message: 'Failed to update keyword',
      },
    });
  }
});

/**
 * DELETE /api/v1/keywords/:id - 删除关键词
 */
keywordsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await keywordService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'KEYWORD_NOT_FOUND',
          message: 'Keyword not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Deleted successfully' },
    });
  } catch (error) {
    console.error('Delete keyword error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORD_DELETE_ERROR',
        message: 'Failed to delete keyword',
      },
    });
  }
});

/**
 * POST /api/v1/keywords/classify-target-customers - 批量自动分类目标客户
 */
keywordsRouter.post('/classify-target-customers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 1000 } = req.body;

    console.log('[Keywords API] Starting batch classification of target customers, limit:', limit);

    const result = await keywordService.batchClassifyTargetCustomers(limit);

    console.log('[Keywords API] Batch classification completed:', result);

    res.json({
      success: true,
      data: {
        message: `已更新 ${result.updated} 个关键词的目标客户分类`,
        updated: result.updated,
        remaining: result.total,
      },
    });
  } catch (error) {
    console.error('Batch classify target customers error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLASSIFICATION_ERROR',
        message: 'Failed to classify target customers',
      },
    });
  }
});

/**
 * POST /api/v1/keywords/:id/search-knowledge - 搜索关键词相关知识
 */
keywordsRouter.post('/:id/search-knowledge', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { knowledgeBaseIds, limit = 10, useSemantic = true } = req.body;

    // 获取关键词信息
    const keyword = await keywordService.findById(id);
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: { message: '关键词不存在' },
      });
    }

    // 使用关键词文本搜索知识库
    let results;
    if (useSemantic && knowledgeSearchService.isAvailable()) {
      results = await knowledgeSearchService.semanticSearch(keyword.keyword, {
        knowledgeBaseIds,
        limit,
      });
    } else {
      results = await knowledgeSearchService.keywordSearch(keyword.keyword, {
        knowledgeBaseIds,
        limit,
      });
    }

    res.json({
      success: true,
      data: {
        keyword: keyword.keyword,
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

// ============================================
// 关键词调研相关路由
// ============================================

/**
 * POST /api/v1/keywords/:id/research - 创建关键词调研任务
 */
keywordsRouter.post('/:id/research', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { autoGenerateTopics = false, targetCustomer } = req.body;

    // 获取关键词信息
    const keyword = await keywordService.findById(id);
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: { message: '关键词不存在' },
      });
    }

    // 检查是否已有进行中的任务
    const existingTask = await keywordResearchService.getLatestTaskByKeywordId(id);
    if (existingTask && existingTask.status === 'in_progress') {
      return res.json({
        success: true,
        data: {
          message: '已有进行中的调研任务',
          task: existingTask,
        },
      });
    }

    // 创建新的调研任务
    const task = await keywordResearchService.createTask(id, keyword.keyword);

    // 异步执行调研（不阻塞响应）
    keywordResearchService.executeTask(task.id, async (progress) => {
      // 可以通过WebSocket发送进度更新
      console.log('[Keyword Research Progress]', progress);
      // TODO: 通过socketService发送进度给前端
    }).then(async (completedTask) => {
      console.log('[Keyword Research Completed]', completedTask.id);

      // 如果启用自动生成话题
      if (autoGenerateTopics) {
        try {
          const suggestedTopics = await keywordResearchService.generateTopicsFromResearch(completedTask.id, {
            maxTopics: 5,
            targetCustomer,
          });

          // 自动创建话题
          for (const topicData of suggestedTopics) {
            await topicService.create(topicData, req.userId!);
          }

          console.log('[Auto-generated Topics]', suggestedTopics.length);
        } catch (error) {
          console.error('[Auto-generate Topics Failed]', error);
        }
      }
    }).catch(error => {
      console.error('[Keyword Research Failed]', error);
    });

    res.json({
      success: true,
      data: {
        message: '调研任务已创建',
        task,
      },
    });
  } catch (error: any) {
    console.error('创建调研任务失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '创建调研任务失败' },
    });
  }
});

/**
 * GET /api/v1/keywords/:id/research/status - 获取关键词调研状态
 */
keywordsRouter.get('/:id/research/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await keywordResearchService.getLatestTaskByKeywordId(id);
    if (!task) {
      return res.json({
        success: true,
        data: {
          has_research: false,
          message: '该关键词暂无调研任务',
        },
      });
    }

    const progress = await keywordResearchService.getProgress(task.id);

    res.json({
      success: true,
      data: {
        has_research: true,
        task,
        progress,
      },
    });
  } catch (error: any) {
    console.error('获取调研状态失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '获取调研状态失败' },
    });
  }
});

/**
 * GET /api/v1/keywords/:id/research/results - 获取关键词调研结果
 */
keywordsRouter.get('/:id/research/results', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await keywordResearchService.getLatestTaskByKeywordId(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: '未找到调研任务' },
      });
    }

    // 汇总结果
    const allResults = task.results.flatMap(r => r.results);
    const summary = {
      total_channels: task.results.length,
      completed_channels: task.results.filter(r => r.status === 'completed').length,
      total_results: task.results.reduce((sum, r) => sum + r.result_count, 0),
      results_by_channel: task.results.map(r => ({
        channel_name: r.channel_name,
        channel_name_en: r.channel_name_en,
        status: r.status,
        result_count: r.result_count,
        results: r.results.slice(0, 5), // 每个渠道返回前5个结果预览
      })),
      knowledge_results: task.knowledge_results || [],
    };

    res.json({
      success: true,
      data: {
        task,
        summary,
      },
    });
  } catch (error: any) {
    console.error('获取调研结果失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '获取调研结果失败' },
    });
  }
});

/**
 * POST /api/v1/keywords/:id/research/generate-topics - 基于调研结果生成话题
 */
keywordsRouter.post('/:id/research/generate-topics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { maxTopics = 5, targetCustomer = 'startup' } = req.body;

    const task = await keywordResearchService.getLatestTaskByKeywordId(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: '未找到调研任务' },
      });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: { message: '调研任务尚未完成' },
      });
    }

    const suggestedTopics = await keywordResearchService.generateTopicsFromResearch(task.id, {
      maxTopics,
      targetCustomer,
    });

    res.json({
      success: true,
      data: {
        suggested_topics: suggestedTopics,
        count: suggestedTopics.length,
      },
    });
  } catch (error: any) {
    console.error('生成话题失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '生成话题失败' },
    });
  }
});

/**
 * GET /api/v1/keywords/research/test-connection - 测试 Google API 连接
 */
keywordsRouter.get('/research/test-connection', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { googleSearchService } = await import('../services/googleSearchService');
    const result = await googleSearchService.testConnection();

    res.json({
      success: result.success,
      data: {
        message: result.message,
        latency: result.latency,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('测试连接失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '测试连接失败' },
    });
  }
});
