/**
 * 关键词表诊断和修复工具
 * 运行: node scripts/check_keywords_table.js
 */

const path = require('path');
// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');
const fs = require('fs');

// 数据库配置（与backend一致）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'asgbook',
  charset: 'utf8mb4',
  timezone: '+00:00',
  multipleStatements: true, // 允许多语句执行
};

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

async function getTableColumns(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT column_name, data_type, column_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?
     ORDER BY ordinal_position`,
    [tableName]
  );
  return rows;
}

async function getTableCount(connection, tableName) {
  try {
    const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    return rows[0].count;
  } catch (error) {
    return -1;
  }
}

async function executeSqlFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await connection.query(sql);
    return true;
  } catch (error) {
    console.error('SQL执行错误:', error.message);
    return false;
  }
}

async function main() {
  let connection;

  try {
    log('\n====================================', 'cyan');
    log('关键词表诊断和修复工具', 'cyan');
    log('====================================\n', 'cyan');

    // 连接数据库
    log('正在连接数据库...', 'blue');
    connection = await mysql.createConnection(dbConfig);
    log('✓ 数据库连接成功\n', 'green');

    // 1. 检查keywords表是否存在
    log('1. 检查keywords表是否存在...', 'blue');
    const tableExists = await checkTableExists(connection, 'keywords');

    if (!tableExists) {
      log('  ✗ keywords表不存在！', 'red');
      log('  正在从初始化脚本创建...', 'yellow');

      const initSqlPath = path.join(__dirname, '../../database/migrations/001_init_mysql.sql');
      const initSql = fs.readFileSync(initSqlPath, 'utf8');

      // 提取keywords表的CREATE语句
      const createTableMatch = initSql.match(
        /CREATE TABLE IF NOT EXISTS keywords [\s\S]+?\)\s*ENGINE=InnoDB/
      );

      if (createTableMatch) {
        await connection.query(createTableMatch[0]);
        log('✓ keywords表创建成功\n', 'green');
      } else {
        log('✗ 无法从初始化脚本中提取keywords表创建语句', 'red');
        return;
      }
    } else {
      log('  ✓ keywords表存在\n', 'green');
    }

    // 2. 检查表中的数据量
    log('2. 检查keywords表中的数据...', 'blue');
    const count = await getTableCount(connection, 'keywords');
    log(`  当前记录数: ${count}\n`, count > 0 ? 'green' : 'yellow');

    // 3. 检查表结构
    log('3. 检查keywords表结构...', 'blue');
    const columns = await getTableColumns(connection, 'keywords');

    const requiredColumns = [
      'id', 'keyword', 'search_volume', 'kd_score', 'cpc',
      'intent', 'asg_relevance', 'priority', 'status',
      'category', 'target_customer', 'competition', 'created_by',
      'source', 'tags', 'notes', 'created_at', 'updated_at'
    ];

    const missingColumns = [];

    log('  当前列:', 'cyan');
    for (const col of columns) {
      const exists = requiredColumns.includes(col.column_name);
      const mark = exists ? '✓' : '?';
      const color = exists ? 'green' : 'yellow';
      log(`    ${mark} ${col.column_name} (${col.column_type})`, color);
    }

    // 检查缺失的列
    for (const required of requiredColumns) {
      if (!columns.find(c => c.column_name === required)) {
        missingColumns.push(required);
      }
    }

    if (missingColumns.length > 0) {
      log(`\n  ⚠ 发现缺失的列: ${missingColumns.join(', ')}`, 'yellow');
      log('  正在执行迁移脚本修复...', 'blue');

      const migrationPath = path.join(__dirname, '../src/migrations/005_add_keywords_fields.sql');

      if (fs.existsSync(migrationPath)) {
        const success = await executeSqlFile(connection, migrationPath);
        if (success) {
          log('✓ 迁移脚本执行成功\n', 'green');
          // 重新获取列信息
          const newColumns = await getTableColumns(connection, 'keywords');
          log('  更新后的列:', 'cyan');
          for (const col of newColumns) {
            log(`    ✓ ${col.column_name} (${col.column_type})`, 'green');
          }
        } else {
          log('✗ 迁移脚本执行失败', 'red');
        }
      } else {
        log(`✗ 迁移文件不存在: ${migrationPath}`, 'red');
      }
    } else {
      log('\n  ✓ 所有必需的列都存在\n', 'green');
    }

    // 4. 添加测试数据（如果表为空）
    const newCount = await getTableCount(connection, 'keywords');
    if (newCount === 0) {
      log('4. keywords表为空，正在添加测试数据...', 'blue');

      const testKeywords = [
        { keyword: 'shopify seo', category: 'core', search_volume: 1000, competition: 'medium', intent: 'informational', priority: 'A', target_customer: 'C1-Entrepreneur' },
        { keyword: 'dropshipping suppliers', category: 'core', search_volume: 5000, competition: 'high', intent: 'commercial', priority: 'S', target_customer: 'C2-Experienced' },
        { keyword: 'how to start ecommerce', category: 'guide', search_volume: 10000, competition: 'high', intent: 'informational', priority: 'A', target_customer: 'C1-Entrepreneur' },
        { keyword: 'shopify vs woocommerce', category: 'comparison', search_volume: 3000, competition: 'medium', intent: 'informational', priority: 'B', target_customer: 'C1-Entrepreneur' },
        { keyword: 'best shopify apps', category: 'long_tail', search_volume: 2000, competition: 'low', intent: 'commercial', priority: 'B', target_customer: 'C2-Experienced' },
        { keyword: 'ecommerce marketing tips', category: 'core', search_volume: 8000, competition: 'high', intent: 'informational', priority: 'A', target_customer: 'C3-TeamSeller' },
        { keyword: 'shopify dropshipping guide', category: 'guide', search_volume: 3000, competition: 'medium', intent: 'informational', priority: 'B', target_customer: 'C1-Entrepreneur' },
        { keyword: 'sell online internationally', category: 'long_tail', search_volume: 1500, competition: 'low', intent: 'informational', priority: 'C', target_customer: 'C4-LocalToGlobal' },
      ];

      const { v4: uuidv4 } = require('uuid');
      for (const kw of testKeywords) {
        const id = uuidv4();
        await connection.execute(
          `INSERT INTO keywords (id, keyword, category, search_volume, competition, intent, asg_relevance, priority, status, source, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'manual', ?)`,
          [id, kw.keyword, kw.category, kw.search_volume, kw.competition, kw.intent, 5, kw.priority, null]
        );
      }

      log(`✓ 添加了 ${testKeywords.length} 条测试数据\n`, 'green');
    }

    // 最终状态
    const finalCount = await getTableCount(connection, 'keywords');
    log('\n====================================', 'cyan');
    log('诊断完成', 'cyan');
    log('====================================', 'cyan');
    log(`keywords表记录数: ${finalCount}`, 'green');
    log('数据库状态: 正常\n', 'green');

  } catch (error) {
    log(`\n错误: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行主程序
main();
