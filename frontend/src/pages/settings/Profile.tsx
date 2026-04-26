import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Row,
  Col,
  Avatar,
  Descriptions,
  Divider,
  Tabs,
  List,
  Tag,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { usersApi, type User } from '../../api/users';
import { authApi } from '../../api/auth';

const { TabPane } = Tabs;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email || '',
        phone: user.phone || '',
        full_name: user.full_name || '',
      });
    }
  }, [user]);

  // 更新个人资料
  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      await usersApi.updateProfile(values);
      // 刷新用户信息
      const { user: updatedUser } = await usersApi.getMe();
      // 更新authStore中的用户信息
      const { setUser } = useAuthStore.getState();
      setUser(updatedUser);
      message.success('个人资料更新成功');
      setEditing(false);
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: any) => {
    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Row gutter={24}>
        {/* 左侧 - 用户信息卡片 */}
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
              <h2>{user.full_name || user.username}</h2>
              <p style={{ color: '#666' }}>{user.email}</p>
              <Divider />
              <Descriptions column={1} size="small">
                <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
                <Descriptions.Item label="角色">{user.role || '用户'}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color="success">活跃</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {new Date(user.created_at).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Card>

          <Card title="快速操作" style={{ marginTop: 16 }}>
            <List
              size="small"
              dataSource={[
                { title: '查看我的内容', description: '浏览我创建的所有内容' },
                { title: '查看发布记录', description: '查看内容发布历史' },
                { title: '技能执行记录', description: '查看AI技能执行历史' },
              ]}
              renderItem={(item) => (
                <List.Item style={{ cursor: 'pointer' }}>
                  <List.Item.Meta title={item.title} description={item.description} />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧 - 详细信息 */}
        <Col span={16}>
          <Card
            title="个人资料"
            extra={
              !editing && (
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                >
                  编辑
                </Button>
              )
            }
          >
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input disabled prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="姓名"
                    name="full_name"
                  >
                    <Input disabled={!editing} placeholder="请输入姓名" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input disabled={!editing} prefix={<MailOutlined />} placeholder="请输入邮箱" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="手机号"
                    name="phone"
                  >
                    <Input disabled={!editing} prefix={<PhoneOutlined />} placeholder="请输入手机号" />
                  </Form.Item>
                </Col>
              </Row>

              {editing && (
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                  >
                    保存修改
                  </Button>
                  <Button
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      setEditing(false);
                      profileForm.resetFields();
                    }}
                  >
                    取消
                  </Button>
                </Form.Item>
              )}
            </Form>
          </Card>

          <Card title="修改密码" style={{ marginTop: 16 }}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleChangePassword}
            >
              <Form.Item
                label="当前密码"
                name="currentPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
              </Form.Item>

              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度至少6位' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码（至少6位）" />
              </Form.Item>

              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={passwordLoading}
                >
                  修改密码
                </Button>
                <Button
                  style={{ marginLeft: 8 }}
                  onClick={() => passwordForm.resetFields()}
                >
                  重置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
