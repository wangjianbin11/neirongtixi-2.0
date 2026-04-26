import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  FileTextOutlined,
  KeyOutlined,
  SendOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { analyticsApi } from '../../api/analytics';

const { Title, Text } = Typography;

export default function AnalyticsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // Analytics data
  const [contentAnalytics, setContentAnalytics] = useState<any>(null);
  const [keywordAnalytics, setKeywordAnalytics] = useState<any>(null);
  const [topicAnalytics, setTopicAnalytics] = useState<any>(null);
  const [publishAnalytics, setPublishAnalytics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [trendPeriod]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [cAnalytics, kAnalytics, tAnalytics, pAnalytics, trendData] = await Promise.all([
        analyticsApi.getContentAnalytics().catch(() => null),
        analyticsApi.getKeywordAnalytics().catch(() => null),
        analyticsApi.getTopicAnalytics().catch(() => null),
        analyticsApi.getPublishAnalytics().catch(() => null),
        analyticsApi.getTrends(trendPeriod).catch(() => []),
      ]);

      setContentAnalytics(cAnalytics);
      setKeywordAnalytics(kAnalytics);
      setTopicAnalytics(tAnalytics);
      setPublishAnalytics(pAnalytics);
      setTrends(trendData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Top keywords table columns
  const keywordColumns: ColumnsType<any> = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
    },
    {
      title: '搜索量',
      dataIndex: 'searchVolume',
      key: 'searchVolume',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '竞争度',
      dataIndex: 'competition',
      key: 'competition',
      render: (value: string) => {
        const colorMap: Record<string, string> = {
          low: 'success',
          medium: 'processing',
          high: 'warning',
        };
        const labelMap: Record<string, string> = {
          low: '低',
          medium: '中',
          high: '高',
        };
        return <Tag color={colorMap[value]}>{labelMap[value]}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        数据分析
      </Title>
      <Text type="secondary">内容系统运营数据分析与洞察</Text>

      {/* Overall Statistics */}
      <Row gutter={16} style={{ marginTop: 24, marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总内容数"
              value={contentAnalytics?.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            {contentAnalytics && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                本月发布: {contentAnalytics.publishedThisMonth || 0}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总关键词数"
              value={keywordAnalytics?.total || 0}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            {keywordAnalytics && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                S级: {keywordAnalytics.byPriority?.S || 0} | A级: {keywordAnalytics.byPriority?.A || 0}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="话题总数"
              value={topicAnalytics?.total || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            {topicAnalytics && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                审核通过率: {topicAnalytics.approvalRate || 0}%
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已发布内容"
              value={publishAnalytics?.totalPublished || 0}
              prefix={<SendOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            {publishAnalytics && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                成功率: {publishAnalytics.successRate || 0}%
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Content Status Distribution */}
      {contentAnalytics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="内容状态分布" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {Object.entries(contentAnalytics.byStatus || {}).map(([status, count]) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    draft: { label: '草稿', color: 'default' },
                    review: { label: '审核中', color: 'processing' },
                    approved: { label: '已批准', color: 'blue' },
                    published: { label: '已发布', color: 'success' },
                  };
                  const info = statusMap[status] || { label: status, color: 'default' };
                  const percent = Math.round((count as number / contentAnalytics.total) * 100);
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Tag color={info.color}>{info.label}</Tag>
                        <span>{count as number} ({percent}%)</span>
                      </div>
                      <Progress percent={percent} showInfo={false} strokeColor={info.color === 'default' ? '#d9d9d9' : undefined} />
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="内容类型分布" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(contentAnalytics.byType || {}).map(([type, count]) => {
                  const typeMap: Record<string, string> = {
                    article: '文章',
                    video_script: '视频脚本',
                    social_post: '社媒帖子',
                    forum_answer: '论坛回答',
                  };
                  return (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{typeMap[type] || type}</span>
                      <strong>{count as number}</strong>
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Topic and Keyword Analytics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          {topicAnalytics && (
            <Card title="话题分析" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text strong>话题类型分布</Text>
                  <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                    {Object.entries(topicAnalytics.byType || {}).map(([type, count]) => {
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
                </div>
                <div>
                  <Text strong>目标客户分布</Text>
                  <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                    {Object.entries(topicAnalytics.byTargetCustomer || {}).map(([customer, count]) => {
                      const customerMap: Record<string, string> = {
                        startup: '初创者',
                        experienced: '有经验卖家',
                        team: '团队卖家',
                        local: '本地到全球',
                      };
                      return (
                        <div key={customer} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{customerMap[customer] || customer}</span>
                          <strong>{count as number}</strong>
                        </div>
                      );
                    })}
                  </Space>
                </div>
              </Space>
            </Card>
          )}
        </Col>
        <Col span={12}>
          {keywordAnalytics && (
            <Card
              title="关键词分析"
              bordered={false}
              extra={<TrophyOutlined style={{ color: '#faad14' }} />}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text strong>优先级分布</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {Object.entries(keywordAnalytics.byPriority || {}).map(([priority, count]) => (
                        <Tag key={priority} color={priority === 'S' ? 'red' : priority === 'A' ? 'orange' : 'blue'}>
                          {priority}级: {count as number}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </div>
                <div>
                  <Text strong>竞争度分布</Text>
                  <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                    {Object.entries(keywordAnalytics.byCompetition || {}).map(([level, count]) => (
                      <div key={level} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{level === 'low' ? '低' : level === 'medium' ? '中' : '高'}竞争度</span>
                        <strong>{count as number}</strong>
                      </div>
                    ))}
                  </Space>
                </div>
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      {/* Top Keywords and Platform Distribution */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          {keywordAnalytics?.topKeywords && (
            <Card
              title="热门关键词"
              bordered={false}
              extra={<RiseOutlined />}
            >
              <Table
                columns={keywordColumns}
                dataSource={keywordAnalytics.topKeywords}
                pagination={false}
                size="small"
                rowKey="keyword"
              />
            </Card>
          )}
        </Col>
        <Col span={12}>
          {publishAnalytics && (
            <Card
              title="发布平台分布"
              bordered={false}
              extra={<SendOutlined />}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(publishAnalytics.byPlatform || {}).map(([platform, count]) => {
                  const platformMap: Record<string, string> = {
                    youtube: 'YouTube',
                    tiktok: 'TikTok',
                    blog: '博客',
                    twitter: 'Twitter',
                    linkedin: 'LinkedIn',
                    reddit: 'Reddit',
                    quora: 'Quora',
                  };
                  const percent = publishAnalytics.totalPublished > 0
                    ? Math.round((count as number / publishAnalytics.totalPublished) * 100)
                    : 0;
                  return (
                    <div key={platform}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{platformMap[platform] || platform}</span>
                        <span>{count as number} ({percent}%)</span>
                      </div>
                      <Progress percent={percent} showInfo={false} />
                    </div>
                  );
                })}
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row gutter={16}>
        <Col span={8}>
          <Card
            title="平均生产时间"
            bordered={false}
            extra={<ClockCircleOutlined />}
          >
            {contentAnalytics && contentAnalytics.avgProductionTime ? (
              <Statistic
                value={contentAnalytics.avgProductionTime}
                suffix="小时"
                precision={1}
                valueStyle={{ color: '#1890ff' }}
              />
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="平均发布时间"
            bordered={false}
            extra={<SendOutlined />}
          >
            {publishAnalytics && publishAnalytics.avgPublishTime ? (
              <Statistic
                value={publishAnalytics.avgPublishTime}
                suffix="分钟"
                precision={1}
                valueStyle={{ color: '#52c41a' }}
              />
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="发布成功率"
            bordered={false}
            extra={<CheckCircleOutlined />}
          >
            {publishAnalytics && publishAnalytics.successRate !== undefined ? (
              <Statistic
                value={publishAnalytics.successRate}
                suffix="%"
                precision={1}
                valueStyle={{ color: publishAnalytics.successRate >= 90 ? '#52c41a' : publishAnalytics.successRate >= 70 ? '#faad14' : '#ff4d4f' }}
              />
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
