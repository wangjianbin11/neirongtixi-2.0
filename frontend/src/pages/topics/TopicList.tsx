import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  Popconfirm,
  message,
  Dropdown,
  Modal,
  Form,
  Upload,
  Progress,
  List,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  DownloadOutlined,
  UploadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { topicsApi, Topic, TopicType, TopicPriority, TopicStatus, TargetCustomer, TopicResearchProgress, TopicResearchTask, TopicResearchResultItem, SearchMethod } from '../../api/topics';
import TopicForm from './TopicForm';

const topicTypeOptions = [
  { label: '教程', value: 'tutorial' },
  { label: '问答', value: 'qa' },
  { label: '案例研究', value: 'case_study' },
  { label: '洞察', value: 'insight' },
  { label: '评论', value: 'review' },
  { label: '对比', value: 'comparison' },
];

const priorityOptions = [
  { label: 'S', value: 'S' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
];

const statusOptions = [
  { label: '待审核', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '生产中', value: 'in_production' },
  { label: '已完成', value: 'completed' },
  { label: '已发布', value: 'published' },
];

const targetCustomerOptions = [
  { label: '初创者', value: 'startup' },
  { label: '有经验卖家', value: 'experienced' },
  { label: '团队卖家', value: 'team' },
  { label: '本地到全球', value: 'local' },
];

const topicTypeMap: Record<TopicType, string> = {
  tutorial: '教程',
  qa: '问答',
  case_study: '案例研究',
  insight: '洞察',
  review: '评论',
  comparison: '对比',
};

const targetCustomerMap: Record<TargetCustomer, string> = {
  startup: '初创者',
  experienced: '有经验卖家',
  team: '团队卖家',
  local: '本地到全球',
};

const statusMap: Record<TopicStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'default' },
  approved: { label: '已批准', color: 'blue' },
  in_production: { label: '生产中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  published: { label: '已发布', color: 'green' },
};

const priorityColorMap: Record<TopicPriority, string> = {
  S: 'red',
  A: 'orange',
  B: 'blue',
  C: 'default',
};

// 搜索方法映射和颜色
const searchMethodMap: Record<SearchMethod, string> = {
  api: 'API',
  crawler: '爬虫',
  google: 'Google搜索',
};

const searchMethodColorMap: Record<SearchMethod, string> = {
  api: 'blue',
  crawler: 'purple',
  google: 'orange',
};

export default function TopicListPage() {
  const navigate = useNavigate();

  // Data state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    byTargetCustomer: Record<string, number>;
  } | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<{
    topic_type?: TopicType;
    priority?: TopicPriority;
    target_customer?: TargetCustomer;
    status?: TopicStatus;
    search?: string;
  }>({});

  // Batch operation state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkUpdateModalVisible, setBulkUpdateModalVisible] = useState(false);
  const [bulkUpdateForm] = Form.useForm();

  // Import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | undefined>(undefined);

  // Research state
  const [researchModalVisible, setResearchModalVisible] = useState(false);
  const [researchProgress, setResearchProgress] = useState<TopicResearchProgress | null>(null);
  const [researchPolling, setResearchPolling] = useState(false);
  const [researchResults, setResearchResults] = useState<TopicResearchTask | null>(null);
  const [platformCandidates, setPlatformCandidates] = useState<any[] | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await topicsApi.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setTopics(result.topics);
      setPagination((prev) => ({ ...prev, total: result.total }));
    } catch (error) {
      message.error('获取话题列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await topicsApi.getStats();
      setStats(result);
    } catch (error) {
      // Error handled silently
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTopics();
    fetchStats();
  }, [fetchTopics, fetchStats]);

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

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // Handle create
  const handleCreate = () => {
    setEditingTopic(undefined);
    setModalVisible(true);
  };

  // Handle edit
  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await topicsApi.delete(id);
      message.success('删除成功');
      fetchTopics();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('删除失败');
    }
  };

  // Handle approve
  const handleApprove = async (id: string) => {
    try {
      await topicsApi.approve(id);
      message.success('已批准');
      fetchTopics();
      fetchStats();
    } catch (error) {
      message.error('批准失败');
    }
  };

  // Handle reject
  const handleReject = async (id: string) => {
    try {
      await topicsApi.reject(id);
      message.success('已拒绝');
      fetchTopics();
      fetchStats();
    } catch (error) {
      message.error('拒绝失败');
    }
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingTopic) {
        await topicsApi.update(editingTopic.id, values);
        message.success('更新成功');
      } else {
        await topicsApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchTopics();
      fetchStats();
    } catch (error) {
      message.error(editingTopic ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的话题');
      return;
    }
    try {
      await topicsApi.bulkDelete(selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 个话题`);
      fetchTopics();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    try {
      await topicsApi.bulkApprove(selectedRowKeys as string[]);
      message.success(`成功批准 ${selectedRowKeys.length} 个话题`);
      fetchTopics();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量批准失败');
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    try {
      await topicsApi.bulkReject(selectedRowKeys as string[]);
      message.success(`成功拒绝 ${selectedRowKeys.length} 个话题`);
      fetchTopics();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量拒绝失败');
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async (values: any) => {
    try {
      const { field, value } = values;
      const updates: Record<string, any> = {};
      updates[field] = value;
      await topicsApi.bulkUpdate(selectedRowKeys as string[], updates);
      message.success(`成功更新 ${selectedRowKeys.length} 个话题`);
      setBulkUpdateModalVisible(false);
      bulkUpdateForm.resetFields();
      fetchTopics();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量更新失败');
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await topicsApi.export(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topics_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // Handle import
  const handleImport = async () => {
    if (importFileList.length === 0) {
      message.warning('请选择要导入的文件');
      return;
    }

    setImporting(true);
    try {
      const file = importFileList[0].originFileObj;
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // 跳过表头
      const dataLines = lines.slice(1);
      const topics = [];

      for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          topics.push({
            title: parts[0].replace(/"/g, '').trim(),
            description: parts[1] ? parts[1].replace(/"/g, '').trim() : '',
            topic_type: parts[2].replace(/"/g, '').trim() as TopicType,
            target_customer: parts[3] ? parts[3].replace(/"/g, '').trim() as TargetCustomer : 'startup',
            priority: parts[4] ? parts[4].replace(/"/g, '').trim() as TopicPriority : 'C',
          });
        }
      }

      if (topics.length > 0) {
        await topicsApi.bulkCreate(topics);
        message.success(`成功导入 ${topics.length} 个话题`);
        setImportModalVisible(false);
        setImportFileList([]);
        fetchTopics();
        fetchStats();
      } else {
        message.warning('文件中没有有效数据');
      }
    } catch (error) {
      message.error('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
    }
  };

  // Handle topic research
  const handleResearchTopic = async (topic: Topic) => {
    setSelectedTopic(topic);
    setResearchModalVisible(true);
    setResearchProgress(null);
    setResearchResults(null);
    setPlatformCandidates(null);

    try {
      // Start research
      const result = await topicsApi.startResearch(topic.id);
      message.success('调研任务已启动');

      // Start polling for progress
      setResearchPolling(true);
      pollResearchProgress(topic.id);
    } catch (error: any) {
      message.error(error?.response?.data?.error?.message || '启动调研失败');
    }
  };

  // Poll research progress
  const pollResearchProgress = async (topicId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await topicsApi.getResearchStatus(topicId);
        setResearchProgress(status);

        // If completed, fetch results and stop polling
        if (status.status === 'completed') {
          clearInterval(interval);
          setResearchPolling(false);

          const results = await topicsApi.getResearchResults(topicId);
          setResearchResults(results);

          // Fetch platform candidates
          const candidates = await topicsApi.getPlatformCandidates(topicId);
          setPlatformCandidates(candidates);

          message.success('调研完成！');
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setResearchPolling(false);
          message.error('调研失败');
        }
      } catch (error) {
        clearInterval(interval);
        setResearchPolling(false);
      }
    }, 2000); // Poll every 2 seconds
  };

  // Close research modal
  const handleCloseResearchModal = () => {
    setResearchModalVisible(false);
    setResearchProgress(null);
    setResearchResults(null);
    setPlatformCandidates(null);
    setResearchPolling(false);
    setSelectedTopic(null);
  };

  // Handle select platform for content generation
  const handleSelectPlatform = async (platform: any) => {
    message.info(`已选择平台: ${platform.platform_name}`);
    handleCloseResearchModal();

    // 导航到内容生成页面，传递平台和话题参数
    const params = new URLSearchParams();
    params.append('platform', platform.platform);
    params.append('platform_name', platform.platform_name);
    if (selectedTopic) {
      params.append('topic_id', selectedTopic.id);
      params.append('topic_title', selectedTopic.title);
    }
    navigate(`/contents/generate?${params.toString()}`);
  };

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // Batch action menu items
  const batchActionMenuItems = [
    {
      key: 'approve',
      label: '批量批准',
      onClick: handleBulkApprove,
    },
    {
      key: 'reject',
      label: '批量拒绝',
      onClick: handleBulkReject,
    },
    {
      key: 'priority',
      label: '批量更新优先级',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'priority' });
      },
    },
    {
      key: 'status',
      label: '批量更新状态',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'status' });
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: '批量删除',
      danger: true,
      onClick: handleBatchDelete,
    },
  ];

  // Table columns
  const columns: ColumnsType<Topic> = [
    {
      title: '话题标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '英文标题',
      dataIndex: 'title_en',
      key: 'title_en',
      width: 200,
      render: (title_en: string) => title_en || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '类型',
      dataIndex: 'topic_type',
      key: 'topic_type',
      width: 100,
      render: (type: TopicType) => <Tag>{topicTypeMap[type]}</Tag>,
    },
    {
      title: '目标客户',
      dataIndex: 'target_customer',
      key: 'target_customer',
      width: 120,
      render: (customer: TargetCustomer) => targetCustomerMap[customer],
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: TopicPriority) => (
        <Tag color={priorityColorMap[priority]}>{priority}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TopicStatus) => {
        const { label, color } = statusMap[status];
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '预估工作量',
      dataIndex: 'estimated_effort',
      key: 'estimated_effort',
      width: 100,
      render: (effort: number) => `${effort}/10`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const canApprove = record.status === 'pending';

        const items = [
          {
            key: 'research',
            icon: <SearchOutlined />,
            label: '调研',
            onClick: () => handleResearchTopic(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            onClick: () => handleEdit(record),
          },
          canApprove && {
            key: 'approve',
            icon: <CheckOutlined />,
            label: '批准',
            onClick: () => handleApprove(record.id),
          },
          canApprove && {
            key: 'reject',
            icon: <CloseOutlined />,
            label: '拒绝',
            onClick: () => handleReject(record.id),
          },
          {
            type: 'divider' as const,
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => handleDelete(record.id),
          },
        ].filter(Boolean);

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="link" size="small" icon={<MoreOutlined />}>
              更多
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总话题数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="待审核" value={stats.byStatus?.pending || 0} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="生产中" value={stats.byStatus?.in_production || 0} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已发布" value={stats.byStatus?.published || 0} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Card */}
      <Card
        title="话题管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTopics}>
              刷新
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
              导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              添加话题
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space size="middle" wrap>
          <Input.Search
            placeholder="搜索话题"
            style={{ width: 200 }}
            onSearch={handleSearch}
            allowClear
          />
          <Select
            placeholder="类型筛选"
            style={{ width: 120 }}
            options={topicTypeOptions}
            allowClear
            onChange={(value) => handleFilterChange('topic_type', value)}
          />
          <Select
            placeholder="优先级筛选"
            style={{ width: 120 }}
            options={priorityOptions}
            allowClear
            onChange={(value) => handleFilterChange('priority', value)}
          />
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            options={statusOptions}
            allowClear
            onChange={(value) => handleFilterChange('status', value)}
          />
          <Select
            placeholder="目标客户筛选"
            style={{ width: 150 }}
            options={targetCustomerOptions}
            allowClear
            onChange={(value) => handleFilterChange('target_customer', value)}
          />
        </Space>
      </Card>

      {/* Batch Actions Bar */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Dropdown menu={{ items: batchActionMenuItems }}>
              <Button>
                批量操作 <MoreOutlined />
              </Button>
            </Dropdown>
            <Button type="link" onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        </Card>
      )}

      {/* Table */}
      <Table
        rowKey="id"
        rowSelection={rowSelection}
        columns={columns}
        dataSource={topics}
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
        scroll={{ x: 1000 }}
      />

      {/* Form Modal */}
      <TopicForm
        visible={modalVisible}
        topic={editingTopic}
        onSubmit={handleSubmit}
        onCancel={() => setModalVisible(false)}
        loading={submitting}
      />

      {/* Bulk Update Modal */}
      <Modal
        title="批量更新话题"
        open={bulkUpdateModalVisible}
        onCancel={() => {
          setBulkUpdateModalVisible(false);
          bulkUpdateForm.resetFields();
        }}
        onOk={() => bulkUpdateForm.submit()}
        okText="更新"
        cancelText="取消"
      >
        <Form form={bulkUpdateForm} layout="vertical" onFinish={handleBulkUpdate}>
          <Form.Item
            label="更新字段"
            name="field"
            rules={[{ required: true, message: '请选择要更新的字段' }]}
          >
            <Select>
              <Select.Option value="priority">优先级</Select.Option>
              <Select.Option value="status">状态</Select.Option>
              <Select.Option value="topic_type">类型</Select.Option>
              <Select.Option value="target_customer">目标客户</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.field !== currentValues.field}>
            {({ getFieldValue }) => {
              const field = getFieldValue('field');
              if (field === 'priority') {
                return (
                  <Form.Item
                    label="新优先级"
                    name="value"
                    rules={[{ required: true, message: '请选择优先级' }]}
                  >
                    <Select>
                      {priorityOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'status') {
                return (
                  <Form.Item
                    label="新状态"
                    name="value"
                    rules={[{ required: true, message: '请选择状态' }]}
                  >
                    <Select>
                      {statusOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'topic_type') {
                return (
                  <Form.Item
                    label="新类型"
                    name="value"
                    rules={[{ required: true, message: '请选择类型' }]}
                  >
                    <Select>
                      {topicTypeOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'target_customer') {
                return (
                  <Form.Item
                    label="新目标客户"
                    name="value"
                    rules={[{ required: true, message: '请选择目标客户' }]}
                  >
                    <Select>
                      {targetCustomerOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="导入话题"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportFileList([]);
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setImportModalVisible(false);
              setImportFileList([]);
            }}>
              取消
            </Button>
            <Button type="primary" onClick={handleImport} loading={importing}>
              导入
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <p>请选择CSV文件进行导入。文件格式要求：</p>
          <ul>
            <li>第一列：标题</li>
            <li>第二列：描述 (可选)</li>
            <li>第三列：类型 (tutorial/qa/case_study/insight/review/comparison)</li>
            <li>第四列：目标客户 (startup/experienced/team/local，可选)</li>
            <li>第五列：优先级 (S/A/B/C，可选)</li>
          </ul>
        </div>
        <Upload
          fileList={importFileList}
          onChange={({ fileList }) => setImportFileList(fileList)}
          beforeUpload={() => false}
          accept=".csv"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>

      {/* Topic Research Modal */}
      <Modal
        title={
          <Space>
            <SearchOutlined />
            <span>话题调研 - {selectedTopic?.title}</span>
          </Space>
        }
        open={researchModalVisible}
        onCancel={handleCloseResearchModal}
        footer={
          <Space>
            <Button onClick={handleCloseResearchModal}>
              关闭
            </Button>
          </Space>
        }
        width={900}
      >
        {researchProgress && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>状态：</strong>
                  <Tag color={
                    researchProgress.status === 'completed' ? 'green' :
                    researchProgress.status === 'in_progress' ? 'blue' :
                    researchProgress.status === 'failed' ? 'red' : 'default'
                  }>
                    {researchProgress.status === 'pending' ? '等待中' :
                     researchProgress.status === 'in_progress' ? '进行中' :
                     researchProgress.status === 'completed' ? '已完成' :
                     researchProgress.status === 'failed' ? '失败' : researchProgress.status}
                  </Tag>
                </div>
                <div>
                  <strong>进度：</strong>
                  {researchProgress.completed_channels} / {researchProgress.total_channels} 渠道
                  ({researchProgress.progress}%)
                </div>
                {researchProgress.current_channel && (
                  <div>
                    <strong>当前渠道：</strong>
                    {researchProgress.current_channel}
                  </div>
                )}
                <div>
                  <strong>已收集结果：</strong>
                  {researchProgress.results_summary?.total_results || 0} 条
                </div>
                <Progress percent={researchProgress.progress} status={researchPolling ? 'active' : 'normal'} />
              </Space>
            </div>
          </div>
        )}

        {researchResults && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h4>调研结果汇总</h4>
              <p>共收集到 <strong>{researchResults.results.reduce((sum, r) => sum + r.result_count, 0)}</strong> 条结果</p>
              <p>知识库匹配 <strong>{researchResults.knowledge_results?.length || 0}</strong> 条</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4>各渠道结果</h4>
              <List
                size="small"
                dataSource={researchResults.results}
                renderItem={(item: TopicResearchResultItem) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.channel_name} ({item.channel_name_en})</span>
                          {item.method && (
                            <Tag color={searchMethodColorMap[item.method]}>
                              {searchMethodMap[item.method]}
                            </Tag>
                          )}
                          <Tag color={
                            item.status === 'completed' ? 'green' :
                            item.status === 'processing' ? 'blue' :
                            item.status === 'failed' ? 'red' : 'default'
                          }>
                            {item.status === 'completed' ? '已完成' :
                             item.status === 'processing' ? '进行中' :
                             item.status === 'failed' ? '失败' : item.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <span>{item.result_count} 条结果</span>
                          {item.started_at && (
                            <span style={{ fontSize: 12, color: '#999' }}>
                              开始时间: {new Date(item.started_at).toLocaleTimeString()}
                            </span>
                          )}
                          {item.completed_at && (
                            <span style={{ fontSize: 12, color: '#999' }}>
                              完成时间: {new Date(item.completed_at).toLocaleTimeString()}
                            </span>
                          )}
                          {item.error && (
                            <span style={{ fontSize: 12, color: '#ff4d4f' }}>
                              错误: {item.error}
                            </span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}

        {platformCandidates && platformCandidates.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4>推荐发布平台</h4>
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={platformCandidates}
              renderItem={(platform: any) => (
                <List.Item>
                  <Card
                    size="small"
                    title={platform.platform_name}
                    extra={
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleSelectPlatform(platform)}
                      >
                        选择
                      </Button>
                    }
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <strong>适配度：</strong>
                        <Progress percent={platform.suitability_score} size="small" />
                      </div>
                      <div>
                        <strong>制作难度：</strong>
                        <Tag color={platform.estimated_effort === 'low' ? 'green' : platform.estimated_effort === 'medium' ? 'orange' : 'red'}>
                          {platform.estimated_effort === 'low' ? '低' : platform.estimated_effort === 'medium' ? '中' : '高'}
                        </Tag>
                      </div>
                      <div>
                        <strong>竞争程度：</strong>
                        <Tag color={platform.competition_level === 'low' ? 'green' : platform.competition_level === 'medium' ? 'orange' : 'red'}>
                          {platform.competition_level === 'low' ? '低' : platform.competition_level === 'medium' ? '中' : '高'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <strong>推荐理由：</strong>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {platform.reasons?.slice(0, 2).map((reason: string, i: number) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        )}

        {!researchProgress && !researchResults && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在启动调研任务...</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
