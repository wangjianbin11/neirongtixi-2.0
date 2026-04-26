import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Modal, Form, Input, message, Tabs, Descriptions, Card, Row, Col, Statistic } from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined, SendOutlined, PaperClipOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import './DraftReview.css';

interface Draft {
  id: string;
  title: string;
  content_type: string;
  content_json: any;
  platform?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  reviewed_at?: string;
  review_comment?: string;
}

interface DraftStats {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
}

const contentTypeMap: Record<string, string> = {
  blog: '博客文章',
  social_xiaohongshu: '小红书',
  social_wechat: '微信公众号',
  social_douyin: '抖音脚本',
  social_weibo: '微博',
  social_linkedin: 'LinkedIn',
  video_script: '视频脚本',
  report: '报告',
};

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  pending_review: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  published: { text: '已发布', color: 'blue' },
};

export const DraftReview: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>('pending_review');
  const [contentType, setContentType] = useState<string | undefined>();
  const [stats, setStats] = useState<DraftStats | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [reviewForm] = Form.useForm();

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/drafts', {
        page,
        pageSize,
        status,
        content_type: contentType,
      });

      if (response.success) {
        setDrafts(response.data.drafts);
        setTotal(response.data.total);
      }
    } catch (error) {
      message.error('获取草稿列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<any>('/drafts/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [page, pageSize, status, contentType]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handlePreview = (draft: Draft) => {
    setSelectedDraft(draft);
    setPreviewModalVisible(true);
  };

  const handleReview = (draft: Draft) => {
    setSelectedDraft(draft);
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async () => {
    const values = await reviewForm.validateFields();
    try {
      await apiClient.post(`/drafts/${selectedDraft!.id}/review`, values);
      message.success('审核完成');
      setReviewModalVisible(false);
      reviewForm.resetFields();
      fetchDrafts();
      fetchStats();
    } catch (error) {
      message.error('审核失败');
    }
  };

  const handlePublish = async (draft: Draft) => {
    try {
      await apiClient.post(`/drafts/${draft.id}/publish`);
      message.success('发布成功');
      fetchDrafts();
      fetchStats();
    } catch (error) {
      message.error('发布失败');
    }
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '内容类型',
      dataIndex: 'content_type',
      key: 'content_type',
      render: (type: string) => contentTypeMap[type] || type,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => platform || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusMap[status] || statusMap.draft;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Draft) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          {record.status === 'pending_review' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleReview(record)}
              >
                审核
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handlePublish(record)}
            >
              发布
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderContentPreview = (draft: Draft) => {
    const content = draft.content_json;

    switch (draft.content_type) {
      case 'blog':
        return (
          <div className="content-preview">
            <h2>{content.title || draft.title}</h2>
            {content.excerpt && <p className="excerpt">{content.excerpt}</p>}
            {content.seo_title && <div><strong>SEO标题:</strong> {content.seo_title}</div>}
            {content.meta_description && <div><strong>Meta描述:</strong> {content.meta_description}</div>}
            {content.keywords && <div><strong>关键词:</strong> {content.keywords.join(', ')}</div>}
            {content.content && <div className="content-body" dangerouslySetInnerHTML={{ __html: content.content }} />}
            {content.paa && content.paa.length > 0 && (
              <div className="paa-section">
                <h4>相关问题 (PAA)</h4>
                {content.paa.map((item: any, idx: number) => (
                  <div key={idx}>
                    <strong>Q:</strong> {item.question}
                    <br />
                    <strong>A:</strong> {item.answer}
                  </div>
                ))}
              </div>
            )}
            {content.sources && content.sources.length > 0 && (
              <div className="sources-section">
                <h4>引用来源</h4>
                {content.sources.map((source: any, idx: number) => (
                  <div key={idx}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'social_xiaohongshu':
      case 'social_wechat':
      case 'social_weibo':
      case 'social_linkedin':
        return (
          <div className="content-preview">
            <h2>{content.title || draft.title}</h2>
            <div className="social-content">{content.text}</div>
            {content.tags && <div><strong>标签:</strong> {content.tags.join(', ')}</div>}
            {content.images && content.images.length > 0 && (
              <div>
                <strong>图片:</strong>
                {content.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} alt="" style={{ maxWidth: 200, margin: 4 }} />
                ))}
              </div>
            )}
          </div>
        );

      case 'social_douyin':
      case 'video_script':
        return (
          <div className="content-preview">
            <h2>{content.title || draft.title}</h2>
            {content.hook && <div><strong>钩子:</strong> {content.hook}</div>}
            {content.script && <div className="script-body"><strong>脚本:</strong><pre>{content.script}</pre></div>}
            {content.scenes && content.scenes.length > 0 && (
              <div className="scenes-section">
                <h4>分镜描述</h4>
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>画面</th>
                      <th>声音</th>
                      <th>动作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.scenes.map((scene: any, idx: number) => (
                      <tr key={idx}>
                        <td>{scene.time}</td>
                        <td>{scene.visual}</td>
                        <td>{scene.audio}</td>
                        <td>{scene.action || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {content.cta && <div><strong>CTA:</strong> {content.cta}</div>}
            {content.bgm_suggestion && <div><strong>BGM建议:</strong> {content.bgm_suggestion}</div>}
          </div>
        );

      default:
        return <pre>{JSON.stringify(content, null, 2)}</pre>;
    }
  };

  return (
    <div className="draft-review">
      <div className="draft-review-header">
        <h2>草稿审核</h2>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总草稿数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="待审核" value={stats.pendingReview} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已通过"
                value={stats.byStatus.approved || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已发布"
                value={stats.byStatus.published || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs
        activeKey={status || 'all'}
        onChange={(key) => setStatus(key === 'all' ? undefined : key)}
        items={[
          { key: 'pending_review', label: `待审核 (${stats?.pendingReview || 0})` },
          { key: 'approved', label: '已通过' },
          { key: 'rejected', label: '已拒绝' },
          { key: 'published', label: '已发布' },
          { key: 'all', label: '全部' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={drafts}
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

      {/* 预览弹窗 */}
      <Modal
        title="草稿预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          selectedDraft?.status === 'pending_review' && (
            <Button
              key="review"
              type="primary"
              onClick={() => {
                setPreviewModalVisible(false);
                handleReview(selectedDraft);
              }}
            >
              去审核
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedDraft && (
          <>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="内容类型">{contentTypeMap[selectedDraft.content_type]}</Descriptions.Item>
              <Descriptions.Item label="平台">{selectedDraft.platform || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusMap[selectedDraft.status]?.text}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(selectedDraft.created_at).toLocaleString()}</Descriptions.Item>
            </Descriptions>
            {renderContentPreview(selectedDraft)}
          </>
        )}
      </Modal>

      {/* 审核弹窗 */}
      <Modal
        title="审核草稿"
        open={reviewModalVisible}
        onOk={handleReviewSubmit}
        onCancel={() => {
          setReviewModalVisible(false);
          reviewForm.resetFields();
        }}
        okText="提交"
        width={800}
      >
        {selectedDraft && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <h3>{selectedDraft.title}</h3>
              <p>类型: {contentTypeMap[selectedDraft.content_type]}</p>
            </Card>

            <Form form={reviewForm} layout="vertical">
              <Form.Item
                label="审核结果"
                name="status"
                rules={[{ required: true, message: '请选择审核结果' }]}
              >
                <Space>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => reviewForm.setFieldsValue({ status: 'approved' })}
                  >
                    通过
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => reviewForm.setFieldsValue({ status: 'rejected' })}
                  >
                    拒绝
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item
                label="审核意见"
                name="comment"
                rules={[{ required: true, message: '请输入审核意见' }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="请输入审核意见..."
                />
              </Form.Item>
            </Form>

            <div style={{ marginTop: 16 }}>
              <h4>内容预览:</h4>
              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #d9d9d9', padding: 12, borderRadius: 4 }}>
                {renderContentPreview(selectedDraft)}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DraftReview;
