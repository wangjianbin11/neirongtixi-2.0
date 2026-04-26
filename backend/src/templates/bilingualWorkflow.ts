import { v4 as uuidv4 } from 'uuid';
import { Workflow } from '../models/types';

/**
 * 双语内容生成工作流模板
 *
 * 工作流逻辑：
 * 1. 关键词选择 → 关键词爬取调研（Google + 热门频道）
 * 2. 调研数据 → 英文话题生成 + 中文翻译
 * 3. 选择话题 → 深度调研（20+渠道）
 * 4. 调研数据 → 英文内容生成
 * 5. 英文内容 → 平台适配（多平台）
 * 6. 适配内容 → 中文翻译
 * 7. 最终输出：英文主版本 + 中文对照
 */

export const BILINGUAL_CONTENT_WORKFLOW_TEMPLATE: Omit<Workflow, 'id' | 'created_at' | 'updated_at'> = {
  name: '双语内容生成工作流',
  description: '完整的双语内容生成流程：从关键词调研到多平台内容生成，最终输出英文主版本+中文对照',
  category: 'bilingual',
  is_template: true,
  estimated_time: 900, // 15分钟
  estimated_cost: 0.35,
  default_params: {
    keyword: '',
    topic_type: 'tutorial',
    target_customer: 'startup',
    target_platforms: ['blog', 'youtube', 'tiktok', 'instagram', 'linkedin', 'twitter', 'reddit', 'pinterest'],
    content_type: 'article',
    tone: 'educational',
    target_length: 2000,
    // 关键词调研渠道配置
    keyword_research_channels: [
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
    // 深度调研范围
    research_scope: 'comprehensive',
    // 翻译风格
    translation_style: 'natural',
  },
  nodes_json: [
    // ============================================
    // 步骤1: 关键词爬取调研
    // ============================================
    {
      id: 'node-keyword-research',
      name: '关键词爬取调研',
      skill_id: 'keyword-crawl-research',
      config: {
        keyword: '$.keyword',
        search_depth: 10,
        include_channels: '$.keyword_research_channels',
      },
      dependencies: [],
      retry_on_failure: false,
      max_retries: 0,
    },

    // ============================================
    // 步骤2: 英文话题生成 + 中文翻译
    // ============================================
    {
      id: 'node-topic-generation',
      name: '英文话题生成+中文翻译',
      skill_id: 'en-topic-generator',
      config: {
        keyword_research_data: '$.node-keyword-research',
        topic_type: '$.topic_type',
        target_customer: '$.target_customer',
        topic_count: 5,
      },
      dependencies: ['node-keyword-research'],
      retry_on_failure: true,
      max_retries: 2,
    },

    // ============================================
    // 步骤3: 深度调研（20+渠道）
    // ============================================
    {
      id: 'node-deep-research',
      name: '20+渠道深度调研',
      skill_id: 'deep-research-20-channels',
      config: {
        topic_en: '$.node-topic-generation.topics[0].title_en', // 使用第一个生成的英文话题
        research_scope: 'comprehensive',
        target_platforms: '$.target_platforms',
      },
      dependencies: ['node-topic-generation'],
      retry_on_failure: true,
      max_retries: 2,
    },

    // ============================================
    // 步骤4: 英文内容生成
    // ============================================
    {
      id: 'node-content-generation',
      name: '英文内容生成',
      skill_id: 'en-content-generator',
      config: {
        topic_en: '$.node-topic-generation.topics[0].title_en',
        research_data: '$.node-deep-research',
        content_type: '$.content_type',
        target_length: '$.target_length',
        tone: '$.tone',
        include_seo: true,
      },
      dependencies: ['node-deep-research'],
      retry_on_failure: true,
      max_retries: 2,
    },

    // ============================================
    // 步骤5: 平台适配
    // ============================================
    {
      id: 'node-platform-adaptation',
      name: '平台适配',
      skill_id: 'platform-adaptation',
      config: {
        content_en: '$.node-content-generation.content_en',
        title_en: '$.node-content-generation.title_en',
        target_platforms: '$.target_platforms',
        research_insights: '$.node-deep-research',
      },
      dependencies: ['node-content-generation'],
      retry_on_failure: false,
      max_retries: 0,
    },

    // ============================================
    // 步骤6: 中文翻译（为每个平台版本翻译）
    // ============================================
    {
      id: 'node-translation',
      name: '中文翻译',
      skill_id: 'zh-translation',
      config: {
        content_en: '$.node-content-generation.content_en',
        title_en: '$.node-content-generation.title_en',
        translation_style: 'natural',
        preserve_formatting: true,
      },
      dependencies: ['node-content-generation'],
      retry_on_failure: true,
      max_retries: 1,
    },
  ],
  created_by: null,
};

/**
 * 创建双语内容生成工作流模板
 * 可用于数据库初始化
 */
export async function createBilingualWorkflowTemplate(): Promise<Workflow> {
  const { workflowService } = await import('../services/workflowService');

  // 检查是否已存在
  const { workflows } = await workflowService.list({
    category: 'bilingual',
    is_template: true,
  });

  const existing = workflows.find(w => w.name === BILINGUAL_CONTENT_WORKFLOW_TEMPLATE.name);
  if (existing) {
    return existing;
  }

  // 创建新模板
  return await workflowService.create(BILINGUAL_CONTENT_WORKFLOW_TEMPLATE);
}

/**
 * 简化版工作流模板（仅生成单个平台的内容）
 */
export const BILINGUAL_SINGLE_PLATFORM_WORKFLOW_TEMPLATE: Omit<Workflow, 'id' | 'created_at' | 'updated_at'> = {
  name: '双语内容生成（单平台）',
  description: '快速生成单个平台的双语内容：英文主版本+中文对照',
  category: 'bilingual',
  is_template: true,
  estimated_time: 300, // 5分钟
  estimated_cost: 0.15,
  default_params: {
    keyword: '',
    topic_en: '',
    platform: 'blog',
    content_type: 'article',
    tone: 'educational',
    target_length: 2000,
  },
  nodes_json: [
    // 如果已有英文话题，跳过前两步
    {
      id: 'node-deep-research-single',
      name: '深度调研（简化版）',
      skill_id: 'deep-research-20-channels',
      config: {
        topic_en: '$.topic_en',
        research_scope: 'standard',
        target_platforms: ['$.platform'],
      },
      dependencies: [],
      retry_on_failure: true,
      max_retries: 2,
    },
    {
      id: 'node-content-generation-single',
      name: '英文内容生成',
      skill_id: 'en-content-generator',
      config: {
        topic_en: '$.topic_en',
        research_data: '$.node-deep-research-single',
        content_type: '$.content_type',
        target_length: '$.target_length',
        tone: '$.tone',
        include_seo: true,
      },
      dependencies: ['node-deep-research-single'],
      retry_on_failure: true,
      max_retries: 2,
    },
    {
      id: 'node-translation-single',
      name: '中文翻译',
      skill_id: 'zh-translation',
      config: {
        content_en: '$.node-content-generation-single.content_en',
        title_en: '$.node-content-generation-single.title_en',
        translation_style: 'natural',
        preserve_formatting: true,
      },
      dependencies: ['node-content-generation-single'],
      retry_on_failure: true,
      max_retries: 1,
    },
  ],
  created_by: null,
};

/**
 * 批量双语内容生成工作流（为多个平台同时生成）
 */
export const BILINGUAL_BATCH_WORKFLOW_TEMPLATE: Omit<Workflow, 'id' | 'created_at' | 'updated_at'> = {
  name: '双语内容批量生成',
  description: '从话题开始，批量生成所有平台的双语内容',
  category: 'bilingual',
  is_template: true,
  estimated_time: 1200, // 20分钟
  estimated_cost: 0.5,
  default_params: {
    keyword: '',
    topic_en: '',
    target_platforms: ['blog', 'youtube', 'tiktok', 'instagram', 'linkedin', 'twitter'],
    tone: 'educational',
  },
  nodes_json: [
    {
      id: 'node-deep-research-batch',
      name: '深度调研',
      skill_id: 'deep-research-20-channels',
      config: {
        topic_en: '$.topic_en',
        research_scope: 'comprehensive',
        target_platforms: '$.target_platforms',
      },
      dependencies: [],
      retry_on_failure: true,
      max_retries: 2,
    },
    {
      id: 'node-content-generation-batch',
      name: '英文内容生成',
      skill_id: 'en-content-generator',
      config: {
        topic_en: '$.topic_en',
        research_data: '$.node-deep-research-batch',
        content_type: 'article',
        target_length: 2000,
        tone: '$.tone',
        include_seo: true,
      },
      dependencies: ['node-deep-research-batch'],
      retry_on_failure: true,
      max_retries: 2,
    },
    {
      id: 'node-platform-adaptation-batch',
      name: '批量平台适配',
      skill_id: 'platform-adaptation',
      config: {
        content_en: '$.node-content-generation-batch.content_en',
        title_en: '$.node-content-generation-batch.title_en',
        target_platforms: '$.target_platforms',
        research_insights: '$.node-deep-research-batch',
      },
      dependencies: ['node-content-generation-batch'],
      retry_on_failure: false,
      max_retries: 0,
    },
    {
      id: 'node-translation-batch',
      name: '中文翻译',
      skill_id: 'zh-translation',
      config: {
        content_en: '$.node-content-generation-batch.content_en',
        title_en: '$.node-content-generation-batch.title_en',
        translation_style: 'natural',
        preserve_formatting: true,
      },
      dependencies: ['node-content-generation-batch'],
      retry_on_failure: true,
      max_retries: 1,
    },
  ],
  created_by: null,
};
