import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, update } from '../utils/db';
import { User, CreateUserInput, UpdateUserInput } from '../models/types';

/**
 * 用户服务
 */
export class UserService {
  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return await queryOne<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    return await queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return await queryOne<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }

  /**
   * 创建新用户
   */
  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const { username, email, password, role = 'viewer', full_name, phone } = input;

    await query(
      `INSERT INTO users (id, username, email, password, role, full_name, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, username, email, password, role, full_name || null, phone || null]
    );

    const user = await this.findById(id);
    return user!;
  }

  /**
   * 更新用户信息
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const result = await update(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result > 0;
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [id]
    );
  }

  /**
   * 检查邮箱是否已存在
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * 检查用户名是否已存在
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      [username]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * 获取用户列表
   */
  async list(options: {
    limit?: number;
    offset?: number;
    role?: string;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { limit = 50, offset = 0, role } = options;

    let whereClause = '';
    const params: any[] = [];

    if (role) {
      whereClause = 'WHERE role = ?';
      params.push(role);
    }

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 获取用户列表
    const users = await query<User>(
      `SELECT * FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      users,
      total,
    };
  }

  /**
   * 更新密码
   */
  async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
    const result = await update(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result > 0;
  }
}

// 导出单例
export const userService = new UserService();
