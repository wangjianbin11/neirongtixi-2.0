import { Router, Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { knowledgeBaseDocumentService } from '../services/knowledgeBaseDocumentService';
import { authenticate } from '../middleware/auth';
import { documentParserService } from '../services/documentParserService';
import { ocrService } from '../services/ocrService';
import { webScraperService } from '../services/webScraperService';

const router: Router = Router();

// 认证中间件
router.use(authenticate);

// ============================================
// 验证模式
// ============================================

const createDocumentSchema = Joi.object({
  knowledge_base_id: Joi.string().required(),
  title: Joi.string().required(),
  content: Joi.string().allow('', null),
  source_type: Joi.string().valid('url', 'pdf', 'word', 'excel', 'markdown', 'image', 'text').required(),
  source_url: Joi.string().allow('', null),
  file_path: Joi.string().allow('', null),
});

const updateDocumentSchema = Joi.object({
  title: Joi.string(),
  content: Joi.string().allow('', null),
  status: Joi.string().valid('draft', 'active', 'archived'),
});

// ============================================
// 路由
// ============================================

/**
 * 获取知识库的文档列表
 * GET /api/v1/knowledge-bases/:id/documents
 */
router.get('/knowledge-bases/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page, pageSize, source_type, status, search } = req.query;

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
    console.error('获取文档列表失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '获取文档列表失败' },
    });
  }
});

/**
 * 获取文档详情
 * GET /api/v1/knowledge-base-documents/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = await knowledgeBaseDocumentService.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: '文档不存在' },
      });
    }

    res.json({
      success: true,
      data: { document },
    });
  } catch (error: any) {
    console.error('获取文档详情失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '获取文档详情失败' },
    });
  }
});

/**
 * 创建文档
 * POST /api/v1/knowledge-base-documents
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createDocumentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const userId = (req as any).user?.id;
    const document = await knowledgeBaseDocumentService.create(value, userId);

    res.json({
      success: true,
      data: { document },
    });
  } catch (error: any) {
    console.error('创建文档失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '创建文档失败' },
    });
  }
});

/**
 * 更新文档
 * PUT /api/v1/knowledge-base-documents/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateDocumentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const document = await knowledgeBaseDocumentService.update(req.params.id, value);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: '文档不存在' },
      });
    }

    res.json({
      success: true,
      data: { document },
    });
  } catch (error: any) {
    console.error('更新文档失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '更新文档失败' },
    });
  }
});

/**
 * 删除文档
 * DELETE /api/v1/knowledge-base-documents/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await knowledgeBaseDocumentService.delete(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { message: '文档不存在' },
      });
    }

    res.json({
      success: true,
      data: { message: '删除成功' },
    });
  } catch (error: any) {
    console.error('删除文档失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '删除文档失败' },
    });
  }
});

/**
 * 搜索文档
 * POST /api/v1/knowledge-base-documents/search
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, knowledge_base_id, limit } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { message: '搜索关键词不能为空' },
      });
    }

    const result = await knowledgeBaseDocumentService.searchContent(query, {
      knowledge_base_id,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('搜索文档失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '搜索文档失败' },
    });
  }
});

// ============================================
// 导入功能
// ============================================

// 配置multer用于文件上传
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * URL导入
 * POST /api/v1/knowledge-base-documents/import/url
 */
router.post('/import/url', async (req: Request, res: Response) => {
  try {
    const { knowledge_base_id, url, title } = req.body;

    if (!knowledge_base_id || !url) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少必需参数' },
      });
    }

    // 验证URL格式
    if (!webScraperService.isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: { message: 'URL格式不正确' },
      });
    }

    // 抓取网页内容
    const scraped = await webScraperService.scrape(url);

    // 创建文档
    const document = await knowledgeBaseDocumentService.create({
      knowledge_base_id,
      title: title || scraped.title,
      content: scraped.content,
      source_type: 'url',
      source_url: url,
    }, (req as any).user?.id);

    res.json({
      success: true,
      data: { document },
    });
  } catch (error: any) {
    console.error('URL导入失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'URL导入失败' },
    });
  }
});

/**
 * 文件导入
 * POST /api/v1/knowledge-base-documents/import/file
 */
router.post('/import/file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { knowledge_base_id, source_type, title } = req.body;

    if (!knowledge_base_id || !req.file) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少必需参数或文件' },
      });
    }

    let parsedContent: { title: string; content: string; wordCount: number };

    // 图片OCR
    if (source_type === 'image') {
      const ocrResult = await ocrService.extractTextFromImage(req.file.path);
      parsedContent = {
        title: title || path.basename(req.file.originalname, path.extname(req.file.originalname)),
        content: ocrService.cleanOCRText(ocrResult.text),
        wordCount: ocrResult.text.length,
      };
    } else {
      // 文档解析
      parsedContent = await documentParserService.parse(req.file.path, source_type);
    }

    // 创建文档
    const document = await knowledgeBaseDocumentService.create({
      knowledge_base_id,
      title: title || parsedContent.title,
      content: parsedContent.content,
      source_type: source_type as any,
      file_path: req.file.path,
    }, (req as any).user?.id);

    res.json({
      success: true,
      data: { document },
    });
  } catch (error: any) {
    console.error('文件导入失败:', error);

    // 清理上传的文件
    if (req.file) {
      fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: { message: error.message || '文件导入失败' },
    });
  }
});

/**
 * 批量文件导入
 * POST /api/v1/knowledge-base-documents/import/batch
 */
router.post('/import/batch', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const { knowledge_base_id } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!knowledge_base_id || !files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少必需参数或文件' },
      });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        // 根据文件扩展名确定类型
        const ext = path.extname(file.originalname).toLowerCase();
        let sourceType: string;

        switch (ext) {
          case '.pdf':
            sourceType = 'pdf';
            break;
          case '.doc':
          case '.docx':
            sourceType = 'word';
            break;
          case '.xls':
          case '.xlsx':
            sourceType = 'excel';
            break;
          case '.md':
          case '.markdown':
            sourceType = 'markdown';
            break;
          case '.png':
          case '.jpg':
          case '.jpeg':
          case '.gif':
          case '.bmp':
          case '.webp':
            sourceType = 'image';
            break;
          default:
            sourceType = 'text';
        }

        let parsedContent: { title: string; content: string; wordCount: number };

        if (sourceType === 'image') {
          const ocrResult = await ocrService.extractTextFromImage(file.path);
          parsedContent = {
            title: path.basename(file.originalname, ext),
            content: ocrService.cleanOCRText(ocrResult.text),
            wordCount: ocrResult.text.length,
          };
        } else {
          parsedContent = await documentParserService.parse(file.path, sourceType);
        }

        const document = await knowledgeBaseDocumentService.create({
          knowledge_base_id,
          title: parsedContent.title,
          content: parsedContent.content,
          source_type: sourceType as any,
          file_path: file.path,
        }, (req as any).user?.id);

        results.push({ success: true, document, file: file.originalname });
      } catch (error: any) {
        errors.push({ file: file.originalname, error: error.message });
        // 清理失败的文件
        fs.unlink(file.path).catch(() => {});
      }
    }

    res.json({
      success: true,
      data: {
        imported: results.length,
        failed: errors.length,
        results,
        errors,
      },
    });
  } catch (error: any) {
    console.error('批量导入失败:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || '批量导入失败' },
    });
  }
});

export { router as knowledgeBaseDocumentsRouter };
