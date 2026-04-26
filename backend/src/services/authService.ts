import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/types';

/**
 * 密码哈希
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * 验证密码
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * 生成访问令牌
 */
export const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign(
    { userId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions
  );
};

/**
 * 生成刷新令牌
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions
  );
};

/**
 * 验证访问令牌
 */
export const verifyAccessToken = (token: string): { userId: string; role: string } => {
  return jwt.verify(token, config.jwt.secret) as { userId: string; role: string };
};

/**
 * 验证刷新令牌
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, config.jwt.secret) as { userId: string };
};

/**
 * 用户数据转换（去除敏感信息）
 */
export const sanitizeUser = (user: User): Partial<User> => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};

/**
 * 计算令牌过期时间
 */
export const getTokenExpiry = (token: string): number => {
  const decoded = jwt.decode(token) as { exp: number };
  return decoded.exp * 1000; // 转换为毫秒
};

/**
 * 生成随机密码重置令牌
 */
export const generateResetToken = (): string => {
  return jwt.sign(
    { type: 'password_reset' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

/**
 * 验证密码重置令牌
 */
export const verifyResetToken = (token: string): boolean => {
  try {
    jwt.verify(token, config.jwt.secret);
    return true;
  } catch {
    return false;
  }
};
