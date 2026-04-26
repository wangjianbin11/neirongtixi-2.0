import { v4 as uuidv4 } from 'uuid';
import { workflowService } from '../services/workflowService';
import { WorkflowNode } from '../models/types';

/**
 * 初始化预置工作流模板
 */
export async function initWorkflowTemplates(): Promise<void> {
  console.log('Initializing workflow templates...');

  // ============================================
  // 1. SEO博客内容生成流程
  // ============================================
  const seoBlogNodes: WorkflowNode[] = [
    {
      id: 'node-1',
      skill_id: 'keyword-research',
      name: '关键词调研',
      config: {
        depth: 'standard',
        include_competitors: true,
      },
      dependencies: [],
      position: { x: 100, y: 100 },
    },
    {
      id: 'node-2',
      skill_id: 'topic-research',
      name: '话题调研',
      config: {
        research_depth: 'deep',
      },
      dependencies: ['node-1'],
      position: { x: 100, y: 250 },
    },
    {
      id: 'node-3',
      skill_id: 'content-research',
      name: '内容调研',
      config: {
        sources_count: 5,
      },
      dependencies: ['node-2'],
      position: { x: 100, y: 400 },
    },
    {
      id: 'node-4',
      skill_id: 'outline-generator',
      name: '大纲生成',
      config: {
        outline_depth: 'detailed',
        target_length: 3000,
      },
      dependencies: ['node-3'],
      position: { x: 100, y: 550 },
    },
    {
      id: 'node-5',
      skill_id: 'blog-generator',
      name: '博客文章生成',
      config: {
        tone: 'professional',
        target_length: 3000,
        include_paa: true,
        include_sources: true,
      },
      dependencies: ['node-4'],
      position: { x: 100, y: 700 },
    },
    {
      id: 'node-6',
      skill_id: 'seo-optimizer',
      name: 'SEO优化',
      config: {},
      dependencies: ['node-5'],
      position: { x: 100, y: 850 },
    },
    {
      id: 'node-7',
      skill_id: 'cover-image-generator',
      name: '封面图生成',
      config: {
        style: 'professional',
      },
      dependencies: ['node-5'],
      position: { x: 350, y: 700 },
    },
    {
      id: 'node-8',
      skill_id: 'illustration-generator',
      name: '内容插图生成',
      config: {
        style: 'consistent',
      },
      dependencies: ['node-5'],
      position: { x: 600, y: 700 },
    },
  ];

  try {
    await workflowService.create({
      name: 'SEO博客内容生成全流程',
      description: '从关键词直接生成完整的SEO优化博客文章，包含调研、大纲、正文、SEO优化和配图',
      category: 'blog',
      is_template: true,
      nodes_json: seoBlogNodes,
      default_params: {
        target_length: 3000,
        tone: 'professional',
      },
      estimated_time: 600, // 10分钟
      estimated_cost: 0.20,
    });
    console.log('  ✓ Created: SEO博客内容生成全流程');
  } catch (error) {
    if ((error as any).code !== 'ER_DUP_ENTRY') {
      console.error('  ✗ Failed to create SEO博客模板:', error);
    } else {
      console.log('  - SEO博客模板 already exists');
    }
  }

  // ============================================
  // 2. 多平台社交媒体批量生成
  // ============================================
  const socialBatchNodes: WorkflowNode[] = [
    {
      id: 'node-1',
      skill_id: 'keyword-research',
      name: '关键词调研',
      config: {
        depth: 'basic',
        include_competitors: false,
      },
      dependencies: [],
      position: { x: 100, y: 100 },
    },
    {
      id: 'node-2',
      skill_id: 'topic-expander',
      name: '话题扩展',
      config: {
        count: 5,
      },
      dependencies: ['node-1'],
      position: { x: 100, y: 250 },
    },
    {
      id: 'node-3',
      skill_id: 'xiaohongshu-generator',
      name: '小红书文案',
      config: {
        tone: 'enthusiastic',
      },
      dependencies: ['node-2'],
      position: { x: 50, y: 400 },
    },
    {
      id: 'node-4',
      skill_id: 'wechat-generator',
      name: '公众号文案',
      config: {},
      dependencies: ['node-2'],
      position: { x: 250, y: 400 },
    },
    {
      id: 'node-5',
      skill_id: 'douyin-script-generator',
      name: '抖音脚本',
      config: {
        video_type: 'tutorial',
        duration: 60,
      },
      dependencies: ['node-2'],
      position: { x: 450, y: 400 },
    },
    {
      id: 'node-6',
      skill_id: 'weibo-generator',
      name: '微博文案',
      config: {},
      dependencies: ['node-2'],
      position: { x: 650, y: 400 },
    },
    {
      id: 'node-7',
      skill_id: 'linkedin-generator',
      name: 'LinkedIn文案',
      config: {},
      dependencies: ['node-2'],
      position: { x: 850, y: 400 },
    },
  ];

  try {
    await workflowService.create({
      name: '多平台社媒内容批量生成',
      description: '一个关键词快速生成5个平台的社媒内容（小红书、公众号、抖音、微博、LinkedIn）',
      category: 'social_media',
      is_template: true,
      nodes_json: socialBatchNodes,
      default_params: {},
      estimated_time: 240, // 4分钟
      estimated_cost: 0.10,
    });
    console.log('  ✓ Created: 多平台社媒内容批量生成');
  } catch (error) {
    if ((error as any).code !== 'ER_DUP_ENTRY') {
      console.error('  ✗ Failed to create 社媒模板:', error);
    } else {
      console.log('  - 社媒模板 already exists');
    }
  }

  // ============================================
  // 3. 视频脚本生成流程
  // ============================================
  const videoScriptNodes: WorkflowNode[] = [
    {
      id: 'node-1',
      skill_id: 'keyword-research',
      name: '关键词调研',
      config: {
        depth: 'basic',
      },
      dependencies: [],
      position: { x: 100, y: 100 },
    },
    {
      id: 'node-2',
      skill_id: 'hook-generator',
      name: '钩子生成',
      config: {
        hook_type: 'question',
      },
      dependencies: ['node-1'],
      position: { x: 100, y: 250 },
    },
    {
      id: 'node-3',
      skill_id: 'douyin-script-generator',
      name: '脚本生成',
      config: {
        video_type: 'tutorial',
        duration: 60,
      },
      dependencies: ['node-2'],
      position: { x: 100, y: 400 },
    },
    {
      id: 'node-4',
      skill_id: 'cta-generator',
      name: 'CTA生成',
      config: {
        goal: 'follow',
        tone: 'friendly',
      },
      dependencies: ['node-3'],
      position: { x: 100, y: 550 },
    },
  ];

  try {
    await workflowService.create({
      name: '短视频脚本生成',
      description: '为TikTok/抖音生成吸引注意力的短视频脚本，包含钩子、主体内容和行动号召',
      category: 'video',
      is_template: true,
      nodes_json: videoScriptNodes,
      default_params: {
        duration: 60,
        video_type: 'tutorial',
      },
      estimated_time: 60, // 1分钟
      estimated_cost: 0.03,
    });
    console.log('  ✓ Created: 短视频脚本生成');
  } catch (error) {
    if ((error as any).code !== 'ER_DUP_ENTRY') {
      console.error('  ✗ Failed to create 视频模板:', error);
    } else {
      console.log('  - 视频模板 already exists');
    }
  }

  // ============================================
  // 4. 快速社媒内容生成（简化版）
  // ============================================
  const quickSocialNodes: WorkflowNode[] = [
    {
      id: 'node-1',
      skill_id: 'xiaohongshu-generator',
      name: '小红书文案',
      config: {
        tone: 'enthusiastic',
      },
      dependencies: [],
      position: { x: 50, y: 100 },
    },
    {
      id: 'node-2',
      skill_id: 'weibo-generator',
      name: '微博文案',
      config: {},
      dependencies: [],
      position: { x: 250, y: 100 },
    },
  ];

  try {
    await workflowService.create({
      name: '快速社媒文案',
      description: '快速生成小红书和微博的社媒文案',
      category: 'social_media',
      is_template: true,
      nodes_json: quickSocialNodes,
      default_params: {},
      estimated_time: 30,
      estimated_cost: 0.01,
    });
    console.log('  ✓ Created: 快速社媒文案');
  } catch (error) {
    if ((error as any).code !== 'ER_DUP_ENTRY') {
      console.error('  ✗ Failed to create 快速社媒模板:', error);
    } else {
      console.log('  - 快速社媒模板 already exists');
    }
  }

  console.log('Workflow templates initialization completed!');
}

// 如果直接运行此脚本
if (require.main === module) {
  initWorkflowTemplates()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
