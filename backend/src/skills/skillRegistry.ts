import {
  SkillMetadata,
  SkillExecutionContext,
  SkillExecutionResult,
} from '../models/types';

/**
 * 技能注册表
 * 维护所有可用技能的元数据
 */
export class SkillRegistry {
  private skills: Map<string, SkillMetadata> = new Map();

  /**
   * 注册技能
   */
  register(metadata: SkillMetadata): void {
    this.skills.set(metadata.id, metadata);
  }

  /**
   * 获取技能元数据
   */
  get(id: string): SkillMetadata | undefined {
    return this.skills.get(id);
  }

  /**
   * 检查技能是否存在
   */
  has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * 获取所有技能
   */
  getAll(): SkillMetadata[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按分类获取技能
   */
  getByCategory(category: string): SkillMetadata[] {
    return this.getAll().filter(s => s.category === category);
  }

  /**
   * 获取活跃的技能
   */
  getActive(): SkillMetadata[] {
    return this.getAll().filter(s => s.is_active);
  }
}

/**
 * 创建技能注册表实例并初始化预置技能
 */
export function createSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();

  // ============================================
  // 研究类技能
  // ============================================

  registry.register({
    id: 'keyword-research',
    name: '关键词调研',
    description: '深入调研关键词的搜索意图、相关话题和竞品分析',
    category: 'research',
    input_schema: {
      keyword: { type: 'string', required: true },
      depth: { type: 'string', enum: ['basic', 'standard', 'deep'], default: 'standard' },
      include_competitors: { type: 'boolean', default: true },
    },
    output_schema: {
      search_intent: { type: 'string' },
      related_topics: { type: 'array' },
      competitors: { type: 'array' },
      opportunities: { type: 'array' },
    },
    estimated_time: 30,
    estimated_cost: 0,
    ai_provider: 'ollama',
    model: 'deepseek-r1:8b',
    is_active: true,
  });

  registry.register({
    id: 'topic-research',
    name: '话题调研',
    description: '深入研究话题框架、用户痛点和内容机会',
    category: 'research',
    input_schema: {
      topic: { type: 'string', required: true },
      keyword_id: { type: 'string' },
      research_depth: { type: 'string', enum: ['quick', 'standard', 'comprehensive'], default: 'standard' },
    },
    output_schema: {
      framework: { type: 'object' },
      pain_points: { type: 'array' },
      content_angles: { type: 'array' },
      target_audience: { type: 'object' },
    },
    estimated_time: 45,
    estimated_cost: 0.02,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  registry.register({
    id: 'content-research',
    name: '内容调研',
    description: '收集权威来源、统计数据和案例',
    category: 'research',
    input_schema: {
      topic: { type: 'string', required: true },
      framework: { type: 'object' },
      sources_count: { type: 'number', default: 5 },
    },
    output_schema: {
      sources: { type: 'array' },
      statistics: { type: 'array' },
      case_studies: { type: 'array' },
    },
    estimated_time: 60,
    estimated_cost: 0.03,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  // ============================================
  // 双语工作流研究类技能
  // ============================================

  registry.register({
    id: 'keyword-crawl-research',
    name: '关键词爬取调研',
    description: '模拟浏览器爬取谷歌搜索和热门频道，获取关键词相关的话题、竞品内容和热门讨论',
    category: 'research',
    input_schema: {
      keyword: { type: 'string', required: true },
      search_depth: { type: 'number', default: 10 },
      include_channels: {
        type: 'array',
        default: [
          'google',
          'youtube',
          'tiktok',
          'reddit',
          'quora',
          'linkedin',
          'twitter',
          'pinterest',
          'instagram',
          'medium'
        ],
        description: '包含的搜索渠道（最少10个）'
      },
    },
    output_schema: {
      keyword_analysis: { type: 'object' },
      trending_topics: { type: 'array' },
      competitor_content: { type: 'array' },
      popular_questions: { type: 'array' },
      search_volume_data: { type: 'object' },
      channel_insights: { type: 'array' },
    },
    estimated_time: 180,
    estimated_cost: 0.08,
    ai_provider: 'ollama',
    model: 'deepseek-r1:8b',
    is_active: true,
  });

  registry.register({
    id: 'deep-research-20-channels',
    name: '20+渠道深度调研',
    description: '从20+不同渠道深度调研话题：Google、YouTube、TikTok、Reddit、Quora、LinkedIn、Pinterest、Instagram、Twitter、Medium、竞品网站、行业报告、论坛、博客、社交媒体、搜索趋势、用户评论、关键词变体、内容格式、发布时间等',
    category: 'research',
    input_schema: {
      topic_en: { type: 'string', required: true },
      research_scope: {
        type: 'string',
        enum: ['standard', 'comprehensive', 'exhaustive'],
        default: 'comprehensive',
      },
      target_platforms: {
        type: 'array',
        default: ['blog', 'youtube', 'tiktok', 'instagram', 'linkedin', 'twitter', 'reddit', 'pinterest'],
      },
    },
    output_schema: {
      research_summary: { type: 'object' },
      channel_insights: { type: 'array' },
      content_gaps: { type: 'array' },
      trending_formats: { type: 'array' },
      best_posting_times: { type: 'object' },
      audience_preferences: { type: 'object' },
      competitor_analysis: { type: 'array' },
      keyword_variations: { type: 'array' },
      content_opportunities: { type: 'array' },
    },
    estimated_time: 300,
    estimated_cost: 0.15,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  // ============================================
  // 内容生成类技能
  // ============================================

  registry.register({
    id: 'outline-generator',
    name: '大纲生成',
    description: '生成结构化文章大纲（H1-H3层级）',
    category: 'content',
    input_schema: {
      topic: { type: 'string', required: true },
      research_data: { type: 'object' },
      outline_depth: { type: 'string', enum: ['basic', 'detailed'], default: 'detailed' },
      target_length: { type: 'number', default: 2000 },
    },
    output_schema: {
      title: { type: 'string' },
      outline: { type: 'array' },
      estimated_word_count: { type: 'number' },
    },
    estimated_time: 30,
    estimated_cost: 0.015,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  registry.register({
    id: 'blog-generator',
    name: '博客文章生成',
    description: '生成完整的SEO优化博客文章，包含PAA和引用',
    category: 'content',
    input_schema: {
      outline: { type: 'array', required: true },
      research_data: { type: 'object' },
      tone: { type: 'string', enum: ['professional', 'casual', 'educational'], default: 'professional' },
      target_length: { type: 'number', default: 2000 },
      include_paa: { type: 'boolean', default: true },
      include_sources: { type: 'boolean', default: true },
    },
    output_schema: {
      title: { type: 'string' },
      content: { type: 'string' },
      excerpt: { type: 'string' },
      paa: { type: 'array' },
      sources: { type: 'array' },
      word_count: { type: 'number' },
    },
    estimated_time: 120,
    estimated_cost: 0.08,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  registry.register({
    id: 'xiaohongshu-generator',
    name: '小红书文案生成',
    description: '生成小红书种草风格文案',
    category: 'content',
    input_schema: {
      topic: { type: 'string', required: true },
      product: { type: 'string' },
      key_points: { type: 'array' },
      tone: { type: 'string', enum: ['enthusiastic', 'professional', 'casual'], default: 'enthusiastic' },
    },
    output_schema: {
      title: { type: 'string' },
      content: { type: 'string' },
      tags: { type: 'array' },
      emojis: { type: 'array' },
    },
    estimated_time: 20,
    estimated_cost: 0.005,
    ai_provider: 'openai',
    model: 'gpt-4o-mini',
    is_active: true,
  });

  registry.register({
    id: 'wechat-generator',
    name: '微信公众号生成',
    description: '生成公众号深度长文',
    category: 'content',
    input_schema: {
      topic: { type: 'string', required: true },
      outline: { type: 'array' },
      research_data: { type: 'object' },
    },
    output_schema: {
      title: { type: 'string' },
      content: { type: 'string' },
      summary: { type: 'string' },
    },
    estimated_time: 90,
    estimated_cost: 0.06,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  registry.register({
    id: 'douyin-script-generator',
    name: '抖音脚本生成',
    description: '生成短视频脚本和分镜描述',
    category: 'content',
    input_schema: {
      topic: { type: 'string', required: true },
      video_type: { type: 'string', enum: ['tutorial', 'story', 'opinion'], default: 'tutorial' },
      duration: { type: 'number', default: 60 },
    },
    output_schema: {
      script: { type: 'string' },
      scenes: { type: 'array' },
      hook: { type: 'string' },
      cta: { type: 'string' },
      bgm_suggestion: { type: 'string' },
    },
    estimated_time: 30,
    estimated_cost: 0.01,
    ai_provider: 'openai',
    model: 'gpt-4o-mini',
    is_active: true,
  });

  registry.register({
    id: 'weibo-generator',
    name: '微博文案生成',
    description: '生成话题式微博文案',
    category: 'content',
    input_schema: {
      topic: { type: 'string', required: true },
      hot_topics: { type: 'array' },
    },
    output_schema: {
      content: { type: 'string' },
      hashtags: { type: 'array' },
    },
    estimated_time: 15,
    estimated_cost: 0.003,
    ai_provider: 'openai',
    model: 'gpt-4o-mini',
    is_active: true,
  });

  registry.register({
    id: 'linkedin-generator',
    name: 'LinkedIn文案生成',
    description: '生成专业LinkedIn观点文章',
    category: 'content',
    input_schema: {
      topic: { type: 'string', required: true },
      industry: { type: 'string' },
    },
    output_schema: {
      content: { type: 'string' },
      hashtags: { type: 'array' },
    },
    estimated_time: 25,
    estimated_cost: 0.008,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  // ============================================
  // 双语工作流内容生成类技能
  // ============================================

  registry.register({
    id: 'en-topic-generator',
    name: '英文话题生成+中文翻译',
    description: '基于关键词调研数据生成英文话题，并自动翻译为中文对照版本',
    category: 'content',
    input_schema: {
      keyword_research_data: { type: 'object', required: true },
      topic_type: {
        type: 'string',
        enum: ['tutorial', 'qa', 'case_study', 'insight', 'review', 'comparison'],
        default: 'tutorial',
      },
      target_customer: {
        type: 'string',
        enum: ['startup', 'experienced', 'team', 'local'],
        default: 'startup',
      },
      topic_count: { type: 'number', default: 5 },
    },
    output_schema: {
      topics: {
        type: 'array',
        description: '生成的话题数组，每个包含英文标题、中文标题、描述等'
      },
      topic_suggestions: { type: 'array' },
      priority_rankings: { type: 'array' },
    },
    estimated_time: 60,
    estimated_cost: 0.04,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  registry.register({
    id: 'en-content-generator',
    name: '英文内容生成',
    description: '基于深度调研数据生成SEO优化的英文内容（文章、视频脚本等）',
    category: 'content',
    input_schema: {
      topic_en: { type: 'string', required: true },
      research_data: { type: 'object', required: true },
      content_type: {
        type: 'string',
        enum: ['article', 'video_script', 'social_post', 'forum_answer'],
        default: 'article',
      },
      target_length: { type: 'number', default: 2000 },
      tone: {
        type: 'string',
        enum: ['professional', 'casual', 'educational', 'enthusiastic'],
        default: 'educational',
      },
      include_seo: { type: 'boolean', default: true },
    },
    output_schema: {
      title_en: { type: 'string' },
      content_en: { type: 'string' },
      excerpt_en: { type: 'string' },
      keywords: { type: 'array' },
      outline: { type: 'array' },
      word_count: { type: 'number' },
      seo_metadata: { type: 'object' },
    },
    estimated_time: 180,
    estimated_cost: 0.1,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  registry.register({
    id: 'platform-adaptation',
    name: '平台适配',
    description: '将英文内容适配为不同平台格式：Blog长文、YouTube视频脚本、TikTok短视频、Instagram图文、LinkedIn专业文、Twitter推文、Reddit问答、Pinterest描述',
    category: 'content',
    input_schema: {
      content_en: { type: 'string', required: true },
      title_en: { type: 'string', required: true },
      target_platforms: {
        type: 'array',
        required: true,
        description: '目标平台列表'
      },
      research_insights: { type: 'object' },
    },
    output_schema: {
      adapted_contents: {
        type: 'array',
        description: '适配后的内容数组，每个平台一个对象'
      },
      platform_specific_tips: { type: 'array' },
      posting_suggestions: { type: 'object' },
    },
    estimated_time: 90,
    estimated_cost: 0.06,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  // ============================================
  // 优化类技能
  // ============================================

  registry.register({
    id: 'seo-optimizer',
    name: 'SEO优化',
    description: '优化文章SEO（标题、元描述、关键词密度）',
    category: 'optimization',
    input_schema: {
      content: { type: 'string', required: true },
      target_keyword: { type: 'string', required: true },
      secondary_keywords: { type: 'array' },
    },
    output_schema: {
      optimized_title: { type: 'string' },
      meta_description: { type: 'string' },
      keyword_density: { type: 'number' },
      readability_score: { type: 'number' },
      suggestions: { type: 'array' },
    },
    estimated_time: 20,
    estimated_cost: 0.005,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  registry.register({
    id: 'cover-image-generator',
    name: '封面图生成',
    description: '生成封面图提示词（用于AI图像生成）',
    category: 'optimization',
    input_schema: {
      title: { type: 'string', required: true },
      content_type: { type: 'string', required: true },
      style: { type: 'string', enum: ['professional', 'creative', 'minimalist'], default: 'professional' },
    },
    output_schema: {
      prompt: { type: 'string' },
      negative_prompt: { type: 'string' },
      style_suggestions: { type: 'array' },
    },
    estimated_time: 10,
    estimated_cost: 0.002,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  registry.register({
    id: 'illustration-generator',
    name: '内容插图生成',
    description: '为文章关键章节生成插图提示词',
    category: 'optimization',
    input_schema: {
      sections: { type: 'array', required: true },
      style: { type: 'string', default: 'consistent' },
    },
    output_schema: {
      illustrations: { type: 'array' },
    },
    estimated_time: 30,
    estimated_cost: 0.01,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  // ============================================
  // 发布类技能
  // ============================================

  registry.register({
    id: 'format-converter',
    name: '格式转换',
    description: '将内容转换为不同平台的格式',
    category: 'publishing',
    input_schema: {
      content: { type: 'string', required: true },
      target_platform: { type: 'string', required: true },
    },
    output_schema: {
      formatted_content: { type: 'string' },
      platform_specific_tips: { type: 'array' },
    },
    estimated_time: 10,
    estimated_cost: 0.002,
    ai_provider: 'local',
    is_active: true,
  });

  // ============================================
  // 工具类技能
  // ============================================

  registry.register({
    id: 'topic-expander',
    name: '话题扩展',
    description: '从核心关键词扩展出多个衍生话题',
    category: 'utility',
    input_schema: {
      keyword: { type: 'string', required: true },
      count: { type: 'number', default: 5 },
    },
    output_schema: {
      topics: { type: 'array' },
    },
    estimated_time: 15,
    estimated_cost: 0.003,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  registry.register({
    id: 'hook-generator',
    name: '钩子生成',
    description: '生成吸引注意力的开头钩子',
    category: 'utility',
    input_schema: {
      topic: { type: 'string', required: true },
      hook_type: { type: 'string', enum: ['question', 'statistic', 'story', 'controversy'], default: 'question' },
    },
    output_schema: {
      hooks: { type: 'array' },
    },
    estimated_time: 10,
    estimated_cost: 0.002,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  registry.register({
    id: 'cta-generator',
    name: 'CTA生成',
    description: '生成行动号召语',
    category: 'utility',
    input_schema: {
      goal: { type: 'string', required: true },
      tone: { type: 'string', enum: ['urgent', 'friendly', 'professional'], default: 'friendly' },
    },
    output_schema: {
      ctas: { type: 'array' },
    },
    estimated_time: 10,
    estimated_cost: 0.002,
    ai_provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    is_active: true,
  });

  // ============================================
  // 双语工作流工具类技能
  // ============================================

  registry.register({
    id: 'zh-translation',
    name: '中文翻译',
    description: '将英文内容翻译为中文对照版本，保持格式和结构一致，用于双语参考',
    category: 'utility',
    input_schema: {
      content_en: { type: 'string', required: true },
      title_en: { type: 'string' },
      translation_style: {
        type: 'string',
        enum: ['formal', 'natural', 'creative'],
        default: 'natural',
      },
      preserve_formatting: { type: 'boolean', default: true },
    },
    output_schema: {
      title_zh: { type: 'string' },
      content_zh: { type: 'string' },
      translation_notes: { type: 'array' },
      glossary: { type: 'array' },
    },
    estimated_time: 30,
    estimated_cost: 0.015,
    ai_provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    is_active: true,
  });

  return registry;
}

// 导出全局注册表实例
export const skillRegistry = createSkillRegistry();
