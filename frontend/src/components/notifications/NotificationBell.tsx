import { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Button, Empty, Spin, Tag, Typography, message } from 'antd';
import { BellOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { notificationsApi, Notification } from '../../api/notifications';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';

const { Text } = Typography;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 获取未读数量
  const fetchUnreadCount = async () => {
    try {
      const result = await notificationsApi.getUnreadCount();
      setUnreadCount(result?.count ?? 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      setUnreadCount(0);
    }
  };

  // 获取通知列表
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.list({
        page: 1,
        pageSize: 10,
        unreadOnly: false,
      });
      setNotifications(result.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket 实时通知
  useWebSocket({
    onNotification: (notification) => {
      // 新通知到达时
      setNotifications(prev => [notification as Notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      message.info(`${notification.title}: ${notification.message}`);
    },
    onSystemMessage: (msg) => {
      if (msg.type === 'error') {
        message.error(msg.message);
      } else if (msg.type === 'warning') {
        message.warning(msg.message);
      } else if (msg.type === 'success') {
        message.success(msg.message);
      } else {
        message.info(msg.message);
      }
    },
  });

  // 初始化
  useEffect(() => {
    fetchUnreadCount();
    // 每30秒刷新一次未读数
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // 打开下拉框时刷新
  const handleOpenChange = (visible: boolean) => {
    setOpen(visible);
    if (visible) {
      fetchNotifications();
    }
  };

  // 标记为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 点击通知
  const handleClick = (notification: Notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
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

  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <Text strong>通知</Text>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={handleMarkAllAsRead}
            >
              全部已读
            </Button>
          )}
        </div>
      ),
    },
    {
      type: 'divider',
    },
    ...(loading
      ? [{
          key: 'loading',
          label: (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin />
            </div>
          ),
        }]
      : notifications.length === 0
      ? [{
          key: 'empty',
          label: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无通知"
              style={{ padding: '20px 0' }}
            />
          ),
        }]
      : notifications.map(notification => ({
          key: notification.id,
          label: (
            <List.Item
              style={{
                padding: '8px 0',
                backgroundColor: notification.read_at ? 'transparent' : '#f0f8ff',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onClick={() => handleClick(notification)}
            >
              <List.Item.Meta
                avatar={getNotificationIcon(notification.type)}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{notification.title}</span>
                    {!notification.read_at && <Badge status="processing" />}
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{notification.message}</Text>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getNotificationTag(notification.type)}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(notification.created_at).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  </div>
                }
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification.id);
                }}
              />
            </List.Item>
          ),
        }))),
    {
      type: 'divider',
    },
    {
      key: 'footer',
      label: (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <Button
            type="link"
            size="small"
            onClick={() => {
              navigate('/notifications');
              setOpen(false);
            }}
          >
            查看全部通知
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
    >
      <Badge count={unreadCount} overflowCount={99}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ color: '#666' }}
        />
      </Badge>
    </Dropdown>
  );
}
