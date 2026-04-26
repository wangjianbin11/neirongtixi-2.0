const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function addMoreSkills() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'f78d06aa32c2',
    database: 'asgbook',
  });

  try {
    console.log('开始添加更多技能模板...\n');

    const newSkills = [
      {
        code: 'social_post_generator',
        name: '社媒帖子生成器',
        description: '为不同社交平台生成吸引人的帖子内容',
        category: 'content_production',
        prompt_template: '为{{topic}}生成{{platform}}平台帖子。目标受众：{{targetAudience}}。语气：{{tone}}。包含emoji和话题标签。内容要求：简洁、吸引人、易传播。',
        input_schema: JSON.stringify({
          topic: 'string',
          platform: 'string',
          targetAudience: 'string',
          tone: 'string'
        }),
        output_schema: JSON.stringify({
          postContent: 'string',
          hashtags: 'array',
          emojis: 'array'
        })
      },
      {
        code: 'summary_generator',
        name: '摘要生成器',
        description: '生成长文章的精简摘要',
        category: 'content_production',
        prompt_template: '为以下内容生成{{length}}字摘要：{{content}}。摘要要求：准确、简洁、保留关键信息。',
        input_schema: JSON.stringify({
          content: 'string',
          length: 'number'
        }),
        output_schema: JSON.stringify({
          summary: 'string',
          keyPoints: 'array'
        })
      },
      {
        code: 'faq_generator',
        name: 'FAQ生成器',
        description: '根据内容生成常见问题和解答',
        category: 'content_production',
        prompt_template: '基于以下内容生成5-10个FAQ：{{content}}。要求：问题真实反映用户关心点，答案准确简洁。',
        input_schema: JSON.stringify({
          content: 'string',
          count: 'number'
        }),
        output_schema: JSON.stringify({
          faqs: 'array'
        })
      },
      {
        code: 'video_script_generator',
        name: '视频脚本生成器',
        description: '生成短视频或长视频脚本',
        category: 'content_production',
        prompt_template: '为{{topic}}生成{{videoType}}视频脚本。时长：{{duration}}分钟。风格：{{style}}。包含场景描述、台词、画面建议。',
        input_schema: JSON.stringify({
          topic: 'string',
          videoType: 'string',
          duration: 'number',
          style: 'string'
        }),
        output_schema: JSON.stringify({
          script: 'string',
          scenes: 'array',
          duration: 'number'
        })
      },
      {
        code: 'product_description',
        name: '产品描述生成器',
        description: '生成吸引人的产品描述',
        category: 'content_production',
        prompt_template: '为{{product}}生成产品描述。核心卖点：{{features}}。目标客户：{{targetCustomer}}。风格：{{style}}。描述要求：吸引人、突出优势、激发购买欲。',
        input_schema: JSON.stringify({
          product: 'string',
          features: 'string',
          targetCustomer: 'string',
          style: 'string'
        }),
        output_schema: JSON.stringify({
          title: 'string',
          description: 'string',
          callToAction: 'string'
        })
      },
      {
        code: 'email_subject_optimizer',
        name: '邮件标题优化器',
        description: '优化邮件标题提高打开率',
        category: 'optimization',
        prompt_template: '优化邮件标题：{{subject}}。邮件内容：{{content}}。目标：提高打开率。提供5个优化版本，并说明优化理由。',
        input_schema: JSON.stringify({
          subject: 'string',
          content: 'string'
        }),
        output_schema: JSON.stringify({
          suggestions: 'array',
          bestOption: 'string',
          reasons: 'array'
        })
      },
      {
        code: 'keyword_density_analyzer',
        name: '关键词密度分析器',
        description: '分析内容中关键词的密度和分布',
        category: 'optimization',
        prompt_template: '分析内容中关键词{{keywords}}的密度和分布。内容：{{content}}。提供密度百分比、分布建议、SEO优化建议。',
        input_schema: JSON.stringify({
          content: 'string',
          keywords: 'array'
        }),
        output_schema: JSON.stringify({
          density: 'object',
          suggestions: 'array',
          score: 'number'
        })
      },
      {
        code: 'competitor_analyzer',
        name: '竞品分析器',
        description: '分析竞争对手的内容策略',
        category: 'data_input',
        prompt_template: '分析{{competitor}}的内容策略。分析维度：内容类型、发布频率、话题选择、互动情况。提供优劣势分析和借鉴建议。',
        input_schema: JSON.stringify({
          competitor: 'string',
          analysisDepth: 'string'
        }),
        output_schema: JSON.stringify({
          strengths: 'array',
          weaknesses: 'array',
          recommendations: 'array',
          score: 'number'
        })
      },
      {
        code: 'content_rewriter',
        name: '改写助手',
        description: '改写和润色内容以提升质量',
        category: 'optimization',
        prompt_template: '改写以下内容：{{content}}。改写目标：{{goal}}。风格：{{style}}。保持原意，提升表达质量和可读性。',
        input_schema: JSON.stringify({
          content: 'string',
          goal: 'string',
          style: 'string'
        }),
        output_schema: JSON.stringify({
          rewritten: 'string',
          improvements: 'array',
          comparison: 'object'
        })
      },
      {
        code: 'trend_discoverer',
        name: '趋势话题发现器',
        description: '发现行业热门趋势和话题机会',
        category: 'data_input',
        prompt_template: '发现{{industry}}行业的热门趋势和话题机会。时间范围：{{timeRange}}。提供具体话题、热度分析、内容机会建议。',
        input_schema: JSON.stringify({
          industry: 'string',
          timeRange: 'string'
        }),
        output_schema: JSON.stringify({
          trends: 'array',
          opportunities: 'array',
          recommendations: 'array'
        })
      },
      {
        code: 'outline_generator',
        name: '大纲生成器',
        description: '生成内容大纲',
        category: 'content_production',
        prompt_template: '为{{topic}}生成内容大纲。内容类型：{{contentType}}。目标读者：{{targetAudience}}。提供详细的大纲结构和关键点。',
        input_schema: JSON.stringify({
          topic: 'string',
          contentType: 'string',
          targetAudience: 'string'
        }),
        output_schema: JSON.stringify({
          outline: 'array',
          sections: 'array',
          wordCountEstimate: 'number'
        })
      },
      {
        code: 'cta_generator',
        name: 'CTA生成器',
        description: '生成有效的行动号召',
        category: 'content_production',
        prompt_template: '为{{offer}}生成行动号召。目标：{{goal}}。受众：{{audience}}。平台：{{platform}}。提供5个不同风格的CTA选项。',
        input_schema: JSON.stringify({
          offer: 'string',
          goal: 'string',
          audience: 'string',
          platform: 'string'
        }),
        output_schema: JSON.stringify({
          ctas: 'array',
          bestPractices: 'array',
          recommendations: 'string'
        })
      },
      {
        code: 'readability_improver',
        name: '可读性优化器',
        description: '优化内容的可读性',
        category: 'optimization',
        prompt_template: '优化以下内容的可读性：{{content}}。目标读者：{{audience}}。提供优化后的内容、可读性评分、改进建议。',
        input_schema: JSON.stringify({
          content: 'string',
          audience: 'string'
        }),
        output_schema: JSON.stringify({
          optimized: 'string',
          score: 'object',
          improvements: 'array'
        })
      },
      {
        code: 'content_scaler',
        name: '内容扩展器',
        description: '将简短内容扩展为详细文章',
        category: 'content_production',
        prompt_template: '将以下核心要点扩展为完整文章：{{points}}。目标长度：{{targetLength}}字。主题：{{topic}}。保持逻辑连贯，内容充实。',
        input_schema: JSON.stringify({
          points: 'string',
          targetLength: 'number',
          topic: 'string'
        }),
        output_schema: JSON.stringify({
          article: 'string',
          actualLength: 'number',
          sections: 'array'
        })
      },
      {
        code: 'meta_tag_generator',
        name: '元标签生成器',
        description: '生成SEO优化的元标签',
        category: 'optimization',
        prompt_template: '为{{content}}生成SEO元标签。包括：title标签、meta描述、keywords。优化目标：{{targetKeyword}}。长度限制：title{{titleLimit}}字，description{{descLimit}}字。',
        input_schema: JSON.stringify({
          content: 'string',
          targetKeyword: 'string',
          titleLimit: 'number',
          descLimit: 'number'
        }),
        output_schema: JSON.stringify({
          title: 'string',
          description: 'string',
          keywords: 'array',
          score: 'number'
        })
      },
      {
        code: 'comment_responder',
        name: '评论回复生成器',
        description: '生成针对用户评论的回复',
        category: 'content_production',
        prompt_template: '为用户评论生成回复。评论内容：{{comment}}。回复风格：{{tone}}。品牌调性：{{brandVoice}}。要求：友好、专业、有互动性。',
        input_schema: JSON.stringify({
          comment: 'string',
          tone: 'string',
          brandVoice: 'string'
        }),
        output_schema: JSON.stringify({
          response: 'string',
          alternatives: 'array'
        })
      }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const skill of newSkills) {
      // 检查是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM skill_templates WHERE code = ?',
        [skill.code]
      );

      if (existing.length > 0) {
        console.log(`  ⊘ 跳过 ${skill.code} - 已存在`);
        skippedCount++;
        continue;
      }

      const id = uuidv4();
      await connection.query(
        `INSERT INTO skill_templates (id, code, name, description, category, prompt_template, input_schema, output_schema, version, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1.0.0', 1)`,
        [id, skill.code, skill.name, skill.description, skill.category, skill.prompt_template, skill.input_schema, skill.output_schema]
      );

      console.log(`  ✓ 添加 ${skill.code}: ${skill.name}`);
      addedCount++;
    }

    console.log(`\n完成！添加了 ${addedCount} 个新技能，跳过 ${skippedCount} 个已存在的技能。`);

    // 显示分类统计
    const [stats] = await connection.query(
      'SELECT category, COUNT(*) as count FROM skill_templates GROUP BY category ORDER BY category'
    );

    console.log('\n技能分类统计:');
    stats.forEach(stat => {
      console.log(`  ${stat.category}: ${stat.count} 个`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

addMoreSkills();
