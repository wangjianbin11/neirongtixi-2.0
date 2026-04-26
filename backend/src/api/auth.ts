import { Router, Request, Response } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { userService } from '../services/userService';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  sanitizeUser,
} from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { addToBlacklist } from '../services/tokenBlacklistService';
import { config } from '../config';

export const authRouter: Router = Router();

/**
 * 验证中间件 - 注册输入
 */
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('user', 'admin', 'editor').optional(),
});

/**
 * 验证中间件 - 登录输入
 */
const loginSchema = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().required(),
}).or('username', 'email');

/**
 * POST /api/v1/auth/register - 注册
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    // 验证输入
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const { username, email, password, role } = value;

    // 检查邮箱是否已存在
    const emailExists = await userService.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
        },
      });
    }

    // 检查用户名是否已存在
    const usernameExists = await userService.usernameExists(username);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already taken',
        },
      });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const newUser = await userService.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    // 生成令牌
    const accessToken = generateAccessToken(newUser.id, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(newUser),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Failed to register user',
      },
    });
  }
});

/**
 * POST /api/v1/auth/login - 登录
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    // 验证输入
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
        },
      });
    }

    const { username, email, password } = value;

    // 查找用户（支持用户名或邮箱登录）
    const user = username
      ? await userService.findByUsername(username)
      : await userService.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash || (user as any).password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    // 检查账户是否被禁用
    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Account has been disabled',
        },
      });
    }

    // 更新最后登录时间
    await userService.updateLastLogin(user.id);

    // 生成令牌
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Failed to login',
      },
    });
  }
});

/**
 * POST /api/v1/auth/refresh - 刷新令牌
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token is required',
        },
      });
    }

    // 验证刷新令牌
    const { userId } = verifyRefreshToken(refreshToken);

    // 获取用户信息
    const user = await userService.findById(userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
        },
      });
    }

    // 生成新的访问令牌
    const accessToken = generateAccessToken(user.id, user.role);

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
      },
    });
  }
});

/**
 * POST /api/v1/auth/logout - 登出
 */
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // 解码token获取剩余过期时间
      const decoded = jwt.decode(token) as { exp?: number };
      const expiresIn = decoded?.exp
        ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
        : 3600; // 默认1小时

      // 将token加入黑名单
      addToBlacklist(token, expiresIn);
    }

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  }
});

/**
 * GET /api/v1/auth/me - 获取当前用户
 */
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
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
    console.error('Get current user error:', error);
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
 * PUT /api/v1/auth/password - 修改密码
 */
authRouter.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        },
      });
    }

    // 获取用户
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

    // 验证当前密码
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash || (user as any).password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    await userService.updatePassword(user.id, hashedPassword);

    res.json({
      success: true,
      data: {
        message: 'Password updated successfully',
      },
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update password',
      },
    });
  }
});
