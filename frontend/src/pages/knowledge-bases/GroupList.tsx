import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, ColorPicker, message, Popconfirm, Tag, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, BookOutlined, MoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { knowledgeBaseGroupsApi, KnowledgeBaseGroup } from '../../api/knowledge-bases';
import type { MenuProps } from 'antd';
import './GroupList.css';

export const GroupList: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<KnowledgeBaseGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<KnowledgeBaseGroup | null>(null);
  const [form] = Form.useForm();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const result = await knowledgeBaseGroupsApi.list({ search });
      setGroups(result.groups || []);
      setTotal(result.total);
    } catch (error) {
      message.error('获取分组列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [search]);

  const handleCreate = () => {
    setEditingGroup(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#1890ff',
      sort_order: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (group: KnowledgeBaseGroup) => {
    setEditingGroup(group);
    form.setFieldsValue({
      name: group.name,
      description: group.description,
      color: group.color,
      icon: group.icon,
      sort_order: group.sort_order,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeBaseGroupsApi.delete(id);
      message.success('删除成功');
      fetchGroups();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingGroup) {
        await knowledgeBaseGroupsApi.update(editingGroup.id, values);
        message.success('更新成功');
      } else {
        await knowledgeBaseGroupsApi.create(values);
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      fetchGroups();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '操作失败');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingGroup(null);
  };

  const handleViewBases = (group: KnowledgeBaseGroup) => {
    navigate(`/knowledge-bases/groups/${group.id}`);
  };

  const getActionMenu = (record: KnowledgeBaseGroup): MenuProps => ({
    items: [
      {
        key: 'view',
        label: '查看知识库',
        icon: <BookOutlined />,
        onClick: () => handleViewBases(record),
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(record),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      },
    ],
  });

  const columns = [
    {
      title: '分组名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KnowledgeBaseGroup) => (
        <Space>
          <FolderOutlined style={{ color: record.color }} />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: '知识库数量',
      dataIndex: 'base_count',
      key: 'base_count',
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: KnowledgeBaseGroup) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<BookOutlined />}
            onClick={() => handleViewBases(record)}
          >
            查看知识库
          </Button>
          <Dropdown menu={getActionMenu(record)} trigger={['click']}>
            <Button icon={<MoreOutlined />} size="small">
              更多
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="group-list">
      <div className="group-list-header">
        <h2>知识库管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          创建分组
        </Button>
      </div>

      <Card className="filter-card">
        <Input.Search
          placeholder="搜索分组名称"
          allowClear
          style={{ width: 300 }}
          onSearch={setSearch}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Table
        columns={columns}
        dataSource={groups}
        rowKey="id"
        loading={loading}
        pagination={{
          total,
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Modal
        title={editingGroup ? '编辑分组' : '创建分组'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="分组名称"
            name="name"
            rules={[{ required: true, message: '请输入分组名称' }]}
          >
            <Input placeholder="例如：产品文档、技术资料、市场分析" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="分组描述（可选）"
            />
          </Form.Item>

          <Form.Item
            label="主题颜色"
            name="color"
          >
            <Input type="color" style={{ width: 100 }} />
          </Form.Item>

          <Form.Item
            label="图标"
            name="icon"
          >
            <Input placeholder="图标名称（可选）" />
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort_order"
          >
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GroupList;
