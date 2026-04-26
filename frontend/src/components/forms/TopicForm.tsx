import { Form, Input, Select, InputNumber, Button, Space, Modal } from 'antd';
import { TextArea } from 'antd';
import { TopicType, TopicPriority, TargetCustomer, Topic } from '@/api/topics';

export interface TopicFormValues {
  title: string;
  title_en?: string;
  description?: string;
  topic_type: TopicType;
  target_customer: TargetCustomer;
  priority?: TopicPriority;
  estimated_effort?: number;
}

interface TopicFormProps {
  initialValues?: Partial<TopicFormValues>;
  topic?: Topic;  // 支持直接传递 topic 对象
  visible?: boolean;
  onSubmit: (values: TopicFormValues) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const topicTypeOptions = [
  { label: '教程', value: 'tutorial' },
  { label: '问答', value: 'qa' },
  { label: '案例研究', value: 'case_study' },
  { label: '见解', value: 'insight' },
  { label: '评测', value: 'review' },
  { label: '对比', value: 'comparison' },
];

const targetCustomerOptions = [
  { label: '初创企业', value: 'startup' },
  { label: '有经验者', value: 'experienced' },
  { label: '团队', value: 'team' },
  { label: '本地商家', value: 'local' },
];

const priorityOptions = [
  { label: 'S级 (最高)', value: 'S' },
  { label: 'A级', value: 'A' },
  { label: 'B级', value: 'B' },
  { label: 'C级 (最低)', value: 'C' },
];

export const TopicForm: React.FC<TopicFormProps> = ({
  initialValues,
  topic,
  visible = false,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm<TopicFormValues>();

  // 如果传递了 topic 对象，将其作为初始值
  const combinedInitialValues = topic ? {
    title: topic.title,
    title_en: topic.title_en || '',
    description: topic.description || undefined,
    topic_type: topic.topic_type,
    target_customer: topic.target_customer,
    priority: topic.priority,
    estimated_effort: topic.estimated_effort,
  } : initialValues;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      // 表单验证失败
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  return (
    <Modal
      title={topic ? '编辑话题' : '创建话题'}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          topic_type: 'tutorial',
          target_customer: 'startup',
          priority: 'B',
          estimated_effort: 1,
          ...combinedInitialValues,
        }}
      >
        <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: '请输入话题标题' }]}
        >
          <Input placeholder="请输入话题标题" />
        </Form.Item>

        <Form.Item
          label="英文标题 (English Title)"
          name="title_en"
        >
          <Input placeholder="Please enter English title" />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
        >
          <TextArea rows={4} placeholder="请输入话题描述" />
        </Form.Item>

        <Form.Item
          label="类型"
          name="topic_type"
          rules={[{ required: true, message: '请选择类型' }]}
        >
          <Select options={topicTypeOptions} placeholder="请选择类型" />
        </Form.Item>

        <Form.Item
          label="目标客户"
          name="target_customer"
          rules={[{ required: true, message: '请选择目标客户' }]}
        >
          <Select options={targetCustomerOptions} placeholder="请选择目标客户" />
        </Form.Item>

        <Form.Item label="优先级" name="priority">
          <Select options={priorityOptions} placeholder="请选择优先级" />
        </Form.Item>

        <Form.Item
          label="预计工作量"
          name="estimated_effort"
          rules={[{ required: true, message: '请输入预计工作量' }]}
        >
          <InputNumber min={1} max={100} placeholder="预计工作量（小时）" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              提交
            </Button>
            <Button onClick={handleCancel} disabled={loading}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TopicForm;
