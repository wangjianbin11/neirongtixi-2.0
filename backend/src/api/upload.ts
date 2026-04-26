import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadService } from '../services/uploadService';

export const uploadRouter: Router = Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'));
  }
};

// 配置multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * POST /api/v1/upload/single - 上传单个文件
 */
uploadRouter.post('/single', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file uploaded',
        },
      });
    }

    const userId = req.userId!;
    const fileData = await uploadService.saveFileInfo(req.file, userId);

    res.status(201).json({
      success: true,
      data: fileData,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Failed to upload file',
      },
    });
  }
});

/**
 * POST /api/v1/upload/multiple - 上传多个文件
 */
uploadRouter.post('/multiple', authenticate, upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES_UPLOADED',
          message: 'No files uploaded',
        },
      });
    }

    const userId = req.userId!;
    const filesData = await Promise.all(
      files.map(file => uploadService.saveFileInfo(file, userId))
    );

    res.status(201).json({
      success: true,
      data: {
        files: filesData,
        count: filesData.length,
      },
    });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILES_UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Failed to upload files',
      },
    });
  }
});

/**
 * POST /api/v1/upload/image - 上传图片
 */
uploadRouter.post('/image', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file uploaded',
        },
      });
    }

    // 验证是否为图片
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_TYPE',
          message: 'Invalid image type',
        },
      });
    }

    const userId = req.userId!;
    const fileData = await uploadService.saveFileInfo(req.file, userId);

    res.status(201).json({
      success: true,
      data: fileData,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'IMAGE_UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Failed to upload image',
      },
    });
  }
});

/**
 * DELETE /api/v1/upload/:id - 删除文件
 */
uploadRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await uploadService.deleteFile(id, userId);

    res.json({
      success: true,
      data: { message: 'File deleted successfully' },
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete file',
      },
    });
  }
});

/**
 * GET /api/v1/upload/:id - 获取文件信息
 */
uploadRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fileInfo = await uploadService.getFileInfo(id);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    res.json({
      success: true,
      data: fileInfo,
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_INFO_ERROR',
        message: 'Failed to get file info',
      },
    });
  }
});
