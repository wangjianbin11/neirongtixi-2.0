import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, message, Spin, InputNumber, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, BranchesOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes_json: any[];
  estimated_time?: number;
  estimated_cost?: number;
}

export const WorkflowEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow();
    }
  }, [id]);

  const fetchWorkflow = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ workflow: Workflow }>(`/workflows/${id}`);
      if (response.success) {
        setWorkflow(response.data.workflow);
        form.setFieldsValue({
          name: response.data.workflow.name,
          description: response.data.workflow.description || '',
          category: response.data.workflow.category,
          estimated_time: response.data.workflow.estimated_time,
          estimated_cost: response.data.workflow.estimated_cost,
        });
      }
    } catch (error) {
      message.error('获取工作流失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const response = await apiClient.put(`/workflows/${id}`, {
        name: values.name,
        description: values.description,
        category: values.category,
        nodes_json: workflow?.nodes_json || [],
        estimated_time: values.estimated_time,
        estimated_cost: values.estimated_cost,
      });

      if (response.success) {
        message.success('保存成功');
        navigate('/workflows');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/workflows')}
          >
            返回
          </Button>
          <h2 style={{ margin: 0 }}>编辑工作流</h2>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            label="工作流名称"
            name="name"
            rules={[{ required: true, message: '请输入工作流名称' }]}
          >
            <Input placeholder="请输入工作流名称" />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category"
          >
            <Select placeholder="选择分类" allowClear>
              <Select.Option value="blog">博客</Select.Option>
              <Select.Option value="social_media">社交媒体</Select.Option>
              <Select.Option value="video">视频</Select.Option>
              <Select.Option value="report">报告</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={4} placeholder="请输入描述" />
          </Form.Item>

          <Form.Item
            label="预估时间（秒）"
            name="estimated_time"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="预估执行时间" />
          </Form.Item>

          <Form.Item
            label="预估成本（美元）"
            name="estimated_cost"
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="预估执行成本" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={saving}
              >
                保存
              </Button>
              <Button
                icon={<BranchesOutlined />}
                onClick={() => navigate(id ? `/workflows/${id}/visual` : '/workflows/visual')}
              >
                可视化编辑
              </Button>
              <Button onClick={() => navigate('/workflows')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Card
          type="inner"
          title="工作流节点"
          style={{ marginTop: 16 }}
        >
          <p style={{ color: '#999' }}>
            可视化编辑器正在开发中...
          </p>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
            {JSON.stringify(workflow?.nodes_json || [], null, 2)}
          </pre>
        </Card>
      </Card>
    </div>
  );
};

export default WorkflowEdit;
