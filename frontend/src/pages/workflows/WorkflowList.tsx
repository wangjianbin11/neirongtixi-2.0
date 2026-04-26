import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm, Dropdown } from 'antd';
import { PlusOutlined, PlayCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined, BranchesOutlined, MoreOutlined, MobileOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { MenuProps } from 'antd';
import './WorkflowList.css';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_template: boolean;
  estimated_time?: number;
  estimated_cost?: number;
  created_at: string;
}

interface WorkflowStats {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
}

const categoryMap: Record<string, string> = {
  blog: '博客',
  social_media: '社交媒体',
  video: '视频',
  report: '报告',
  custom: '自定义',
  bilingual: '双语内容',
};

const categoryColorMap: Record<string, string> = {
  blog: 'blue',
  social_media: 'green',
  video: 'purple',
  report: 'orange',
  custom: 'default',
  bilingual: 'cyan',
};

export const WorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [category, setCategory] = useState<string | undefined>();
  const [isTemplate, setIsTemplate] = useState<boolean | undefined>();
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executeForm] = Form.useForm();

  const { onConnected, onDisconnected } = useWebSocket({
    onConnected: () => {},
    onDisconnected: () => {},
  });

  // 监听工作流执行事件
  useEffect(() => {
    const handleProgress = (data: any) => {
      message.info(`执行进度: ${data.progress}% - ${data.message}`);
    };

    const handleCompleted = (data: any) => {
      message.success('工作流执行完成！');
      fetchWorkflows(); // 刷新列表
    };

    const handleFailed = (data: any) => {
      message.error(`工作流执行失败: ${data.error}`);
    };

    // 注册事件监听（需要在实际WebSocket连接上添加）
    window.addEventListener('workflow:progress' as any, handleProgress);
    window.addEventListener('workflow:completed' as any, handleCompleted);
    window.addEventListener('workflow:failed' as any, handleFailed);

    return () => {
      window.removeEventListener('workflow:progress' as any, handleProgress);
      window.removeEventListener('workflow:completed' as any, handleCompleted);
      window.removeEventListener('workflow:failed' as any, handleFailed);
    };
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/workflows', {
        page,
        pageSize,
        category,
        is_template: isTemplate?.toString(),
        search,
      });

      if (response.success) {
        setWorkflows(response.data.workflows);
        setTotal(response.data.total);
      }
    } catch (error) {
      message.error('获取工作流列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // 这里可以获取执行统计，暂时跳过
    } catch (error) {
      // Error handled silently
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [page, pageSize, category, isTemplate, search]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/workflows/${id}`);
      message.success('删除成功');
      fetchWorkflows();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      await apiClient.post(`/workflows/${workflow.id}/duplicate`);
      message.success('复制成功');
      fetchWorkflows();
    } catch (error) {
      message.error('复制失败');
    }
  };

  const handleExecute = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setExecuteModalVisible(true);
  };

  const handleExecuteSubmit = async (values: any) => {
    try {
      const response = await apiClient.post(`/workflows/${selectedWorkflow!.id}/execute`, {
        input_data: values,
      });

      if (response.success) {
        message.success('工作流已开始执行');
        setExecuteModalVisible(false);
        executeForm.resetFields();
        navigate(`/workflows/executions/${response.data.execution.id}`);
      }
    } catch (error) {
      message.error('启动工作流失败');
    }
  };

  // 移动端操作菜单
  const getActionMenu = (record: Workflow): MenuProps => ({
    items: [
      {
        key: 'execute',
        label: '执行',
        icon: <PlayCircleOutlined />,
        onClick: () => handleExecute(record),
      },
      {
        key: 'duplicate',
        label: '复制',
        icon: <CopyOutlined />,
        onClick: () => handleDuplicate(record),
      },
      {
        key: 'visual',
        label: '可视化编辑',
        icon: <BranchesOutlined />,
        onClick: () => navigate(`/workflows/${record.id}/visual`),
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => navigate(`/workflows/${record.id}/edit`),
      },
      !record.is_template ? {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      } : null,
    ].filter(Boolean),
  });

  const columns = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
      render: (name: string, record: Workflow) => (
        <Space>
          {record.is_template && <ThunderboltOutlined style={{ color: '#faad14' }} />}
          <span className="workflow-name">{name}</span>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'],
      render: (category: string) => (
        category ? <Tag color={categoryColorMap[category]}>{categoryMap[category] || category}</Tag> : '-'
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      responsive: ['md', 'lg', 'xl', 'xxl'],
      render: (desc: string) => desc || '-',
    },
    {
      title: '预估时间',
      dataIndex: 'estimated_time',
      key: 'estimated_time',
      width: 100,
      responsive: ['lg', 'xl', 'xxl'],
      render: (time: number) => time ? `${Math.floor(time / 60)}分钟` : '-',
    },
    {
      title: '预估成本',
      dataIndex: 'estimated_cost',
      key: 'estimated_cost',
      width: 100,
      responsive: ['lg', 'xl', 'xxl'],
      render: (cost: number) => cost ? `$${cost.toFixed(2)}` : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      responsive: ['md', 'lg', 'xl', 'xxl'],
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: Workflow) => (
        <>
          {/* 桌面端：显示所有按钮 */}
          <Space className="desktop-actions">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record)}
            >
              执行
            </Button>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicate(record)}
            >
              复制
            </Button>
            <Button
              size="small"
              icon={<BranchesOutlined />}
              onClick={() => navigate(`/workflows/${record.id}/visual`)}
            >
              可视化
            </Button>
            {!record.is_template && (
              <Popconfirm
                title="确定删除这个工作流吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>

          {/* 移动端：更多操作菜单 */}
          <Space className="mobile-actions">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record)}
            >
              执行
            </Button>
            <Dropdown menu={getActionMenu(record)} trigger={['click']}>
              <Button icon={<MoreOutlined />} size="small">
                更多
              </Button>
            </Dropdown>
          </Space>
        </>
      ),
    },
  ];

  return (
    <div className="workflow-list">
      <div className="workflow-list-header">
        <h2>工作流管理</h2>
        <Space>
          <Button
            type={showTemplate ? "default" : "primary"}
            onClick={() => {
              setShowTemplate(false);
              setIsTemplate(undefined);
            }}
          >
            我的工作流
          </Button>
          <Button
            type={showTemplate ? "primary" : "default"}
            onClick={() => {
              setShowTemplate(true);
              setIsTemplate(true);
            }}
          >
            模板库
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/workflows/visual')}
          >
            创建工作流
          </Button>
        </Space>
      </div>

      <Card className="filter-card">
        <Space wrap>
          <Input.Search
            placeholder="搜索工作流名称"
            allowClear
            style={{ width: 200 }}
            onSearch={setSearch}
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 120 }}
            value={category}
            onChange={setCategory}
          >
            <Select.Option value="blog">博客</Select.Option>
            <Select.Option value="social_media">社交媒体</Select.Option>
            <Select.Option value="video">视频</Select.Option>
            <Select.Option value="report">报告</Select.Option>
            <Select.Option value="custom">自定义</Select.Option>
            <Select.Option value="bilingual">双语内容</Select.Option>
          </Select>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={workflows}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          simple: false,
        }}
        className="workflow-table"
      />

      <Modal
        title={`执行工作流: ${selectedWorkflow?.name}`}
        open={executeModalVisible}
        onOk={handleExecuteSubmit}
        onCancel={() => {
          setExecuteModalVisible(false);
          executeForm.resetFields();
        }}
        width={700}
        footer={null}
      >
        <Form
          form={executeForm}
          layout="vertical"
          onFinish={handleExecuteSubmit}
        >
          {/* 基础参数 */}
          <Form.Item
            label="关键词"
            name="keyword"
            rules={[{ required: true, message: '请输入关键词' }]}
            tooltip="要调研和生成内容的关键词"
          >
            <Input placeholder="例如：dropshipping, cross-border ecommerce" />
          </Form.Item>

          {/* 双语工作流专属参数 */}
          {selectedWorkflow?.category === 'bilingual' && (
            <>
              <Form.Item label="话题类型" name="topic_type" initialValue="tutorial">
                <Select>
                  <Select.Option value="tutorial">教程</Select.Option>
                  <Select.Option value="qa">问答</Select.Option>
                  <Select.Option value="case_study">案例研究</Select.Option>
                  <Select.Option value="insight">见解</Select.Option>
                  <Select.Option value="review">评测</Select.Option>
                  <Select.Option value="comparison">对比</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="目标客户" name="target_customer" initialValue="startup">
                <Select>
                  <Select.Option value="startup">初创企业</Select.Option>
                  <Select.Option value="experienced">有经验者</Select.Option>
                  <Select.Option value="team">团队</Select.Option>
                  <Select.Option value="local">本地商家</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="目标平台"
                name="target_platforms"
                initialValue={['blog', 'youtube', 'tiktok']}
              >
                <Select mode="multiple" placeholder="选择要生成内容的平台">
                  <Select.Option value="blog">博客 (Blog)</Select.Option>
                  <Select.Option value="youtube">YouTube</Select.Option>
                  <Select.Option value="tiktok">TikTok</Select.Option>
                  <Select.Option value="instagram">Instagram</Select.Option>
                  <Select.Option value="linkedin">LinkedIn</Select.Option>
                  <Select.Option value="twitter">Twitter</Select.Option>
                  <Select.Option value="reddit">Reddit</Select.Option>
                  <Select.Option value="pinterest">Pinterest</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="内容类型" name="content_type" initialValue="article">
                <Select>
                  <Select.Option value="article">文章</Select.Option>
                  <Select.Option value="video_script">视频脚本</Select.Option>
                  <Select.Option value="social_post">社交媒体帖子</Select.Option>
                  <Select.Option value="forum_answer">论坛回答</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="语气风格" name="tone" initialValue="educational">
                <Select>
                  <Select.Option value="professional">专业</Select.Option>
                  <Select.Option value="educational">教育性</Select.Option>
                  <Select.Option value="casual">轻松</Select.Option>
                  <Select.Option value="enthusiastic">热情</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="目标字数" name="target_length" initialValue={2000}>
                <Select>
                  <Select.Option value={1000}>1000字 (快速)</Select.Option>
                  <Select.Option value={2000}>2000字 (标准)</Select.Option>
                  <Select.Option value={3000}>3000字 (详细)</Select.Option>
                  <Select.Option value={5000}>5000字 (深度)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="调研范围" name="research_scope" initialValue="comprehensive">
                <Select>
                  <Select.Option value="standard">标准</Select.Option>
                  <Select.Option value="comprehensive">全面</Select.Option>
                  <Select.Option value="exhaustive">深入</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="翻译风格" name="translation_style" initialValue="natural">
                <Select>
                  <Select.Option value="formal">正式</Select.Option>
                  <Select.Option value="natural">自然</Select.Option>
                  <Select.Option value="creative">创意</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          {/* 预估信息 */}
          {selectedWorkflow && (
            <div style={{
              marginTop: 16,
              padding: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 8,
              color: 'white'
            }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                执行预估
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>预估时间:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {selectedWorkflow.estimated_time ? `${Math.floor(selectedWorkflow.estimated_time / 60)}分钟` : '未知'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>预估成本:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {selectedWorkflow.estimated_cost ? `$${selectedWorkflow.estimated_cost.toFixed(2)}` : '未知'}
                </span>
              </div>
            </div>
          )}

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setExecuteModalVisible(false);
                executeForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />}>
                开始执行
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowList;
