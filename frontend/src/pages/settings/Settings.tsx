import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  message,
  Tabs,
  Space,
  Divider,
  Select,
  InputNumber,
  Row,
  Col,
  Typography,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  BellOutlined,
  SecurityScanOutlined,
  ApiOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { settingsApi } from '../../api/settings';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 通用设置
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'ASG内容系统',
    siteUrl: 'https://example.com',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
  });

  // 通知设置
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    contentPublished: true,
    publishFailed: true,
    systemUpdates: true,
  });

  // AI设置
  const [aiSettings, setAiSettings] = useState({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 3000,
    temperature: 0.7,
    apiKey: '',
  });

  // 发布设置
  const [publishSettings, setPublishSettings] = useState({
    autoPublish: false,
    retryAttempts: 3,
    retryDelay: 5,
    queuePaused: false,
  });

  // 加载设置数据
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [general, notif, ai, publish] = await Promise.all([
          settingsApi.getGeneral(),
          settingsApi.getNotifications(),
          settingsApi.getAI(),
          settingsApi.getPublish(),
        ]);
        setGeneralSettings(general);
        setNotificationSettings(notif);
        setAiSettings(ai);
        setPublishSettings(publish);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSaveGeneral = async (values: any) => {
    setLoading(true);
    try {
      const result = await settingsApi.updateGeneral(values);
      setGeneralSettings(result.settings);
      message.success('通用设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async (values: any) => {
    setLoading(true);
    try {
      const result = await settingsApi.updateNotifications(values);
      setNotificationSettings(result.settings);
      message.success('通知设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAI = async (values: any) => {
    setLoading(true);
    try {
      const result = await settingsApi.updateAI(values);
      setAiSettings(result.settings);
      message.success('AI设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePublish = async (values: any) => {
    setLoading(true);
    try {
      const result = await settingsApi.updatePublish(values);
      setPublishSettings(result.settings);
      message.success('发布设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (type: 'ai' | 'database' | 'redis') => {
    try {
      const result = await settingsApi.testConnection(type);
      if (result.success) {
        message.success(result.data.message);
      } else {
        message.error(result.data.message);
      }
    } catch (error) {
      message.error('连接失败');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <SettingOutlined style={{ marginRight: 8 }} />
        系统设置
      </Title>

      <Tabs defaultActiveKey="general">
        {/* 通用设置 */}
        <TabPane tab={<span><SettingOutlined /> 通用设置</span>} key="general">
          <Card>
            <Form
              layout="vertical"
              initialValues={generalSettings}
              onFinish={handleSaveGeneral}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="站点名称"
                    name="siteName"
                    rules={[{ required: true, message: '请输入站点名称' }]}
                  >
                    <Input placeholder="请输入站点名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="站点URL"
                    name="siteUrl"
                    rules={[{ required: true, message: '请输入站点URL' }]}
                  >
                    <Input placeholder="https://example.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="语言"
                    name="language"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Select.Option value="zh-CN">简体中文</Select.Option>
                      <Select.Option value="en-US">English</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="时区"
                    name="timezone"
                    rules={[{ required: true }]}
                  >
                    <Select showSearch>
                      <Select.Option value="Asia/Shanghai">中国标准时间 (UTC+8)</Select.Option>
                      <Select.Option value="America/New_York">美东时间 (UTC-5)</Select.Option>
                      <Select.Option value="Europe/London">格林威治时间 (UTC+0)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* 通知设置 */}
        <TabPane tab={<span><BellOutlined /> 通知设置</span>} key="notifications">
          <Card>
            <Alert
              message="通知配置"
              description="配置系统通知的发送方式和触发条件"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form
              layout="vertical"
              initialValues={notificationSettings}
              onFinish={handleSaveNotifications}
            >
              <Title level={5}>通知方式</Title>
              <Form.Item name="emailEnabled" valuePropName="checked">
                <Switch checkedChildren="邮件通知" />
              </Form.Item>
              <Form.Item name="pushEnabled" valuePropName="checked">
                <Switch checkedChildren="站内通知" />
              </Form.Item>
              <Form.Item name="smsEnabled" valuePropName="checked">
                <Switch checkedChildren="短信通知" />
              </Form.Item>

              <Divider />

              <Title level={5}>通知类型</Title>
              <Form.Item name="contentPublished" valuePropName="checked">
                <Switch checkedChildren="内容发布成功" />
              </Form.Item>
              <Form.Item name="publishFailed" valuePropName="checked">
                <Switch checkedChildren="内容发布失败" />
              </Form.Item>
              <Form.Item name="systemUpdates" valuePropName="checked">
                <Switch checkedChildren="系统更新通知" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* AI设置 */}
        <TabPane tab={<span><SecurityScanOutlined /> AI设置</span>} key="ai">
          <Card>
            <Alert
              message="AI服务配置"
              description="配置用于内容生成和技能执行的AI服务参数"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form
              layout="vertical"
              initialValues={aiSettings}
              onFinish={handleSaveAI}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="AI服务提供商"
                    name="provider"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Select.Option value="anthropic">Anthropic (Claude)</Select.Option>
                      <Select.Option value="openai">OpenAI (GPT)</Select.Option>
                      <Select.Option value="azure">Azure OpenAI</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="模型"
                    name="model"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Select.Option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</Select.Option>
                      <Select.Option value="claude-3-opus-20240229">Claude 3 Opus</Select.Option>
                      <Select.Option value="gpt-4">GPT-4</Select.Option>
                      <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="最大Token数"
                    name="maxTokens"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={100} max={100000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="温度参数"
                    name="temperature"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="API密钥"
                name="apiKey"
              >
                <Input.Password placeholder="请输入API密钥（留空则使用系统默认）" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    保存设置
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={() => handleTestConnection('ai')}>
                    测试连接
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* 发布设置 */}
        <TabPane tab={<span><ApiOutlined /> 发布设置</span>} key="publish">
          <Card>
            <Form
              layout="vertical"
              initialValues={publishSettings}
              onFinish={handleSavePublish}
            >
              <Title level={5}>自动化设置</Title>
              <Form.Item
                name="autoPublish"
                valuePropName="checked"
                tooltip="内容审核通过后自动发布到指定平台"
              >
                <Switch checkedChildren="自动发布已审核内容" />
              </Form.Item>

              <Divider />

              <Title level={5}>重试设置</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="重试次数"
                    name="retryAttempts"
                  >
                    <InputNumber min={0} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="重试间隔（分钟）"
                    name="retryDelay"
                  >
                    <InputNumber min={1} max={60} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="queuePaused"
                valuePropName="checked"
                tooltip="暂停发布队列将停止所有自动发布任务"
              >
                <Switch checkedChildren="暂停发布队列" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        {/* 数据库设置 */}
        <TabPane tab={<span><DatabaseOutlined /> 数据库</span>} key="database">
          <Card>
            <Alert
              message="数据库连接配置"
              description="管理系统数据库连接，修改后需重启服务生效"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form layout="vertical">
              <Form.Item label="MySQL连接">
                <Input.Password value="mysql://localhost:3306/asgbook" disabled />
              </Form.Item>
              <Form.Item label="Redis连接">
                <Input.Password value="redis://localhost:6379" disabled />
              </Form.Item>

              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => handleTestConnection('database')}>
                  测试MySQL连接
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => handleTestConnection('redis')}>
                  测试Redis连接
                </Button>
              </Space>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
