import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Card, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Dropdown, Upload } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  FileTextOutlined,
  LinkOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  PictureOutlined,
  FolderOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { knowledgeBasesApi, knowledgeBaseDocumentsApi, KnowledgeBase, KnowledgeBaseDocument, DocumentSourceType, DocumentStatus } from '../../api/knowledge-bases';
import type { MenuProps } from 'antd';
import './DocumentList.css';

const sourceTypeConfig: Record<DocumentSourceType, { icon: React.ReactNode; text: string; color: string }> = {
  url: { icon: <LinkOutlined />, text: 'URL链接', color: 'blue' },
  pdf: { icon: <FilePdfOutlined />, text: 'PDF', color: 'red' },
  word: { icon: <FileWordOutlined />, text: 'Word', color: 'blue' },
  excel: { icon: <FileExcelOutlined />, text: 'Excel', color: 'green' },
  markdown: { icon: <FileMarkdownOutlined />, text: 'Markdown', color: 'purple' },
  image: { icon: <PictureOutlined />, text: '图片', color: 'orange' },
  text: { icon: <FileTextOutlined />, text: '文本', color: 'default' },
};

const statusConfig: Record<DocumentStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  active: { text: '已发布', color: 'success' },
  archived: { text: '已归档', color: 'warning' },
};

export const DocumentList: React.FC = () => {
  const { id: baseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState<KnowledgeBase | null>(null);
  const [search, setSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<DocumentSourceType | undefined>();
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeBaseDocument | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<DocumentSourceType>('text');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const fetchBase = async () => {
    try {
      const baseData = await knowledgeBasesApi.getById(baseId);
      setBase(baseData);
    } catch (error) {
      message.error('获取知识库信息失败');
    }
  };

  const fetchDocuments = async () => {
    if (!baseId) return;
    setLoading(true);
    try {
      const result = await knowledgeBaseDocumentsApi.listByKnowledgeBase(baseId, {
        page,
        pageSize,
        source_type: sourceTypeFilter,
        status: statusFilter,
        search,
      });
      setDocuments(result.documents || []);
      setTotal(result.total);
    } catch (error) {
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (baseId) {
      fetchBase();
      fetchDocuments();
    }
  }, [baseId, page, pageSize, sourceTypeFilter, statusFilter, search]);

  const handleCreate = () => {
    setEditingDoc(null);
    setSelectedSourceType('text');
    setUploadedFile(null);
    form.resetFields();
    form.setFieldsValue({
      source_type: 'text',
      knowledge_base_id: baseId,
    });
    setModalVisible(true);
  };

  const handleEdit = (doc: KnowledgeBaseDocument) => {
    setEditingDoc(doc);
    form.setFieldsValue({
      title: doc.title,
      content: doc.content,
      status: doc.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeBaseDocumentsApi.delete(id);
      message.success('删除成功');
      fetchDocuments();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '删除失败');
    }
  };

  const handleModalOk = async () => {
    if (editingDoc) {
      // 编辑模式 - 使用原有逻辑
      try {
        const values = await form.validateFields();
        await knowledgeBaseDocumentsApi.update(editingDoc.id, values);
        message.success('更新成功');
        setModalVisible(false);
        form.resetFields();
        fetchDocuments();
      } catch (error: any) {
        message.error(error.response?.data?.error?.message || '操作失败');
      }
      return;
    }

    // 创建模式 - 根据source_type处理
    try {
      setImporting(true);
      const values = await form.validateFields();

      switch (selectedSourceType) {
        case 'url':
          // URL导入
          await knowledgeBaseDocumentsApi.importFromUrl(baseId!, values.source_url, values.title);
          message.success('URL导入成功');
          break;

        case 'text':
          // 纯文本
          await knowledgeBaseDocumentsApi.create({
            knowledge_base_id: baseId!,
            title: values.title,
            content: values.content,
            source_type: 'text',
          });
          message.success('创建成功');
          break;

        case 'pdf':
        case 'word':
        case 'excel':
        case 'markdown':
        case 'image':
          // 文件导入
          if (!uploadedFile) {
            message.error('请选择文件');
            return;
          }
          await knowledgeBaseDocumentsApi.importFromFile(
            baseId!,
            uploadedFile,
            selectedSourceType,
            values.title
          );
          message.success('文件导入成功');
          break;

        default:
          message.error('不支持的文档类型');
          return;
      }

      setModalVisible(false);
      form.resetFields();
      setUploadedFile(null);
      setSelectedSourceType('text');
      fetchDocuments();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '操作失败');
    } finally {
      setImporting(false);
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingDoc(null);
    setUploadedFile(null);
    setSelectedSourceType('text');
  };

  // 获取文件上传的accept属性
  const getFileAccept = (type: DocumentSourceType): string => {
    switch (type) {
      case 'pdf': return '.pdf';
      case 'word': return '.doc,.docx';
      case 'excel': return '.xls,.xlsx';
      case 'markdown': return '.md,.markdown';
      case 'image': return '.png,.jpg,.jpeg,.gif,.bmp,.webp';
      default: return '';
    }
  };

  // 获取文件上传大小限制提示
  const getFileUploadTip = (type: DocumentSourceType): string => {
    const sizeLimit = '50MB';
    const extensions: Record<DocumentSourceType, string> = {
      url: '',
      pdf: 'PDF文件',
      word: 'Word文件',
      excel: 'Excel文件',
      markdown: 'Markdown文件',
      image: '图片文件',
      text: '',
    };
    return extensions[type] ? `支持上传${extensions[type]}，最大${sizeLimit}` : '';
  };

  const handleViewDetail = (doc: KnowledgeBaseDocument) => {
    navigate(`/knowledge-bases/documents/${doc.id}`);
  };

  const getActionMenu = (record: KnowledgeBaseDocument): MenuProps => ({
    items: [
      {
        key: 'view',
        label: '查看详情',
        icon: <FileTextOutlined />,
        onClick: () => handleViewDetail(record),
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(record),
      },
      record.status === 'active' ? {
        key: 'archive',
        label: '归档',
        onClick: async () => {
          try {
            await knowledgeBaseDocumentsApi.update(record.id, { status: 'archived' });
            message.success('已归档');
            fetchDocuments();
          } catch (error) {
            message.error('操作失败');
          }
        },
      } : null,
      record.status === 'archived' ? {
        key: 'activate',
        label: '重新发布',
        onClick: async () => {
          try {
            await knowledgeBaseDocumentsApi.update(record.id, { status: 'active' });
            message.success('已重新发布');
            fetchDocuments();
          } catch (error) {
            message.error('操作失败');
          }
        },
      } : null,
      {
        type: 'divider' as const,
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      },
    ].filter(Boolean),
  });

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: KnowledgeBaseDocument) => (
        <Space>
          {sourceTypeConfig[record.source_type].icon}
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      ),
    },
    {
      title: '来源类型',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 120,
      render: (type: DocumentSourceType) => {
        const config = sourceTypeConfig[type];
        return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '来源URL',
      dataIndex: 'source_url',
      key: 'source_url',
      ellipsis: true,
      render: (url: string) => {
        if (!url) return '-';
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
            {url.length > 50 ? url.slice(0, 50) + '...' : url}
          </a>
        );
      },
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      render: (count: number) => count ? count.toLocaleString() : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: DocumentStatus) => {
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: KnowledgeBaseDocument) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
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
    <div className="document-list">
      <div className="document-list-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/knowledge-bases/groups/${base?.group_id}`)}
          >
            返回
          </Button>
          <h2>
            <FolderOutlined /> {base?.name} <span style={{ fontSize: 14, color: '#999', marginLeft: 12 }}>文档列表</span>
          </h2>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          添加文档
        </Button>
      </div>

      <Card className="filter-card">
        <Space wrap>
          <Input.Search
            placeholder="搜索文档标题或内容"
            allowClear
            style={{ width: 300 }}
            onSearch={setSearch}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="来源类型"
            allowClear
            style={{ width: 150 }}
            value={sourceTypeFilter}
            onChange={setSourceTypeFilter}
          >
            <Select.Option value="url">URL链接</Select.Option>
            <Select.Option value="pdf">PDF</Select.Option>
            <Select.Option value="word">Word</Select.Option>
            <Select.Option value="excel">Excel</Select.Option>
            <Select.Option value="markdown">Markdown</Select.Option>
            <Select.Option value="image">图片</Select.Option>
            <Select.Option value="text">文本</Select.Option>
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Select.Option value="draft">草稿</Select.Option>
            <Select.Option value="active">已发布</Select.Option>
            <Select.Option value="archived">已归档</Select.Option>
          </Select>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title={editingDoc ? '编辑文档' : '添加文档'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        confirmLoading={importing}
        okButtonProps={{ disabled: importing }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="文档标题"
            name="title"
            rules={[{ required: !editingDoc, message: '请输入文档标题' }]}
          >
            <Input placeholder="输入文档标题（可选，自动从文件名或URL提取）" />
          </Form.Item>

          {!editingDoc && (
            <>
              <Form.Item
                label="文档类型"
                name="source_type"
                rules={[{ required: true, message: '请选择文档类型' }]}
              >
                <Select
                  value={selectedSourceType}
                  onChange={(value) => {
                    setSelectedSourceType(value);
                    setUploadedFile(null);
                  }}
                >
                  <Select.Option value="text">
                    <Space><FileTextOutlined />纯文本</Space>
                  </Select.Option>
                  <Select.Option value="url">
                    <Space><LinkOutlined />URL链接</Space>
                  </Select.Option>
                  <Select.Option value="pdf">
                    <Space><FilePdfOutlined />PDF文件</Space>
                  </Select.Option>
                  <Select.Option value="word">
                    <Space><FileWordOutlined />Word文件</Space>
                  </Select.Option>
                  <Select.Option value="excel">
                    <Space><FileExcelOutlined />Excel文件</Space>
                  </Select.Option>
                  <Select.Option value="markdown">
                    <Space><FileMarkdownOutlined />Markdown文件</Space>
                  </Select.Option>
                  <Select.Option value="image">
                    <Space><PictureOutlined />图片（OCR识别）</Space>
                  </Select.Option>
                </Select>
              </Form.Item>

              {/* URL类型 - 显示URL输入 */}
              {selectedSourceType === 'url' && (
                <Form.Item
                  label="URL地址"
                  name="source_url"
                  rules={[{ required: true, message: '请输入URL地址' }]}
                >
                  <Input placeholder="https://example.com/article" prefix={<LinkOutlined />} />
                </Form.Item>
              )}

              {/* 文本类型 - 显示内容输入 */}
              {selectedSourceType === 'text' && (
                <Form.Item
                  label="内容"
                  name="content"
                  rules={[{ required: true, message: '请输入文档内容' }]}
                >
                  <Input.TextArea
                    rows={12}
                    placeholder="输入文档内容..."
                  />
                </Form.Item>
              )}

              {/* 文件类型 - 显示文件上传 */}
              {['pdf', 'word', 'excel', 'markdown', 'image'].includes(selectedSourceType) && (
                <Form.Item
                  label="上传文件"
                  rules={[{ required: true, message: '请选择文件' }]}
                >
                  <Upload
                    accept={getFileAccept(selectedSourceType)}
                    beforeUpload={(file) => {
                      setUploadedFile(file);
                      return false; // 阻止自动上传
                    }}
                    onRemove={() => setUploadedFile(null)}
                    maxCount={1}
                    fileList={uploadedFile ? [{
                      uid: '1',
                      name: uploadedFile.name,
                      status: 'done',
                      size: uploadedFile.size,
                    }] : []}
                  >
                    <Button icon={<UploadOutlined />}>选择文件</Button>
                  </Upload>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {getFileUploadTip(selectedSourceType)}
                  </div>
                </Form.Item>
              )}
            </>
          )}

          {editingDoc && (
            <>
              <Form.Item
                label="内容"
                name="content"
              >
                <Input.TextArea
                  rows={12}
                  placeholder="编辑文档内容..."
                />
              </Form.Item>

              <Form.Item
                label="状态"
                name="status"
              >
                <Select>
                  <Select.Option value="draft">草稿</Select.Option>
                  <Select.Option value="active">已发布</Select.Option>
                  <Select.Option value="archived">已归档</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentList;
