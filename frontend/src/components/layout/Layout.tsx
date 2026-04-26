import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Dropdown,
  theme as antdTheme,
  Button,
  message,
  Switch,
} from 'antd';
import {
  DashboardOutlined,
  KeyOutlined,
  FileTextOutlined,
  FileAddOutlined,
  ThunderboltOutlined,
  SendOutlined,
  BarChartOutlined,
  PictureOutlined,
  SearchOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  BranchesOutlined,
  CheckSquareOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { MenuItem } from 'antd/es/menu/interface';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import type { User } from '../../api/auth';
import NotificationBell from '../notifications/NotificationBell';

const { Header, Sider, Content } = AntLayout;

const menuItems: MenuItem[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表板',
  },
  {
    key: '/keywords',
    icon: <KeyOutlined />,
    label: '关键词管理',
  },
  {
    key: '/topics',
    icon: <FileTextOutlined />,
    label: '话题管理',
  },
  {
    key: 'contents-group',
    icon: <FileAddOutlined />,
    label: '内容管理',
    children: [
      {
        key: '/contents',
        label: '内容列表',
      },
      {
        key: '/contents/generate',
        label: 'AI内容生成',
      },
      {
        key: '/drafts',
        label: '草稿审核',
      },
    ],
  },
  {
    key: 'workflows-group',
    icon: <BranchesOutlined />,
    label: '工作流自动化',
    children: [
      {
        key: '/workflows',
        label: '工作流管理',
      },
      {
        key: '/workflows/executions',
        label: '执行历史',
      },
    ],
  },
  {
    key: '/skills',
    icon: <ThunderboltOutlined />,
    label: '技能管理',
  },
  {
    key: '/knowledge-bases',
    icon: <BookOutlined />,
    label: '知识库',
  },
  {
    key: '/search',
    icon: <SearchOutlined />,
    label: 'Google搜索',
  },
  {
    key: '/publish',
    icon: <SendOutlined />,
    label: '发布中心',
  },
  {
    key: '/analytics',
    icon: <BarChartOutlined />,
    label: '数据分析',
  },
  {
    key: '/assets',
    icon: <PictureOutlined />,
    label: '素材库',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, theme, setTheme } = useUIStore();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = antdTheme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    try {
      await logout();
      message.success('已退出登录');
      navigate('/login');
    } catch (error) {
      message.error('退出登录失败');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: sidebarCollapsed ? 16 : 20,
            fontWeight: 'bold',
          }}
        >
          {sidebarCollapsed ? 'ASG' : 'ASG内容系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout style={{ marginLeft: sidebarCollapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={theme === 'light' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{ fontSize: '16px' }}
            />
            <NotificationBell />
            <span style={{ color: '#666' }}>
              {user?.username || '用户'}
            </span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                icon={<UserOutlined />}
                style={{ cursor: 'pointer', backgroundColor: '#1890ff' }}
              />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
