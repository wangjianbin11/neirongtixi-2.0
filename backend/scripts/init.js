const bcrypt = require('bcrypt');
const { query, queryOne } = require('../dist/utils/db');

async function initialize() {
  try {
    console.log('开始初始化系统数据...\n');

    // 1. 创建管理员用户
    console.log('1. 创建管理员用户...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const existingAdmin = await queryOne('SELECT id FROM users WHERE username = ?', ['admin']);

    if (!existingAdmin) {
      await query(
        `INSERT INTO users (id, username, email, password, role, status, is_active)
         VALUES (UUID(), ?, ?, ?, 'admin', 'active', 1)`,
        ['admin', 'admin@example.com', hashedPassword]
      );
      console.log('   ✓ 管理员用户创建成功');
      console.log('     用户名: admin');
      console.log('     密码: admin123');
      console.log('     邮箱: admin@example.com\n');
    } else {
      console.log('   - 管理员用户已存在，跳过\n');
    }

    // 2. 创建系统配置
    console.log('2. 创建系统配置...');
    const configs = [
      // 通用设置
      { key: 'site_name', value: 'ASG内容系统', description: '站点名称', is_public: true },
      { key: 'site_url', value: 'http://localhost:3000', description: '站点URL', is_public: true },
      { key: 'language', value: 'zh-CN', description: '默认语言', is_public: true },
      { key: 'timezone', value: 'Asia/Shanghai', description: '时区', is_public: true },

      // AI设置
      { key: 'ai_provider', value: 'anthropic', description: 'AI服务提供商', is_public: false },
      { key: 'ai_model', value: 'claude-3-5-sonnet-20241022', description: 'AI模型', is_public: false },
      { key: 'ai_max_tokens', value: 3000, description: 'AI最大Token数', is_public: false },
      { key: 'ai_temperature', value: 0.7, description: 'AI温度参数', is_public: false },

      // 发布设置
      { key: 'publish_auto', value: false, description: '自动发布', is_public: false },
      { key: 'publish_retry_attempts', value: 3, description: '发布重试次数', is_public: false },
      { key: 'publish_retry_delay', value: 5, description: '发布重试延迟(秒)', is_public: false },
      { key: 'publish_queue_paused', value: false, description: '发布队列暂停', is_public: false },

      // 通知设置
      { key: 'notif_email_enabled', value: true, description: '邮件通知启用', is_public: false },
      { key: 'notif_push_enabled', value: true, description: '推送通知启用', is_public: false },
      { key: 'notif_sms_enabled', value: false, description: '短信通知启用', is_public: false },
      { key: 'notif_content_published', value: true, description: '内容发布通知', is_public: false },
      { key: 'notif_publish_failed', value: true, description: '发布失败通知', is_public: false },
      { key: 'notif_system_updates', value: true, description: '系统更新通知', is_public: false },
    ];

    for (const config of configs) {
      const existing = await queryOne('SELECT id FROM system_configs WHERE `key` = ?', [config.key]);
      if (!existing) {
        await query(
          `INSERT INTO system_configs (id, \`key\`, value, description, is_public)
           VALUES (UUID(), ?, ?, ?, ?)`,
          [config.key, JSON.stringify(config.value), config.description, config.is_public ? 1 : 0]
        );
      }
    }
    console.log('   ✓ 系统配置创建完成\n');

    // 3. 创建技能模板
    console.log('3. 创建技能模板...');
    const skills = [
      {
        code: 'keyword_research',
        name: '关键词研究',
        description: '根据话题自动生成相关关键词',
        category: 'data_input',
        prompt_template: '请为主题"{{topic}}"生成10-15个相关的SEO关键词。考虑以下方面：搜索意图、竞争程度、目标客户{{target_customer}}。返回JSON格式：[{keyword, searchVolume, competition, intent}]',
        input_schema: { topic: 'string', targetCustomer: 'string' },
        output_schema: { keywords: 'array' }
      },
      {
        code: 'content_generator',
        name: '内容生成器',
        description: '根据话题生成高质量内容',
        category: 'content_production',
        prompt_template: '请为主题"{{topic}}"创作一篇{{contentType}}。目标受众：{{targetCustomer}}。平台：{{platform}}。内容要求：专业、实用、易于理解。',
        input_schema: { topic: 'string', contentType: 'string', targetCustomer: 'string', platform: 'string' },
        output_schema: { content: 'string', title: 'string', summary: 'string' }
      },
      {
        code: 'title_optimizer',
        name: '标题优化器',
        description: '优化内容标题以获得更好的点击率',
        category: 'optimization',
        prompt_template: '请优化以下标题：{{title}}。平台：{{platform}}。目标：提高点击率和SEO效果。提供5个优化建议。',
        input_schema: { title: 'string', platform: 'string' },
        output_schema: { suggestions: 'array' }
      },
      {
        code: 'hashtag_generator',
        name: '标签生成器',
        description: '为内容生成相关的社交媒体标签',
        category: 'content_production',
        prompt_template: '为以下内容生成10-15个相关的热门标签：{{content}}。平台：{{platform}}。',
        input_schema: { content: 'string', platform: 'string' },
        output_schema: { hashtags: 'array' }
      },
      {
        code: 'content_analyzer',
        name: '内容分析器',
        description: '分析内容质量并提供改进建议',
        category: 'optimization',
        prompt_template: '请分析以下内容的质量：{{content}}。评估维度：可读性、SEO、专业性、吸引力。提供具体的改进建议。',
        input_schema: { content: 'string' },
        output_schema: { score: 'number', analysis: 'object', suggestions: 'array' }
      }
    ];

    for (const skill of skills) {
      const existing = await queryOne('SELECT id FROM skill_templates WHERE code = ?', [skill.code]);
      if (!existing) {
        await query(
          `INSERT INTO skill_templates (id, code, name, description, category, prompt_template, input_schema, output_schema, version, is_active)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, '1.0.0', 1)`,
          [skill.code, skill.name, skill.description, skill.category, skill.prompt_template,
           JSON.stringify(skill.input_schema), JSON.stringify(skill.output_schema)]
        );
      }
    }
    console.log('   ✓ 技能模板创建完成\n');

    // 4. 创建关键词分类
    console.log('4. 创建关键词分类...');
    const categories = [
      { id: 'core', name: '核心词', description: '业务核心关键词' },
      { id: 'long_tail', name: '长尾词', description: '长尾搜索关键词' },
      { id: 'question', name: '问题词', description: '疑问类关键词' },
      { id: 'guide', name: '指南词', description: '教程指南类关键词' },
      { id: 'comparison', name: '对比词', description: '产品对比类关键词' },
      { id: 'brand', name: '品牌词', description: '品牌相关关键词' },
      { id: 'product', name: '产品词', description: '产品相关关键词' },
      { id: 'industry', name: '行业词', description: '行业术语关键词' },
    ];

    for (const category of categories) {
      const existing = await queryOne('SELECT id FROM keyword_categories WHERE id = ?', [category.id]);
      if (!existing) {
        await query(
          `INSERT INTO keyword_categories (id, name, description) VALUES (?, ?, ?)`,
          [category.id, category.name, category.description]
        );
      }
    }
    console.log('   ✓ 关键词分类创建完成\n');

    // 5. 创建示例话题
    console.log('5. 创建示例话题...');
    const sampleTopics = [
      {
        title: '如何选择合适的跨境电商平台',
        description: '分析主流跨境电商平台的特点、费用和适用场景',
        topic_type: 'tutorial',
        target_customer: 'startup',
        priority: 'A',
        estimated_effort: 3,
      },
      {
        title: 'TikTok短视频营销策略',
        description: '介绍如何在TikTok上开展有效的跨境电商营销',
        topic_type: 'insight',
        target_customer: 'experienced',
        priority: 'A',
        estimated_effort: 2,
      },
      {
        title: 'SEO工具对比：Ahrefs vs SEMrush',
        description: '深入比较两大SEO工具的功能和性价比',
        topic_type: 'comparison',
        target_customer: 'team',
        priority: 'B',
        estimated_effort: 2,
      },
    ];

    const adminUser = await queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
    if (adminUser) {
      for (const topic of sampleTopics) {
        const existing = await queryOne('SELECT id FROM topics WHERE title = ?', [topic.title]);
        if (!existing) {
          await query(
            `INSERT INTO topics (id, title, description, topic_type, target_customer, priority, estimated_effort, status, created_by)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [topic.title, topic.description, topic.topic_type, topic.target_customer, topic.priority, topic.estimated_effort, adminUser.id]
          );
        }
      }
    }
    console.log('   ✓ 示例话题创建完成\n');

    // 6. 创建示例关键词
    console.log('6. 创建示例关键词...');
    const sampleKeywords = [
      { keyword: '跨境电商平台', category: 'core', search_volume: 10000, competition: 'high', priority: 'S' },
      { keyword: '跨境电商如何开始', category: 'guide', search_volume: 5000, competition: 'medium', priority: 'A' },
      { keyword: 'shopify vs woocommerce', category: 'comparison', search_volume: 8000, competition: 'high', priority: 'A' },
      { keyword: 'tiktok电商怎么做', category: 'question', search_volume: 3000, competition: 'low', priority: 'B' },
      { keyword: '独立站推广方法', category: 'long_tail', search_volume: 2000, competition: 'medium', priority: 'B' },
      { keyword: 'amazon开店流程', category: 'guide', search_volume: 15000, competition: 'high', priority: 'S' },
      { keyword: '跨境电商选品技巧', category: 'core', search_volume: 6000, competition: 'medium', priority: 'A' },
      { keyword: 'facebook广告投放教程', category: 'guide', search_volume: 4000, competition: 'low', priority: 'B' },
    ];

    for (const kw of sampleKeywords) {
      const existing = await queryOne('SELECT id FROM keywords WHERE keyword = ?', [kw.keyword]);
      if (!existing) {
        const kdScore = kw.competition === 'low' ? 20 : kw.competition === 'high' ? 80 : 50;
        await query(
          `INSERT INTO keywords (id, keyword, category, search_volume, kd_score, competition, intent, asg_relevance, priority, status, source)
           VALUES (UUID(), ?, ?, ?, ?, ?, 'informational', 5, ?, 'pending', 'manual')`,
          [kw.keyword, kw.category, kw.search_volume, kdScore, kw.competition, kw.priority]
        );
      }
    }
    console.log('   ✓ 示例关键词创建完成\n');

    // 显示统计信息
    console.log('=================================');
    console.log('初始化完成！数据统计：');
    console.log('=================================');

    const [userCount] = await query('SELECT COUNT(*) as count FROM users');
    const [configCount] = await query('SELECT COUNT(*) as count FROM system_configs');
    const [skillCount] = await query('SELECT COUNT(*) as count FROM skill_templates');
    const [categoryCount] = await query('SELECT COUNT(*) as count FROM keyword_categories');
    const [topicCount] = await query('SELECT COUNT(*) as count FROM topics');
    const [keywordCount] = await query('SELECT COUNT(*) as count FROM keywords');

    console.log(`  用户: ${userCount.count}`);
    console.log(`  系统配置: ${configCount.count}`);
    console.log(`  技能模板: ${skillCount.count}`);
    console.log(`  关键词分类: ${categoryCount.count}`);
    console.log(`  话题: ${topicCount.count}`);
    console.log(`  关键词: ${keywordCount.count}`);
    console.log('=================================\n');

    console.log('✅ 系统初始化完成！');
    console.log('\n登录信息：');
    console.log('  地址: http://localhost:4000/api/v1');
    console.log('  用户名: admin');
    console.log('  密码: admin123\n');

  } catch (error) {
    console.error('初始化失败:', error.message);
  } finally {
    process.exit(0);
  }
}

initialize();
