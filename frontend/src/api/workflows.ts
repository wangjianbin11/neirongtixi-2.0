/**
 * 工作流相关API类型定义
 */

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category?: 'blog' | 'social_media' | 'video' | 'report' | 'custom' | 'bilingual';
  is_template: boolean;
  nodes_json: WorkflowNode[];
  default_params?: Record<string, any>;
  estimated_time?: number;
  estimated_cost?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  skill_id: string;
  name?: string;
  config?: Record<string, any>;
  dependencies?: string[];
  position?: { x: number; y: number };
  retry_on_failure?: boolean;
  max_retries?: number;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input_data?: Record<string, any>;
  result_json?: Record<string, any>;
  error_message?: string;
  progress: number;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionLog {
  id: string;
  execution_id: string;
  node_id?: string;
  skill_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  message?: string;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_detail?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

export interface Draft {
  id: string;
  execution_id?: string;
  workflow_id?: string;
  title: string;
  content_type: 'blog' | 'social_xiaohongshu' | 'social_wechat' | 'social_douyin' | 'social_weibo' | 'social_linkedin' | 'video_script' | 'report';
  content_json: DraftContentJson;
  platform?: string;
  keyword_id?: string;
  topic_id?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  metadata?: Record<string, any>;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  published_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DraftContentJson {
  // 博客文章
  title?: string;
  content?: string;
  excerpt?: string;
  seo_title?: string;
  meta_description?: string;
  keywords?: string[];
  cover_image?: string;
  illustrations?: string[];

  // 社交媒体
  text?: string;
  images?: string[];
  tags?: string[];
  emojis?: string[];

  // 视频脚本
  script?: string;
  scenes?: Array<{
    time: string;
    visual: string;
    audio: string;
    action?: string;
  }>;
  hook?: string;
  cta?: string;
  bgm_suggestion?: string;

  // 通用
  sources?: Array<{
    title: string;
    url: string;
    author?: string;
  }>;
  paa?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'content' | 'optimization' | 'publishing' | 'utility';
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  estimated_time: number;
  estimated_cost: number;
  ai_provider: 'claude' | 'openai' | 'local';
  model?: string;
  is_active: boolean;
}

/**
 * API响应类型
 */
export interface WorkflowListResponse {
  success: true;
  data: {
    workflows: Workflow[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface ExecutionListResponse {
  success: true;
  data: {
    executions: WorkflowExecution[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface ExecutionDetailResponse {
  success: true;
  data: {
    execution: WorkflowExecution;
    logs: WorkflowExecutionLog[];
  };
}

export interface DraftListResponse {
  success: true;
  data: {
    drafts: Draft[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface DraftStatsResponse {
  success: true;
  data: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    pendingReview: number;
  };
}
