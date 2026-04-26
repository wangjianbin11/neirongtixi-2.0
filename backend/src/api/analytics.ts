import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';
import { query, queryOne } from '../utils/db';

export const analyticsRouter: Router = Router();

/**
 * GET /api/v1/analytics/overall - 获取整体统计数据
 */
analyticsRouter.get('/overall', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await analyticsService.getOverallStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Fetch overall analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_OVERALL_ERROR',
        message: 'Failed to fetch overall analytics',
      },
    });
  }
});

/**
 * GET /api/v1/analytics/contents - 获取内容分析数据
 */
analyticsRouter.get('/contents', authenticate, async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.getContentAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Fetch content analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_CONTENT_ERROR',
        message: 'Failed to fetch content analytics',
      },
    });
  }
});

/**
 * GET /api/v1/analytics/keywords - 获取关键词分析数据
 */
analyticsRouter.get('/keywords', authenticate, async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.getKeywordAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Fetch keyword analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_KEYWORD_ERROR',
        message: 'Failed to fetch keyword analytics',
      },
    });
  }
});

/**
 * GET /api/v1/analytics/topics - 获取话题分析数据
 */
analyticsRouter.get('/topics', authenticate, async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.getTopicAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Fetch topic analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_TOPIC_ERROR',
        message: 'Failed to fetch topic analytics',
      },
    });
  }
});

/**
 * GET /api/v1/analytics/publishes - 获取发布分析数据
 */
analyticsRouter.get('/publishes', authenticate, async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsService.getPublishAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Fetch publish analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_PUBLISH_ERROR',
        message: 'Failed to fetch publish analytics',
      },
    });
  }
});

/**
 * GET /api/v1/analytics/trends - 获取趋势数据
 */
analyticsRouter.get('/trends', authenticate, async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    const trends = await analyticsService.getTrends(period as 'week' | 'month' | 'quarter');
    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('Fetch trends error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_TRENDS_ERROR',
        message: 'Failed to fetch trends',
      },
    });
  }
});

// Legacy endpoints - TODO: Remove after migration

// GET /api/v1/analytics/dashboard - 获取仪表板数据
analyticsRouter.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await analyticsService.getOverallStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_DASHBOARD_ERROR',
        message: 'Failed to fetch dashboard data',
      },
    });
  }
});

// GET /api/v1/analytics/content/:id - 获取内容分析数据
analyticsRouter.get('/content/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取内容基本信息
    const content = await queryOne<any>(
      'SELECT * FROM contents WHERE id = ?',
      [id]
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
        },
      });
    }

    // 获取内容评分数据
    const score = await queryOne<any>(
      'SELECT * FROM content_scores WHERE content_id = ?',
      [id]
    );

    // 获取发布记录
    const publications = await query(
      'SELECT * FROM content_publications WHERE content_id = ? ORDER BY published_at DESC LIMIT 10',
      [id]
    );

    // 统计分析数据
    const analytics = await queryOne<any>(
      `SELECT
        COUNT(DISTINCT id) as total_views,
        COUNT(DISTINCT CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN id END) as views_last_7_days,
        COUNT(DISTINCT CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN id END) as views_last_30_days
       FROM content_views
       WHERE content_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        content: {
          id: content.id,
          title: content.title,
          content_type: content.content_type,
          platform: content.platform,
          status: content.status,
          created_at: content.created_at,
          published_at: content.published_at,
        },
        score: score ? {
          overall_score: score.overall_score,
          is_ymyl: score.is_ymyl,
          eeat_score: score.eeat_score,
          main_content_score: score.main_content_score,
        } : null,
        publications: publications || [],
        analytics: analytics || {
          total_views: 0,
          views_last_7_days: 0,
          views_last_30_days: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_ANALYTICS_ERROR',
        message: 'Failed to fetch content analytics',
      },
    });
  }
});

// POST /api/v1/analytics/reports - 生成分析报告
analyticsRouter.post('/reports', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, period, includeCharts, format } = req.body;
    // TODO: 实现分析报告生成逻辑
    res.json({
      success: true,
      data: {
        message: 'Generate analytics report endpoint - to be implemented',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_GENERATION_ERROR',
        message: 'Failed to generate analytics report',
      },
    });
  }
});
