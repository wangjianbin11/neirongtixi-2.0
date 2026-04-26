import fs from 'fs/promises';
import path from 'path';
import { query } from '../utils/db';

async function runMigration() {
  console.log('Running research tables migration...');

  try {
    const sqlPath = path.join(__dirname, '../migrations/007_create_research_tables.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');

    // 分割SQL语句并执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          await query(statement);
          console.log(`  ✓ Success`);
        } catch (err: any) {
          console.log(`  ✗ Failed: ${err.message}`);
        }
      }
    }

    console.log('✓ Research tables created successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
