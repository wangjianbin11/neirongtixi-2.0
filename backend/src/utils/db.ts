import mysql from 'mysql2/promise';
import { config } from '../config';

/**
 * MySQL连接池
 */
export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: config.database.waitForConnections,
  connectionLimit: config.database.connectionLimit,
  queueLimit: config.database.queueLimit,
  // MySQL 5.7 兼容配置
  charset: 'utf8mb4',
  timezone: '+00:00',
  // 启用execute以支持命名参数
  namedPlaceholders: false,
});

/**
 * 执行查询
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/**
 * 执行原始SQL（用于迁移等特殊场景，不支持PREPARE等命令）
 */
export async function rawQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

/**
 * 执行查询并返回单行
 */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 插入数据并返回插入的ID
 */
export async function insert(sql: string, params?: any[]): Promise<number> {
  const [result] = await pool.execute(sql, params);
  return (result as any).insertId;
}

/**
 * 更新数据并返回影响的行数
 */
export async function update(sql: string, params?: any[]): Promise<number> {
  const [result] = await pool.execute(sql, params);
  return (result as any).affectedRows;
}

/**
 * 删除数据并返回影响的行数
 */
export async function remove(sql: string, params?: any[]): Promise<number> {
  const [result] = await pool.execute(sql, params);
  return (result as any).affectedRows;
}

/**
 * 检查数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.getConnection();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * 转义SQL标识符
 */
export function escapeIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

/**
 * 转义SQL值
 */
export function escapeValue(value: any): string {
  return pool.escape(value);
}

export default pool;
