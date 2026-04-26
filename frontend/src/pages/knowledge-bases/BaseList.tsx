import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Card, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, FolderOutlined, ArrowLeftOutlined, MoreOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { knowledgeBasesApi, knowledgeBaseDocumentsApi, KnowledgeBase, KnowledgeBaseType, CreateKnowledgeBaseInput } from '../../api/knowledge-bases';
import { knowledgeBaseGroupsApi } from '../../api/knowledge-bases';
import type { MenuProps } from 'antd';
import './BaseList.css';

export const BaseList: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBase, setEditingBase] = useState<KnowledgeBase | null>(null);
  const [form] = Form.useForm();

  const fetchGroup = async () => {
    try {
      const groupData = await knowledgeBaseGroupsApi.getById(groupId);
      setGroup(groupData);
    } catch (error) {
      message.error('获取分组信息失败');
    }
  };

  const fetchBases = async () => {
    setLoading(true);
    try {
      const result = await knowledgeBasesApi.list({
        group_id: groupId,
        search,
      });
      setBases(result.bases || []);
      setTotal(result.total);
    } catch (error) {
      message.error('获取知识库列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchBases();
    }
  }, [groupId, search]);

  const handleCreate = () => {
    setEditingBase(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'manual',
      group_id: groupId,
    });
    setModalVisible(true);
  };

  const handleEdit = (base: KnowledgeBase) => {
    setEditingBase(base);
    form.setFieldsValue({
      name: base.name,
      description: base.description,
      type: base.type,
      tags: base.tags || [],
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeBasesApi.delete(id);
      message.success('删除成功');
      fetchBases();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingBase) {
        await knowledgeBasesApi.update(editingBase.id, values);
        message.success('更新成功');
      } else {
        const input: CreateKnowledgeBaseInput = {
          ...values,
          group_id: groupId,
        };
        await knowledgeBasesApi.create(input);
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      fetchBases();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '操作失败');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingBase(null);
  };

  const handleViewDocuments = (base: KnowledgeBase) => {
    navigate(`/knowledge-bases/bases/${base.id}/documents`);
  };

  const getActionMenu = (record: KnowledgeBase): MenuProps => ({
    items: [
      {
        key: 'documents',
        label: '查看文档',
        icon: <FileTextOutlined />,
        onClick: () => handleViewDocuments(record),
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(record),
      },
      record.is_active ? {
        key: 'deactivate',
        label: '停用',
        onClick: async () => {
          try {
            await knowledgeBasesApi.update(record.id, { is_active: false });
            message.success('已停用');
            fetchBases();
          } catch (error) {
            message.error('操作失败');
          }
        },
      } : null,
      record.is_active === false ? {
        key: 'activate',
        label: '启用',
        onClick: async () => {
          try {
            await knowledgeBasesApi.update(record.id, { is_active: true });
            message.success('已启用');
            fetchBases();
          } catch (error) {
            message.error('操作失败');
          }
        },
      } : null,
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      },
    ].filter(Boolean),
  });

  const typeMap: Record<KnowledgeBaseType, { text: string; color: string }> = {
    manual: { text: '手动创建', color: 'blue' },
    ai_generated: { text: 'AI生成', color: 'purple' },
    imported: { text: '导入', color: 'green' },
  };

  const columns = [
    {
      title: '知识库名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KnowledgeBase) => (
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: KnowledgeBaseType) => {
        const config = typeMap[type];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => {
        if (!tags || tags.length === 0) return '-';
        return (
          <Space size={4}>
            {tags.map(tag => (
              <Tag key={tag} color="geekblue">{tag}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '文档数量',
      dataIndex: 'document_count',
      key: 'document_count',
      width: 100,
      render: (count: number) => <Tag color="cyan">{count || 0}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: KnowledgeBase) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDocuments(record)}
          >
            查看文档
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
    <div className="base-list">
      <div className="base-list-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/knowledge-bases')}
          >
            返回
          </Button>
          <h2>
            {group?.name} <span style={{ fontSize: 14, color: '#999', marginLeft: 12 }}>知识库列表</span>
          </h2>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          创建知识库
        </Button>
      </div>

      <Card className="filter-card">
        <Space wrap>
          <Input.Search
            placeholder="搜索知识库名称"
            allowClear
            style={{ width: 300 }}
            onSearch={setSearch}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={bases}
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
        title={editingBase ? '编辑知识库' : '创建知识库'}
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
            label="知识库名称"
            name="name"
            rules={[{ required: true, message: '请输入知识库名称' }]}
          >
            <Input placeholder="例如：产品手册、技术文档、竞品分析" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="知识库描述（可选）"
            />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
          >
            <Select>
              <Select.Option value="manual">手动创建</Select.Option>
              <Select.Option value="ai_generated">AI生成</Select.Option>
              <Select.Option value="imported">导入</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            >
              <Select.Option value="技术">技术</Select.Option>
              <Select.Option value="产品">产品</Select.Option>
              <Select.Option value="市场">市场</Select.Option>
              <Select.Option value="竞品">竞品</Select.Option>
              <Select.Option value="文档">文档</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BaseList;
