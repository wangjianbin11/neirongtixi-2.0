import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { assetService } from '../services/assetService';

export const assetsRouter: Router = Router();

// GET /api/v1/assets/stats - 获取素材统计
assetsRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await assetService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSETS_STATS_ERROR',
        message: 'Failed to fetch assets stats',
      },
    });
  }
});

// GET /api/v1/assets/search - 搜索素材
assetsRouter.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { q, limit = '20' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEARCH_QUERY',
          message: 'Search query is required',
        },
      });
    }

    const assets = await assetService.search(q, parseInt(limit as string));
    res.json({
      success: true,
      data: { assets },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSETS_SEARCH_ERROR',
        message: 'Failed to search assets',
      },
    });
  }
});

// GET /api/v1/assets - 获取素材列表
assetsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20', type, category, tags, search, is_active } = req.query;

    const result = await assetService.list({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      type: type as any,
      category: category as string,
      tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
      search: search as string,
      is_active: is_active ? is_active === 'true' : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSETS_FETCH_ERROR',
        message: 'Failed to fetch assets',
      },
    });
  }
});

// GET /api/v1/assets/:id - 获取素材详情
assetsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await assetService.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
    }

    res.json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSET_FETCH_ERROR',
        message: 'Failed to fetch asset',
      },
    });
  }
});

// POST /api/v1/assets - 创建素材
assetsRouter.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const assetData = req.body;
    const asset = await assetService.create(assetData, userId);

    res.status(201).json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSET_CREATE_ERROR',
        message: 'Failed to create asset',
      },
    });
  }
});

// PUT /api/v1/assets/:id - 更新素材
assetsRouter.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const asset = await assetService.update(id, updateData);

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
    }

    res.json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSET_UPDATE_ERROR',
        message: 'Failed to update asset',
      },
    });
  }
});

// DELETE /api/v1/assets/:id - 删除素材
assetsRouter.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await assetService.delete(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Asset deleted successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSET_DELETE_ERROR',
        message: 'Failed to delete asset',
      },
    });
  }
});
