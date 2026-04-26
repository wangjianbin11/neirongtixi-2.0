import { Form, Input, Select, Button, Space } from 'antd';
import { TextArea } from 'antd';
import { ContentType, ContentStatus } from '@/api/contents';

export interface ContentFormValues {
  title: string;
  content_type: ContentType;
  platform: string;
  status?: ContentStatus;
  content_text?: string;
  topic_id?: string;
}

interface ContentFormProps {
  initialValues?: Partial<ContentFormValues>;
  onSubmit: (values: ContentFormValues) => void;
  onCancel?: () => void;
  loading?: boolean;
  topicId?: string;
}

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
  { label: '微信公众号', value: 'wechat' },
  { label: '知乎', value: 'zhihu' },
  { label: '小红书', value: 'xiaohongshu' },
  { label: '抖音', value: 'douyin' },
  { label: 'B站', value: 'bilibili' },
  { label: '今日头条', value: 'toutiao' },
  { label: '官网', value: 'website' },
  { label: '其他', value: 'other' },
];

export const ContentForm: React.FC<ContentFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  topicId,
}) => {
  const [form] = Form.useForm<ContentFormValues>();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      // 表单验证失败
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        content_type: 'article',
        platform: 'wechat',
        status: 'draft',
        topic_id: topicId,
        ...initialValues,
      }}
    >
      <Form.Item
        label="标题"
        name="title"
        rules={[{ required: true, message: '请输入内容标题' }]}
      >
        <Input placeholder="请输入内容标题" />
      </Form.Item>

      <Form.Item
        label="内容类型"
        name="content_type"
        rules={[{ required: true, message: '请选择内容类型' }]}
      >
        <Select options={contentTypeOptions} placeholder="请选择内容类型" />
      </Form.Item>

      <Form.Item
        label="发布平台"
        name="platform"
        rules={[{ required: true, message: '请选择发布平台' }]}
      >
        <Select options={platformOptions} placeholder="请选择发布平台" />
      </Form.Item>

      <Form.Item label="状态" name="status">
        <Select options={statusOptions} placeholder="请选择状态" />
      </Form.Item>

      <Form.Item label="内容正文" name="content_text">
        <TextArea rows={12} placeholder="请输入内容正文" />
      </Form.Item>

      <Form.Item hidden name="topic_id">
        <Input />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            提交
          </Button>
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              取消
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ContentForm;
