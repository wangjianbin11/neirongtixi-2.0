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
  Modal,
  Form,
  Switch,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  DatabaseOutlined,
  FormatPainterOutlined,
  MessageOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { assetsApi, Asset, AssetType, AssetStats } from '../../api/assets';

const typeOptions = [
  { label: '案例', value: 'case' },
  { label: '数据', value: 'data' },
  { label: '引用', value: 'quote' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '模板', value: 'template' },
];

const categoryOptions = [
  { label: '行业案例', value: 'industry_case' },
  { label: '用户案例', value: 'user_case' },
  { label: '市场数据', value: 'market_data' },
  { label: '产品数据', value: 'product_data' },
  { label: '金句引用', value: 'golden_quote' },
  { label: '专家观点', value: 'expert_quote' },
  { label: '配图', value: 'image_photo' },
  { label: '图标', value: 'image_icon' },
  { label: '视频素材', value: 'video_footage' },
  { label: '模板文件', value: 'template_file' },
];

const typeMap: Record<AssetType, string> = {
  case: '案例',
  data: '数据',
  quote: '引用',
  image: '图片',
  video: '视频',
  template: '模板',
};

const typeIconMap: Record<AssetType, React.ReactNode> = {
  case: <FileOutlined />,
  data: <DatabaseOutlined />,
  quote: <MessageOutlined />,
  image: <PictureOutlined />,
  video: <VideoCameraOutlined />,
  template: <FormatPainterOutlined />,
};

export default function AssetListPage() {
  // Data state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);

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
    type?: AssetType;
    category?: string;
    search?: string;
  }>({});

  // Modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Form state
  const [form] = Form.useForm();

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await assetsApi.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setAssets(result.assets);
      setPagination((prev) => ({ ...prev, total: result.total }));
    } catch (error) {
      message.error('获取素材列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await assetsApi.getStats();
      setStats(result);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, [fetchAssets, fetchStats]);

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
  const handleView = (asset: Asset) => {
    setSelectedAsset(asset);
    setViewModalVisible(true);
  };

  // Handle edit
  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    form.setFieldsValue(asset);
    setEditModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await assetsApi.delete(id);
      message.success('删除成功');
      fetchAssets();
      fetchStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // Handle create
  const handleCreate = () => {
    setSelectedAsset(null);
    form.resetFields();
    setEditModalVisible(true);
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedAsset) {
        await assetsApi.update(selectedAsset.id, values);
        message.success('更新成功');
      } else {
        await assetsApi.create(values);
        message.success('创建成功');
      }
      setEditModalVisible(false);
      fetchAssets();
      fetchStats();
    } catch (error) {
      message.error(selectedAsset ? '更新失败' : '创建失败');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Table columns
  const columns: ColumnsType<Asset> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: AssetType) => (
        <Tag icon={typeIconMap[type]}>{typeMap[type]}</Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string | null) => category ? <Tag>{category}</Tag> : '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space size={4} wrap>
          {tags?.slice(0, 3).map((tag) => (
            <Tag key={tag} style={{ margin: 0 }}>{tag}</Tag>
          ))}
          {tags?.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number | null) => formatFileSize(size),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      ellipsis: true,
      render: (source: string | null) => source || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
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
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个素材吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总素材数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="案例"
                value={stats.byType?.case || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="数据"
                value={stats.byType?.data || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总文件大小"
                value={formatFileSize(stats.totalFileSize)}
                valueStyle={{ color: '#722ed1' }}
                prefix={<CloudUploadOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Type Breakdown */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="素材类型分布" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                      {typeIconMap[type as AssetType]}
                      <span>{typeMap[type as AssetType]}</span>
                    </Space>
                    <strong>{count}</strong>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="分类分布" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(stats.byCategory).map(([category, count]) => (
                  <div key={category} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{category}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Card */}
      <Card
        title="素材库"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchAssets}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建素材
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space size="middle" wrap>
          <Input.Search
            placeholder="搜索素材"
            style={{ width: 200 }}
            onSearch={handleSearch}
            allowClear
          />
          <Select
            placeholder="类型筛选"
            style={{ width: 120 }}
            options={typeOptions}
            allowClear
            onChange={(value) => handleFilterChange('type', value)}
          />
          <Select
            placeholder="分类筛选"
            style={{ width: 150 }}
            options={categoryOptions}
            allowClear
            onChange={(value) => handleFilterChange('category', value)}
          />
        </Space>
      </Card>

      {/* Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={assets}
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

      {/* View Modal */}
      <Modal
        title="素材详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedAsset && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="标题">{selectedAsset.title}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Space>
                {typeIconMap[selectedAsset.type]}
                {typeMap[selectedAsset.type]}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="分类">
              {selectedAsset.category ? <Tag>{selectedAsset.category}</Tag> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedAsset.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="标签">
              <Space size={4} wrap>
                {selectedAsset.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="文件URL">
              {selectedAsset.file_url ? (
                <a href={selectedAsset.file_url} target="_blank" rel="noopener noreferrer">
                  {selectedAsset.file_url}
                </a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {formatFileSize(selectedAsset.file_size)}
            </Descriptions.Item>
            <Descriptions.Item label="文件类型">
              {selectedAsset.file_type || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="来源">
              {selectedAsset.source || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedAsset.is_active ? 'success' : 'default'}>
                {selectedAsset.is_active ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedAsset.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit/Create Modal */}
      <Modal
        title={selectedAsset ? '编辑素材' : '新建素材'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="输入素材标题" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="选择素材类型">
              {typeOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  <Space>
                    {typeIconMap[option.value]}
                    {option.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="分类" name="category">
            <Select placeholder="选择分类" allowClear>
              {categoryOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="输入素材描述" />
          </Form.Item>

          <Form.Item label="文件URL" name="file_url">
            <Input placeholder="输入文件URL" />
          </Form.Item>

          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签，按回车添加" />
          </Form.Item>

          <Form.Item label="来源" name="source">
            <Input placeholder="输入素材来源" />
          </Form.Item>

          <Form.Item label="启用状态" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
