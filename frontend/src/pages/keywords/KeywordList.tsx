import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  Popconfirm,
  message,
  Dropdown,
  Modal,
  Form,
  Upload,
  List,
  Spin,
  Progress,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  MoreOutlined,
  RobotOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  MinusOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { keywordsApi, Keyword, KeywordCategory, KeywordPriority, TargetCustomer, ResearchProgress, ResearchTask, ResearchResultItem, SearchMethod, KeywordScene, KEYWORD_SCENES_OPTIONS } from '../../api/keywords';
import { topicsApi } from '../../api/topics';
import { contentsApi } from '../../api/contents';
import { skillsApi } from '../../api/skills';
import { apiClient } from '../../api/client';
import KeywordForm from './KeywordForm';

const categoryOptions = [
  { label: '核心词', value: 'core' },
  { label: '长尾词', value: 'long_tail' },
  { label: '问题词', value: 'question' },
  { label: '指南词', value: 'guide' },
  { label: '对比词', value: 'comparison' },
];

const priorityOptions = [
  { label: 'S', value: 'S' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
];

const targetCustomerOptions = [
  { label: 'C1 - 创业者', value: 'C1-Entrepreneur' },
  { label: 'C2 - 有经验卖家', value: 'C2-Experienced' },
  { label: 'C3 - 团队卖家', value: 'C3-TeamSeller' },
  { label: 'C4 - 本地到全球', value: 'C4-LocalToGlobal' },
];

const targetCustomerMap: Record<TargetCustomer, string> = {
  'C1-Entrepreneur': '创业者',
  'C2-Experienced': '有经验卖家',
  'C3-TeamSeller': '团队卖家',
  'C4-LocalToGlobal': '本地到全球',
};

const competitionOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
];

const intentOptions = [
  { label: '信息型', value: 'informational' },
  { label: '商业型', value: 'commercial' },
  { label: '交易型', value: 'transactional' },
  { label: '导航型', value: 'navigational' },
];

const categoryMap: Record<KeywordCategory, string> = {
  core: '核心词',
  long_tail: '长尾词',
  question: '问题词',
  guide: '指南词',
  comparison: '对比词',
};

const competitionMap: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'green' },
  medium: { label: '中', color: 'orange' },
  high: { label: '高', color: 'red' },
};

const intentMap: Record<string, string> = {
  informational: '信息型',
  commercial: '商业型',
  transactional: '交易型',
  navigational: '导航型',
};

const intentColorMap: Record<string, string> = {
  informational: 'blue',
  commercial: 'orange',
  transactional: 'green',
  navigational: 'purple',
};

// 场景映射
const sceneLabelMap: Record<KeywordScene, string> = {
  website: '网站',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  amazon: '亚马逊',
  linkedin: 'LinkedIn',
};

const sceneOptions = KEYWORD_SCENES_OPTIONS;

// 搜索方法映射和颜色
const searchMethodMap: Record<SearchMethod, string> = {
  api: 'API',
  crawler: '爬虫',
  google: 'Google搜索',
};

const searchMethodColorMap: Record<SearchMethod, string> = {
  api: 'blue',
  crawler: 'purple',
  google: 'orange',
};

const priorityColorMap: Record<KeywordPriority, string> = {
  S: 'red',
  A: 'orange',
  B: 'blue',
  C: 'default',
};

export default function KeywordListPage() {
  const navigate = useNavigate();

  // Data state
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [stats, setStats] = useState<{ total: number; byCategory: Record<string, number>; byPriority: Record<string, number>; byTargetCustomer: Record<string, number> } | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filter state - 必须在 ref 之前声明
  const [filters, setFilters] = useState<{
    category?: KeywordCategory;
    priority?: KeywordPriority;
    target_customer?: TargetCustomer;
    competition?: 'low' | 'medium' | 'high';
    intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
    scenes?: KeywordScene;
    search?: string;
  }>({});

  // 使用 ref 存储最新的 filters 和 pagination，避免闭包问题
  const filtersRef = useRef(filters);
  const paginationRef = useRef(pagination);

  // 更新 ref 当状态变化时
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Batch operation state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkUpdateModalVisible, setBulkUpdateModalVisible] = useState(false);
  const [bulkUpdateForm] = Form.useForm();

  // Import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Classification state
  const [classifying, setClassifying] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | undefined>(undefined);

  // Workflow execution state
  const [workflowSelectModalVisible, setWorkflowSelectModalVisible] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>('');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState(false);

  // Research state
  const [researchModalVisible, setResearchModalVisible] = useState(false);
  const [researchProgress, setResearchProgress] = useState<ResearchProgress | null>(null);
  const [researchPolling, setResearchPolling] = useState(false);
  const [researchResults, setResearchResults] = useState<ResearchTask | null>(null);
  // 跟踪是否应该自动生成话题（从"引用到话题"触发）
  const [autoGenerateTopics, setAutoGenerateTopics] = useState(false);
  // 研究窗口最小化状态
  const [researchWindowMinimized, setResearchWindowMinimized] = useState(false);

  // Topic/Content/Skill execution state
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [skills, setSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [topicForm] = Form.useForm();
  const [contentForm] = Form.useForm();

  // Fetch keywords
  const fetchKeywords = useCallback(async (page?: number, pageSize?: number) => {
    setLoading(true);
    try {
      // 使用 ref 中的最新值
      const actualPage = page ?? paginationRef.current.current;
      const actualPageSize = pageSize ?? paginationRef.current.pageSize;
      const currentFilters = filtersRef.current;

      const result = await keywordsApi.list({
        page: actualPage,
        pageSize: actualPageSize,
        ...currentFilters,
      });

      setKeywords(result.keywords);
      setPagination((prev) => ({
        ...prev,
        current: actualPage,
        pageSize: actualPageSize,
        total: result.total,
      }));
    } catch (error) {
      message.error('获取关键词列表失败');
    } finally {
      setLoading(false);
    }
  }, []); // 移除所有依赖，使用 ref 中的值

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await keywordsApi.getStats();
      setStats(result);
    } catch (error) {
      // Error handled silently
    }
  }, []);

  // Initial load - 只在组件挂载时执行一次
  useEffect(() => {
    fetchKeywords();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle table change
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchKeywords(newPagination.current || 1, newPagination.pageSize || 20);
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    // 筛选改变后重置到第一页并刷新数据
    fetchKeywords(1, pagination.pageSize);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
    // 搜索后重置到第一页并刷新数据
    fetchKeywords(1, pagination.pageSize);
  };

  // Handle create
  const handleCreate = () => {
    setEditingKeyword(undefined);
    setModalVisible(true);
  };

  // Handle edit
  const handleEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await keywordsApi.delete(id);
      message.success('删除成功');
      fetchKeywords();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('删除失败');
    }
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingKeyword) {
        await keywordsApi.update(editingKeyword.id, values);
        message.success('更新成功');
      } else {
        await keywordsApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchKeywords();
      fetchStats();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || (editingKeyword ? '更新失败' : '创建失败');
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的关键词');
      return;
    }
    try {
      await keywordsApi.bulkDelete(selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 个关键词`);
      fetchKeywords();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async (values: any) => {
    try {
      const { field, value } = values;
      const updates: Record<string, any> = {};
      updates[field] = value;
      await keywordsApi.bulkUpdate(selectedRowKeys as string[], updates);
      message.success(`成功更新 ${selectedRowKeys.length} 个关键词`);
      setBulkUpdateModalVisible(false);
      bulkUpdateForm.resetFields();
      fetchKeywords();
      fetchStats();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量更新失败');
    }
  };

  // Handle classify target customers
  const handleClassifyTargetCustomers = async () => {
    setClassifying(true);
    try {
      const result = await keywordsApi.classifyTargetCustomers(1000);
      message.success(`成功分类 ${result.updated} 个关键词，剩余 ${result.remaining} 个待分类`);
      fetchKeywords();
      fetchStats();

      // 如果还有剩余，询问是否继续
      if (result.remaining > 0) {
        Modal.confirm({
          title: '继续分类?',
          content: `还有 ${result.remaining} 个关键词未分类，是否继续?`,
          onOk: () => handleClassifyTargetCustomers(),
        });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || '分类失败';
      message.error(errorMessage);
    } finally {
      setClassifying(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await keywordsApi.export(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keywords_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // Handle import
  const handleImport = async () => {
    if (importFileList.length === 0) {
      message.warning('请选择要导入的文件');
      return;
    }

    setImporting(true);
    try {
      const file = importFileList[0].originFileObj;
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // 跳过表头
      const dataLines = lines.slice(1);
      const keywords = [];

      // 有效的场景枚举值
      const VALID_SCENES: KeywordScene[] = ['website', 'tiktok', 'youtube', 'twitter', 'instagram', 'facebook', 'amazon', 'linkedin'];

      for (const line of dataLines) {
        // 更健壮的CSV解析，处理引号内的逗号
        const parts = parseCSVLine(line);
        if (parts.length >= 2) {
          // 解析场景字段（第8列，用分号分隔）
          const scenesStr = parts[7] ? parts[7].replace(/"/g, '').trim() : '';
          const scenes = scenesStr
            ? scenesStr.split(';')
                .map(s => s.trim())
                .filter((s): s is KeywordScene => VALID_SCENES.includes(s as KeywordScene))
            : [];

          keywords.push({
            keyword: parts[0].replace(/"/g, '').trim(),
            category: parts[1] ? parts[1].replace(/"/g, '').trim() as KeywordCategory : 'core',
            search_volume: parts[2] ? parseInt(parts[2].replace(/"/g, '').trim()) || 0 : 0,
            competition: parts[3] ? parts[3].replace(/"/g, '').trim() as any : 'medium',
            intent: parts[4] ? parts[4].replace(/"/g, '').trim() as any : 'informational',
            priority: parts[5] ? parts[5].replace(/"/g, '').trim() as KeywordPriority : 'C',
            scenes,
          });
        }
      }

      if (keywords.length > 0) {
        await keywordsApi.bulkCreate(keywords);
        message.success(`成功导入 ${keywords.length} 个关键词`);
        setImportModalVisible(false);
        setImportFileList([]);
        fetchKeywords();
        fetchStats();
      } else {
        message.warning('文件中没有有效数据');
      }
    } catch (error) {
      message.error('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
    }
  };

  // 辅助函数：解析CSV行，处理引号内的逗号
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Handle download template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await keywordsApi.getExportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keywords_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('下载模板失败');
    }
  };

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // Batch action menu items
  const batchActionMenuItems = [
    {
      key: 'priority',
      label: '批量更新优先级',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'priority' });
      },
    },
    {
      key: 'category',
      label: '批量更新分类',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'category' });
      },
    },
    {
      key: 'scenes',
      label: '批量更新场景',
      onClick: () => {
        setBulkUpdateModalVisible(true);
        bulkUpdateForm.setFieldsValue({ field: 'scenes' });
      },
    },
    {
      key: 'delete',
      label: '批量删除',
      danger: true,
      onClick: handleBatchDelete,
    },
  ];

  // Table columns
  const columns: ColumnsType<Keyword> = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: KeywordCategory | null) => {
        if (!category) return '-';
        return <Tag>{categoryMap[category] || category}</Tag>;
      },
    },
    {
      title: '搜索量',
      dataIndex: 'search_volume',
      key: 'search_volume',
      width: 120,
      render: (value: number) => value?.toLocaleString() || '-',
      sorter: true,
    },
    {
      title: '竞争度',
      dataIndex: 'competition',
      key: 'competition',
      width: 100,
      render: (competition: string) => {
        const { label, color } = competitionMap[competition] || { label: competition, color: 'default' };
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '意图',
      dataIndex: 'intent',
      key: 'intent',
      width: 100,
      render: (intent: string) => (
        <Tag color={intentColorMap[intent]}>{intentMap[intent] || intent}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: KeywordPriority) => (
        <Tag color={priorityColorMap[priority]}>{priority}</Tag>
      ),
    },
    {
      title: '目标客户',
      dataIndex: 'target_customer',
      key: 'target_customer',
      width: 150,
      render: (customer: TargetCustomer | null) => {
        if (!customer) return '-';
        const label = targetCustomerMap[customer];
        return label ? (
          <Tag color={customer === 'C1-Entrepreneur' ? 'blue' :
                      customer === 'C2-Experienced' ? 'green' :
                      customer === 'C3-TeamSeller' ? 'orange' : 'purple'}>
            {label}
          </Tag>
        ) : customer;
      },
    },
    {
      title: '场景',
      dataIndex: 'scenes',
      key: 'scenes',
      width: 150,
      render: (scenes: KeywordScene[] | null) => {
        if (!scenes || scenes.length === 0) return '-';
        return (
          <Space size={4} wrap>
            {scenes.slice(0, 3).map(scene => (
              <Tag key={scene} color="blue">
                {sceneLabelMap[scene] || scene}
              </Tag>
            ))}
            {scenes.length > 3 && (
              <Tag>+{scenes.length - 3}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '引用',
      key: 'reference',
      width: 100,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'topic',
                label: '引用到话题',
                onClick: () => handleReferenceKeyword(record, 'topic'),
              },
              {
                key: 'content',
                label: '引用到内容',
                onClick: () => handleReferenceKeyword(record.keyword, 'content'),
              },
              {
                key: 'workflow',
                label: '引用到工作流',
                onClick: () => handleReferenceKeyword(record.keyword, 'workflow'),
              },
              {
                key: 'skill',
                label: '引用到技能库',
                onClick: () => handleReferenceKeyword(record.keyword, 'skill'),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="link" size="small">
            引用 <MoreOutlined />
          </Button>
        </Dropdown>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SearchOutlined />}
            onClick={() => handleResearchKeyword(record)}
          >
            调研
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个关键词吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Handle keyword reference
  const handleReferenceKeyword = async (keyword: Keyword | string, targetType: 'topic' | 'content' | 'workflow' | 'skill') => {
    // 处理参数：可能是 Keyword 对象或字符串
    const keywordText = typeof keyword === 'string' ? keyword : keyword.keyword;
    const keywordId = typeof keyword === 'string' ? null : keyword.id;

    setSelectedKeyword(keywordText);

    if (targetType === 'workflow') {
      // 工作流：打开选择对话框
      setWorkflowSelectModalVisible(true);
      fetchWorkflows();
    } else if (targetType === 'topic') {
      // 话题：打开创建对话框
      setTopicModalVisible(true);
      topicForm.setFieldsValue({
        title: keywordText,
        description: `基于关键词"${keywordText}"生成的话题`,
        topic_type: 'insight',
        target_customer: 'startup',
        priority: 'B',
      });

      // 自动开始关键词调研
      if (keywordId) {
        // 设置标志：调研完成后自动生成话题
        setAutoGenerateTopics(true);

        // 打开调研进度对话框，让用户看到实时进度
        setSelectedKeywordId(keywordId);
        setSelectedKeyword(keywordText);
        setResearchModalVisible(true);
        setResearchProgress(null);
        setResearchResults(null);

        try {
          const result = await keywordsApi.startResearch(keywordId, false);
          message.success('已打开话题创建，并自动启动关键词调研');

          // 开始轮询调研进度
          setResearchPolling(true);
          pollResearchProgress(keywordId);
        } catch (error: any) {
          console.error('启动调研失败:', error);
          // 调研失败，重置标志
          setAutoGenerateTopics(false);
          // 调研失败不影响话题创建，只提示错误
          message.warning('话题创建已打开，但调研启动失败');
        }
      }
    } else if (targetType === 'content') {
      // 内容：打开生成对话框
      setContentModalVisible(true);
      contentForm.setFieldsValue({
        topic_title: keywordText,
        content_type: 'article',
        platform: 'blog',
        target_customer: 'startup',
      });
    } else if (targetType === 'skill') {
      // 技能：打开选择对话框
      setSkillModalVisible(true);
      fetchSkills();
    }
  };

  // Fetch skills
  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const response = await apiClient.get<any>('/workflows/skills');
      const apiResponse = (response as any).data || response;
      if (apiResponse.success) {
        setSkills(apiResponse.data.skills || []);
      }
    } catch (error) {
      message.error('获取技能列表失败');
    } finally {
      setSkillsLoading(false);
    }
  };

  // Execute topic creation and generation
  const handleExecuteTopic = async () => {
    const values = topicForm.getFieldsValue();
    setExecuting(true);
    try {
      // 创建话题
      const topic = await topicsApi.create({
        title: values.title,
        description: values.description,
        topic_type: values.topic_type,
        target_customer: values.target_customer,
        priority: values.priority,
      });

      message.success(`话题已创建，ID: ${topic.id}`);
      setTopicModalVisible(false);
      topicForm.resetFields();

      // 跳转到话题列表或详情页
      navigate(`/topics`);
    } catch (error) {
      message.error('创建话题失败');
    } finally {
      setExecuting(false);
    }
  };

  // Execute content generation
  const handleExecuteContent = async () => {
    const values = contentForm.getFieldsValue();
    setExecuting(true);
    try {
      // 生成内容
      const content = await contentsApi.generate({
        topic_title: values.topic_title,
        topic_description: `基于关键词"${selectedKeyword}"生成的内容`,
        content_type: values.content_type,
        platform: values.platform,
        target_customer: values.target_customer,
      });

      message.success('内容已生成');
      setContentModalVisible(false);
      contentForm.resetFields();

      // 跳转到内容列表
      navigate('/contents');
    } catch (error) {
      message.error('生成内容失败');
    } finally {
      setExecuting(false);
    }
  };

  // Execute skill
  const handleExecuteSkill = async (skillCode: string, skillName: string) => {
    setExecuting(true);
    try {
      await skillsApi.execute(skillCode, { keyword: selectedKeyword });
      message.success(`技能"${skillName}"已开始执行，关键词："${selectedKeyword}"`);
      setSkillModalVisible(false);

      // 跳转到技能执行历史
      navigate('/skills');
    } catch (error) {
      message.error('执行技能失败');
    } finally {
      setExecuting(false);
    }
  };

  // Fetch workflows for selection
  const fetchWorkflows = async () => {
    setWorkflowsLoading(true);
    try {
      const response = await apiClient.get<any>('/workflows', { pageSize: 100 });
      const apiResponse = (response as any).data || response;
      if (apiResponse.success) {
        setWorkflows(apiResponse.data.workflows);
      }
    } catch (error) {
      message.error('获取工作流列表失败');
    } finally {
      setWorkflowsLoading(false);
    }
  };

  // Execute workflow with selected keyword
  const handleExecuteWorkflow = async (workflowId: string, workflowName: string) => {
    setExecutingWorkflow(true);
    try {
      const response = await apiClient.post(`/workflows/${workflowId}/execute`, {
        input_data: { keyword: selectedKeyword },
      });

      if (response.success) {
        message.success(`工作流"${workflowName}"已开始执行，关键词："${selectedKeyword}"`);
        setWorkflowSelectModalVisible(false);

        // 跳转到执行历史页面查看进度
        const executionId = response.data?.execution?.id;
        if (executionId) {
          navigate(`/workflows/executions/${executionId}`);
        } else {
          navigate('/workflows/executions');
        }
      }
    } catch (error) {
      message.error('执行工作流失败');
    } finally {
      setExecutingWorkflow(false);
    }
  };

  // Handle keyword research
  const handleResearchKeyword = async (keyword: Keyword) => {
    setSelectedKeywordId(keyword.id);
    setSelectedKeyword(keyword.keyword);
    setResearchModalVisible(true);
    setResearchProgress(null);
    setResearchResults(null);

    // 手动调研，不自动生成话题
    setAutoGenerateTopics(false);

    try {
      // Start research
      const result = await keywordsApi.startResearch(keyword.id, false);
      message.success('调研任务已启动');

      // Start polling for progress
      setResearchPolling(true);
      pollResearchProgress(keyword.id);
    } catch (error: any) {
      message.error(error?.response?.data?.error?.message || '启动调研失败');
    }
  };

  // Poll research progress
  const pollResearchProgress = async (keywordId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await keywordsApi.getResearchStatus(keywordId);
        // 确保status是有效的对象
        if (!status || typeof status !== 'object') {
          console.warn('Invalid research status:', status);
          return;
        }
        setResearchProgress(status);

        // If completed, fetch results and stop polling
        if (status.status === 'completed') {
          clearInterval(interval);
          setResearchPolling(false);

          const results = await keywordsApi.getResearchResults(keywordId);
          setResearchResults(results);

          // 如果是从"引用到话题"触发的，自动生成话题
          if (autoGenerateTopics) {
            try {
              message.loading('正在根据调研结果生成话题...', 0);

              // 从调研结果获取目标客户类型
              const targetCustomer = results?.keyword?.target_customer || 'startup';

              // 自动生成话题
              const topics = await keywordsApi.generateTopicsFromResearch(keywordId, {
                maxTopics: 5,
                targetCustomer,
              });

              message.destroy();
              message.success(`调研完成！已自动生成 ${topics.length} 个话题并添加到话题管理`);

              // 刷新关键词列表
              fetchKeywords();

              // 重置自动生成标志
              setAutoGenerateTopics(false);

              // 提示用户可以到话题管理查看
              setTimeout(() => {
                message.info('您可以在"话题管理"页面查看生成的话题');
              }, 2000);
            } catch (error: any) {
              message.destroy();
              console.error('生成话题失败:', error);
              // 重置自动生成标志
              setAutoGenerateTopics(false);
              message.warning('调研完成，但自动生成话题失败：' + (error?.response?.data?.error?.message || error.message));
            }
          } else {
            message.success('调研完成！');
          }
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setResearchPolling(false);
          setAutoGenerateTopics(false); // 重置标志
          message.error('调研失败');
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(interval);
        setResearchPolling(false);
        setAutoGenerateTopics(false); // 重置标志
      }
    }, 2000); // Poll every 2 seconds
  };

  // Handle view research results
  const handleViewResearchResults = async (keyword: Keyword) => {
    setSelectedKeywordId(keyword.id);
    setSelectedKeyword(keyword.keyword);
    setResearchModalVisible(true);

    try {
      const status = await keywordsApi.getResearchStatus(keyword.id);
      if (status.status === 'completed') {
        const results = await keywordsApi.getResearchResults(keyword.id);
        setResearchResults(results);
        setResearchProgress(status);
      } else {
        setResearchProgress(status);
        // Start polling if in progress
        if (status.status === 'in_progress') {
          setResearchPolling(true);
          pollResearchProgress(keyword.id);
        }
      }
    } catch (error) {
      message.error('获取调研状态失败');
    }
  };

  // Close research modal
  const handleCloseResearchModal = () => {
    setResearchModalVisible(false);
    setResearchWindowMinimized(false);
    setResearchProgress(null);
    setResearchResults(null);
    setResearchPolling(false);
    setSelectedKeywordId('');
    setSelectedKeyword('');
  };

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总关键词数" value={stats.total} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="S级关键词" value={stats.byPriority?.S || 0} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="A级关键词" value={stats.byPriority?.A || 0} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="核心词" value={stats.byCategory?.core || 0} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Card */}
      <Card
        title="关键词管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchKeywords}>
              刷新
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
              导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button
              icon={<RobotOutlined />}
              onClick={handleClassifyTargetCustomers}
              loading={classifying}
            >
              自动分类目标客户
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              添加关键词
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space size="middle" wrap style={{ width: '100%' }}>
          <Input.Search
            placeholder="搜索关键词"
            style={{ width: 200 }}
            onSearch={handleSearch}
            allowClear
          />
          <Select
            placeholder="分类筛选"
            style={{ width: 120 }}
            options={categoryOptions}
            allowClear
            onChange={(value) => handleFilterChange('category', value)}
          />
          <Select
            placeholder="优先级筛选"
            style={{ width: 120 }}
            options={priorityOptions}
            allowClear
            onChange={(value) => handleFilterChange('priority', value)}
          />
          <Select
            placeholder="目标客户筛选"
            style={{ width: 150 }}
            options={targetCustomerOptions}
            allowClear
            onChange={(value) => handleFilterChange('target_customer', value)}
          />
          <Select
            placeholder="竞争度筛选"
            style={{ width: 120 }}
            options={competitionOptions}
            allowClear
            onChange={(value) => handleFilterChange('competition', value)}
          />
          <Select
            placeholder="意图筛选"
            style={{ width: 120 }}
            options={intentOptions}
            allowClear
            onChange={(value) => handleFilterChange('intent', value)}
          />
          <Select
            placeholder="场景筛选"
            style={{ width: 120 }}
            options={sceneOptions}
            allowClear
            onChange={(value) => handleFilterChange('scenes', value)}
          />
          <Button type="link" onClick={handleDownloadTemplate}>
            下载导入模板
          </Button>
        </Space>
      </Card>

      {/* Batch Actions Bar */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Dropdown menu={{ items: batchActionMenuItems }}>
              <Button>
                批量操作 <MoreOutlined />
              </Button>
            </Dropdown>
            <Button type="link" onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        </Card>
      )}

      {/* Table */}
      <Table
        rowKey="id"
        rowSelection={rowSelection}
        columns={columns}
        dataSource={keywords}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />

      {/* Form Modal */}
      <KeywordForm
        visible={modalVisible}
        keyword={editingKeyword}
        onSubmit={handleSubmit}
        onCancel={() => setModalVisible(false)}
        loading={submitting}
      />

      {/* Bulk Update Modal */}
      <Modal
        title="批量更新关键词"
        open={bulkUpdateModalVisible}
        onCancel={() => {
          setBulkUpdateModalVisible(false);
          bulkUpdateForm.resetFields();
        }}
        onOk={() => bulkUpdateForm.submit()}
        okText="更新"
        cancelText="取消"
      >
        <Form form={bulkUpdateForm} layout="vertical" onFinish={handleBulkUpdate}>
          <Form.Item
            label="更新字段"
            name="field"
            rules={[{ required: true, message: '请选择要更新的字段' }]}
          >
            <Select>
              <Select.Option value="priority">优先级</Select.Option>
              <Select.Option value="category">分类</Select.Option>
              <Select.Option value="competition">竞争度</Select.Option>
              <Select.Option value="intent">意图</Select.Option>
              <Select.Option value="scenes">场景</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.field !== currentValues.field}>
            {({ getFieldValue }) => {
              const field = getFieldValue('field');
              if (field === 'priority') {
                return (
                  <Form.Item
                    label="新优先级"
                    name="value"
                    rules={[{ required: true, message: '请选择优先级' }]}
                  >
                    <Select>
                      {priorityOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'category') {
                return (
                  <Form.Item
                    label="新分类"
                    name="value"
                    rules={[{ required: true, message: '请选择分类' }]}
                  >
                    <Select>
                      {categoryOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'competition') {
                return (
                  <Form.Item
                    label="新竞争度"
                    name="value"
                    rules={[{ required: true, message: '请选择竞争度' }]}
                  >
                    <Select>
                      <Select.Option value="low">低</Select.Option>
                      <Select.Option value="medium">中</Select.Option>
                      <Select.Option value="high">高</Select.Option>
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'intent') {
                return (
                  <Form.Item
                    label="新意图"
                    name="value"
                    rules={[{ required: true, message: '请选择意图' }]}
                  >
                    <Select>
                      <Select.Option value="informational">信息型</Select.Option>
                      <Select.Option value="commercial">商业型</Select.Option>
                      <Select.Option value="transactional">交易型</Select.Option>
                      <Select.Option value="navigational">导航型</Select.Option>
                    </Select>
                  </Form.Item>
                );
              }
              if (field === 'scenes') {
                return (
                  <Form.Item
                    label="新场景"
                    name="value"
                    rules={[{ required: true, message: '请选择场景' }]}
                  >
                    <Select mode="multiple" options={sceneOptions} placeholder="选择场景" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="导入关键词"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportFileList([]);
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setImportModalVisible(false);
              setImportFileList([]);
            }}>
              取消
            </Button>
            <Button onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button type="primary" onClick={handleImport} loading={importing}>
              导入
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <p>请选择CSV文件进行导入。文件格式要求：</p>
          <ul>
            <li>第一列：关键词</li>
            <li>第二列：分类 (core/long_tail/question/guide/comparison)</li>
            <li>第三列：搜索量 (数字，可选)</li>
            <li>第四列：竞争度 (low/medium/high，可选)</li>
            <li>第五列：意图 (informational/commercial/transactional/navigational，可选)</li>
            <li>第六列：优先级 (S/A/B/C，可选)</li>
            <li>第七列：目标客户 (可选)</li>
            <li>第八列：场景 (多个场景用分号;分隔，如：tiktok;youtube，可选)</li>
          </ul>
        </div>
        <Upload
          fileList={importFileList}
          onChange={({ fileList }) => setImportFileList(fileList)}
          beforeUpload={() => false}
          accept=".csv"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>

      {/* Workflow Selection Modal */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined />
            <span>选择工作流执行</span>
          </Space>
        }
        open={workflowSelectModalVisible}
        onCancel={() => setWorkflowSelectModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <strong>关键词：</strong>
              <Tag color="blue" style={{ fontSize: 14 }}>{selectedKeyword}</Tag>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              选择一个工作流来自动执行，关键词将自动填入工作流的参数中
            </div>
          </Space>
        </div>

        {workflowsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <List
            dataSource={workflows}
            renderItem={(workflow: any) => (
              <List.Item
                actions={[
                  <Button
                    key="execute"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={executingWorkflow}
                    onClick={() => handleExecuteWorkflow(workflow.id, workflow.name)}
                    disabled={executingWorkflow}
                  >
                    执行
                  </Button>,
                  <Button
                    key="manual"
                    icon={<ThunderboltOutlined />}
                    onClick={() => {
                      // 手动执行：跳转到工作流页面，带上关键词参数
                      setWorkflowSelectModalVisible(false);
                      navigate(`/workflows/${workflow.id}/visual?keyword=${encodeURIComponent(selectedKeyword)}`);
                    }}
                    disabled={executingWorkflow}
                  >
                    手动
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={workflow.is_template ? <ThunderboltOutlined style={{ fontSize: 24, color: '#faad14' }} /> : null}
                  title={workflow.name}
                  description={
                    <Space direction="vertical" size={0}>
                      {workflow.description && <span>{workflow.description}</span>}
                      <Space size="small">
                        <Tag color={workflow.category === 'bilingual' ? 'cyan' :
                                  workflow.category === 'blog' ? 'blue' :
                                  workflow.category === 'social_media' ? 'green' :
                                  workflow.category === 'video' ? 'purple' :
                                  workflow.category === 'report' ? 'orange' : 'default'}>
                          {workflow.category === 'bilingual' ? '双语内容' :
                           workflow.category === 'blog' ? '博客' :
                           workflow.category === 'social_media' ? '社交媒体' :
                           workflow.category === 'video' ? '视频' :
                           workflow.category === 'report' ? '报告' : '自定义'}
                        </Tag>
                        {workflow.estimated_time && (
                          <Tag>预计 {Math.floor(workflow.estimated_time / 60)}分钟</Tag>
                        )}
                        {workflow.estimated_cost && (
                          <Tag>${workflow.estimated_cost.toFixed(2)}</Tag>
                        )}
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Space>
            <Button onClick={() => setWorkflowSelectModalVisible(false)}>
              取消
            </Button>
            <Button type="link" onClick={() => navigate('/workflows')}>
              管理工作流
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Topic Creation Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>创建话题</span>
          </Space>
        }
        open={topicModalVisible}
        onCancel={() => {
          setTopicModalVisible(false);
          topicForm.resetFields();
        }}
        onOk={handleExecuteTopic}
        okText="创建"
        cancelText="取消"
        confirmLoading={executing}
        width={600}
      >
        <Form form={topicForm} layout="vertical">
          <Form.Item
            label="关键词"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="话题标题（使用关键词）" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="话题描述" />
          </Form.Item>

          <Form.Item label="话题类型" name="topic_type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="tutorial">教程</Select.Option>
              <Select.Option value="qa">问答</Select.Option>
              <Select.Option value="case_study">案例研究</Select.Option>
              <Select.Option value="insight">见解</Select.Option>
              <Select.Option value="review">评测</Select.Option>
              <Select.Option value="comparison">对比</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="目标客户" name="target_customer" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="startup">创业者</Select.Option>
              <Select.Option value="experienced">有经验者</Select.Option>
              <Select.Option value="team">团队</Select.Option>
              <Select.Option value="local">本地商家</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="优先级" name="priority" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="S">S级</Select.Option>
              <Select.Option value="A">A级</Select.Option>
              <Select.Option value="B">B级</Select.Option>
              <Select.Option value="C">C级</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Content Generation Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>生成内容</span>
          </Space>
        }
        open={contentModalVisible}
        onCancel={() => {
          setContentModalVisible(false);
          contentForm.resetFields();
        }}
        onOk={handleExecuteContent}
        okText="生成"
        cancelText="取消"
        confirmLoading={executing}
        width={600}
      >
        <Form form={contentForm} layout="vertical">
          <Form.Item
            label="关键词"
            name="topic_title"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input placeholder="使用关键词作为话题标题" />
          </Form.Item>

          <Form.Item label="内容类型" name="content_type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="article">文章</Select.Option>
              <Select.Option value="video_script">视频脚本</Select.Option>
              <Select.Option value="social_post">社交媒体帖子</Select.Option>
              <Select.Option value="forum_answer">论坛回答</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="平台" name="platform" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="blog">博客</Select.Option>
              <Select.Option value="youtube">YouTube</Select.Option>
              <Select.Option value="tiktok">TikTok</Select.Option>
              <Select.Option value="instagram">Instagram</Select.Option>
              <Select.Option value="linkedin">LinkedIn</Select.Option>
              <Select.Option value="twitter">Twitter</Select.Option>
              <Select.Option value="reddit">Reddit</Select.Option>
              <Select.Option value="pinterest">Pinterest</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="目标客户" name="target_customer" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="startup">创业者</Select.Option>
              <Select.Option value="experienced">有经验者</Select.Option>
              <Select.Option value="team">团队</Select.Option>
              <Select.Option value="local">本地商家</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Skill Execution Modal */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined />
            <span>选择技能执行</span>
          </Space>
        }
        open={skillModalVisible}
        onCancel={() => setSkillModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <strong>关键词：</strong>
              <Tag color="blue" style={{ fontSize: 14 }}>{selectedKeyword}</Tag>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              选择一个技能来执行，关键词将自动填入技能的参数中
            </div>
          </Space>
        </div>

        {skillsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <List
            dataSource={skills}
            renderItem={(skill: any) => (
              <List.Item
                actions={[
                  <Button
                    key="execute"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={executing}
                    onClick={() => handleExecuteSkill(skill.id, skill.name)}
                    disabled={executing}
                  >
                    执行
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={skill.name}
                  description={
                    <Space direction="vertical" size={0}>
                      <span>{skill.description}</span>
                      <Space size="small">
                        <Tag color={skill.category === 'research' ? 'blue' :
                                  skill.category === 'content' ? 'green' :
                                  skill.category === 'optimization' ? 'orange' :
                                  skill.category === 'publishing' ? 'purple' : 'default'}>
                          {skill.category === 'research' ? '研究' :
                           skill.category === 'content' ? '内容生成' :
                           skill.category === 'optimization' ? '优化' :
                           skill.category === 'publishing' ? '发布' : '工具'}
                        </Tag>
                        <Tag>{skill.estimated_time}秒</Tag>
                        {skill.estimated_cost && (
                          <Tag>${skill.estimated_cost.toFixed(3)}</Tag>
                        )}
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Space>
            <Button onClick={() => setSkillModalVisible(false)}>
              取消
            </Button>
            <Button type="link" onClick={() => navigate('/skills')}>
              技能库
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Keyword Research Modal */}
      <Modal
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <SearchOutlined />
              <span>
                {autoGenerateTopics ? '引用到话题 - ' : '关键词调研 - '}
                {String(selectedKeyword || '')}
              </span>
            </Space>
            {researchPolling && (
              <Button
                type="text"
                size="small"
                icon={<MinusOutlined />}
                onClick={() => setResearchWindowMinimized(true)}
                style={{ marginLeft: 'auto' }}
              >
                最小化
              </Button>
            )}
          </Space>
        }
        open={researchModalVisible && !researchWindowMinimized}
        onCancel={handleCloseResearchModal}
        footer={
          <Space>
            <Button onClick={handleCloseResearchModal} disabled={researchPolling}>
              {researchPolling ? '调研进行中...' : '关闭'}
            </Button>
            {researchResults && !autoGenerateTopics && (
              <Button type="primary" onClick={() => navigate('/topics')}>
                查看生成的话题
              </Button>
            )}
          </Space>
        }
        width={800}
        closable={!researchPolling}
        maskClosable={!researchPolling}
      >
        {autoGenerateTopics && (
          <Alert
            message="自动化流程进行中"
            description="调研完成后将自动根据结果生成话题并添加到话题管理"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {researchProgress && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>状态：</strong>
                  <Tag color={
                    researchProgress.status === 'completed' ? 'green' :
                    researchProgress.status === 'in_progress' ? 'blue' :
                    researchProgress.status === 'failed' ? 'red' : 'default'
                  }>
                    {researchProgress.status === 'pending' ? '等待中' :
                     researchProgress.status === 'in_progress' ? '进行中' :
                     researchProgress.status === 'completed' ? '已完成' :
                     researchProgress.status === 'failed' ? '失败' : String(researchProgress.status || '未知')}
                  </Tag>
                </div>
                <div>
                  <strong>调研进度：</strong>
                  {researchProgress.completed_channels} / {researchProgress.total_channels} 个渠道
                  ({researchProgress.progress}%)
                </div>
                {researchProgress.current_channel && (
                  <div>
                    <strong>当前渠道：</strong>
                    <Tag color="blue">{researchProgress.current_channel}</Tag>
                  </div>
                )}
                <div>
                  <strong>已收集结果：</strong>
                  <Tag color="green" style={{ fontSize: 16 }}>
                    {researchProgress.results_summary?.total_results || 0} 条
                  </Tag>
                </div>
                {researchProgress.results_summary && typeof researchProgress.results_summary.by_channel === 'object' && (
                  <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      各渠道结果统计：
                    </div>
                    <Space wrap>
                      {Object.entries(researchProgress.results_summary.by_channel || {}).map(([channel, count]) => (
                        <Tag key={channel}>
                          {channel}: {count}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
                <Progress
                  percent={researchProgress.progress}
                  status={researchPolling ? 'active' : researchProgress.status === 'completed' ? 'success' : 'normal'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </Space>
            </div>
          </div>
        )}

        {researchResults && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h4>调研结果汇总</h4>
              <p>共收集到 <strong>{(researchResults.results || []).reduce((sum, r) => sum + (r.result_count || 0), 0)}</strong> 条结果</p>
              <p>知识库匹配 <strong>{researchResults.knowledge_results?.length || 0}</strong> 条</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4>各渠道结果</h4>
              <List
                size="small"
                dataSource={researchResults.results}
                renderItem={(item: ResearchResultItem) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.channel_name} ({item.channel_name_en})</span>
                          {item.method && (
                            <Tag color={searchMethodColorMap[item.method]}>
                              {searchMethodMap[item.method]}
                            </Tag>
                          )}
                          <Tag color={
                            item.status === 'completed' ? 'green' :
                            item.status === 'processing' ? 'blue' :
                            item.status === 'failed' ? 'red' : 'default'
                          }>
                            {item.status === 'completed' ? '已完成' :
                             item.status === 'processing' ? '进行中' :
                             item.status === 'failed' ? '失败' : item.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <span>{item.result_count} 条结果</span>
                          {item.started_at && (
                            <span style={{ fontSize: 12, color: '#999' }}>
                              开始时间: {new Date(item.started_at).toLocaleTimeString()}
                            </span>
                          )}
                          {item.completed_at && (
                            <span style={{ fontSize: 12, color: '#999' }}>
                              完成时间: {new Date(item.completed_at).toLocaleTimeString()}
                            </span>
                          )}
                          {item.error && (
                            <span style={{ fontSize: 12, color: '#ff4d4f' }}>
                              错误: {item.error}
                            </span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>

            {researchResults.knowledge_results && researchResults.knowledge_results.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>知识库匹配</h4>
                <List
                  size="small"
                  dataSource={researchResults.knowledge_results.slice(0, 5)}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.title || item.document_title}
                        description={item.content?.substring(0, 100) || item.snippet}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {!researchProgress && !researchResults && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在启动调研任务...</p>
          </div>
        )}
      </Modal>

      {/* 浮动最小化窗口 */}
      {researchModalVisible && researchWindowMinimized && researchProgress && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            minWidth: 280,
            maxWidth: 350,
          }}
        >
          <Card
            size="small"
            title={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space style={{ fontSize: 12 }}>
                  <SearchOutlined />
                  <span>{autoGenerateTopics ? '引用到话题' : '关键词调研'}</span>
                </Space>
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ExpandOutlined />}
                    onClick={() => setResearchWindowMinimized(false)}
                    style={{ padding: '0 4px' }}
                  />
                  {!researchPolling && (
                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={handleCloseResearchModal}
                      style={{ padding: '0 4px' }}
                    >
                      ×
                    </Button>
                  )}
                </Space>
              </Space>
            }
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 8,
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color={
                  researchProgress.status === 'completed' ? 'green' :
                  researchProgress.status === 'in_progress' ? 'blue' :
                  researchProgress.status === 'failed' ? 'red' : 'default'
                } style={{ margin: 0 }}>
                  {researchProgress.status === 'pending' ? '等待中' :
                   researchProgress.status === 'in_progress' ? '进行中' :
                   researchProgress.status === 'completed' ? '已完成' :
                   researchProgress.status === 'failed' ? '失败' : String(researchProgress.status || '未知')}
                </Tag>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {researchProgress.completed_channels} / {researchProgress.total_channels}
                </span>
              </div>

              {researchProgress.current_channel && (
                <div style={{ fontSize: 11, color: '#888' }}>
                  当前: {researchProgress.current_channel}
                </div>
              )}

              <Progress
                percent={researchProgress.progress}
                status={researchPolling ? 'active' : researchProgress.status === 'completed' ? 'success' : 'normal'}
                size="small"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#52c41a' }}>
                  {researchProgress.results_summary?.total_results || 0} 条结果
                </span>
                <span style={{ color: '#666' }}>{selectedKeyword}</span>
              </div>
            </Space>
          </Card>
        </div>
      )}
    </div>
  );
}
