const { query } = require('../dist/utils/db');

async function testDatabase() {
  try {
    console.log('Testing database connection...\n');

    // 测试查询
    const tables = await query('SHOW TABLES');
    console.log(`✓ Connected! Found ${tables.length} tables.\n`);

    // 检查关键表
    const keyTables = ['users', 'keywords', 'topics', 'contents', 'skill_templates'];
    console.log('Key tables status:');
    for (const table of keyTables) {
      const [result] = await query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.count;
      console.log(`  ✓ ${table}: ${count} records`);
    }

    console.log('\n✓ Database connection test passed!');

  } catch (error) {
    console.error('✗ Database test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testDatabase();
