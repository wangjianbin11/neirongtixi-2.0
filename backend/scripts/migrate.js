const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  // 读取 SQL 文件
  const sqlFile = path.join(__dirname, '../../database/migrations/001_init_mysql.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // 连接数据库
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'f78d06aa32c2',
    multipleStatements: true,
  });

  try {
    console.log('Connected to MySQL server');

    // 创建数据库（如果不存在）
    await connection.query('CREATE DATABASE IF NOT EXISTS asgbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('Database created or already exists');

    // 切换到目标数据库
    await connection.query('USE asgbook');
    console.log('Using database: asgbook');

    // 执行 SQL 脚本
    await connection.query(sql);
    console.log('Migration completed successfully!');

    // 验证表是否创建
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\nCreated tables:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('\nNote: Some tables may already exist. This is normal if you have run the migration before.');
    }
  } finally {
    await connection.end();
    console.log('\nConnection closed');
  }
}

migrate();
