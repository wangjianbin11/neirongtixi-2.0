import { Form, Input, Select, InputNumber, Button, Space } from 'antd';
import { KeywordPriority, KeywordCompetition, KeywordIntent, KeywordCategory, TargetCustomer, KeywordScene, KEYWORD_SCENES_OPTIONS } from '@/api/keywords';

export interface KeywordFormValues {
  keyword: string;
  category: KeywordCategory;
  search_volume?: number;
  competition?: KeywordCompetition;
  intent?: KeywordIntent;
  priority?: KeywordPriority;
  target_customer?: TargetCustomer;
  scenes?: KeywordScene[];
}

interface KeywordFormProps {
  initialValues?: Partial<KeywordFormValues>;
  onSubmit: (values: KeywordFormValues) => void;
  onCancel?: () => void;
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
  { label: '信息性', value: 'informational' },
  { label: '商业性', value: 'commercial' },
  { label: '交易性', value: 'transactional' },
  { label: '导航性', value: 'navigational' },
];

const priorityOptions = [
  { label: 'S级 (最高)', value: 'S' },
  { label: 'A级', value: 'A' },
  { label: 'B级', value: 'B' },
  { label: 'C级 (最低)', value: 'C' },
];

const targetCustomerOptions = [
  { label: 'C1-创业者', value: 'C1-Entrepreneur' },
  { label: 'C2-有经验者', value: 'C2-Experienced' },
  { label: 'C3-团队销售', value: 'C3-TeamSeller' },
  { label: 'C4-本地到全球', value: 'C4-LocalToGlobal' },
];

const sceneOptions = KEYWORD_SCENES_OPTIONS;

export const KeywordForm: React.FC<KeywordFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm<KeywordFormValues>();

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
        category: 'core',
        search_volume: 0,
        competition: 'medium',
        intent: 'informational',
        priority: 'B',
        ...initialValues,
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

      <Form.Item label="搜索量" name="search_volume">
        <InputNumber min={0} placeholder="搜索量" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item label="竞争度" name="competition">
        <Select options={competitionOptions} placeholder="请选择竞争度" />
      </Form.Item>

      <Form.Item label="搜索意图" name="intent">
        <Select options={intentOptions} placeholder="请选择搜索意图" />
      </Form.Item>

      <Form.Item label="优先级" name="priority">
        <Select options={priorityOptions} placeholder="请选择优先级" />
      </Form.Item>

      <Form.Item label="目标客户" name="target_customer">
        <Select
          options={targetCustomerOptions}
          placeholder="请选择目标客户"
          allowClear
        />
      </Form.Item>

      <Form.Item label="场景分类" name="scenes">
        <Select
          mode="multiple"
          options={sceneOptions}
          placeholder="选择适用场景"
          allowClear
        />
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

export default KeywordForm;
