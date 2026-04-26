#!/usr/bin/env ts-node
/**
 * 数据库迁移执行脚本
 * 用法: npm run migrate 或 npm run migrate:rollback
 */

import { runMigrations, rollbackMigrations } from './runner';

const command = process.argv[2] || 'up';

async function main() {
  try {
    if (command === 'rollback') {
      await rollbackMigrations();
    } else {
      await runMigrations();
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

main();
