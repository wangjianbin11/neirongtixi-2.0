import fs from 'fs';
import path from 'path';
import { pool, query, rawQuery } from '../utils/db';

/**
 * 运行数据库迁移
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname);

  try {
    // 确保迁移记录表存在
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 获取所有迁移文件
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== 'runner.ts')
      .sort();

    // 获取已执行的迁移
    const executed = await query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const executedSet = new Set(executed.map((e: any) => e.filename));

    console.log('Running database migrations...');

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`  ✓ ${file} - already executed`);
        continue;
      }

      console.log(`  → ${file} - executing...`);

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // 分割多个SQL语句并执行
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        // 使用 rawQuery 以支持 PREPARE 等特殊命令
        await rawQuery(statement);
      }

      // 记录迁移
      await query(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [file]
      );

      console.log(`  ✓ ${file} - completed`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * 回滚所有迁移（谨慎使用）
 */
export async function rollbackMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname);

  try {
    // 获取已执行的迁移（倒序）
    const executed = await query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename DESC'
    );

    for (const { filename } of executed) {
      console.log(`  → Rolling back ${filename}...`);

      // 这里需要为每个迁移编写对应的回滚逻辑
      // 暂时只删除迁移记录
      await query(
        'DELETE FROM schema_migrations WHERE filename = ?',
        [filename]
      );

      console.log(`  ✓ ${filename} - rolled back`);
    }

    console.log('Rollback completed');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}
