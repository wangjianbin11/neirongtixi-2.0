import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, message, Descriptions, Tag, Typography, Spin, Modal, Form, Input, Select } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  FileTextOutlined,
  LinkOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileMarkdownOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { knowledgeBaseDocumentsApi, KnowledgeBaseDocument, DocumentSourceType, DocumentStatus } from '../../api/knowledge-bases';
import './DocumentDetail.css';

const { Title, Paragraph, Text } = Typography;

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

export const DocumentDetail: React.FC = () => {
  const { id: docId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<KnowledgeBaseDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchDocument = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const docData = await knowledgeBaseDocumentsApi.getById(docId);
      setDocument(docData);
      form.setFieldsValue({
        title: docData.title,
        content: docData.content,
        status: docData.status,
      });
    } catch (error) {
      message.error('获取文档详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [docId]);

  const handleEdit = () => {
    form.setFieldsValue({
      title: document?.title,
      content: document?.content,
      status: document?.status,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!docId) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await knowledgeBaseDocumentsApi.update(docId, values);
      message.success('保存成功');
      setEditModalVisible(false);
      fetchDocument();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderContent = (content: string) => {
    if (!content) return <Paragraph type="secondary">暂无内容</Paragraph>;

    // 简单渲染：按行分割显示
    const lines = content.split('\n');
    return (
      <div className="document-content">
        {lines.map((line, index) => {
          if (line.trim() === '') {
            return <br key={index} />;
          }
          return <Paragraph key={index}>{line}</Paragraph>;
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!document) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="secondary">文档不存在</Text>
      </div>
    );
  }

  const sourceConfig = sourceTypeConfig[document.source_type];
  const statusConfigItem = statusConfig[document.status];

  return (
    <div className="document-detail">
      <div className="document-detail-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            返回
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            编辑
          </Button>
        </Space>
      </div>

      <Card>
        <div className="document-title-section">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="middle">
              {sourceConfig.icon}
              <Title level={2} style={{ margin: 0 }}>{document.title}</Title>
            </Space>
            <Space size="small">
              <Tag icon={sourceConfig.icon} color={sourceConfig.color}>{sourceConfig.text}</Tag>
              <Tag color={statusConfigItem.color}>{statusConfigItem.text}</Tag>
              {document.source_url && (
                <Tag icon={<LinkOutlined />} color="blue">
                  <a href={document.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                    查看来源
                  </a>
                </Tag>
              )}
            </Space>
          </Space>
        </div>

        <Descriptions bordered size="small" column={2} style={{ marginTop: 24 }}>
          <Descriptions.Item label="文档ID">{document.id}</Descriptions.Item>
          <Descriptions.Item label="知识库ID">{document.knowledge_base_id}</Descriptions.Item>
          <Descriptions.Item label="来源类型">
            <Tag icon={sourceConfig.icon} color={sourceConfig.color}>{sourceConfig.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusConfigItem.color}>{statusConfigItem.text}</Tag>
          </Descriptions.Item>
          {document.word_count && (
            <Descriptions.Item label="字数">{document.word_count.toLocaleString()}</Descriptions.Item>
          )}
          {document.file_size && (
            <Descriptions.Item label="文件大小">
              {(document.file_size / 1024).toFixed(2)} KB
            </Descriptions.Item>
          )}
          <Descriptions.Item label="创建时间">{new Date(document.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{new Date(document.updated_at).toLocaleString('zh-CN')}</Descriptions.Item>
          {document.source_url && (
            <Descriptions.Item label="来源URL" span={2}>
              <a href={document.source_url} target="_blank" rel="noopener noreferrer">
                {document.source_url}
              </a>
            </Descriptions.Item>
          )}
        </Descriptions>

        <div className="document-content-section">
          <Title level={4}>文档内容</Title>
          <div className="document-content-wrapper">
            {renderContent(document.content || '')}
          </div>
        </div>

        {document.file_path && (
          <div className="document-file-section">
            <Title level={4}>附件信息</Title>
            <Text>文件路径: {document.file_path}</Text>
            {document.file_mime_type && (
              <Text type="secondary" style={{ marginLeft: 16 }}>
                MIME类型: {document.file_mime_type}
              </Text>
            )}
          </div>
        )}
      </Card>

      <Modal
        title="编辑文档"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        width={800}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="文档标题"
            name="title"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="输入文档标题" />
          </Form.Item>

          <Form.Item
            label="内容"
            name="content"
          >
            <Input.TextArea
              rows={15}
              placeholder="输入文档内容"
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
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentDetail;
