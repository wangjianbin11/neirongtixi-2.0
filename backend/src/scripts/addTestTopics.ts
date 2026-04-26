import { topicService } from '../services/topicService';
import { query } from '../utils/db';

/**
 * 添加测试话题
 */
async function addTestTopics() {
  console.log('开始添加测试话题...');

  // 获取一些关键词作为基础
  const keywords = await query(`
    SELECT keyword, category, intent, priority
    FROM keywords
    WHERE priority IN ('S', 'A')
    LIMIT 15
  `);

  console.log(`找到 ${keywords.length} 个关键词作为基础`);

  const testUserId = '1983df02-fc3e-11f0-ba5a-c87f5470ce11'; // 从日志中获取的用户ID

  // 基于关键词创建话题
  const topicsToCreate = [
    // Dropshipping 相关话题
    {
      title: 'Dropshipping 一代发货模式完全指南',
      description: '介绍 dropshipping 一代发货的运作模式、优缺点分析、如何选择供应商、平台选择策略等',
      topic_type: 'tutorial' as const,
      target_customer: 'startup' as const,
      priority: 'A' as const,
      estimated_effort: 3,
    },
    {
      title: 'Dropshipping 与传统电商利润对比分析',
      description: '深入分析 dropshipping 模式与传统囤货电商的利润率、资金占用、风险对比',
      topic_type: 'comparison' as const,
      target_customer: 'experienced' as const,
      priority: 'A' as const,
      estimated_effort: 2,
    },
    {
      title: 'ASG Dropshipping 平台使用体验评测',
      description: '真实用户分享 ASG 平台的使用感受，包括订单处理、物流时效、客服质量等',
      topic_type: 'review' as const,
      target_customer: 'startup' as const,
      priority: 'B' as const,
      estimated_effort: 1,
    },

    // 跨境电商相关话题
    {
      title: '2025年跨境电商选品趋势分析',
      description: '分析当前热门产品类别、消费者偏好变化、季节性选品策略',
      topic_type: 'insight' as const,
      target_customer: 'experienced' as const,
      priority: 'S' as const,
      estimated_effort: 3,
    },
    {
      title: 'TikTok Shop 跨境电商入驻攻略',
      description: '详细介绍 TikTok Shop 开店流程、资质要求、选品技巧、流量获取方法',
      topic_type: 'tutorial' as const,
      target_customer: 'startup' as const,
      priority: 'A' as const,
      estimated_effort: 2,
    },
    {
      title: '独立站 vs 第三方平台：2025年如何选择',
      description: '对比独立站和 Amazon、eBay 等平台的优劣势，帮助卖家做出正确选择',
      topic_type: 'comparison' as const,
      target_customer: 'startup' as const,
      priority: 'A' as const,
      estimated_effort: 2,
    },

    // 供应链相关话题
    {
      title: '跨境电商供应链管理最佳实践',
      description: '分享如何优化供应链、降低采购成本、提高库存周转率、管理供应商关系',
      topic_type: 'insight' as const,
      target_customer: 'experienced' as const,
      priority: 'A' as const,
      estimated_effort: 3,
    },
    {
      title: '如何找到可靠的海外供应商',
      description: '介绍寻找和筛选海外供应商的方法、注意事项、风险评估技巧',
      topic_type: 'tutorial' as const,
      target_customer: 'startup' as const,
      priority: 'B' as const,
      estimated_effort: 2,
    },

    // 营销推广相关话题
    {
      title: 'Google Ads 跨境电商广告投放策略',
      description: '详细介绍 Google Shopping 广告、搜索广告、展示广告的投放技巧和优化方法',
      topic_type: 'tutorial' as const,
      target_customer: 'experienced' as const,
      priority: 'A' as const,
      estimated_effort: 3,
    },
    {
      title: 'TikTok 短视频营销实战案例分析',
      description: '分析成功的 TikTok 电商营销案例，拆解其内容策略、发布节奏、转化技巧',
      topic_type: 'case_study' as const,
      target_customer: 'team' as const,
      priority: 'B' as const,
      estimated_effort: 2,
    },

    // 本地化相关话题
    {
      title: '美国市场本地化运营指南',
      description: '介绍如何针对美国市场进行产品本地化、内容本地化、客服本地化',
      topic_type: 'insight' as const,
      target_customer: 'local' as const,
      priority: 'A' as const,
      estimated_effort: 2,
    },
    {
      title: '欧洲市场合规要求全面解读',
      description: '详细说明 GDPR、CE 认证、VAT 税务等欧洲市场的合规要求',
      topic_type: 'tutorial' as const,
      target_customer: 'experienced' as const,
      priority: 'S' as const,
      estimated_effort: 3,
    },

    // 工具软件相关话题
    {
      title: '跨境电商必备工具推荐与使用技巧',
      description: '推荐选品工具、关键词工具、数据分析工具、客服工具等，并分享使用技巧',
      topic_type: 'review' as const,
      target_customer: 'startup' as const,
      priority: 'B' as const,
      estimated_effort: 2,
    },
    {
      title: 'AI 工具在跨境电商中的应用实践',
      description: '介绍如何利用 AI 进行文案生成、图片处理、客服自动化、数据分析等',
      topic_type: 'insight' as const,
      target_customer: 'experienced' as const,
      priority: 'A' as const,
      estimated_effort: 2,
    },

    // 行业洞察话题
    {
      title: '2025年 DTC 品牌出海趋势预测',
      description: '预测 DTC 品牌在海外市场的发展趋势、消费者行为变化、新兴机会',
      topic_type: 'insight' as const,
      target_customer: 'experienced' as const,
      priority: 'S' as const,
      estimated_effort: 2,
    },
    {
      title: '东南亚跨境电商市场机会分析',
      description: '分析东南亚各主要市场的电商发展现状、消费者特征、进入策略',
      topic_type: 'insight' as const,
      target_customer: 'startup' as const,
      priority: 'A' as const,
      estimated_effort: 2,
    },
  ];

  try {
    // 批量创建话题
    const createdTopics = await topicService.bulkCreate(topicsToCreate, testUserId);

    console.log(`\n成功创建 ${createdTopics.length} 个话题:`);
    createdTopics.forEach((topic: any, index: number) => {
      console.log(`${index + 1}. ${topic.title}`);
      console.log(`   类型: ${topic.topic_type}, 目标: ${topic.target_customer}, 优先级: ${topic.priority}`);
      console.log(`   状态: ${topic.status}, ID: ${topic.id}`);
      console.log('');
    });

    // 查询话题统计
    const stats = await topicService.getStats();
    console.log('话题统计:');
    console.log(`  总数: ${stats.total}`);
    console.log(`  按类型: ${JSON.stringify(stats.byType, null, 2)}`);
    console.log(`  按优先级: ${JSON.stringify(stats.byPriority, null, 2)}`);
    console.log(`  按目标客户: ${JSON.stringify(stats.byTargetCustomer, null, 2)}`);

    process.exit(0);
  } catch (error) {
    console.error('添加话题失败:', error);
    process.exit(1);
  }
}

addTestTopics();
