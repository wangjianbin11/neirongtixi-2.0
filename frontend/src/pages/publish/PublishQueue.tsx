import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
  Progress,
} from 'antd';
import {
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  RedoOutlined,
  StopOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { publishApi, PublishTask, PublishTaskStatus, QueueStats } from '../../api/publish';

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '已调度', value: 'scheduled' },
  { label: '发布中', value: 'publishing' },
  { label: '已发布', value: 'published' },
  { label: '失败', value: 'failed' },
  { label: '已取消', value: 'cancelled' },
];

const platformOptions = [
  { label: 'YouTube', value: 'youtube' },
  { label: 'TikTok', value: 'tiktok' },
  { label: '博客', value: 'blog' },
  { label: 'Twitter', value: 'twitter' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Reddit', value: 'reddit' },
  { label: 'Quora', value: 'quora' },
];

const statusMap: Record<PublishTaskStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'default' },
  scheduled: { label: '已调度', color: 'blue' },
  publishing: { label: '发布中', color: 'processing' },
  published: { label: '已发布', color: 'success' },
  failed: { label: '失败', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
};

const statusOrder: Record<PublishTaskStatus, number> = {
  published: 6,
  publishing: 5,
  scheduled: 4,
  pending: 3,
  failed: 2,
  cancelled: 1,
};

export default function PublishQueuePage() {
  // Data state
  const [tasks, setTasks] = useState<PublishTask[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [queueActionLoading, setQueueActionLoading] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<{
    status?: PublishTaskStatus;
    platform?: string;
  }>({});

  // Queue control state
  const [isPaused, setIsPaused] = useState(false);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await publishApi.getTasks({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setTasks(result.tasks);
      setPagination((prev) => ({ ...prev, total: result.total }));
    } catch (error) {
      message.error('获取发布任务失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await publishApi.getStats();
      setStats(result);
    } catch (error) {
      console.error('获取队列统计失败:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTasks();
    fetchStats();

    // 定期刷新统计数据
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchStats]);

  // Handle table change
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20,
    }));
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // Handle retry
  const handleRetry = async (id: string) => {
    try {
      await publishApi.retryTask(id);
      message.success('任务已重新调度');
      fetchTasks();
      fetchStats();
    } catch (error) {
      message.error('重试失败');
    }
  };

  // Handle cancel
  const handleCancel = async (id: string) => {
    try {
      await publishApi.cancelTask(id);
      message.success('任务已取消');
      fetchTasks();
      fetchStats();
    } catch (error) {
      message.error('取消失败');
    }
  };

  // Handle pause queue
  const handlePauseQueue = async () => {
    setQueueActionLoading(true);
    try {
      await publishApi.pauseQueue();
      setIsPaused(true);
      message.success('发布队列已暂停');
      fetchStats();
    } catch (error) {
      message.error('暂停失败');
    } finally {
      setQueueActionLoading(false);
    }
  };

  // Handle resume queue
  const handleResumeQueue = async () => {
    setQueueActionLoading(true);
    try {
      await publishApi.resumeQueue();
      setIsPaused(false);
      message.success('发布队列已恢复');
      fetchStats();
    } catch (error) {
      message.error('恢复失败');
    } finally {
      setQueueActionLoading(false);
    }
  };

  // Handle clear queue
  const handleClearQueue = async () => {
    setQueueActionLoading(true);
    try {
      await publishApi.clearQueue();
      message.success('发布队列已清空');
      fetchTasks();
      fetchStats();
    } catch (error) {
      message.error('清空失败');
    } finally {
      setQueueActionLoading(false);
    }
  };

  // Calculate completion rate
  const completionRate = stats ? Math.round(
    ((stats.completed || 0) / ((stats.completed || 0) + (stats.failed || 0) + (stats.waiting || 0) + (stats.active || 0))) * 100
  ) : 0;

  // Table columns
  const columns: ColumnsType<PublishTask> = [
    {
      title: '内容ID',
      dataIndex: 'content_id',
      key: 'content_id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: string) => {
        const platformMap: Record<string, string> = {
          youtube: 'YouTube',
          tiktok: 'TikTok',
          blog: '博客',
          twitter: 'Twitter',
          linkedin: 'LinkedIn',
          reddit: 'Reddit',
          quora: 'Quora',
        };
        return <Tag>{platformMap[platform] || platform}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PublishTaskStatus) => {
        const { label, color } = statusMap[status];
        return <Tag color={color}>{label}</Tag>;
      },
      sorter: (a: PublishTask, b: PublishTask) => statusOrder[b.status] - statusOrder[a.status],
    },
    {
      title: '重试次数',
      dataIndex: 'retry_count',
      key: 'retry_count',
      width: 100,
    },
    {
      title: '调度时间',
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      width: 150,
      render: (date: string | null) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '发布时间',
      dataIndex: 'published_at',
      key: 'published_at',
      width: 150,
      render: (date: string | null) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message',
      ellipsis: true,
      render: (error: string | null) => error ? <span style={{ color: '#ff4d4f' }}>{error}</span> : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const canRetry = record.status === 'failed' || record.status === 'cancelled';
        const canCancel = record.status === 'pending' || record.status === 'scheduled';

        return (
          <Space size="small">
            {canRetry && (
              <Popconfirm
                title="确定要重试这个任务吗?"
                onConfirm={() => handleRetry(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" icon={<RedoOutlined />}>
                  重试
                </Button>
              </Popconfirm>
            )}
            {canCancel && (
              <Popconfirm
                title="确定要取消这个任务吗?"
                onConfirm={() => handleCancel(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            )}
            {record.platform_post_url && (
              <Button
                type="link"
                size="small"
                onClick={() => window.open(record.platform_post_url, '_blank')}
              >
                查看
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* Queue Statistics */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="等待中" value={stats.waiting} valueStyle={{ color: '#999' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="处理中" value={stats.active} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="失败" value={stats.failed} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Completion Rate */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="队列完成率" bordered={false}>
              <Progress
                percent={completionRate}
                status={completionRate >= 90 ? 'success' : completionRate >= 70 ? 'normal' : 'exception'}
              />
              <p style={{ marginTop: 16 }}>
                总计: {stats.completed} 完成 / {stats.failed} 失败 / {stats.waiting + stats.active} 待处理
              </p>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="队列控制" bordered={false}>
              <Space size="middle">
                {isPaused ? (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleResumeQueue}
                    loading={queueActionLoading}
                  >
                    恢复队列
                  </Button>
                ) : (
                  <Button
                    icon={<PauseCircleOutlined />}
                    onClick={handlePauseQueue}
                    loading={queueActionLoading}
                  >
                    暂停队列
                  </Button>
                )}
                <Popconfirm
                  title="确定要清空队列吗?这将删除所有等待中的任务。"
                  onConfirm={handleClearQueue}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<ClearOutlined />} loading={queueActionLoading}>
                    清空队列
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Card */}
      <Card
        title="发布任务"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTasks}>
              刷新
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space size="middle">
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            options={statusOptions}
            allowClear
            onChange={(value) => handleFilterChange('status', value)}
          />
          <Select
            placeholder="平台筛选"
            style={{ width: 120 }}
            options={platformOptions}
            allowClear
            onChange={(value) => handleFilterChange('platform', value)}
          />
        </Space>
      </Card>

      {/* Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={tasks}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}
