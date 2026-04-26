import { query } from '../utils/db';

(async () => {
  try {
    // 检查关键词表
    const keywords = await query('SELECT COUNT(*) as count FROM keywords');
    console.log('Keywords count:', keywords[0].count);

    // 检查关键词表结构
    const columns = await query('DESCRIBE keywords');
    console.log('\nKeywords table columns:');
    columns.forEach((c: any) => console.log(`  - ${c.Field} (${c.Type})`));

    // 查看一些样本数据
    const samples = await query('SELECT id, keyword, status FROM keywords LIMIT 5');
    console.log('\nSample keywords:');
    samples.forEach((k: any) => console.log(`  - ${k.keyword} (${k.status})`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
