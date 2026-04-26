import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  message,
  Spin,
  Typography,
  Row,
  Col,
  Tag,
  Divider,
  Alert,
} from 'antd';
import {
  ThunderboltOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { topicsApi, Topic } from '../../api/topics';
import { contentsApi, ContentType, ContentStatus } from '../../api/contents';
import { useAuthStore } from '../../stores/authStore';

const { Title, Paragraph, Text } = Typography;

const contentTypeOptions = [
  { label: '文章', value: 'article' },
  { label: '视频脚本', value: 'video_script' },
  { label: '社媒帖子', value: 'social_post' },
  { label: '论坛回答', value: 'forum_answer' },
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

const targetCustomerOptions = [
  { label: '初创者', value: 'startup' },
  { label: '有经验卖家', value: 'experienced' },
  { label: '团队卖家', value: 'team' },
  { label: '本地到全球', value: 'local' },
];

export default function ContentGeneratePage() {
  const { user } = useAuthStore();
  const [form] = Form.useForm();

  // Data state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    try {
      const result = await topicsApi.list({
        pageSize: 100,
        status: 'approved',
      });
      setTopics(result.topics);
    } catch (error) {
      message.error('获取话题列表失败');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Handle topic change
  const handleTopicChange = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    setSelectedTopic(topic || null);
  };

  // Handle generate
  const handleGenerate = async (values: any) => {
    if (!selectedTopic) {
      message.warning('请选择话题');
      return;
    }

    setGenerating(true);
    setGeneratedContent('');

    try {
      const content = await contentsApi.generate({
        topic_id: selectedTopic.id,
        topic_title: selectedTopic.title,
        topic_description: selectedTopic.description || null,
        content_type: values.content_type,
        platform: values.platform,
        target_customer: values.target_customer,
      });

      setGeneratedContent(content.content_text || '');
      message.success('内容生成成功');
    } catch (error) {
      message.error('内容生成失败：' + (error as any).message);
    } finally {
      setGenerating(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    const values = form.getFieldsValue();

    if (!generatedContent) {
      message.warning('请先生成内容');
      return;
    }

    setSaving(true);
    try {
      await contentsApi.create({
        topic_id: selectedTopic?.id || null,
        title: selectedTopic?.title || '未命名内容',
        content_type: values.content_type,
        platform: values.platform,
        status: 'draft',
        content_text: generatedContent,
        generated_by_skill: 'ai-service',
      });

      message.success('内容已保存到草稿箱');
      setGeneratedContent('');
      form.resetFields();
      setSelectedTopic(null);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle regenerate
  const handleRegenerate = () => {
    form.submit();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <ThunderboltOutlined style={{ marginRight: 8 }} />
        AI内容生成
      </Title>
      <Paragraph type="secondary">
        选择话题，AI将自动为您生成适合不同平台的内容
      </Paragraph>

      <Row gutter={24}>
        {/* Left column - Form */}
        <Col span={10}>
          <Card title="生成配置" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGenerate}
              initialValues={{
                content_type: 'article',
                platform: 'blog',
                target_customer: 'startup',
              }}
            >
              <Form.Item
                label="选择话题"
                name="topic_id"
                rules={[{ required: true, message: '请选择话题' }]}
              >
                <Select
                  placeholder="请选择话题"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleTopicChange}
                  options={topics.map(t => ({
                    label: t.title,
                    value: t.id,
                  }))}
                />
              </Form.Item>

              {selectedTopic && (
                <Alert
                  message="话题信息"
                  description={
                    <div>
                      <p><strong>类型：</strong>{selectedTopic.topic_type}</p>
                      <p><strong>目标客户：</strong>{selectedTopic.target_customer}</p>
                      <p><strong>优先级：</strong>{selectedTopic.priority}</p>
                      {selectedTopic.description && (
                        <p><strong>描述：</strong>{selectedTopic.description}</p>
                      )}
                    </div>
                  }
                  type="info"
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item
                label="内容类型"
                name="content_type"
                rules={[{ required: true, message: '请选择内容类型' }]}
              >
                <Select options={contentTypeOptions} />
              </Form.Item>

              <Form.Item
                label="发布平台"
                name="platform"
                rules={[{ required: true, message: '请选择发布平台' }]}
              >
                <Select options={platformOptions} />
              </Form.Item>

              <Form.Item
                label="目标客户"
                name="target_customer"
                rules={[{ required: true, message: '请选择目标客户' }]}
              >
                <Select options={targetCustomerOptions} />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    htmlType="submit"
                    loading={generating}
                    size="large"
                  >
                    {generating ? '生成中...' : '生成内容'}
                  </Button>
                  {generatedContent && (
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleRegenerate}
                      disabled={generating}
                    >
                      重新生成
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right column - Generated content */}
        <Col span={14}>
          <Card
            title="生成结果"
            extra={
              generatedContent && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                >
                  保存到草稿箱
                </Button>
              )
            }
            bordered={false}
          >
            {generating && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#999' }}>
                  AI正在为您创作内容...
                </div>
              </div>
            )}

            {!generating && !generatedContent && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                <p>请选择话题并点击"生成内容"按钮</p>
                <p>AI将根据您的要求自动创作内容</p>
              </div>
            )}

            {!generating && generatedContent && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Tag color="green"><CheckOutlined /> 生成完成</Tag>
                  <Tag color="blue">AI生成</Tag>
                </div>
                <div
                  style={{
                    padding: 16,
                    background: '#fafafa',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                    minHeight: 400,
                    maxHeight: 600,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.8,
                  }}
                >
                  {generatedContent}
                </div>
                <Divider />
                <Space>
                  <Text type="secondary">字数：{generatedContent.length}</Text>
                  <Text type="secondary">创作者：AI助手</Text>
                  <Text type="secondary">时间：{new Date().toLocaleString('zh-CN')}</Text>
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
