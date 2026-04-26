import { query } from '../utils/db';

async function checkTables() {
  try {
    const result = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'asgbook'
      AND TABLE_NAME LIKE 'knowledge_base%'
    `);

    console.log('Knowledge base tables in database:');
    if (result.length === 0) {
      console.log('  ❌ No tables found!');
    } else {
      result.forEach((row: any) => {
        console.log(`  ✓ ${row.TABLE_NAME}`);
      });
    }
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
