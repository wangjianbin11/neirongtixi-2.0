import { query } from '../utils/db';

(async () => {
  try {
    // 检查表结构
    console.log('=== 检查数据库表结构 ===\n');

    // Topics 表
    const topicColumns = await query('DESCRIBE topics');
    console.log('Topics 表字段:');
    topicColumns.forEach((c: any) => {
      if (c.Field.includes('title')) {
        console.log(`  ✓ ${c.Field} (${c.Type})`);
      }
    });

    // Contents 表
    const contentColumns = await query('DESCRIBE contents');
    console.log('\nContents 表字段:');
    contentColumns.forEach((c: any) => {
      if (c.Field.includes('title') || c.Field.includes('content_text')) {
        console.log(`  ✓ ${c.Field} (${c.Type})`);
      }
    });

    // 检查现有数据
    console.log('\n=== 检查现有数据 ===\n');

    const topics = await query('SELECT id, title, title_en FROM topics LIMIT 3');
    console.log('话题样本（需要添加英文标题）:');
    topics.forEach((t: any) => {
      console.log(`  - ${t.title}`);
      console.log(`    英文: ${t.title_en || '(未设置)'}`);
    });

    const contents = await query('SELECT id, title, title_en FROM contents LIMIT 3');
    console.log('\n内容样本（需要添加英文标题）:');
    contents.forEach((c: any) => {
      console.log(`  - ${c.title}`);
      console.log(`    英文: ${c.title_en || '(未设置)'}`);
    });

    // 更新一些测试数据
    console.log('\n=== 更新测试数据 ===\n');

    // 为第一个话题添加英文标题
    if (topics.length > 0 && !topics[0].title_en) {
      await query(
        'UPDATE topics SET title_en = ? WHERE id = ?',
        ['AI Tools Application in Cross-Border E-commerce', topics[0].id]
      );
      console.log('✓ 已为话题添加英文标题');
    }

    // 为第一个内容添加英文标题和内容
    if (contents.length > 0 && !contents[0].title_en) {
      await query(
        'UPDATE contents SET title_en = ?, content_text_en = ? WHERE id = ?',
        [
          'Dropshipping for Beginners: A Complete Guide',
          'Dropshipping is a retail fulfillment method where a store does not keep the products it sells in stock...',
          contents[0].id
        ]
      );
      console.log('✓ 已为内容添加英文标题和英文内容');
    }

    // 验证更新
    const updatedTopic = await query('SELECT title, title_en FROM topics WHERE id = ?', [topics[0].id]);
    const updatedContent = await query('SELECT title, title_en, LEFT(content_text_en, 50) as content_en_preview FROM contents WHERE id = ?', [contents[0].id]);

    console.log('\n=== 验证更新结果 ===\n');
    console.log('话题更新后:');
    console.log(`  中文: ${updatedTopic[0].title}`);
    console.log(`  英文: ${updatedTopic[0].title_en}`);

    console.log('\n内容更新后:');
    console.log(`  中文: ${updatedContent[0].title}`);
    console.log(`  英文: ${updatedContent[0].title_en}`);
    console.log(`  内容预览: ${updatedContent[0].content_en_preview}...`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
