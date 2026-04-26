import { useState, useEffect, useCallback } from 'react';
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
  Descriptions,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  SendOutlined,
  EyeOutlined,
  MoreOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { contentsApi, Content, ContentType, ContentStatus } from '../../api/contents';

const contentTypeOptions = [
  { label: '文章', value: 'article' },
  { label: '视频脚本', value: 'video_script' },
  { label: '社媒帖子', value: 'social_post' },
  { label: '论坛回答', value: 'forum_answer' },
];

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '审核中', value: 'review' },
  { label: '已批准', value: 'approved' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
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

const contentTypeMap: Record<ContentType, string> = {
  article: '文章',
  video_script: '视频脚本',
  social_post: '社媒帖子',
  forum_answer: '论坛回答',
};

const platformMap: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  blog: '博客',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  quora: 'Quora',
};

const statusMap: Record<ContentStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  review: { label: '审核中', color: 'orange' },
  approved: { label: '已批准', color: 'blue' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'default' },
};

const statusColorMap: Record<ContentStatus, string> = {
  draft: 'default',
  review: 'orange',
  approved: 'blue',
  published: 'green',
  archived: 'default',
};

export default function ContentListPage() {
  const navigate = useNavigate();

  // Data state
  const [contents, setContents] = useState<Content[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byType: Record<string, number>;
    byPlatform: Record<string, number>;
    byStatus: Record<string, number>;
  } | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<{
    content_type?: ContentType;
    platform?: string;
    status?: ContentStatus;
    search?: string;
  }>({});

  // Modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Batch operation state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkUpdateModalVisible, setBulkUpdateModalVisible] = useState(false);
  const [bulkUpdateForm] = Form.useForm();

  // Import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Fetch contents
  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await contentsApi.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setContents(result.contents);
      setPagination((prev) => ({ ...prev, total: result.total }));
    } catch (error) {
      message.error('获取内容列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await contentsApi.getStats();
      setStats(result);
    } catch (error) {
      // Error handled silently
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchContents();
    fetchStats();
  }, [fetchContents, fetchStats]);

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

  // Handle view
  const handleView = (content: Content) => {
    setSelectedContent(content);
    setViewModalVisible(true);
  };

  // Handle approve
  const handleApprove = async (id: string) => {
    try {
      await contentsApi.approve(id);
      message.success('已批准');
      fetchContents();
      fetchStats();
    } catch (error) {
      message.error('批准失败');
    }
  };

  // Handle publish
  const handlePublish = async (id: string) => {
    try {
      await contentsApi.publish(id);
      message.success('已发布');
      fetchContents();
      fetchStats();
    } catch (error) {
      message.error('发布失败');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await contentsApi.delete(id);
      message.success('删除成功');
      fetchContents();
      fetchStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的内容');
      return;
    }
    try {
      await contentsApi.bulkDelete(selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 个内容`);
      fetchContents();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    try {
      await contentsApi.bulkApprove(selectedRowKeys as string[]);
      message.success(`成功批准 ${selectedRowKeys.length} 个内容`);
      fetchContents();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量批准失败');
    }
  };

  // Handle bulk update status
  const handleBulkUpdateStatus = async (status: ContentStatus) => {
    try {
      await contentsApi.bulkUpdateStatus(selectedRowKeys as string[], status);
      message.success(`成功更新 ${selectedRowKeys.length} 个内容的状态`);
      fetchContents();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量更新状态失败');
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async (values: any) => {
    try {
      const { field, value } = values;
      const updates: Record<string, any> = {};
      updates[field] = value;
      await contentsApi.bulkUpdate(selectedRowKeys as string[], updates);
      message.success(`成功更新 ${selectedRowKeys.length} 个内容`);
      setBulkUpdateModalVisible(false);
      bulkUpdateForm.resetFields();
      fetchContents();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量更新失败');
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await contentsApi.export(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contents_${new Date().toISOString().slice(0, 10)}.csv`;
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
      const contents = [];

      for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          contents.push({
            title: parts[0].replace(/"/g, '').trim(),
            content_type: parts[1].replace(/"/g, '').trim() as ContentType,
            platform: parts[2].replace(/"/g, '').trim(),
            status: parts[3] ? parts[3].replace(/"/g, '').trim() as ContentStatus : 'draft',
            content_text: parts[4] ? parts[4].replace(/"/g, '').trim() : '',
          });
        }
      }

      if (contents.length > 0) {
        await contentsApi.bulkCreate(contents);
        message.success(`成功导入 ${contents.length} 个内容`);
        setImportModalVisible(false);
        setImportFileList([]);
        fetchContents();
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
      key: 'status-draft',
      label: '批量设为草稿',
      onClick: () => handleBulkUpdateStatus('draft'),
    },
    {
      key: 'status-review',
      label: '批量设为审核中',
      onClick: () => handleBulkUpdateStatus('review'),
    },
    {
      key: 'status-archived',
      label: '批量归档',
      onClick: () => handleBulkUpdateStatus('archived'),
    },
    {
      key: 'platform',
      label: '批量更新平台',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'platform' });
      },
    },
    {
      key: 'type',
      label: '批量更新类型',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'content_type' });
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
  const columns: ColumnsType<Content> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      ellipsis: true,
    },
    {
      title: '英文标题',
      dataIndex: 'title_en',
      key: 'title_en',
      width: 180,
      ellipsis: true,
      render: (title_en: string) => title_en || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '类型',
      dataIndex: 'content_type',
      key: 'content_type',
      width: 100,
      render: (type: ContentType) => <Tag>{contentTypeMap[type]}</Tag>,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: string) => <Tag>{platformMap[platform] || platform}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ContentStatus) => {
        const { label, color } = statusMap[status];
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'AI生成',
      dataIndex: 'generated_by_skill',
      key: 'generated_by_skill',
      width: 100,
      render: (skill: string | null) => (skill ? <Tag icon={<ThunderboltOutlined />} color="orange">AI</Tag> : '-'),
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
        const canApprove = record.status === 'draft' || record.status === 'review';
        const canPublish = record.status === 'approved';

        const items = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            onClick: () => navigate(`/contents/${record.id}`),
          },
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: '查看',
            onClick: () => handleView(record),
          },
          canApprove && {
            key: 'approve',
            icon: <CheckOutlined />,
            label: '批准',
            onClick: () => handleApprove(record.id),
          },
          canPublish && {
            key: 'publish',
            icon: <SendOutlined />,
            label: '发布',
            onClick: () => handlePublish(record.id),
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
              <Statistic title="总内容数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="草稿" value={stats.byStatus?.draft || 0} valueStyle={{ color: '#999' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已批准" value={stats.byStatus?.approved || 0} valueStyle={{ color: '#1890ff' }} />
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
        title="内容管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchContents}>
              刷新
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
              导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              创建内容
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space size="middle" wrap>
          <Input.Search
            placeholder="搜索内容"
            style={{ width: 200 }}
            onSearch={handleSearch}
            allowClear
          />
          <Select
            placeholder="类型筛选"
            style={{ width: 120 }}
            options={contentTypeOptions}
            allowClear
            onChange={(value) => handleFilterChange('content_type', value)}
          />
          <Select
            placeholder="平台筛选"
            style={{ width: 120 }}
            options={platformOptions}
            allowClear
            onChange={(value) => handleFilterChange('platform', value)}
          />
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            options={statusOptions}
            allowClear
            onChange={(value) => handleFilterChange('status', value)}
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
        dataSource={contents}
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

      {/* View Content Modal */}
      <Modal
        title="内容详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedContent && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="标题">{selectedContent.title}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag>{contentTypeMap[selectedContent.content_type]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="平台">
                <Tag>{platformMap[selectedContent.platform] || selectedContent.platform}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[selectedContent.status]}>
                  {statusMap[selectedContent.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="AI生成">
                {selectedContent.generated_by_skill ? (
                  <Tag icon={<ThunderboltOutlined />} color="orange">
                    {selectedContent.generated_by_skill}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedContent.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <h4>内容文本</h4>
              <div style={{
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {selectedContent.content_text || '无内容'}
              </div>
            </div>
            {selectedContent.content_metadata && (
              <div style={{ marginTop: 16 }}>
                <h4>元数据</h4>
                <pre style={{
                  padding: 12,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {JSON.stringify(selectedContent.content_metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Bulk Update Modal */}
      <Modal
        title="批量更新内容"
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
              <Select.Option value="platform">平台</Select.Option>
              <Select.Option value="content_type">类型</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.field !== currentValues.field}>
            {({ getFieldValue }) => {
              const field = getFieldValue('field');
              if (field === 'platform') {
                return (
                  <Form.Item
                    label="新平台"
                    name="value"
                    rules={[{ required: true, message: '请选择平台' }]}
                  >
                    <Select>
                      {platformOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'content_type') {
                return (
                  <Form.Item
                    label="新类型"
                    name="value"
                    rules={[{ required: true, message: '请选择类型' }]}
                  >
                    <Select>
                      {contentTypeOptions.map(opt => (
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
        title="导入内容"
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
            <li>第二列：类型 (article/video_script/social_post/forum_answer)</li>
            <li>第三列：平台</li>
            <li>第四列：状态 (draft/review/approved/published/archived，可选)</li>
            <li>第五列：内容文本 (可选)</li>
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
    </div>
  );
}
