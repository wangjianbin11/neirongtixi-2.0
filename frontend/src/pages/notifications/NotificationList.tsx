import { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Tag,
  Typography,
  Empty,
  Switch,
  message,
  Popconfirm,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, Notification } from '../../api/notifications';

const { Title, Text } = Typography;

export default function NotificationListPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const navigate = useNavigate();

  // 获取通知列表
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.list({
        page: 1,
        pageSize: 100,
        unreadOnly,
      });
      setNotifications(result.notifications);
    } catch (error) {
      message.error('获取通知列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  // 标记为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      message.error('标记失败');
    }
  };

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      );
      message.success('已全部标记为已读');
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 删除所有通知
  const handleDeleteAll = async () => {
    try {
      await notificationsApi.deleteAll();
      setNotifications([]);
      message.success('已清空所有通知');
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 点击通知
  const handleClick = (notification: Notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      content_created: '📝',
      content_approved: '✅',
      content_published: '🚀',
      content_rejected: '❌',
      publish_success: '🎉',
      publish_failed: '⚠️',
      system: '🔔',
    };
    return iconMap[type] || '🔔';
  };

  // 获取通知类型标签
  const getNotificationTag = (type: string) => {
    const tagMap: Record<string, { color: string; label: string }> = {
      content_created: { color: 'blue', label: '内容创建' },
      content_approved: { color: 'success', label: '审核通过' },
      content_published: { color: 'success', label: '发布成功' },
      content_rejected: { color: 'error', label: '审核拒绝' },
      publish_success: { color: 'success', label: '发布成功' },
      publish_failed: { color: 'warning', label: '发布失败' },
      system: { color: 'default', label: '系统通知' },
    };
    const info = tagMap[type] || { color: 'default', label: '通知' };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>
          <BellOutlined style={{ marginRight: 8 }} />
          通知中心
        </Title>
        <Space>
          <Space>
            <Text>只显示未读</Text>
            <Switch checked={unreadOnly} onChange={setUnreadOnly} />
          </Space>
          <Button icon={<FilterOutlined />}>筛选</Button>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            全部已读
          </Button>
        </Space>
      </div>

      {notifications.length > 0 && (
        <Card
          extra={
            <Popconfirm
              title="确定要删除所有通知吗?"
              onConfirm={handleDeleteAll}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                清空全部
              </Button>
            </Popconfirm>
          }
          style={{ marginBottom: 16 }}
        >
          <Text>
            共 {notifications.length} 条通知，其中 {unreadCount} 条未读
          </Text>
        </Card>
      )}

      <Card loading={loading}>
        {notifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  padding: '16px',
                  backgroundColor: notification.read_at ? 'transparent' : '#f0f8ff',
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: notification.link ? 'pointer' : 'default',
                  transition: 'background-color 0.3s',
                }}
                onMouseEnter={(e) => {
                  if (!notification.read_at) {
                    e.currentTarget.style.backgroundColor = '#e6f3ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!notification.read_at) {
                    e.currentTarget.style.backgroundColor = '#f0f8ff';
                  }
                }}
                onClick={() => handleClick(notification)}
                actions={[
                  !notification.read_at && (
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      标记已读
                    </Button>
                  ),
                  <Popconfirm
                    title="确定要删除这条通知吗?"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      删除
                    </Button>
                  </Popconfirm>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ fontSize: 32 }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  }
                  title={
                    <Space>
                      <span>{notification.title}</span>
                      {!notification.read_at && <Tag color="processing">未读</Tag>}
                      {getNotificationTag(notification.type)}
                    </Space>
                  }
                  description={
                    <div>
                      <Text>{notification.message}</Text>
                      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                        {new Date(notification.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
