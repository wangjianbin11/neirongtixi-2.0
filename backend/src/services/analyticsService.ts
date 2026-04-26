import { query, queryOne } from '../utils/db';

/**
 * 数据分析服务
 */
export class AnalyticsService {
  /**
   * 获取内容分析数据
   */
  async getContentAnalytics() {
    // 总数统计
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contents');
    const total = totalResult?.count || 0;

    // 按状态统计
    const statusResult = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM contents GROUP BY status`
    );
    const byStatus: Record<string, number> = {};
    statusResult.forEach(row => {
      byStatus[row.status] = row.count;
    });

    // 按类型统计
    const typeResult = await query<{ content_type: string; count: number }>(
      `SELECT content_type, COUNT(*) as count FROM contents GROUP BY content_type`
    );
    const byType: Record<string, number> = {};
    typeResult.forEach(row => {
      byType[row.content_type] = row.count;
    });

    // 按平台统计
    const platformResult = await query<{ platform: string; count: number }>(
      `SELECT platform, COUNT(*) as count FROM contents WHERE platform IS NOT NULL GROUP BY platform`
    );
    const byPlatform: Record<string, number> = {};
    platformResult.forEach(row => {
      byPlatform[row.platform] = row.count;
    });

    // 本月发布数量
    const monthResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM contents
       WHERE status = 'published'
       AND published_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`
    );
    const publishedThisMonth = monthResult?.count || 0;

    // 本周发布数量
    const weekResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM contents
       WHERE status = 'published'
       AND published_at >= DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY)`
    );
    const publishedThisWeek = weekResult?.count || 0;

    // 平均生产时间（从创建到发布的平均小时数）
    const avgTimeResult = await queryOne<{ avg_hours: number }>(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, published_at)) as avg_hours
       FROM contents
       WHERE status = 'published'
       AND published_at IS NOT NULL
       AND created_at IS NOT NULL`
    );
    const avgProductionTime = parseFloat((avgTimeResult?.avg_hours || 0).toString());

    return {
      total,
      byStatus,
      byType,
      byPlatform,
      publishedThisMonth,
      publishedThisWeek,
      avgProductionTime,
    };
  }

  /**
   * 获取关键词分析数据
   */
  async getKeywordAnalytics() {
    // 总数统计
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM keywords');
    const total = totalResult?.count || 0;

    // 按优先级统计
    const priorityResult = await query<{ priority: string; count: number }>(
      `SELECT priority, COUNT(*) as count FROM keywords GROUP BY priority`
    );
    const byPriority: Record<string, number> = {};
    priorityResult.forEach(row => {
      byPriority[row.priority] = row.count;
    });

    // 按分类统计
    const categoryResult = await query<{ category: string; count: number }>(
      `SELECT category, COUNT(*) as count FROM keywords GROUP BY category`
    );
    const byCategory: Record<string, number> = {};
    categoryResult.forEach(row => {
      byCategory[row.category] = row.count;
    });

    // 按竞争度统计
    const competitionResult = await query<{ competition: string; count: number }>(
      `SELECT competition, COUNT(*) as count FROM keywords GROUP BY competition`
    );
    const byCompetition: Record<string, number> = {};
    competitionResult.forEach(row => {
      byCompetition[row.competition] = row.count;
    });

    // 热门关键词（按搜索量排序）
    const topKeywordsResult = await query<{ keyword: string; search_volume: number; competition: string }>(
      `SELECT keyword, search_volume, competition
       FROM keywords
       ORDER BY search_volume DESC
       LIMIT 10`
    );
    const topKeywords = topKeywordsResult.map(row => ({
      keyword: row.keyword,
      searchVolume: row.search_volume,
      competition: row.competition,
    }));

    return {
      total,
      byPriority,
      byCategory,
      byCompetition,
      topKeywords,
    };
  }

  /**
   * 获取话题分析数据
   */
  async getTopicAnalytics() {
    // 总数统计
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM topics');
    const total = totalResult?.count || 0;

    // 按状态统计
    const statusResult = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM topics GROUP BY status`
    );
    const byStatus: Record<string, number> = {};
    statusResult.forEach(row => {
      byStatus[row.status] = row.count;
    });

    // 按类型统计
    const typeResult = await query<{ topic_type: string; count: number }>(
      `SELECT topic_type, COUNT(*) as count FROM topics GROUP BY topic_type`
    );
    const byType: Record<string, number> = {};
    typeResult.forEach(row => {
      byType[row.topic_type] = row.count;
    });

    // 按目标客户统计
    const customerResult = await query<{ target_customer: string; count: number }>(
      `SELECT target_customer, COUNT(*) as count FROM topics
       WHERE target_customer IS NOT NULL
       GROUP BY target_customer`
    );
    const byTargetCustomer: Record<string, number> = {};
    customerResult.forEach(row => {
      byTargetCustomer[row.target_customer] = row.count;
    });

    // 审核通过率
    const approved = byStatus.approved || 0;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      total,
      byStatus,
      byType,
      byTargetCustomer,
      approvalRate,
    };
  }

  /**
   * 获取发布分析数据
   */
  async getPublishAnalytics() {
    // 总发布数
    const totalResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM publish_tasks WHERE status = 'published'`
    );
    const totalPublished = totalResult?.count || 0;

    // 按平台统计
    const platformResult = await query<{ platform: string; count: number }>(
      `SELECT platform, COUNT(*) as count FROM publish_tasks
       WHERE status = 'published'
       GROUP BY platform`
    );
    const byPlatform: Record<string, number> = {};
    platformResult.forEach(row => {
      byPlatform[row.platform] = row.count;
    });

    // 成功率（发布成功 / 总任务数）
    const successResult = await queryOne<{ success: number; total: number }>(
      `SELECT
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as success,
        COUNT(*) as total
       FROM publish_tasks`
    );
    const { success, total } = successResult || { success: 0, total: 0 };
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    // 平均发布时间（分钟）
    const avgTimeResult = await queryOne<{ avg_minutes: number }>(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, published_at)) as avg_minutes
       FROM publish_tasks
       WHERE status = 'published'
       AND published_at IS NOT NULL
       AND created_at IS NOT NULL`
    );
    const avgPublishTime = parseFloat((avgTimeResult?.avg_minutes || 0).toString());

    // 最近趋势（最近30天每天发布数）
    const trendsResult = await query<{ date: Date; count: number }>(
      `SELECT
         DATE(published_at) as date,
         COUNT(*) as count
       FROM publish_tasks
       WHERE status = 'published'
       AND published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(published_at)
       ORDER BY date DESC`
    );
    const recentTrends = trendsResult.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: row.count,
    }));

    return {
      totalPublished,
      byPlatform,
      successRate,
      avgPublishTime,
      recentTrends,
    };
  }

  /**
   * 获取趋势数据
   */
  async getTrends(period: 'week' | 'month' | 'quarter' = 'month') {
    let interval = 30;
    if (period === 'week') interval = 7;
    if (period === 'quarter') interval = 90;

    const result = await query<{ date: Date; count: number }>(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as count
       FROM contents
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [interval]
    );

    return result.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: row.count,
    }));
  }

  /**
   * 获取整体统计数据
   */
  async getOverallStats() {
    const [contents, keywords, topics, publishes] = await Promise.all([
      this.getContentAnalytics(),
      this.getKeywordAnalytics(),
      this.getTopicAnalytics(),
      this.getPublishAnalytics(),
    ]);

    return {
      contents,
      keywords,
      topics,
      publishes,
    };
  }
}

// 导出单例
export const analyticsService = new AnalyticsService();
