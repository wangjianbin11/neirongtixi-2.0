import { query } from '../utils/db';

/**
 * 添加英文字段到 topics 和 contents 表
 */
export async function up() {
  console.log('Adding English fields to tables...');

  // 为 topics 表添加 title_en 字段
  try {
    await query(`
      ALTER TABLE topics
      ADD COLUMN title_en VARCHAR(500) NULL COMMENT '英文标题'
    `);
    console.log('✓ Added topics.title_en');
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
    console.log('  topics.title_en already exists');
  }

  // 为 contents 表添加 title_en 字段
  try {
    await query(`
      ALTER TABLE contents
      ADD COLUMN title_en VARCHAR(500) NULL COMMENT '英文标题'
    `);
    console.log('✓ Added contents.title_en');
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
    console.log('  contents.title_en already exists');
  }

  // 为 contents 表添加 content_text_en 字段
  try {
    await query(`
      ALTER TABLE contents
      ADD COLUMN content_text_en TEXT NULL COMMENT '英文内容'
    `);
    console.log('✓ Added contents.content_text_en');
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
    console.log('  contents.content_text_en already exists');
  }

  console.log('Migration completed successfully!');
}

export async function down() {
  console.log('Rolling back English fields...');

  // 删除添加的字段
  try {
    await query('ALTER TABLE topics DROP COLUMN title_en');
    console.log('✓ Dropped topics.title_en');
  } catch (error) {
    console.log('  topics.title_en does not exist');
  }

  try {
    await query('ALTER TABLE contents DROP COLUMN title_en');
    console.log('✓ Dropped contents.title_en');
  } catch (error) {
    console.log('  contents.title_en does not exist');
  }

  try {
    await query('ALTER TABLE contents DROP COLUMN content_text_en');
    console.log('✓ Dropped contents.content_text_en');
  } catch (error) {
    console.log('  contents.content_text_en does not exist');
  }

  console.log('Rollback completed!');
}

// 如果直接运行此文件
if (require.main === module) {
  up()
    .then(() => {
      console.log('\n✓ Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Migration failed:', error);
      process.exit(1);
    });
}
