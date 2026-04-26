import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  message,
  Row,
  Col,
  Tag,
  Descriptions,
  Space,
  Divider,
  Alert,
  Popconfirm,
  Typography,
  Progress,
  Statistic,
  Collapse,
  Rate,
  Spin,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  SendOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StarOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { contentsApi, Content, ContentType, ContentStatus } from '../../api/contents';

const { TextArea } = Input;
const { Title, Text } = Typography;

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

const statusMap: Record<ContentStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  review: { label: '审核中', color: 'orange' },
  approved: { label: '已批准', color: 'blue' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'default' },
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

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Score state
  const [score, setScore] = useState<any>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Fetch content details
  const fetchContent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await contentsApi.getById(id);
      setContent(data);
      form.setFieldsValue({
        title: data.title,
        title_en: data.title_en || '',
        content_type: data.content_type,
        platform: data.platform,
        status: data.status,
        content_text: data.content_text || '',
        content_text_en: data.content_text_en || '',
      });
    } catch (error) {
      message.error('获取内容详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [id]);

  // Handle save
  const handleSave = async () => {
    if (!id) return;

    try {
      const values = await form.validateFields();
      setSaving(true);
      const updated = await contentsApi.update(id, values);
      setContent(updated);
      message.success('保存成功');
      setEditMode(false);
      fetchContent();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!id) return;

    try {
      setSaving(true);
      const updated = await contentsApi.approve(id);
      setContent(updated);
      message.success('已批准');
      fetchContent();
    } catch (error) {
      message.error('批准失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!id) return;

    try {
      setSaving(true);
      const updated = await contentsApi.publish(id);
      setContent(updated);
      message.success('已发布');
      fetchContent();
    } catch (error) {
      message.error('发布失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!id) return;

    try {
      await contentsApi.delete(id);
      message.success('删除成功');
      navigate('/contents');
    } catch (error) {
      message.error('删除失败');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditMode(false);
    if (content) {
      form.setFieldsValue({
        title: content.title,
        title_en: content.title_en || '',
        content_type: content.content_type,
        platform: content.platform,
        status: content.status,
        content_text: content.content_text || '',
        content_text_en: content.content_text_en || '',
      });
    }
  };

  // Fetch score
  const fetchScore = async () => {
    if (!id) return;
    setScoreLoading(true);
    try {
      const scoreData = await contentsApi.getScore(id);
      setScore(scoreData);
    } catch (error) {
      console.error('获取评分失败:', error);
    } finally {
      setScoreLoading(false);
    }
  };

  // Handle analyze content
  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      await contentsApi.startAnalysis(id);
      message.success('分析任务已启动，正在后台进行...');
      // Poll for results
      setTimeout(() => {
        fetchScore();
      }, 3000);
    } catch (error: any) {
      message.error(error?.response?.data?.error?.message || '启动分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // Load score on mount
  useEffect(() => {
    fetchScore();
  }, [id]);

  if (loading || !content) {
    return <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>;
  }

  const canApprove = content.status === 'draft' || content.status === 'review';
  const canPublish = content.status === 'approved';
  const canEdit = content.status !== 'published';

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/contents')}
          >
            返回列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {editMode ? '编辑内容' : '内容详情'}
          </Title>
        </Space>
        <Space>
          {!editMode ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
                disabled={!canEdit}
              >
                编辑
              </Button>
              {canApprove && (
                <Popconfirm
                  title="确认批准此内容？"
                  onConfirm={handleApprove}
                >
                  <Button type="primary" icon={<CheckOutlined />} loading={saving}>
                    批准
                  </Button>
                </Popconfirm>
              )}
              {canPublish && (
                <Popconfirm
                  title="确认发布此内容？"
                  onConfirm={handlePublish}
                >
                  <Button type="primary" icon={<SendOutlined />} loading={saving}>
                    发布
                  </Button>
                </Popconfirm>
              )}
              <Popconfirm
                title="确认删除此内容？"
                onConfirm={handleDelete}
                okText="确认"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <>
              <Button onClick={handleCancelEdit}>
                取消
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                保存
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* Status Alert */}
      <Alert
        message={
          <Space>
            <Text strong>当前状态：</Text>
            <Tag color={statusMap[content.status].color}>
              {statusMap[content.status].label}
            </Tag>
            {content.generated_by_skill && (
              <Tag icon={<EditOutlined />} color="orange">
                AI生成: {content.generated_by_skill}
              </Tag>
            )}
          </Space>
        }
        type={content.status === 'published' ? 'success' : content.status === 'review' ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* AI Analysis Score Card */}
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <span>AI内容分析</span>
          </Space>
        }
        extra={
          <Space>
            {!score && !analyzing && (
              <Button
                type="primary"
                size="small"
                icon={<StarOutlined />}
                onClick={handleAnalyze}
                loading={analyzing}
              >
                开始AI分析
              </Button>
            )}
            {score && (
              <Button
                size="small"
                onClick={handleAnalyze}
                loading={analyzing}
              >
                重新分析
              </Button>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {scoreLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
            <p style={{ marginTop: 10 }}>加载评分中...</p>
          </div>
        ) : score ? (
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="综合评分"
                  value={score.overall_score}
                  suffix="/ 100"
                  valueStyle={{
                    color: score.overall_score >= 80 ? '#3f8600' :
                           score.overall_score >= 60 ? '#faad14' : '#cf1322'
                  }}
                />
                {score.is_ymyl && (
                  <Tag color="orange" style={{ marginTop: 8 }}>
                    YMYL内容
                  </Tag>
                )}
              </Card>
            </Col>
            <Col span={18}>
              <Collapse
                size="small"
                items={[
                  {
                    key: 'eeat',
                    label: 'E-E-A-T 评分',
                    children: (
                      <Row gutter={[16, 16]}>
                        <Col span={6}>
                          <Card size="small" title="经验 (Experience)">
                            <Progress
                              type="circle"
                              percent={score.eeat_score?.experience?.score || 0}
                              size={80}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" title="专业性 (Expertise)">
                            <Progress
                              type="circle"
                              percent={score.eeat_score?.expertise?.score || 0}
                              size={80}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" title="权威性 (Authority)">
                            <Progress
                              type="circle"
                              percent={score.eeat_score?.authoritativeness?.score || 0}
                              size={80}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" title="可信度 (Trust)">
                            <Progress
                              type="circle"
                              percent={score.eeat_score?.trustworthiness?.score || 0}
                              size={80}
                            />
                          </Card>
                        </Col>
                      </Row>
                    ),
                  },
                  {
                    key: 'summary',
                    label: '分析总结',
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>整体评估：</Text>
                          <p>{score.summary?.overall_assessment}</p>
                        </div>
                        {score.summary?.key_strengths?.length > 0 && (
                          <div>
                            <Text strong>主要优点：</Text>
                            <ul>
                              {score.summary.key_strengths.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {score.summary?.critical_improvements?.length > 0 && (
                          <div>
                            <Text strong style={{ color: '#cf1322' }}>关键改进：</Text>
                            <ul>
                              {score.summary.critical_improvements.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {score.summary?.recommendations?.length > 0 && (
                          <div>
                            <Text strong>改进建议：</Text>
                            <ul>
                              {score.summary.recommendations.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Space>
                    ),
                  },
                  {
                    key: 'details',
                    label: '主体内容质量',
                    children: (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Card size="small" title="目标达成度">
                            <Progress percent={score.main_content_score?.purpose_achievement?.score || 0} />
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card size="small" title="内容质量">
                            <Progress percent={score.main_content_score?.content_quality?.score || 0} />
                          </Card>
                        </Col>
                        <Col span={12} style={{ marginTop: 16 }}>
                          <Card size="small" title="SEO优化">
                            <Progress percent={score.main_content_score?.seo_optimization?.score || 0} />
                          </Card>
                        </Col>
                        <Col span={12} style={{ marginTop: 16 }}>
                          <Card size="small" title="用户参与度">
                            <Progress percent={score.main_content_score?.user_engagement?.score || 0} />
                          </Card>
                        </Col>
                      </Row>
                    ),
                  },
                ]}
              />
            </Col>
          </Row>
        ) : (
          <Alert
            message="暂无AI分析评分"
            description="点击上方「开始AI分析」按钮，AI将基于E-E-A-T标准对内容进行全面分析"
            type="info"
            showIcon
          />
        )}
      </Card>

      <Row gutter={24}>
        {/* Main Content */}
        <Col span={16}>
          <Card title="内容信息" extra={!editMode && <Tag>查看模式</Tag>}>
            <Form
              form={form}
              layout="vertical"
              disabled={!editMode}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="标题"
                    name="title"
                    rules={[{ required: true, message: '请输入标题' }]}
                  >
                    <Input placeholder="请输入标题" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="英文标题 (English Title)"
                    name="title_en"
                  >
                    <Input placeholder="Please enter English title" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="类型"
                    name="content_type"
                    rules={[{ required: true, message: '请选择类型' }]}
                  >
                    <Select options={contentTypeOptions} placeholder="请选择类型" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="平台"
                    name="platform"
                    rules={[{ required: true, message: '请选择平台' }]}
                  >
                    <Select options={platformOptions} placeholder="请选择平台" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="状态"
                    name="status"
                    rules={[{ required: true, message: '请选择状态' }]}
                  >
                    <Select options={statusOptions} placeholder="请选择状态" />
                  </Form.Item>
                </Col>
              </Row>

              {/* 双语内容编辑区 - 左右并排 */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        <Text strong style={{ color: '#1890ff' }}>英文内容 (English Content)</Text>
                        <Tag color="blue">主要</Tag>
                      </Space>
                    }
                    name="content_text_en"
                    tooltip="英文内容是主要发布内容，必填"
                  >
                    <TextArea
                      rows={18}
                      placeholder="Please enter English content here..."
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        <Text strong>中文内容 (Chinese Translation)</Text>
                        <Tag>翻译对照</Tag>
                      </Space>
                    }
                    name="content_text"
                    tooltip="中文内容是英文的翻译对照，选填"
                  >
                    <TextArea
                      rows={18}
                      placeholder="请输入中文翻译内容..."
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Sidebar Info */}
        <Col span={8}>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="内容ID">
                <Text copyable>{content.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(content.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(content.updated_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              {content.published_at && (
                <Descriptions.Item label="发布时间">
                  {new Date(content.published_at).toLocaleString('zh-CN')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建人">
                {content.created_by}
              </Descriptions.Item>
              {content.reviewed_by && (
                <Descriptions.Item label="审核人">
                  {content.reviewed_by}
                </Descriptions.Item>
              )}
              {content.topic_id && (
                <Descriptions.Item label="关联话题">
                  <Text copyable>{content.topic_id}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {content.content_metadata && Object.keys(content.content_metadata).length > 0 && (
            <Card title="元数据" style={{ marginBottom: 16 }}>
              <pre style={{
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
                maxHeight: 200,
                overflow: 'auto',
                fontSize: 12,
              }}>
                {JSON.stringify(content.content_metadata, null, 2)}
              </pre>
            </Card>
          )}

          <Card title="操作提示">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="工作流提示"
                description={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>草稿 → 审核中 → 已批准 → 已发布</li>
                    <li>任何状态下都可以归档</li>
                    <li>已发布的内容无法编辑</li>
                  </ul>
                }
                type="info"
                showIcon
              />
              {canApprove && (
                <Alert
                  message="待审核"
                  description="此内容等待审核批准后才能发布"
                  type="warning"
                  showIcon
                />
              )}
              {canPublish && (
                <Alert
                  message="可以发布"
                  description="此内容已批准，可以发布到目标平台"
                  type="success"
                  showIcon
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
