import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  List,
  Tag,
  Space,
  Spin,
} from 'antd';
import {
  KeyOutlined,
  FileTextOutlined,
  SendOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { keywordsApi } from '../../api/keywords';
import { topicsApi } from '../../api/topics';
import { contentsApi } from '../../api/contents';
import { skillsApi } from '../../api/skills';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  // Stats state
  const [keywordStats, setKeywordStats] = useState<any>(null);
  const [topicStats, setTopicStats] = useState<any>(null);
  const [contentStats, setContentStats] = useState<any>(null);
  const [skillStats, setSkillStats] = useState<any>(null);

  // Recent activities
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const [kStats, tStats, cStats, sStats, executions] = await Promise.all([
        keywordsApi.getStats().catch(() => null),
        topicsApi.getStats().catch(() => null),
        contentsApi.getStats().catch(() => null),
        skillsApi.getStats().catch(() => null),
        skillsApi.getRecentExecutions(5).catch((e) => {
          console.error('getRecentExecutions failed:', e);
          return [];
        }),
      ]);

      setKeywordStats(kStats);
      setTopicStats(tStats);
      setContentStats(cStats);
      setSkillStats(sStats);
      // 确保 recentExecutions 始终是数组
      setRecentExecutions(Array.isArray(executions) ? executions : []);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // 出错时设置默认值
      setRecentExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Calculate total stats
  const totalKeywords = keywordStats?.total || 0;
  const totalTopics = topicStats?.total || 0;
  const totalContents = contentStats?.total || 0;
  const totalSkills = skillStats?.total || 0;

  // Calculate completion rates
  const approvedTopics = topicStats?.byStatus?.approved || 0;
  const publishedContents = contentStats?.byStatus?.published || 0;
  const topicCompletionRate = totalTopics > 0 ? Math.round((approvedTopics / totalTopics) * 100) : 0;
  const contentPublishRate = totalContents > 0 ? Math.round((publishedContents / totalContents) * 100) : 0;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>仪表板</h1>

      {/* Main Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总关键词"
              value={totalKeywords}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            {keywordStats && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                S级: {keywordStats.byPriority?.S || 0} | A级: {keywordStats.byPriority?.A || 0}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总话题"
              value={totalTopics}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            {topicStats && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                待审核: {topicStats.byStatus?.pending || 0} | 生产中: {topicStats.byStatus?.in_production || 0}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总内容"
              value={totalContents}
              prefix={<SendOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            {contentStats && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                已发布: {contentStats.byStatus?.published || 0} | 草稿: {contentStats.byStatus?.draft || 0}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="AI技能"
              value={totalSkills}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            {skillStats && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                活跃: {skillStats.active || 0} | 总执行: {skillStats.totalExecutions || 0}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Progress Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="话题审核进度" bordered={false}>
            <Progress
              percent={topicCompletionRate}
              status="active"
              strokeColor={{ from: '#108ee9', to: '#87d068' }}
            />
            <p style={{ marginTop: 16 }}>
              已批准 {approvedTopics} / {totalTopics} 个话题
            </p>
            {topicStats && (
              <Space size="small" wrap>
                {topicStats.byStatus?.pending > 0 && (
                  <Tag color="default">待审核: {topicStats.byStatus.pending}</Tag>
                )}
                {topicStats.byStatus?.approved > 0 && (
                  <Tag color="blue">已批准: {topicStats.byStatus.approved}</Tag>
                )}
                {topicStats.byStatus?.in_production > 0 && (
                  <Tag color="processing">生产中: {topicStats.byStatus.in_production}</Tag>
                )}
                {topicStats.byStatus?.completed > 0 && (
                  <Tag color="success">已完成: {topicStats.byStatus.completed}</Tag>
                )}
              </Space>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="内容发布进度" bordered={false}>
            <Progress
              percent={contentPublishRate}
              status="success"
            />
            <p style={{ marginTop: 16 }}>
              已发布 {publishedContents} / {totalContents} 个内容
            </p>
            {contentStats && (
              <Space size="small" wrap>
                {contentStats.byStatus?.draft > 0 && (
                  <Tag color="default">草稿: {contentStats.byStatus.draft}</Tag>
                )}
                {contentStats.byStatus?.review > 0 && (
                  <Tag color="orange">审核中: {contentStats.byStatus.review}</Tag>
                )}
                {contentStats.byStatus?.approved > 0 && (
                  <Tag color="blue">已批准: {contentStats.byStatus.approved}</Tag>
                )}
                {contentStats.byStatus?.published > 0 && (
                  <Tag color="success">已发布: {contentStats.byStatus.published}</Tag>
                )}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="话题类型分布" bordered={false}>
            {topicStats && topicStats.byType ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(topicStats.byType).map(([type, count]) => {
                  const typeMap: Record<string, string> = {
                    tutorial: '教程',
                    qa: '问答',
                    case_study: '案例研究',
                    insight: '洞察',
                    review: '评论',
                    comparison: '对比',
                  };
                  return (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{typeMap[type] || type}</span>
                      <strong>{count as number}</strong>
                    </div>
                  );
                })}
              </Space>
            ) : (
              <p style={{ color: '#999' }}>暂无数据</p>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="内容平台分布" bordered={false}>
            {contentStats && contentStats.byPlatform ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(contentStats.byPlatform).map(([platform, count]) => {
                  const platformMap: Record<string, string> = {
                    youtube: 'YouTube',
                    tiktok: 'TikTok',
                    blog: '博客',
                    twitter: 'Twitter',
                    linkedin: 'LinkedIn',
                    reddit: 'Reddit',
                    quora: 'Quora',
                  };
                  return (
                    <div key={platform} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{platformMap[platform] || platform}</span>
                      <strong>{count as number}</strong>
                    </div>
                  );
                })}
              </Space>
            ) : (
              <p style={{ color: '#999' }}>暂无数据</p>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent AI Skill Executions */}
      <Card title="最近AI技能执行" bordered={false}>
        {recentExecutions.length > 0 ? (
          <List
            dataSource={recentExecutions}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    item.status === 'completed' ? (
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    ) : (
                      <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
                    )
                  }
                  title={
                    <Space>
                      <span>{item.skill_code}</span>
                      <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
                        {item.status === 'completed' ? '完成' : '处理中'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      {item.execution_time_ms && <span>执行时间: {item.execution_time_ms}ms</span>}
                      {item.cost_usd && <span>成本: ${item.cost_usd.toFixed(4)}</span>}
                      <span style={{ color: '#999' }}>
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                      </span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无执行记录</p>
        )}
      </Card>
    </div>
  );
}
