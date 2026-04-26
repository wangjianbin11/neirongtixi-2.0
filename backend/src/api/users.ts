import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { userService } from '../services/userService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sanitizeUser } from '../services/authService';

export const usersRouter: Router = Router();

/**
 * 验证中间件 - 更新用户资料
 */
const updateProfileSchema = Joi.object({
  email: Joi.string().email().optional(),
  full_name: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  avatar_url: Joi.string().uri().optional(),
});

/**
 * GET /api/v1/users/me - 获取当前用户完整信息
 */
usersRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.findById(req.userId!);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get user information',
      },
    });
  }
});

/**
 * PUT /api/v1/users/me - 更新当前用户资料
 */
usersRouter.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 验证输入
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const { email, full_name, phone, avatar_url } = value;

    // 如果更新邮箱，检查是否已被使用
    if (email) {
      const existingUser = await userService.findByEmail(email);
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already in use',
          },
        });
      }
    }

    // 更新用户信息
    const updatedUser = await userService.update(req.userId!, {
      email,
      full_name,
      phone,
      avatar_url,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(updatedUser),
        message: 'Profile updated successfully',
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update profile',
      },
    });
  }
});

/**
 * GET /api/v1/users/:id - 获取指定用户信息（管理员）
 */
usersRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requester = await userService.findById(req.userId!);
    if (!requester || (requester.role !== 'admin' && req.userId !== req.params.id)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this user',
        },
      });
    }

    const user = await userService.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get user information',
      },
    });
  }
});

/**
 * PUT /api/v1/users/:id - 更新指定用户信息（管理员）
 */
usersRouter.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requester = await userService.findById(req.userId!);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can update other users',
        },
      });
    }

    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const updatedUser = await userService.update(req.params.id, value);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(updatedUser),
        message: 'User updated successfully',
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update user',
      },
    });
  }
});

/**
 * GET /api/v1/users - 获取用户列表（管理员）
 */
usersRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requester = await userService.findById(req.userId!);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can list users',
        },
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const role = req.query.role as string;

    const result = await userService.list({ limit, offset, role });

    res.json({
      success: true,
      data: {
        users: result.users.map(sanitizeUser),
        total: result.total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to list users',
      },
    });
  }
});
