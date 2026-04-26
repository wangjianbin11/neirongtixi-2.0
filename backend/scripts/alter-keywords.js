const { query } = require('../dist/utils/db');

async function alterKeywordsTable() {
  try {
    console.log('正在更新 keywords 表结构...\n');

    // 添加 category 字段
    try {
      await query(`ALTER TABLE keywords ADD COLUMN category VARCHAR(50) AFTER keyword`);
      console.log('✓ 添加 category 字段');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
    }

    // 添加 competition 字段
    try {
      await query(`ALTER TABLE keywords ADD COLUMN competition ENUM('low', 'medium', 'high') DEFAULT 'medium' AFTER kd_score`);
      console.log('✓ 添加 competition 字段');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
    }

    // 添加 target_customer 字段
    try {
      await query(`ALTER TABLE keywords ADD COLUMN target_customer VARCHAR(50) AFTER asg_relevance`);
      console.log('✓ 添加 target_customer 字段');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
    }

    console.log('\n✅ keywords 表结构更新完成！');

  } catch (error) {
    console.error('更新失败:', error.message);
  } finally {
    process.exit(0);
  }
}

alterKeywordsTable();
