import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  Handle,
  Position,
  getBezierPath,
  BaseEdge,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  message,
  Drawer,
  Tag,
  Tooltip,
  Tour,
  TourProps,
  Badge,
  Alert,
  Switch,
  InputNumber,
  Select,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  UndoOutlined,
  RedoOutlined,
  BlockOutlined,
  AppstoreOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import './WorkflowVisualEditor.css';

// 动态表单字段生成组件
interface SchemaField {
  type: string;
  required?: boolean;
  default?: any;
  enum?: string[];
  description?: string;
}

interface NodeConfigFormProps {
  skillId: string;
  config: Record<string, any>;
  onChange: (newConfig: Record<string, any>) => void;
  skills: SkillMetadata[];
  allNodes?: Node<SkillNodeData>[];
  allEdges?: Edge[];
  currentNodeId?: string;
}

// 可拖拽的字段项
interface DraggableFieldItemProps {
  nodeId: string;
  nodeName: string;
  fieldName: string;
  fieldLabel: string;
}

function DraggableFieldItem({ nodeId, nodeName, fieldName, fieldLabel }: DraggableFieldItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      nodeId,
      nodeName,
      fieldName,
      fieldLabel,
      reference: `$.${nodeId}.${fieldName}`,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className="node-draggable-field-item"
      draggable
      onDragStart={handleDragStart}
    >
      <span style={{ color: '#52c41a', fontSize: 14, flexShrink: 0 }}>⬥</span>
      <span className="node-draggable-field-item-node">{nodeName}</span>
      <span style={{ color: '#999', flexShrink: 0 }}>→</span>
      <span className="node-draggable-field-item-field">{fieldLabel || fieldName}</span>
    </div>
  );
}

function NodeConfigForm({ skillId, config, onChange, skills, allNodes = [], allEdges = [], currentNodeId }: NodeConfigFormProps) {
  const skill = skills.find(s => s.id === skillId);
  const schema = skill?.input_schema || {};

  // 根据字段类型生成对应的表单控件
  const renderField = (fieldName: string, fieldDef: SchemaField) => {
    const value = config[fieldName] ?? fieldDef.default;
    const label = getFieldLabel(fieldName);
    const required = fieldDef.required || false;

    switch (fieldDef.type) {
      case 'string':
        if (fieldDef.enum) {
          // 枚举类型：下拉选择
          return (
            <Form.Item
              key={fieldName}
              label={label}
              required={required}
              tooltip={fieldDef.description}
            >
              <Select
                value={value}
                onChange={(val) => onChange({ ...config, [fieldName]: val })}
                placeholder={`请选择${label}`}
              >
                {fieldDef.enum.map((enumValue) => (
                  <Select.Option key={enumValue} value={enumValue}>
                    {getEnumLabel(enumValue)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          );
        }
        // 普通字符串：支持直接输入或引用节点输出
        const isRef = value?.startsWith?.('$.');

        // 解析引用信息
        let refNodeName = '';
        let refFieldName = '';
        if (isRef && value) {
          const parts = value.slice(2).split('.');
          const refNodeId = parts[0];
          const refNode = allNodes.find(n => n.id === refNodeId);
          if (refNode) {
            refNodeName = refNode.data.label;
            refFieldName = parts.slice(1).join('.');
          }
        }

        return (
          <Form.Item
            key={fieldName}
            label={
              <div className="node-form-label-with-tag">
                <span>{label}</span>
                {isRef && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    自动映射
                  </Tag>
                )}
              </div>
            }
            required={required}
            tooltip={fieldDef.description}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 显示当前值状态 */}
              {isRef ? (
                <div className="node-ref-info">
                  <div className="node-ref-info-content">
                    <span style={{ color: '#1890ff', flexShrink: 0 }}>📥 来自:</span>
                    <strong className="node-ref-info-node">{refNodeName}</strong>
                    <span style={{ color: '#999', flexShrink: 0 }}>→</span>
                    <span className="node-ref-info-field">{getFieldLabel(refFieldName) || refFieldName}</span>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        // 切换到直接输入模式
                        onChange({ ...config, [fieldName]: '' });
                      }}
                      style={{ padding: 0, fontSize: 12, flexShrink: 0 }}
                    >
                      修改
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="node-switch-mode-container">
                  <Switch
                    checked={false}
                    onChange={(checked) => {
                      if (checked) {
                        // 切换到引用模式，尝试自动选择第一个前置节点
                        const previousNodes = allNodes.filter(node =>
                          allEdges.some(edge => edge.target === currentNodeId && edge.source === node.id)
                        );
                        if (previousNodes.length > 0) {
                          const firstNode = previousNodes[0];
                          const firstSkill = skills.find(s => s.id === firstNode.data.skill_id);
                          const outputSchema = firstSkill?.output_schema || {};
                          // 尝试找到匹配的字段
                          const matchedField = Object.keys(outputSchema).find(f => f === fieldName) ||
                            Object.keys(outputSchema).find(f => {
                              const semanticMatches: Record<string, string[]> = {
                                'topic': ['research_data', 'keyword', 'title', 'content'],
                                'keyword': ['research_data', 'topic', 'keyword'],
                                'research_data': ['topic', 'keyword', 'research'],
                                'outline': ['research_data', 'topic', 'content'],
                                'content': ['outline', 'blog_content', 'article'],
                              };
                              const possibleMatches = semanticMatches[fieldName] || [];
                              return possibleMatches.includes(f);
                            });
                          if (matchedField) {
                            onChange({ ...config, [fieldName]: `$.${firstNode.id}.${matchedField}` });
                            return;
                          }
                          // 如果没有找到匹配的字段，使用第一个可用字段
                          const firstField = Object.keys(outputSchema)[0];
                          if (firstField) {
                            onChange({ ...config, [fieldName]: `$.${firstNode.id}.${firstField}` });
                          }
                        }
                      }
                    }}
                    size="small"
                  />
                  <span className="node-switch-mode-text">切换为引用模式</span>
                </div>
              )}

              {!isRef && (
                <Input
                  value={value}
                  onChange={(e) => onChange({ ...config, [fieldName]: e.target.value })}
                  placeholder={`请输入${label} 或拖拽字段到此处`}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'));
                      if (data.reference) {
                        onChange({ ...config, [fieldName]: data.reference });
                        message.success(`已引用字段: ${data.nodeName} → ${data.fieldLabel}`);
                      }
                    } catch (error) {
                      // Error parsing dropped data
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  style={{
                    border: '1px dashed #d9d9d9',
                    transition: 'all 0.3s',
                  }}
                />
              )}
            </div>
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item
            key={fieldName}
            label={label}
            required={required}
            tooltip={fieldDef.description}
          >
            <InputNumber
              value={value}
              onChange={(val) => onChange({ ...config, [fieldName]: val })}
              placeholder={`请输入${label}`}
              style={{ width: '100%' }}
              min={0}
            />
          </Form.Item>
        );

      case 'boolean':
        return (
          <Form.Item
            key={fieldName}
            label={label}
            tooltip={fieldDef.description}
            valuePropName="checked"
          >
            <Switch
              checked={value}
              onChange={(val) => onChange({ ...config, [fieldName]: val })}
            />
            <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
              {value ? '开启' : '关闭'}
            </span>
          </Form.Item>
        );

      case 'array':
      case 'object': {
        // 复杂类型：支持直接输入或引用节点输出
        const isRef = value?.startsWith?.('$.');
        // 解析引用信息
        let refNodeName = '';
        let refFieldName = '';
        if (isRef && value) {
          const parts = value.slice(2).split('.');
          const refNodeId = parts[0];
          const refNode = allNodes.find(n => n.id === refNodeId);
          if (refNode) {
            refNodeName = refNode.data.label;
            refFieldName = parts.slice(1).join('.');
          }
        }
        return (
          <Form.Item
            key={fieldName}
            label={
              <div className="node-form-label-with-tag">
                <span>{label}</span>
                {isRef && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    自动映射
                  </Tag>
                )}
              </div>
            }
            required={required}
            tooltip={fieldDef.description || `${label} (JSON格式)`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isRef ? (
                <div style={{
                  padding: '8px 12px',
                  background: '#f0f8ff',
                  border: '1px solid #91d5ff',
                  borderRadius: 6,
                  fontSize: 13
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#1890ff' }}>📥 来自:</span>
                    <strong>{refNodeName}</strong>
                    <span style={{ color: '#999' }}>→</span>
                    <span style={{ color: '#52c41a' }}>{getFieldLabel(refFieldName) || refFieldName}</span>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        onChange({ ...config, [fieldName]: '' });
                      }}
                      style={{ padding: 0, fontSize: 12, marginLeft: 'auto' }}
                    >
                      修改
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="node-switch-mode-container">
                  <Switch
                    checked={false}
                    onChange={(checked) => {
                      if (checked) {
                        const previousNodes = allNodes.filter(node =>
                          allEdges.some(edge => edge.target === currentNodeId && edge.source === node.id)
                        );
                        if (previousNodes.length > 0) {
                          const firstNode = previousNodes[0];
                          const firstSkill = skills.find(s => s.id === firstNode.data.skill_id);
                          const outputSchema = firstSkill?.output_schema || {};
                          const firstField = Object.keys(outputSchema)[0];
                          if (firstField) {
                            onChange({ ...config, [fieldName]: `$.${firstNode.id}.${firstField}` });
                          }
                        }
                      }
                    }}
                    size="small"
                  />
                  <span className="node-switch-mode-text">切换为引用模式</span>
                </div>
              )}

              {!isRef && (
                <Input.TextArea
                  rows={4}
                  value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      onChange({ ...config, [fieldName]: parsed });
                    } catch {
                      // 暂时不更新，等待输入完整JSON
                    }
                  }}
                  placeholder={`请输入${label} (JSON格式) 或拖拽字段到此处`}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'));
                      if (data.reference) {
                        onChange({ ...config, [fieldName]: data.reference });
                        message.success(`已引用字段: ${data.nodeName} → ${data.fieldLabel}`);
                      }
                    } catch (error) {
                      // Error parsing dropped data
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  style={{
                    border: '1px dashed #d9d9d9',
                    transition: 'all 0.3s',
                  }}
                />
              )}
            </div>
          </Form.Item>
        );
      }

      default:
        return null;
    }
  };

  if (Object.keys(schema).length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: '#999' }}>
        该节点无需配置参数
      </div>
    );
  }

  // 获取所有前置节点及其输出字段
  const previousNodes = allNodes.filter(node =>
    allEdges.some(edge => edge.target === currentNodeId && edge.source === node.id)
  );

  const availableFields = previousNodes.flatMap(node => {
    const skill = skills.find(s => s.id === node.data.skill_id);
    const outputSchema = skill?.output_schema || {};
    return Object.entries(outputSchema).map(([fieldName, fieldDef]) => ({
      nodeId: node.id,
      nodeName: node.data.label,
      fieldName,
      fieldLabel: getFieldLabel(fieldName),
    }));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 可用字段面板 */}
      {availableFields.length > 0 && (
        <div style={{
          padding: 12,
          background: '#fafafa',
          border: '1px solid #e8e8e8',
          borderRadius: 6,
        }}>
          <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 13, color: '#666' }}>
            💡 可用字段（拖拽到输入框）
          </div>
          {availableFields.map((field, index) => (
            <DraggableFieldItem
              key={`${field.nodeId}-${field.fieldName}-${index}`}
              nodeId={field.nodeId}
              nodeName={field.nodeName}
              fieldName={field.fieldName}
              fieldLabel={field.fieldLabel}
            />
          ))}
        </div>
      )}

      <div className="node-config-form">
        {Object.entries(schema).map(([fieldName, fieldDef]) =>
          renderField(fieldName, fieldDef as SchemaField)
        )}
      </div>
    </div>
  );
}

// 字段名称转中文标签
function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    keyword: '关键词',
    topic: '话题',
    depth: '调研深度',
    include_competitors: '包含竞品分析',
    research_depth: '研究深度',
    sources_count: '来源数量',
    outline: '大纲',
    research_data: '调研数据',
    outline_depth: '大纲深度',
    target_length: '目标长度',
    tone: '语气风格',
    include_paa: '包含相关问题',
    include_sources: '包含引用来源',
    product: '产品名称',
    key_points: '关键要点',
    platform: '目标平台',
    target_audience: '目标受众',
    keywords: '关键词列表',
  };
  return labels[fieldName] || fieldName;
}

// 枚举值转中文
function getEnumLabel(value: string): string {
  const labels: Record<string, string> = {
    basic: '基础',
    standard: '标准',
    deep: '深度',
    quick: '快速',
    comprehensive: '全面',
    detailed: '详细',
    professional: '专业',
    casual: '轻松',
    educational: '教育',
    enthusiastic: '热情',
    xiaohongshu: '小红书',
    wechat: '微信',
    douyin: '抖音',
    weibo: '微博',
    linkedin: '领英',
  };
  return labels[value] || value;
}

// 图标映射
const skillIcons: Record<string, React.ReactNode> = {
  'start': '🚀',
  'end': '🏁',
  'keyword-research': '🔍',
  'topic-research': '📋',
  'content-research': '📚',
  'outline-generator': '📝',
  'blog-generator': '📄',
  'xiaohongshu-generator': '📕',
  'wechat-generator': '💬',
  'douyin-script-generator': '🎬',
  'weibo-generator': '📢',
  'linkedin-generator': '💼',
  'seo-optimizer': '⚡',
  'cover-image-generator': '🖼️',
  'illustration-generator': '🎨',
  'format-converter': '🔄',
  'topic-expander': '🌳',
  'hook-generator': '🪝',
  'cta-generator': '📣',
};

interface SkillNodeData {
  nodeId: string;
  label: string;
  skill_id: string;
  config?: Record<string, any>;
  category?: string;
  description?: string;
}

interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  input_schema: Record<string, SchemaField>;
  output_schema: Record<string, SchemaField>;
  estimated_time: number;
  estimated_cost: number;
  ai_provider?: string;
  model?: string;
  is_active?: boolean;
}

const categoryColors: Record<string, string> = {
  research: '#1890ff',
  content: '#52c41a',
  optimization: '#faad14',
  publishing: '#722ed1',
  utility: '#13c2c2',
  control: '#8c8c8c',
};

// 开始节点组件
function StartNode({ data, selected }: { data: SkillNodeData; selected: boolean }) {
  return (
    <div className={`workflow-node start-node ${selected ? 'selected' : ''}`}>
      <div className="node-icon">🚀</div>
      <div className="node-label">{data.label}</div>
      {/* 只有输出连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        className="node-handle node-handle-output"
      />
    </div>
  );
}

// 结束节点组件
function EndNode({ data, selected }: { data: SkillNodeData; selected: boolean }) {
  return (
    <div className={`workflow-node end-node ${selected ? 'selected' : ''}`}>
      {/* 只有输入连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle node-handle-input"
      />
      <div className="node-icon">🏁</div>
      <div className="node-label">{data.label}</div>
    </div>
  );
}

// 自定义边组件 - 支持在边上插入节点
interface InsertableEdgeData {
  onInsertNode?: (edgeId: string) => void;
}

function InsertableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<InsertableEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [hovered, setHovered] = useState(false);

  // 计算边的中点位置
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onInsertNode) {
      data.onInsertNode(id);
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {/* 插入节点按钮 - 鼠标悬停时显示 */}
      <foreignObject
        x={midX - 12}
        y={midY - 12}
        width={24}
        height={24}
        className="edge-button-foreign"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Button
            type="primary"
            size="small"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={handleInsert}
            style={{
              width: '24px',
              height: '24px',
              minWidth: '24px',
              padding: 0,
              fontSize: '12px',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          />
        </div>
      </foreignObject>
    </>
  );
}

// 简洁模式节点组件
function SkillNode({ data, selected }: { data: SkillNodeData; selected: boolean }) {
  const category = data.category || 'utility';
  const color = categoryColors[category] || '#999';
  const icon = skillIcons[data.skill_id] || '📦';

  return (
    <div
      className={`workflow-node ${selected ? 'selected' : ''}`}
      style={{ borderLeftColor: color }}
    >
      {/* 输入连接点（左侧） */}
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle node-handle-input"
      />

      <div className="node-icon">{icon}</div>
      <div className="node-label">{data.label}</div>
      <Tooltip title={data.description || data.skill_id}>
        <div className="node-status-indicator" style={{ backgroundColor: color }} />
      </Tooltip>

      {/* 输出连接点（右侧） */}
      <Handle
        type="source"
        position={Position.Right}
        className="node-handle node-handle-output"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  skill: SkillNode,
};

const edgeTypes: EdgeTypes = {
  insertable: InsertableEdge,
};

function EditorContent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<SkillNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Node<SkillNodeData>[]>([]);
  const [configDrawerVisible, setConfigDrawerVisible] = useState(false);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [executeForm] = Form.useForm();
  const [skillPanelVisible, setSkillPanelVisible] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 插入节点相关状态
  const [insertModalVisible, setInsertModalVisible] = useState(false);
  const [insertEdgeId, setInsertEdgeId] = useState<string | null>(null);

  // 撤销/重做历史
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [draggedSkill, setDraggedSkill] = useState<SkillMetadata | null>(null);

  // 新手引导步骤
  const tourSteps: TourProps['steps'] = [
    {
      title: '欢迎使用工作流编辑器',
      description: '这是一个可视化的工作流编辑器，让您轻松创建和管理自动化工作流。',
      target: null,
    },
    {
      title: '技能面板',
      description: '左侧是可用的技能列表，您可以点击或拖拽技能到画布上添加节点。',
      target: () => document.querySelector('.skill-panel'),
    },
    {
      title: '画布区域',
      description: '中间是工作流画布，您可以在这里连接节点、创建工作流。按住空格键拖拽可以平移画布。',
      target: () => document.querySelector('.react-flow'),
    },
    {
      title: '连接节点',
      description: '从一个节点的右侧连接点拖拽到另一个节点的左侧连接点，即可创建连接。',
      target: () => document.querySelector('.react-flow__node'),
    },
    {
      title: '配置节点',
      description: '点击节点后，右侧面板会显示节点配置，您可以修改节点参数。',
      target: () => document.querySelector('.config-panel'),
    },
    {
      title: '快捷操作',
      description: '使用快捷键可以更高效地编辑：Delete删除、Ctrl+Z撤销、Ctrl+C/V复制粘贴。',
      target: () => document.querySelector('.toolbar-shortcuts'),
    },
    {
      title: '保存和执行',
      description: '编辑完成后，点击顶部保存按钮保存工作流，点击执行按钮开始运行。',
      target: () => document.querySelector('.toolbar-actions'),
    },
  ];

  useEffect(() => {
    // 检查是否首次使用
    const hasSeenTour = localStorage.getItem('workflow-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => setTourOpen(true), 500);
    }
    fetchSkills();
    if (id && id !== 'create') {
      fetchWorkflow(id);
    }
  }, [id]);

  // 保存历史状态
  const saveToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      saveToHistory(nodes, edges);
    }
  }, [nodes, edges]);

  // 实时验证
  useEffect(() => {
    const errors: string[] = [];

    // 检查孤立节点
    const isolatedNodes = nodes.filter(node => {
      const hasInput = edges.some(e => e.target === node.id);
      const hasOutput = edges.some(e => e.source === node.id);
      return !hasInput && !hasOutput && nodes.length > 1;
    });

    if (isolatedNodes.length > 0) {
      errors.push(`发现 ${isolatedNodes.length} 个孤立节点`);
    }

    // 检查循环依赖
    const hasCycle = detectCycle(nodes, edges);
    if (hasCycle) {
      errors.push('工作流存在循环依赖');
    }

    setValidationErrors(errors);
  }, [nodes, edges]);

  // 检测循环依赖
  const detectCycle = (nodes: Node[], edges: Edge[]): boolean => {
    const graph = new Map<string, string[]>();
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      const targets = graph.get(edge.source) || [];
      targets.push(edge.target);
      graph.set(edge.source, targets);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true;
      }
    }

    return false;
  };

  const fetchSkills = async () => {
    try {
      const response = await apiClient.get<{ skills: SkillMetadata[] }>('/workflows/skills');
      if (response.success) {
        setSkills(response.data.skills);
        // 将 skills 数据存储到 window 对象，供节点组件使用
        (window as any).__workflowSkills = response.data.skills;
      }
    } catch (error) {
      // Error fetching skills
    }
  };

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get<{ workflow: any }>(`/workflows/${workflowId}`);
      if (response.success) {
        const { workflow } = response.data;
        setWorkflowName(workflow.name);
        setWorkflowDescription(workflow.description || '');

        const convertedNodes: Node<SkillNodeData>[] = (workflow.nodes_json || []).map(
          (node: any, index: number) => ({
            id: node.id,
            type: 'skill',
            position: node.position || { x: 100 + index * 200, y: 100 },
            data: {
              nodeId: node.id,
              label: node.name || skills.find(s => s.id === node.skill_id)?.name || node.skill_id,
              skill_id: node.skill_id,
              config: node.config,
              category: skills.find(s => s.id === node.skill_id)?.category,
              description: skills.find(s => s.id === node.skill_id)?.description,
            },
          })
        );

        const convertedEdges: Edge[] = [];
        (workflow.nodes_json || []).forEach((node: any) => {
          if (node.dependencies && node.dependencies.length > 0) {
            node.dependencies.forEach((depId: string) => {
              convertedEdges.push({
                id: `${depId}-${node.id}`,
                source: depId,
                target: node.id,
                animated: true,
                type: 'insertable',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                },
                data: {
                  onInsertNode: (edgeId: string) => {
                    setInsertEdgeId(edgeId);
                    setInsertModalVisible(true);
                  },
                },
              });
            });
          }
        });

        setNodes(convertedNodes);
        setEdges(convertedEdges);
      }
    } catch (error) {
      message.error('获取工作流失败');
    }
  };

  // 智能字段映射：自动匹配前置节点的输出到当前节点的输入
  const autoMapFields = useCallback((targetNodeId: string, allNodes: Node<SkillNodeData>[], allEdges: Edge[]) => {
    // 找到所有前置节点
    const previousNodes = allNodes.filter(node =>
      allEdges.some(edge => edge.target === targetNodeId && edge.source === node.id)
    );

    if (previousNodes.length === 0) return {};

    const targetNode = allNodes.find(n => n.id === targetNodeId);
    if (!targetNode) return {};

    const targetSkill = skills.find(s => s.id === targetNode.data.skill_id);
    if (!targetSkill) return {};

    const inputSchema = targetSkill.input_schema || {};
    const autoMapping: Record<string, string> = {};

    // 遍历当前节点的每个输入字段
    for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
      // 尝试在前置节点中找到匹配的输出字段
      for (const prevNode of previousNodes) {
        const prevSkill = skills.find(s => s.id === prevNode.data.skill_id);
        if (!prevSkill) continue;

        const outputSchema = prevSkill.output_schema || {};

        // 1. 精确匹配：字段名完全相同
        if (outputSchema[fieldName]) {
          autoMapping[fieldName] = `$.${prevNode.id}.${fieldName}`;
          break;
        }

        // 2. 语义匹配：常见的字段名映射关系
        const semanticMatches: Record<string, string[]> = {
          'topic': ['research_data', 'keyword', 'title', 'content'],
          'keyword': ['research_data', 'topic', 'keyword'],
          'research_data': ['topic', 'keyword', 'research'],
          'outline': ['research_data', 'topic', 'content'],
          'content': ['outline', 'blog_content', 'article'],
          'product': ['keyword', 'topic'],
          'key_points': ['research_data', 'outline', 'content'],
        };

        const possibleMatches = semanticMatches[fieldName] || [];
        for (const possibleField of possibleMatches) {
          if (outputSchema[possibleField]) {
            autoMapping[fieldName] = `$.${prevNode.id}.${possibleField}`;
            break;
          }
        }

        // 如果找到了匹配，跳出前置节点循环
        if (autoMapping[fieldName]) break;
      }
    }

    return autoMapping;
  }, [skills]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(
          {
            ...params,
            animated: true,
            type: 'insertable', // 使用自定义边类型
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            data: {
              onInsertNode: (edgeId: string) => {
                setInsertEdgeId(edgeId);
                setInsertModalVisible(true);
              },
            },
          },
          eds
        );

        // 连接后自动映射字段
        const targetNode = nodes.find(n => n.id === params.target);
        if (targetNode) {
          const autoMapping = autoMapFields(params.target, nodes, newEdges);
          if (Object.keys(autoMapping).length > 0) {
            // 更新目标节点的配置
            setNodes((nds) =>
              nds.map((n) =>
                n.id === params.target
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        config: { ...n.data.config, ...autoMapping },
                      },
                    }
                  : n
              )
            );
            // 提示用户自动映射的字段
            const mappedFields = Object.keys(autoMapping);
            message.success(`已自动映射 ${mappedFields.length} 个字段: ${mappedFields.join(', ')}`);
          }
        }

        return newEdges;
      });
    },
    [setEdges, nodes, autoMapFields]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodes([node as Node<SkillNodeData>]);
    setConfigDrawerVisible(true);
  }, []);

  // 拖拽添加节点
  const onDragStart = (event: React.DragEvent, skill: SkillMetadata) => {
    setDraggedSkill(skill);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedSkill || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node<SkillNodeData> = {
        id: `node-${Date.now()}`,
        type: 'skill',
        position,
        data: {
          nodeId: `node-${Date.now()}`,
          label: draggedSkill.name,
          skill_id: draggedSkill.id,
          config: {},
          category: draggedSkill.category,
          description: draggedSkill.description,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setDraggedSkill(null);
    },
    [draggedSkill, setNodes]
  );

  // 点击添加节点
  const addNode = (skill: SkillMetadata) => {
    const newNode: Node<SkillNodeData> = {
      id: `node-${Date.now()}`,
      type: 'skill',
      position: {
        x: 300 + Math.random() * 200,
        y: 150 + Math.random() * 200,
      },
      data: {
        label: skill.name,
        skill_id: skill.id,
        config: {},
        category: skill.category,
        description: skill.description,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // 添加控制节点
  const addControlNode = (type: 'start' | 'end', name: string) => {
    const newNode: Node<SkillNodeData> = {
      id: `${type}-${Date.now()}`,
      type: type,
      position: {
        x: type === 'start' ? 100 : 700,
        y: 150 + Math.random() * 200,
      },
      data: {
        label: name,
        skill_id: type,
        config: {},
        category: 'control',
        description: type === 'start' ? '工作流起点' : '工作流终点',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // 删除节点
  const deleteSelected = useCallback(() => {
    if (selectedNodes.length === 0) return;

    const selectedIds = selectedNodes.map(n => n.id);
    setNodes((nds) => nds.filter((n) => !selectedIds.includes(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
    setSelectedNodes([]);
    setConfigDrawerVisible(false);
    message.success(`已删除 ${selectedNodes.length} 个节点`);
  }, [selectedNodes, setNodes, setEdges]);

  // 复制节点
  const duplicateSelected = useCallback(() => {
    if (selectedNodes.length === 0) return;

    const newNodes = selectedNodes.map(node => ({
      ...node,
      id: `node-${Date.now()}-${Math.random()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    setSelectedNodes(newNodes);
    message.success(`已复制 ${selectedNodes.length} 个节点`);
  }, [selectedNodes, setNodes]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
      message.success('已撤销');
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
      message.success('已重做');
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 自动布局
  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // 简单的分层布局算法
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string, level: number): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const currentLevel = levels.get(nodeId) || 0;
      levels.set(nodeId, Math.max(currentLevel, level));

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => {
        calculateLevel(edge.target, level + 1);
      });
    };

    // 找出没有输入的节点作为起点
    const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
    startNodes.forEach(node => calculateLevel(node.id, 0));

    // 按层级排列节点
    const nodesByLevel = new Map<number, Node[]>();
    levels.forEach((level, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        if (!nodesByLevel.has(level)) {
          nodesByLevel.set(level, []);
        }
        nodesByLevel.get(level)!.push(node);
      }
    });

    // 计算新位置
    const horizontalSpacing = 250;
    const verticalSpacing = 150;
    const updatedNodes = nodes.map(node => {
      const level = levels.get(node.id) || 0;
      const nodesInLevel = nodesByLevel.get(level) || [];
      const index = nodesInLevel.findIndex(n => n.id === node.id);

      const x = 100 + level * horizontalSpacing;
      const y = 100 + index * verticalSpacing;

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(updatedNodes);
    fitView({ padding: 0.2 });
    message.success('已自动布局');
  }, [nodes, edges, setNodes, fitView]);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
      } else if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (event.key === 'y') {
          event.preventDefault();
          redo();
        } else if (event.key === 'c') {
          event.preventDefault();
          // 复制到剪贴板逻辑已由浏览器处理
        } else if (event.key === 'v') {
          event.preventDefault();
          // 从剪贴板粘贴逻辑
        } else if (event.key === 'd') {
          event.preventDefault();
          duplicateSelected();
        } else if (event.key === 'a') {
          event.preventDefault();
          setSelectedNodes(nodes);
        }
      } else if (event.key === 'Escape') {
        setSelectedNodes([]);
        setConfigDrawerVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, undo, redo, duplicateSelected, nodes]);

  const handleSave = async () => {
    try {
      setSaving(true);

      if (nodes.length === 0) {
        message.warning('请至少添加一个节点');
        setSaving(false);
        return;
      }

      // 过滤掉控制节点（start/end），只保留实际执行的工作流节点
      const controlNodeIds = new Set(
        nodes
          .filter(node => node.data.skill_id === 'start' || node.data.skill_id === 'end')
          .map(node => node.id)
      );

      const workflowNodes = nodes.filter(
        node => !controlNodeIds.has(node.id)
      );

      // 验证是否有有效的节点
      if (workflowNodes.length === 0) {
        message.warning('请至少添加一个功能节点（非控制节点）');
        setSaving(false);
        return;
      }

      const nodes_json = workflowNodes.map((node) => ({
        id: node.id,
        skill_id: node.data.skill_id,
        name: node.data.label,
        config: node.data.config,
        dependencies: edges
          .filter((e) => e.target === node.id && !controlNodeIds.has(e.source))
          .map((e) => e.source),
        position: node.position,
      }));

      const data = {
        name: workflowName,
        description: workflowDescription,
        category: 'custom',
        nodes_json,
        default_params: {},
        estimated_time: workflowNodes.reduce((sum, node) => {
          const skill = skills.find(s => s.id === node.data.skill_id);
          return sum + (skill?.estimated_time || 0);
        }, 0),
        estimated_cost: workflowNodes.reduce((sum, node) => {
          const skill = skills.find(s => s.id === node.data.skill_id);
          return sum + (skill?.estimated_cost || 0);
        }, 0),
      };

      let response;
      if (id && id !== 'create') {
        response = await apiClient.put(`/workflows/${id}`, data);
      } else {
        response = await apiClient.post('/workflows', data);
      }

      if (response.success) {
        message.success('保存成功');
        if (id === 'create') {
          navigate('/workflows');
        }
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || '保存失败';
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    if (nodes.length === 0) {
      message.warning('请先添加节点');
      return;
    }

    if (validationErrors.length > 0) {
      message.error('请先修复工作流中的错误');
      return;
    }

    const firstNode = nodes[0];
    if (firstNode.data.skill_id === 'keyword-research') {
      setExecuteModalVisible(true);
    } else {
      executeWorkflow({});
    }
  };

  const executeWorkflow = async (inputData: any) => {
    try {
      // 过滤掉控制节点（start/end），只保留实际执行的工作流节点
      const controlNodeIds = new Set(
        nodes
          .filter(node => node.data.skill_id === 'start' || node.data.skill_id === 'end')
          .map(node => node.id)
      );

      const workflowNodes = nodes.filter(
        node => !controlNodeIds.has(node.id)
      );

      const nodes_json = workflowNodes.map((node) => ({
        id: node.id,
        skill_id: node.data.skill_id,
        name: node.data.label,
        config: node.data.config,
        dependencies: edges
          .filter((e) => e.target === node.id && !controlNodeIds.has(e.source))
          .map((e) => e.source),
        position: node.position,
      }));

      const workflowData = {
        name: workflowName || '未命名工作流',
        description: workflowDescription,
        category: 'custom',
        // is_template: false,  // 移除 - 更新时不允许此字段
        nodes_json,
        default_params: {},
      };

      // 验证是否有有效的节点
      if (nodes_json.length === 0) {
        message.error('工作流中没有有效的节点，请添加至少一个功能节点');
        return;
      }

      let workflowId = id;
      if (id === 'create' || !id) {
        const createResponse = await apiClient.post('/workflows', workflowData);
        if (createResponse.success) {
          workflowId = createResponse.data.workflow.id;
        } else {
          throw new Error('Failed to create workflow');
        }
      } else {
        await apiClient.put(`/workflows/${id}`, workflowData);
      }

      // 确保 workflowId 有效
      if (!workflowId || workflowId === 'create') {
        throw new Error('Invalid workflow ID');
      }

      const executeResponse = await apiClient.post(`/workflows/${workflowId}/execute`, {
        input_data: inputData,
      });

      if (executeResponse.success) {
        message.success('工作流已开始执行');
        setExecuteModalVisible(false);
        navigate(`/workflows/executions/${executeResponse.data.execution.id}`);
      } else {
        throw new Error(executeResponse.error?.message || 'Execution failed');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || '执行失败';
      message.error(errorMessage);
    }
  };

  // 处理插入节点
  const handleInsertNode = (skillId: string) => {
    if (!insertEdgeId) return;

    const edgeToInsert = edges.find(e => e.id === insertEdgeId);
    if (!edgeToInsert) return;

    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;

    // 计算新节点的位置（在边的中点）
    const sourceNode = nodes.find(n => n.id === edgeToInsert.source);
    const targetNode = nodes.find(n => n.id === edgeToInsert.target);

    if (!sourceNode || !targetNode) return;

    const newNodeId = `node-${Date.now()}`;
    const newNode: Node<SkillNodeData> = {
      id: newNodeId,
      type: 'skill',
      position: {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2 + 100, // 稍微向下偏移
      },
      data: {
        nodeId: newNodeId,
        skill_id: skill.id,
        label: skill.name,
        category: skill.category,
        config: {},
      },
    };

    // 删除原来的边，创建两条新的边
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => {
      const newEdges = eds
        .filter(e => e.id !== insertEdgeId)
        .concat(
          {
            id: `edge-${edgeToInsert.source}-${newNodeId}`,
            source: edgeToInsert.source,
            target: newNodeId,
            type: 'insertable',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            data: {
              onInsertNode: (edgeId: string) => {
                setInsertEdgeId(edgeId);
                setInsertModalVisible(true);
              },
            },
          },
          {
            id: `edge-${newNodeId}-${edgeToInsert.target}`,
            source: newNodeId,
            target: edgeToInsert.target,
            type: 'insertable',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            data: {
              onInsertNode: (edgeId: string) => {
                setInsertEdgeId(edgeId);
                setInsertModalVisible(true);
              },
            },
          }
        );

      // 自动映射字段
      const autoMapping = autoMapFields(newNodeId, [...nds, newNode], newEdges);
      if (Object.keys(autoMapping).length > 0) {
        message.success(`已自动映射 ${Object.keys(autoMapping).length} 个字段`);
      }

      // 更新新节点的配置
      setTimeout(() => {
        setNodes((currentNodes) =>
          currentNodes.map((n) =>
            n.id === newNodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    config: { ...n.data.config, ...autoMapping },
                  },
                }
              : n
          )
        );
      }, 0);

      return newEdges;
    });

    setInsertModalVisible(false);
    setInsertEdgeId(null);
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillMetadata[]>);

  const categoryNames: Record<string, string> = {
    control: '控制节点',
    research: '研究',
    content: '内容生成',
    optimization: '优化',
    publishing: '发布',
    utility: '工具',
  };

  // 控制节点（开始/结束）
  const controlNodes = [
    { id: 'start', name: '开始', description: '工作流的起点，触发执行', category: 'control' },
    { id: 'end', name: '结束', description: '工作流的终点，标记完成', category: 'control' },
  ];

  return (
    <div className="workflow-visual-editor">
      {/* 顶部工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <Space>
            <Tooltip title="返回列表">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/workflows')}
                type="text"
              />
            </Tooltip>
            <Input
              placeholder="工作流名称"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              style={{ width: 200 }}
              bordered={false}
              className="workflow-name-input"
            />
            <Input
              placeholder="描述（可选）"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              style={{ width: 250 }}
              bordered={false}
              className="workflow-desc-input"
            />
          </Space>
        </div>

        <div className="toolbar-center toolbar-shortcuts">
          <Space>
            <Tooltip title="撤销 (Ctrl+Z)">
              <Button
                icon={<UndoOutlined />}
                onClick={undo}
                disabled={historyIndex <= 0}
                type="text"
              />
            </Tooltip>
            <Tooltip title="重做 (Ctrl+Y)">
              <Button
                icon={<RedoOutlined />}
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                type="text"
              />
            </Tooltip>
            <Tooltip title="删除选中 (Delete)">
              <Button
                icon={<DeleteOutlined />}
                onClick={deleteSelected}
                disabled={selectedNodes.length === 0}
                type="text"
              />
            </Tooltip>
            <Tooltip title="复制选中 (Ctrl+D)">
              <Button
                icon={<CopyOutlined />}
                onClick={duplicateSelected}
                disabled={selectedNodes.length === 0}
                type="text"
              />
            </Tooltip>
            <Tooltip title="自动布局">
              <Button
                icon={<ThunderboltOutlined />}
                onClick={autoLayout}
                type="text"
              />
            </Tooltip>
          </Space>
        </div>

        <div className="toolbar-right">
          <Space className="toolbar-actions">
            <Tooltip title="新手引导">
              <Button
                icon={<QuestionCircleOutlined />}
                onClick={() => setTourOpen(true)}
                type="text"
              />
            </Tooltip>
            <Tooltip title={skillPanelVisible ? '隐藏技能面板' : '显示技能面板'}>
              <Button
                icon={skillPanelVisible ? <AppstoreOutlined /> : <BlockOutlined />}
                onClick={() => setSkillPanelVisible(!skillPanelVisible)}
                type="text"
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecute}
              disabled={validationErrors.length > 0}
            >
              执行
            </Button>
          </Space>
        </div>
      </div>

      {/* 验证错误提示 */}
      {validationErrors.length > 0 && (
        <Alert
          message="工作流存在问题"
          description={validationErrors.join('；')}
          type="warning"
          showIcon
          closable
          className="validation-alert"
        />
      )}

      <div className="editor-content" ref={reactFlowWrapper}>
        {/* 技能面板 */}
        {skillPanelVisible && (
          <div className="skill-panel">
            <div className="skill-panel-header">
              <h3>技能库</h3>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setSkillPanelVisible(false)}
                size="small"
              />
            </div>
            <div className="skill-panel-content">
              {/* 控制节点分类 */}
              <div className="skill-category">
                <div className="skill-category-title">
                  <span className="category-dot" style={{ backgroundColor: categoryColors.control }} />
                  控制节点
                  <Badge count={controlNodes.length} style={{ backgroundColor: categoryColors.control }} />
                </div>
                {controlNodes.map((node) => (
                  <Tooltip key={node.id} title={node.description} placement="right">
                    <div
                      className="skill-item control-node-item"
                      onClick={() => addControlNode(node.id, node.name)}
                    >
                      <span className="skill-icon">{skillIcons[node.id] || '📦'}</span>
                      <span className="skill-name">{node.name}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>

              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <div key={category} className="skill-category">
                  <div className="skill-category-title">
                    <span className="category-dot" style={{ backgroundColor: categoryColors[category] }} />
                    {categoryNames[category] || category}
                    <Badge count={categorySkills.length} style={{ backgroundColor: categoryColors[category] }} />
                  </div>
                  {categorySkills.map((skill) => (
                    <Tooltip key={skill.id} title={skill.description} placement="right">
                      <div
                        className="skill-item"
                        onClick={() => addNode(skill)}
                        draggable
                        onDragStart={(e) => onDragStart(e, skill)}
                      >
                        <span className="skill-icon">{skillIcons[skill.id] || '📦'}</span>
                        <span className="skill-name">{skill.name}</span>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 画布区域 */}
        <div className="canvas-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => {
              setSelectedNodes([]);
              setConfigDrawerVisible(false);
            }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            selectionMode={SelectionMode.Partial}
            fitView
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              animated: true,
              type: 'insertable', // 默认使用可插入的边类型
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
          >
            <Background />
            <Controls />
            <MiniMap nodeColor={(node) => categoryColors[node.data.category || 'utility']} />
          </ReactFlow>
        </div>

        {/* 配置面板 */}
        {configDrawerVisible && selectedNodes.length > 0 && (
          <div className="config-panel">
            <div className="config-panel-header">
              <h3>节点配置</h3>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setConfigDrawerVisible(false)}
                size="small"
              />
            </div>
            <div className="config-panel-content">
              {selectedNodes.map((node) => (
                <div key={node.id} className="node-config-item">
                  <div className="node-config-header">
                    <span className="node-config-icon">{skillIcons[node.data.skill_id] || '📦'}</span>
                    <span className="node-config-title">{node.data.label}</span>
                  </div>

                  {/* 节点名称编辑 */}
                  <Form layout="vertical" size="small" style={{ marginBottom: 16 }}>
                    <Form.Item label="节点名称">
                      <Input
                        value={node.data.label}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          setNodes((nds) =>
                            nds.map((n) =>
                              n.id === node.id
                                ? { ...n, data: { ...n.data, label: newLabel } }
                                : n
                            )
                          );
                          setSelectedNodes(
                            selectedNodes.map((n) =>
                              n.id === node.id
                                ? { ...n, data: { ...n.data, label: newLabel } }
                                : n
                            )
                          );
                        }}
                        placeholder="请输入节点名称"
                      />
                    </Form.Item>
                  </Form>

                  {/* 动态表单（非控制节点） */}
                  {node.data.skill_id !== 'start' && node.data.skill_id !== 'end' && (
                    <>
                      <Divider style={{ margin: '12px 0' }}>参数配置</Divider>
                      <NodeConfigForm
                        skillId={node.data.skill_id}
                        config={node.data.config || {}}
                        onChange={(newConfig) => {
                          // 同时更新 nodes 和 selectedNodes 状态
                          setNodes((nds) =>
                            nds.map((n) =>
                              n.id === node.id
                                ? { ...n, data: { ...n.data, config: newConfig } }
                                : n
                            )
                          );
                          setSelectedNodes((selNodes) =>
                            selNodes.map((n) =>
                              n.id === node.id
                                ? { ...n, data: { ...n.data, config: newConfig } }
                                : n
                            )
                          );
                        }}
                        skills={skills}
                        allNodes={nodes}
                        allEdges={edges}
                        currentNodeId={node.id}
                      />
                    </>
                  )}

                  {/* 依赖关系显示 */}
                  <Divider style={{ margin: '16px 0' }}>连接关系</Divider>
                  <div className="node-dependencies">
                    <span className="dependencies-label">输入来源：</span>
                    <span className="dependencies-value">
                      {edges.filter((e) => e.target === node.id).map((e) => {
                        const sourceNode = nodes.find(n => n.id === e.source);
                        return sourceNode?.data.label || e.source;
                      }).join(', ') || '无'}
                    </span>
                  </div>
                  <div className="node-dependencies">
                    <span className="dependencies-label">输出到：</span>
                    <span className="dependencies-value">
                      {edges.filter((e) => e.source === node.id).map((e) => {
                        const targetNode = nodes.find(n => n.id === e.target);
                        return targetNode?.data.label || e.target;
                      }).join(', ') || '无'}
                    </span>
                  </div>

                  {/* 输出字段显示 */}
                  <Divider style={{ margin: '16px 0' }}>输出字段（可被其他节点引用）</Divider>
                  {(() => {
                    const skill = skills.find(s => s.id === node.data.skill_id);
                    const outputFields = skill?.output_schema || {};
                    const fieldList = Object.entries(outputFields);

                    if (fieldList.length === 0) {
                      return (
                        <div style={{ padding: '12px 0', textAlign: 'center', color: '#999', fontSize: 12 }}>
                          此节点无输出字段
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {fieldList.map(([fieldName, fieldDef]: [string, any]) => (
                          <div
                            key={fieldName}
                            className="node-output-field-item"
                            draggable
                            onDragStart={(e) => {
                              const fieldLabel = getFieldLabel(fieldName);
                              e.dataTransfer.setData('application/json', JSON.stringify({
                                nodeId: node.id,
                                nodeName: node.data.label,
                                fieldName,
                                fieldLabel,
                                reference: `$.${node.id}.${fieldName}`,
                              }));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                          >
                            <span style={{ color: '#52c41a', fontSize: 14 }}>●</span>
                            <div className="node-output-field-item-content">
                              <div className="node-output-field-item-label">
                                {getFieldLabel(fieldName)}
                              </div>
                              <div className="node-output-field-item-ref">
                                ${node.id}.{fieldName}
                              </div>
                            </div>
                            <span className="node-output-field-item-badge">
                              可拖拽
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 新手引导 */}
      <Tour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          localStorage.setItem('workflow-tour-seen', 'true');
        }}
        steps={tourSteps}
      />

      {/* 执行参数弹窗 */}
      <Modal
        title="执行工作流"
        open={executeModalVisible}
        onOk={() => {
          executeForm.validateFields().then((values) => {
            executeWorkflow(values);
          });
        }}
        onCancel={() => {
          setExecuteModalVisible(false);
          executeForm.resetFields();
        }}
      >
        <Form form={executeForm} layout="vertical">
          <Form.Item label="关键词" name="keyword" rules={[{ required: true, message: '请输入关键词' }]}>
            <Input placeholder="请输入要处理的关键词" />
          </Form.Item>
          <Form.Item label="其他参数">
            <Input.TextArea
              rows={4}
              placeholder='JSON格式的额外参数 (可选)'
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 插入节点弹窗 */}
      <Modal
        title="插入节点"
        open={insertModalVisible}
        onCancel={() => {
          setInsertModalVisible(false);
          setInsertEdgeId(null);
        }}
        footer={null}
        width={600}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {Object.entries(
            skills.reduce((acc, skill) => {
              if (!acc[skill.category]) {
                acc[skill.category] = [];
              }
              acc[skill.category].push(skill);
              return acc;
            }, {} as Record<string, SkillMetadata[]>)
          ).map(([category, categorySkills]) => (
            <div key={category} style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, color: '#666' }}>
                {categoryNames[category] || category}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {categorySkills.map((skill) => (
                  <Card
                    key={skill.id}
                    size="small"
                    hoverable
                    onClick={() => handleInsertNode(skill.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>
                        {skillIcons[skill.id] || '📦'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{skill.name}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {skill.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// 使用 ReactFlowProvider 包装
export default function WorkflowVisualEditor() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  );
}
