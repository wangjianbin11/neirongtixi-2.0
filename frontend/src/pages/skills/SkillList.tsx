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
  message,
  Modal,
  Descriptions,
  Form,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { skillsApi, SkillTemplate, SkillCategory, SkillExecution, SkillExecutionResult } from '../../api/skills';

const categoryOptions = [
  { label: '数据输入', value: 'data_input' },
  { label: '内容生产', value: 'content_production' },
  { label: '分发', value: 'distribution' },
  { label: '优化', value: 'optimization' },
  { label: '支持', value: 'support' },
];

const categoryMap: Record<SkillCategory, string> = {
  data_input: '数据输入',
  content_production: '内容生产',
  distribution: '分发',
  optimization: '优化',
  support: '支持',
};

const categoryColorMap: Record<SkillCategory, string> = {
  data_input: 'blue',
  content_production: 'green',
  distribution: 'orange',
  optimization: 'purple',
  support: 'cyan',
};

export default function SkillListPage() {
  // Data state
  const [skills, setSkills] = useState<SkillTemplate[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byCategory: Record<string, number>;
    active: number;
    totalExecutions: number;
  } | null>(null);
  const [executions, setExecutions] = useState<SkillExecution[]>([]);
  const [executionResult, setExecutionResult] = useState<SkillExecutionResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<{
    category?: SkillCategory;
    is_active?: boolean;
  }>({});

  // Modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [executionModalVisible, setExecutionModalVisible] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillTemplate | null>(null);
  const [executionForm] = Form.useForm();

  // Fetch skills
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const result = await skillsApi.list(filter);
      setSkills(result);
    } catch (error) {
      message.error('获取技能列表失败');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await skillsApi.getStats();
      setStats(result);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  // Fetch executions
  const fetchExecutions = useCallback(async () => {
    try {
      const result = await skillsApi.getRecentExecutions(10);
      setExecutions(result);
    } catch (error) {
      console.error('获取执行记录失败:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSkills();
    fetchStats();
    fetchExecutions();
  }, [fetchSkills, fetchStats, fetchExecutions]);

  // Handle filter change
  const handleFilterChange = (key: string, value: any) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  // Handle view detail
  const handleViewDetail = (skill: SkillTemplate) => {
    setSelectedSkill(skill);
    setDetailModalVisible(true);
  };

  // Handle execute button click
  const handleExecute = (skill: SkillTemplate) => {
    setSelectedSkill(skill);
    setExecutionResult(null);
    setExecutionError(null);
    executionForm.resetFields();
    setExecutionModalVisible(true);
  };

  // Handle execution form submit
  const handleExecutionSubmit = async () => {
    if (!selectedSkill) return;

    const values = await executionForm.validateFields().catch(() => null);
    if (!values) return;

    setExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      const result = await skillsApi.execute(selectedSkill.code, values, {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 3000,
        temperature: 0.7,
      });

      setExecutionResult(result);
      message.success('技能执行成功');
      // Refresh executions list
      fetchExecutions();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '技能执行失败';
      setExecutionError(errorMsg);
      message.error(errorMsg);
    } finally {
      setExecuting(false);
    }
  };

  // Handle close execution modal
  const handleCloseExecutionModal = () => {
    setExecutionModalVisible(false);
    setExecutionResult(null);
    setExecutionError(null);
    executionForm.resetFields();
  };

  // Generate form fields from input schema
  const generateFormFields = (schema: Record<string, any>) => {
    const fields: JSX.Element[] = [];

    Object.entries(schema).forEach(([key, config]: [string, any]) => {
      const fieldType = config.type || 'text';
      const label = config.title || config.label || key;
      const placeholder = config.description || `请输入${label}`;
      const required = config.required || false;
      const options = config.enum || config.options;

      let inputElement: JSX.Element;

      if (fieldType === 'textarea' || config.multiline) {
        inputElement = (
          <Input.TextArea
            placeholder={placeholder}
            rows={4}
            allowClear
          />
        );
      } else if (options && Array.isArray(options)) {
        inputElement = (
          <Select
            placeholder={placeholder}
            allowClear
            options={options.map((opt: any) => ({
              label: typeof opt === 'string' ? opt : opt.label || opt.value,
              value: typeof opt === 'string' ? opt : opt.value,
            }))}
          />
        );
      } else if (fieldType === 'number') {
        inputElement = (
          <Input type="number" placeholder={placeholder} />
        );
      } else {
        inputElement = (
          <Input placeholder={placeholder} allowClear />
        );
      }

      fields.push(
        <Form.Item
          key={key}
          name={key}
          label={label}
          rules={required ? [{ required: true, message: `请输入${label}` }] : undefined}
          tooltip={config.description}
        >
          {inputElement}
        </Form.Item>
      );
    });

    return fields;
  };

  // Table columns
  const columns: ColumnsType<SkillTemplate> = [
    {
      title: '技能代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '技能名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: SkillCategory) => (
        <Tag color={categoryColorMap[category]}>{categoryMap[category]}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '活跃' : '停用'}
        </Tag>
      ),
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
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record)}
            disabled={!record.is_active}
          >
            执行
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
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
              <Statistic title="总技能数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="活跃技能" value={stats.active} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="数据输入技能"
                value={stats.byCategory?.data_input || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="内容生产技能"
                value={stats.byCategory?.content_production || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Recent Executions */}
      {executions.length > 0 && (
        <Card title="最近执行记录" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {executions.slice(0, 5).map((execution) => (
              <Card key={execution.id} size="small" style={{ backgroundColor: '#fafafa' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{execution.skill_code}</strong>
                    <Tag color={execution.status === 'completed' ? 'success' : 'processing'}>
                      {execution.status === 'completed' ? '完成' : '处理中'}
                    </Tag>
                  </div>
                  {execution.execution_time_ms && (
                    <div>执行时间: {execution.execution_time_ms}ms</div>
                  )}
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {new Date(execution.created_at).toLocaleString('zh-CN')}
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      )}

      {/* Filter Card */}
      <Card
        title="技能管理"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchSkills}>
            刷新
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Space size="middle">
          <Input
            placeholder="搜索技能"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="分类筛选"
            style={{ width: 150 }}
            options={categoryOptions}
            allowClear
            onChange={(value) => handleFilterChange('category', value)}
          />
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            options={[
              { label: '活跃', value: true },
              { label: '停用', value: false },
            ]}
            allowClear
            onChange={(value) => handleFilterChange('is_active', value)}
          />
        </Space>
      </Card>

      {/* Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={skills}
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1000 }}
      />

      {/* Skill Detail Modal */}
      <Modal
        title="技能详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedSkill && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="技能代码">{selectedSkill.code}</Descriptions.Item>
            <Descriptions.Item label="技能名称">{selectedSkill.name}</Descriptions.Item>
            <Descriptions.Item label="分类">
              <Tag color={categoryColorMap[selectedSkill.category]}>
                {categoryMap[selectedSkill.category]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedSkill.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="版本">{selectedSkill.version}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedSkill.is_active ? 'success' : 'default'}>
                {selectedSkill.is_active ? '活跃' : '停用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="输入Schema">
              <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(selectedSkill.input_schema, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="输出Schema">
              <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(selectedSkill.output_schema, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="提示词模板">
              <pre style={{ fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                {selectedSkill.prompt_template}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Skill Execution Modal */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined />
            {`执行技能: ${selectedSkill?.name || ''}`}
          </Space>
        }
        open={executionModalVisible}
        onCancel={handleCloseExecutionModal}
        footer={
          <Space>
            <Button onClick={handleCloseExecutionModal}>
              关闭
            </Button>
            {!executionResult && !executionError && (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleExecutionSubmit}
                loading={executing}
              >
                执行技能
              </Button>
            )}
            {(executionResult || executionError) && (
              <Button onClick={() => {
                setExecutionResult(null);
                setExecutionError(null);
                executionForm.resetFields();
              }}>
                重新执行
              </Button>
            )}
          </Space>
        }
        width={700}
      >
        {selectedSkill && (
          <div>
            {/* Skill Description */}
            {selectedSkill.description && (
              <Alert
                message={selectedSkill.description}
                type="info"
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Input Form */}
            {!executionResult && !executionError && (
              <>
                <Divider orientation="left">输入参数</Divider>
                <Form
                  form={executionForm}
                  layout="vertical"
                >
                  {generateFormFields(selectedSkill.input_schema)}
                </Form>
                {Object.keys(selectedSkill.input_schema).length === 0 && (
                  <Alert
                    message="此技能不需要输入参数"
                    type="info"
                    showIcon
                  />
                )}
              </>
            )}

            {/* Executing State */}
            {executing && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#666' }}>
                  AI正在执行技能...
                </div>
              </div>
            )}

            {/* Error State */}
            {executionError && (
              <Alert
                message="执行失败"
                description={executionError}
                type="error"
                icon={<CloseCircleOutlined />}
                showIcon
              />
            )}

            {/* Success State */}
            {executionResult && (
              <>
                <Alert
                  message="执行成功"
                  type="success"
                  icon={<CheckCircleOutlined />}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="执行时间">
                    {executionResult.execution_time_ms} ms
                  </Descriptions.Item>
                  {executionResult.cost_usd !== undefined && (
                    <Descriptions.Item label="成本">
                      ${executionResult.cost_usd.toFixed(6)}
                    </Descriptions.Item>
                  )}
                </Descriptions>
                <Divider orientation="left">执行结果</Divider>
                <div style={{
                  padding: 16,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  maxHeight: 300,
                  overflow: 'auto'
                }}>
                  <pre style={{ fontSize: 12, margin: 0 }}>
                    {JSON.stringify(executionResult.output_data, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
