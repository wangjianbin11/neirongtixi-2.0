import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';

async function runMigration() {
  console.log('Running knowledge base tables migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'f78d06aa32c2',
    database: 'asgbook',
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, '../migrations/006_create_knowledge_base_tables.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');

    await connection.query(sql);
    console.log('✓ Knowledge base tables created successfully!');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
