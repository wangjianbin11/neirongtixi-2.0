import { Modal, Form, Input, Select, InputNumber } from 'antd';
import type { Keyword, CreateKeywordInput, UpdateKeywordInput, KeywordCategory, KeywordCompetition, KeywordIntent, KeywordPriority, TargetCustomer, KeywordScene } from '../../api/keywords';
import { KEYWORD_SCENES_OPTIONS } from '../../api/keywords';

interface KeywordFormProps {
  visible: boolean;
  keyword?: Keyword;
  onSubmit: (values: CreateKeywordInput | UpdateKeywordInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const categoryOptions = [
  { label: '核心词', value: 'core' },
  { label: '长尾词', value: 'long_tail' },
  { label: '问题词', value: 'question' },
  { label: '指南词', value: 'guide' },
  { label: '对比词', value: 'comparison' },
];

const competitionOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
];

const intentOptions = [
  { label: '信息型', value: 'informational' },
  { label: '商业型', value: 'commercial' },
  { label: '交易型', value: 'transactional' },
  { label: '导航型', value: 'navigational' },
];

const priorityOptions = [
  { label: 'S - 最高优先级', value: 'S' },
  { label: 'A - 高优先级', value: 'A' },
  { label: 'B - 中优先级', value: 'B' },
  { label: 'C - 低优先级', value: 'C' },
];

const targetCustomerOptions = [
  { label: 'C1 - 创业者', value: 'C1-Entrepreneur' },
  { label: 'C2 - 有经验卖家', value: 'C2-Experienced' },
  { label: 'C3 - 团队卖家', value: 'C3-TeamSeller' },
  { label: 'C4 - 本地到全球', value: 'C4-LocalToGlobal' },
];

const sceneOptions = KEYWORD_SCENES_OPTIONS;

export default function KeywordForm({ visible, keyword, onSubmit, onCancel, loading }: KeywordFormProps) {
  const [form] = Form.useForm();

  const isEdit = !!keyword;

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
      title={isEdit ? '编辑关键词' : '添加关键词'}
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
          category: 'core',
          search_volume: 0,
          competition: 'medium',
          intent: 'informational',
          priority: 'B',
          target_customer: undefined,
          ...keyword,
        }}
      >
        <Form.Item
          label="关键词"
          name="keyword"
          rules={[{ required: true, message: '请输入关键词' }]}
        >
          <Input placeholder="请输入关键词" />
        </Form.Item>

        <Form.Item
          label="分类"
          name="category"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select options={categoryOptions} placeholder="请选择分类" />
        </Form.Item>

        <Form.Item
          label="搜索量"
          name="search_volume"
          rules={[{ required: true, message: '请输入搜索量' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入搜索量" />
        </Form.Item>

        <Form.Item
          label="竞争度"
          name="competition"
          rules={[{ required: true, message: '请选择竞争度' }]}
        >
          <Select options={competitionOptions} placeholder="请选择竞争度" />
        </Form.Item>

        <Form.Item
          label="搜索意图"
          name="intent"
          rules={[{ required: true, message: '请选择搜索意图' }]}
        >
          <Select options={intentOptions} placeholder="请选择搜索意图" />
        </Form.Item>

        <Form.Item
          label="优先级"
          name="priority"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select options={priorityOptions} placeholder="请选择优先级" />
        </Form.Item>

        <Form.Item
          label="目标客户"
          name="target_customer"
        >
          <Select
            options={targetCustomerOptions}
            placeholder="请选择目标客户"
            allowClear
          />
        </Form.Item>

        <Form.Item
          label="场景分类"
          name="scenes"
        >
          <Select
            mode="multiple"
            options={sceneOptions}
            placeholder="选择适用场景"
            allowClear
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
