import { Modal, Form, Input, Select, InputNumber } from 'antd';
import type { Topic, CreateTopicInput, UpdateTopicInput, TopicType, TopicPriority, TargetCustomer } from '../../api/topics';

interface TopicFormProps {
  visible: boolean;
  topic?: Topic;
  onSubmit: (values: CreateTopicInput | UpdateTopicInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const topicTypeOptions = [
  { label: '教程', value: 'tutorial' },
  { label: '问答', value: 'qa' },
  { label: '案例研究', value: 'case_study' },
  { label: '洞察', value: 'insight' },
  { label: '评论', value: 'review' },
  { label: '对比', value: 'comparison' },
];

const targetCustomerOptions = [
  { label: '初创者', value: 'startup' },
  { label: '有经验卖家', value: 'experienced' },
  { label: '团队卖家', value: 'team' },
  { label: '本地到全球', value: 'local' },
];

const priorityOptions = [
  { label: 'S - 最高优先级', value: 'S' },
  { label: 'A - 高优先级', value: 'A' },
  { label: 'B - 中优先级', value: 'B' },
  { label: 'C - 低优先级', value: 'C' },
];

export default function TopicForm({ visible, topic, onSubmit, onCancel, loading }: TopicFormProps) {
  const [form] = Form.useForm();

  const isEdit = !!topic;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      if (!isEdit) {
        form.resetFields();
      }
    } catch (error) {
      // Validation error or API error handled by caller
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={isEdit ? '编辑话题' : '添加话题'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          topic_type: 'tutorial',
          target_customer: 'startup',
          priority: 'B',
          estimated_effort: 1,
          description: '',
          ...topic,
        }}
      >
        <Form.Item
          label="话题标题"
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
          label="话题描述"
          name="description"
        >
          <Input.TextArea rows={4} placeholder="请输入话题描述" />
        </Form.Item>

        <Form.Item
          label="话题类型"
          name="topic_type"
          rules={[{ required: true, message: '请选择话题类型' }]}
        >
          <Select options={topicTypeOptions} placeholder="请选择话题类型" />
        </Form.Item>

        <Form.Item
          label="目标客户"
          name="target_customer"
          rules={[{ required: true, message: '请选择目标客户' }]}
        >
          <Select options={targetCustomerOptions} placeholder="请选择目标客户" />
        </Form.Item>

        <Form.Item
          label="优先级"
          name="priority"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select options={priorityOptions} placeholder="请选择优先级" />
        </Form.Item>

        <Form.Item
          label="预估工作量"
          name="estimated_effort"
          rules={[{ required: true, message: '请输入预估工作量' }]}
          tooltip="1-10，数字越大表示工作量越大"
        >
          <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="请输入预估工作量" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
