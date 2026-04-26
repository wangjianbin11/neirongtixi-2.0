import { Router, Response } from 'express';
import Joi from 'joi';
import { googleSearchService } from '../services/googleSearchService';
import { authenticate, AuthRequest } from '../middleware/auth';

export const searchRouter: Router = Router();

/**
 * 验证中间件 - 搜索请求
 */
const searchSchema = Joi.object({
  q: Joi.string().required().min(1).max(500),
  page: Joi.number().integer().min(1).max(100).default(1),
  maxPages: Joi.number().integer().min(1).max(10).default(10),
});

/**
 * POST /api/v1/search - 搜索（深度搜索，最多100个结果）
 */
searchRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 验证输入
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const { q, page, maxPages } = value;

    // 执行深度搜索
    const results = await googleSearchService.deepSearch(q, maxPages, page);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message || 'Failed to perform search',
      },
    });
  }
});

/**
 * GET /api/v1/search - 搜索（单页，通过查询参数）
 */
searchRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, page = '1' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required',
        },
      });
    }

    const pageNumber = parseInt(String(page)) || 1;

    // 执行单页搜索
    const results = await googleSearchService.searchPage(q, pageNumber);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message || 'Failed to perform search',
      },
    });
  }
});

/**
 * POST /api/v1/search/batch - 批量搜索多个关键词
 */
searchRouter.post('/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { keywords, maxPages = 10 } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Keywords must be a non-empty array',
        },
      });
    }

    if (keywords.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 50 keywords allowed per batch',
        },
      });
    }

    // 执行批量搜索
    const results = await googleSearchService.searchMultiple(keywords, maxPages);

    // 转换Map为对象
    const resultsObj: Record<string, any> = {};
    results.forEach((value, key) => {
      resultsObj[key] = value;
    });

    res.json({
      success: true,
      data: {
        results: resultsObj,
        total: results.size,
      },
    });
  } catch (error: any) {
    console.error('Batch search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message || 'Failed to perform batch search',
      },
    });
  }
});

/**
 * POST /api/v1/search/analyze - 分析搜索结果
 */
searchRouter.post('/analyze', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, maxPages = 10 } = req.body;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required',
        },
      });
    }

    // 执行搜索
    const searchResults = await googleSearchService.deepSearch(q, maxPages, 1);

    // 分析结果
    const analysis = googleSearchService.analyzeResults(searchResults.items);

    res.json({
      success: true,
      data: {
        search: searchResults,
        analysis,
      },
    });
  } catch (error: any) {
    console.error('Search analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message || 'Failed to analyze search results',
      },
    });
  }
});

/**
 * GET /api/v1/search/urls - 获取搜索结果的URL列表
 */
searchRouter.get('/urls', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q, maxPages = '10' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required',
        },
      });
    }

    const pages = parseInt(String(maxPages)) || 10;

    // 执行搜索
    const searchResults = await googleSearchService.deepSearch(q, pages, 1);

    // 提取URL
    const urls = googleSearchService.extractUrls(searchResults.items);

    res.json({
      success: true,
      data: {
        query: q,
        urls,
        total: urls.length,
        searchTime: searchResults.searchTime,
      },
    });
  } catch (error: any) {
    console.error('Search URLs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message || 'Failed to get search URLs',
      },
    });
  }
});
