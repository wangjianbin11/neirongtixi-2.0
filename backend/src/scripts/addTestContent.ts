import { contentService } from '../services/contentService';
import { topicService } from '../services/topicService';
import { query } from '../utils/db';

/**
 * 添加测试内容
 */
async function addTestContent() {
  console.log('开始添加测试内容...');

  // 获取现有话题
  const topicsResult = await topicService.list({ limit: 20 });
  const topics = topicsResult.topics;

  if (topics.length === 0) {
    console.log('没有找到话题，请先运行 addTestTopics.ts');
    process.exit(1);
  }

  console.log(`找到 ${topics.length} 个话题`);

  const testUserId = '1983df02-fc3e-11f0-ba5a-c87f5470ce11';

  // 为前几个话题创建内容
  const contentToCreate = [
    {
      topic_id: topics[0].id, // Dropshipping 一代发货模式完全指南
      title: 'Dropshipping 新手入门：从零开始的第一代发货指南',
      content_type: 'article' as const,
      platform: 'blog',
      status: 'draft' as const,
    },
    {
      topic_id: topics[0].id,
      title: 'Dropshipping 运作模式视频教程',
      content_type: 'video_script' as const,
      platform: 'youtube',
      status: 'draft' as const,
    },
    {
      topic_id: topics[3].id, // 2025年跨境电商选品趋势分析
      title: '2025年爆品预测：这些产品类别值得关注',
      content_type: 'article' as const,
      platform: 'blog',
      status: 'published' as const,
    },
    {
      topic_id: topics[4].id, // TikTok Shop 跨境电商入驻攻略
      title: 'TikTok Shop 开店流程详解：从注册到首单',
      content_type: 'article' as const,
      platform: 'blog',
      status: 'review' as const,
    },
    {
      topic_id: topics[5].id, // 独立站 vs 第三方平台
      title: '独立站与亚马逊平台对比：哪个更适合你？',
      content_type: 'video_script' as const,
      platform: 'youtube',
      status: 'published' as const,
    },
    {
      topic_id: topics[9].id, // Google Ads 广告投放策略
      title: 'Google Shopping 广告投放实战技巧分享',
      content_type: 'social_post' as const,
      platform: 'linkedin',
      status: 'draft' as const,
    },
    {
      topic_id: topics[10].id, // TikTok 短视频营销案例
      title: '月销百万的 TikTok 账号运营策略拆解',
      content_type: 'article' as const,
      platform: 'blog',
      status: 'approved' as const,
    },
    {
      topic_id: topics[13].id, // AI 工具应用实践
      title: 'AI 写作工具测评：ChatGPT vs Claude vs 文心一言',
      content_type: 'article' as const,
      platform: 'blog',
      status: 'published' as const,
    },
  ];

  try {
    // 批量创建内容
    const createdContent = await contentService.bulkCreate(contentToCreate, testUserId);

    console.log(`\n成功创建 ${createdContent.length} 个内容:`);
    createdContent.forEach((content: any, index: number) => {
      console.log(`${index + 1}. ${content.title}`);
      console.log(`   类型: ${content.content_type}, 平台: ${content.platform}, 状态: ${content.status}`);
      console.log(`   ID: ${content.id}`);
      console.log(`   关联话题: ${content.topic_id}`);
      console.log('');
    });

    // 查询内容统计
    const stats = await contentService.getStats();
    console.log('内容统计:');
    console.log(`  总数: ${stats.total}`);
    console.log(`  按状态: ${JSON.stringify(stats.byStatus, null, 2)}`);
    console.log(`  按平台: ${JSON.stringify(stats.byPlatform, null, 2)}`);
    console.log(`  按类型: ${JSON.stringify(stats.byType, null, 2)}`);

    process.exit(0);
  } catch (error) {
    console.error('添加内容失败:', error);
    process.exit(1);
  }
}

addTestContent();
