import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Modal, Timeline, Descriptions, message, Card, Select, Progress, Collapse, Drawer } from 'antd';
import { EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, StopOutlined, ReloadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import './ExecutionHistory.css';

const { Panel } = Collapse;

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  input_data?: any;
  result_json?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface WorkflowExecutionLog {
  id: string;
  execution_id: string;
  node_id?: string;
  skill_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  message?: string;
  error_detail?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

const statusMap: Record<string, { text: string; color: string; icon: any }> = {
  pending: { text: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
  running: { text: '执行中', color: 'processing', icon: <ClockCircleOutlined /> },
  completed: { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> },
  cancelled: { text: '已取消', color: 'default', icon: <StopOutlined /> },
};

export const ExecutionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>();
  const [workflowCategory, setWorkflowCategory] = useState<string | undefined>();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [logs, setLogs] = useState<WorkflowExecutionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { id } = useParams();

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/workflows/executions/list', {
        page,
        pageSize,
        status,
      });

      const apiResponse = (response as any).data || response;
      if (apiResponse.success) {
        setExecutions(apiResponse.data.executions);
        setTotal(apiResponse.data.total);
      }
    } catch (error) {
      message.error('获取执行历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新正在执行的记录
  useEffect(() => {
    if (!autoRefresh) return;

    const hasRunning = executions.some(e => e.status === 'running' || e.status === 'pending');
    if (!hasRunning) {
      setAutoRefresh(false);
      return;
    }

    const interval = setInterval(() => {
      fetchExecutions();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, executions]);

  // 检查是否有正在执行的记录
  useEffect(() => {
    const hasRunning = executions.some(e => e.status === 'running' || e.status === 'pending');
    if (hasRunning && !autoRefresh) {
      setAutoRefresh(true);
    }
  }, [executions]);

  const fetchExecutionDetail = async (executionId: string) => {
    setLogsLoading(true);
    try {
      const response = await apiClient.get<any>(`/workflows/executions/${executionId}`);

      const apiResponse = (response as any).data || response;
      if (apiResponse.success) {
        setSelectedExecution(apiResponse.data.execution);
        setLogs(apiResponse.data.logs || []);
        setDetailDrawerVisible(true);
      }
    } catch (error) {
      message.error('获取执行详情失败');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [page, pageSize, status]);

  const handleCancel = async (executionId: string) => {
    try {
      await apiClient.post(`/workflows/executions/${executionId}/cancel`);
      message.success('已发送取消请求');
      fetchExecutions();
    } catch (error) {
      message.error('取消失败');
    }
  };

  const columns = [
    {
      title: '工作流名称',
      dataIndex: 'workflow_name',
      key: 'workflow_name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = statusMap[status] || statusMap.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: WorkflowExecution) => {
        if (record.status === 'completed') return <Progress percent={100} size="small" status="success" />;
        if (record.status === 'failed' || record.status === 'cancelled') return <Progress percent={progress} size="small" status="exception" />;
        return <Progress percent={progress} size="small" status="active" />;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '耗时',
      key: 'duration',
      render: (_: any, record: WorkflowExecution) => {
        if (!record.started_at || !record.completed_at) return '-';
        const start = new Date(record.started_at).getTime();
        const end = new Date(record.completed_at).getTime();
        const duration = Math.floor((end - start) / 1000);
        if (duration < 60) return `${duration}秒`;
        return `${Math.floor(duration / 60)}分${duration % 60}秒`;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: WorkflowExecution) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => fetchExecutionDetail(record.id)}
          >
            详情
          </Button>
          {(record.status === 'running' || record.status === 'pending') && (
            <Button
              danger
              size="small"
              onClick={() => handleCancel(record.id)}
            >
              取消
            </Button>
          )}
          {record.status === 'completed' && (
            <Button
              type="primary"
              size="small"
              onClick={() => navigate(`/drafts?execution_id=${record.id}`)}
            >
              查看草稿
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderLogStatus = (log: WorkflowExecutionLog) => {
    const config = statusMap[log.status] || statusMap.pending;
    return (
      <Tag color={config.color} icon={config.icon} style={{ fontSize: 12 }}>
        {config.text}
      </Tag>
    );
  };

  return (
    <div className="execution-history">
      <div className="execution-history-header">
        <h2>执行历史</h2>
        <Space>
          {autoRefresh && (
            <Tag color="processing" icon={<ReloadOutlined spin />}>
              自动刷新中
            </Tag>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchExecutions}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Card className="filter-bar" size="small">
        <Space wrap>
          <Button
            type={status === undefined ? 'primary' : 'default'}
            onClick={() => setStatus(undefined)}
          >
            全部
          </Button>
          <Button
            type={status === 'running' ? 'primary' : 'default'}
            onClick={() => setStatus('running')}
          >
            执行中
          </Button>
          <Button
            type={status === 'completed' ? 'primary' : 'default'}
            onClick={() => setStatus('completed')}
          >
            已完成
          </Button>
          <Button
            type={status === 'failed' ? 'primary' : 'default'}
            onClick={() => setStatus('failed')}
          >
            失败
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={executions}
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

      <Drawer
        title="执行详情"
        placement="right"
        width={800}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDetailDrawerVisible(false)}>关闭</Button>
            {selectedExecution?.status === 'completed' && selectedExecution?.result_json && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const dataStr = JSON.stringify(selectedExecution.result_json, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `execution-${selectedExecution.id}-result.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                  message.success('结果已下载');
                }}
              >
                导出结果
              </Button>
            )}
          </Space>
        }
      >
        {selectedExecution && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 基本信息 */}
            <Card size="small" title="基本信息">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="工作流">{selectedExecution.workflow_name}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  {(() => {
                    const config = statusMap[selectedExecution.status];
                    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="进度">
                  <Progress percent={selectedExecution.progress} size="small" />
                </Descriptions.Item>
                <Descriptions.Item label="执行ID">
                  <code style={{ fontSize: 12 }}>{selectedExecution.id}</code>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(selectedExecution.created_at).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">
                  {selectedExecution.started_at ? new Date(selectedExecution.started_at).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="完成时间">
                  {selectedExecution.completed_at ? new Date(selectedExecution.completed_at).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="总耗时">
                  {selectedExecution.started_at && selectedExecution.completed_at
                    ? `${Math.floor((new Date(selectedExecution.completed_at).getTime() - new Date(selectedExecution.started_at).getTime()) / 1000)}秒`
                    : '-'}
                </Descriptions.Item>
                {selectedExecution.error_message && (
                  <Descriptions.Item label="错误信息" span={2}>
                    <span style={{ color: '#ff4d4f' }}>{selectedExecution.error_message}</span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 输入参数 */}
            {selectedExecution.input_data && (
              <Card size="small" title={<Space><FileTextOutlined />输入参数</Space>}>
                <Collapse ghost>
                  {Object.entries(selectedExecution.input_data).map(([key, value]) => (
                    <Panel header={key} key={key}>
                      <pre style={{ margin: 0, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </pre>
                    </Panel>
                  ))}
                </Collapse>
              </Card>
            )}

            {/* 执行结果 */}
            {selectedExecution.status === 'completed' && selectedExecution.result_json && (
              <Card size="small" title={<Space><CheckCircleOutlined />执行结果</Space>}>
                <Collapse ghost>
                  {Object.entries(selectedExecution.result_json).map(([key, value]) => (
                    <Panel header={key} key={key}>
                      {key === 'topics' || key === 'adapted_contents' ? (
                        <div>
                          {Array.isArray(value) && value.map((item: any, idx: number) => (
                            <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </Card>
                          ))}
                        </div>
                      ) : typeof value === 'object' ? (
                        <pre style={{ margin: 0, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </Panel>
                  ))}
                </Collapse>
              </Card>
            )}

            {/* 执行日志 */}
            <Card size="small" title="执行日志">
              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
              ) : logs.length > 0 ? (
                <Timeline mode="left">
                  {logs.map((log) => (
                    <Timeline.Item
                      key={log.id}
                      color={log.status === 'completed' ? 'green' : log.status === 'failed' ? 'red' : 'blue'}
                      label={log.completed_at ? new Date(log.completed_at).toLocaleTimeString() : undefined}
                    >
                      <div>
                        <Space>
                          {renderLogStatus(log)}
                          <strong>{log.skill_id}</strong>
                        </Space>
                        {log.message && <div style={{ marginTop: 4 }}>{log.message}</div>}
                        {log.error_detail && (
                          <div style={{ marginTop: 4, padding: 8, background: '#fff2f0', borderRadius: 4, color: '#ff4d4f' }}>
                            错误: {log.error_detail}
                          </div>
                        )}
                        {log.duration_ms && (
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            耗时: {(log.duration_ms / 1000).toFixed(2)}秒
                          </div>
                        )}
                        {log.input_data && (
                          <Collapse ghost size="small" style={{ marginTop: 8 }}>
                            <Panel header="输入数据" key="input">
                              <pre style={{ margin: 0, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 11 }}>
                                {JSON.stringify(log.input_data, null, 2)}
                              </pre>
                            </Panel>
                          </Collapse>
                        )}
                        {log.output_data && (
                          <Collapse ghost size="small" style={{ marginTop: 8 }}>
                            <Panel header="输出数据" key="output">
                              <pre style={{ margin: 0, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 11, maxHeight: 200, overflow: 'auto' }}>
                                {JSON.stringify(log.output_data, null, 2)}
                              </pre>
                            </Panel>
                          </Collapse>
                        )}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无日志</div>
              )}
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default ExecutionHistory;
