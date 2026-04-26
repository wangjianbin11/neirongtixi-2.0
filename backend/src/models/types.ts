// ============================================
// 用户类型
// ============================================
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'publisher' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  is_active?: boolean;
  avatar_url?: string;
  full_name?: string;
  phone?: string;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'editor' | 'publisher' | 'viewer';
  full_name?: string;
  phone?: string;
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
  role?: 'admin' | 'editor' | 'publisher' | 'viewer';
}

// ============================================
// 关键词类型
// ============================================

/**
 * 场景分类枚举
 */
export type KeywordScene =
  | 'website'      // 网站
  | 'tiktok'       // TikTok
  | 'youtube'      // YouTube
  | 'twitter'      // X (Twitter)
  | 'instagram'    // Instagram
  | 'facebook'     // Facebook
  | 'amazon'       // 亚马逊
  | 'linkedin';    // LinkedIn

export interface Keyword {
  id: string;
  keyword: string;
  search_volume: number;
  kd_score: number;
  competition: 'low' | 'medium' | 'high';
  category?: string;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  asg_relevance: number;
  priority: 'S' | 'A' | 'B' | 'C';
  status: 'pending' | 'selected' | 'in_use' | 'completed';
  source: string;
  tags: string[];
  notes?: string;
  target_customer?: string;
  scenes?: KeywordScene[];  // 场景分类（多选）
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKeywordInput {
  keyword: string;
  category?: string;
  search_volume?: number;
  competition?: 'low' | 'medium' | 'high';
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  priority?: 'S' | 'A' | 'B' | 'C';
  target_customer?: string;
  scenes?: KeywordScene[];
}

export interface UpdateKeywordInput {
  keyword?: string;
  category?: string;
  search_volume?: number;
  competition?: 'low' | 'medium' | 'high';
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  asg_relevance?: number;
  priority?: 'S' | 'A' | 'B' | 'C';
  status?: 'pending' | 'selected' | 'in_use' | 'completed';
  notes?: string;
  scenes?: KeywordScene[];
}

// ============================================
// 话题类型
// ============================================
export interface Topic {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  topic_type: 'tutorial' | 'qa' | 'case_study' | 'insight' | 'review' | 'comparison';
  target_customer: 'startup' | 'experienced' | 'team' | 'local';
  priority: 'S' | 'A' | 'B' | 'C';
  status: 'pending' | 'approved' | 'in_production' | 'completed' | 'published';
  estimated_effort: number;
  created_by: string;
  assigned_to?: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

export interface CreateTopicInput {
  title: string;
  title_en?: string;
  description?: string;
  topic_type: 'tutorial' | 'qa' | 'case_study' | 'insight' | 'review' | 'comparison';
  target_customer?: 'startup' | 'experienced' | 'team' | 'local';
  priority?: 'S' | 'A' | 'B' | 'C';
  estimated_effort?: number;
}

export interface UpdateTopicInput {
  title?: string;
  title_en?: string;
  description?: string;
  topic_type?: 'tutorial' | 'qa' | 'case_study' | 'insight' | 'review' | 'comparison';
  target_customer?: 'startup' | 'experienced' | 'team' | 'local';
  priority?: 'S' | 'A' | 'B' | 'C';
  status?: 'pending' | 'approved' | 'in_production' | 'completed' | 'published';
  estimated_effort?: number;
  assigned_to?: string;
}

export interface TopicPlatform {
  id: string;
  topic_id: string;
  platform: 'youtube' | 'tiktok' | 'blog' | 'twitter' | 'linkedin' | 'reddit' | 'quora';
  content_format: 'long_video' | 'short_video' | 'article' | 'post' | 'answer';
  status: 'pending' | 'in_production' | 'completed' | 'published';
  scheduled_at?: Date;
  published_at?: Date;
  url?: string;
  created_at: Date;
}

// ============================================
// 内容类型
// ============================================
export interface Content {
  id: string;
  topic_id?: string;
  title: string;
  title_en?: string;
  content_type: 'article' | 'video_script' | 'social_post' | 'forum_answer';
  platform: string;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  content_text?: string;
  content_text_en?: string;
  content_metadata?: Record<string, any>;
  generated_by_skill?: string;
  created_by: string;
  reviewed_by?: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

export interface CreateContentInput {
  topic_id?: string;
  title: string;
  title_en?: string;
  content_type: 'article' | 'video_script' | 'social_post' | 'forum_answer';
  platform: string;
  status?: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  content_text?: string;
  content_text_en?: string;
  content_metadata?: Record<string, any>;
  generated_by_skill?: string;
}

export interface UpdateContentInput {
  title?: string;
  title_en?: string;
  content_text?: string;
  content_text_en?: string;
  content_metadata?: Record<string, any>;
  status?: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  reviewed_by?: string;
}

// ============================================
// 技能类型
// ============================================
export interface SkillTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 'data_input' | 'content_production' | 'distribution' | 'optimization' | 'support';
  prompt_template: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  version: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSkillInput {
  code: string;
  name: string;
  description?: string;
  category: 'data_input' | 'content_production' | 'distribution' | 'optimization' | 'support';
  prompt_template: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  version?: string;
  is_active?: boolean;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  category?: 'data_input' | 'content_production' | 'distribution' | 'optimization' | 'support';
  prompt_template?: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  version?: string;
  is_active?: boolean;
}

export interface SkillExecution {
  id: string;
  skill_code: string;
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  cost_usd?: number;
  created_by?: string;
  created_at: Date;
  completed_at?: Date;
}

// ============================================
// 发布任务类型
// ============================================
export interface PublishTask {
  id: string;
  content_id: string;
  platform: string;
  status: 'pending' | 'scheduled' | 'publishing' | 'published' | 'failed';
  scheduled_at?: Date;
  published_at?: Date;
  platform_post_id?: string;
  platform_post_url?: string;
  error_message?: string;
  retry_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// 素材类型
// ============================================
export interface Asset {
  id: string;
  title: string;
  type: 'case' | 'data' | 'quote' | 'image' | 'video' | 'template';
  category?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  tags: string[];
  source?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAssetInput {
  title: string;
  type: 'case' | 'data' | 'quote' | 'image' | 'video' | 'template';
  category?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  tags?: string[];
  source?: string;
  is_active?: boolean;
}

export interface UpdateAssetInput {
  title?: string;
  type?: 'case' | 'data' | 'quote' | 'image' | 'video' | 'template';
  category?: string;
  description?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  tags?: string[];
  source?: string;
  is_active?: boolean;
}

export interface AssetListParams {
  page?: number;
  pageSize?: number;
  type?: 'case' | 'data' | 'quote' | 'image' | 'video' | 'template';
  category?: string;
  tags?: string[];
  search?: string;
  is_active?: boolean;
}

export interface AssetStats {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  totalFileSize: number;
}

// ============================================
// 分析数据类型
// ============================================
export interface PlatformMetrics {
  id: string;
  platform: string;
  content_id?: string;
  metric_date: Date;
  views: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate?: number;
  ctr?: number;
  metadata?: Record<string, any>;
  created_at: Date;
}

// ============================================
// API响应类型
// ============================================
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================
// Express 扩展类型
// ============================================
import { Request } from 'express';
import { Multer } from 'multer';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// ============================================
// 工作流类型
// ============================================

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  id: string;
  skill_id: string;
  name?: string;
  config?: Record<string, any>;
  dependencies?: string[];  // 依赖的节点ID列表
  position?: { x: number; y: number };
  retry_on_failure?: boolean;
  max_retries?: number;
}

/**
 * 工作流定义
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
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  category?: 'blog' | 'social_media' | 'video' | 'report' | 'custom' | 'bilingual';
  is_template?: boolean;
  nodes_json: WorkflowNode[];
  default_params?: Record<string, any>;
  estimated_time?: number;
  estimated_cost?: number;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  category?: 'blog' | 'social_media' | 'video' | 'report' | 'custom' | 'bilingual';
  nodes_json?: WorkflowNode[];
  default_params?: Record<string, any>;
  estimated_time?: number;
  estimated_cost?: number;
}

export interface WorkflowListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  is_template?: boolean;
  search?: string;
}

/**
 * 工作流执行记录
 */
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input_data?: Record<string, any>;
  result_json?: Record<string, any>;
  error_message?: string;
  progress: number;
  started_at?: Date;
  completed_at?: Date;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExecutionInput {
  workflow_id: string;
  input_data: Record<string, any>;
}

export interface ExecutionListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  workflow_id?: string;
}

/**
 * 工作流执行日志
 */
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
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
  created_at: Date;
}

// ============================================
// 草稿类型
// ============================================

/**
 * 草稿内容
 */
export interface Draft {
  id: string;
  execution_id?: string;
  workflow_id?: string;
  title: string;
  content_type: 'blog' | 'social_xiaohongshu' | 'social_wechat' | 'social_douyin' | 'social_weibo' | 'social_linkedin' | 'video_script' | 'report';
  content_json: Record<string, any>;
  platform?: string;
  keyword_id?: string;
  topic_id?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  metadata?: Record<string, any>;
  reviewed_by?: string;
  reviewed_at?: Date;
  review_comment?: string;
  published_at?: Date;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DraftContentJson {
  // 博客文章
  title?: string;
  content?: string;  // HTML格式
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

export interface CreateDraftInput {
  execution_id?: string;
  workflow_id?: string;
  title: string;
  content_type: 'blog' | 'social_xiaohongshu' | 'social_wechat' | 'social_douyin' | 'social_weibo' | 'social_linkedin' | 'video_script' | 'report';
  content_json: DraftContentJson;
  platform?: string;
  keyword_id?: string;
  topic_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDraftInput {
  title?: string;
  content_json?: DraftContentJson;
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  review_comment?: string;
}

export interface DraftListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  content_type?: string;
  platform?: string;
  keyword_id?: string;
  search?: string;
}

export interface DraftReviewInput {
  status: 'approved' | 'rejected';
  comment?: string;
}

// ============================================
// 技能元数据类型
// ============================================

/**
 * 技能元数据（技能注册表）
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'content' | 'optimization' | 'publishing' | 'utility';
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  estimated_time: number;  // 秒
  estimated_cost: number;  // 美元
  ai_provider: 'claude' | 'openai' | 'ollama' | 'local';
  model?: string;
  is_active: boolean;
}

/**
 * 技能执行上下文
 */
export interface SkillExecutionContext {
  execution_id: string;
  workflow_id: string;
  user_id?: string;
  variables: Record<string, any>;  // 工作流级别的变量
  node_outputs: Record<string, any>;  // 已完成节点的输出
}

/**
 * 技能执行结果
 */
export interface SkillExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  execution_time_ms?: number;
  cost_usd?: number;
}

// ============================================
// 知识库分组类型
// ============================================
export interface KnowledgeBaseGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sort_order: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKnowledgeBaseGroupInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateKnowledgeBaseGroupInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

// ============================================
// 知识库类型
// ============================================
export interface KnowledgeBase {
  id: string;
  group_id?: string;
  name: string;
  description?: string;
  type: 'manual' | 'ai_generated' | 'imported';
  tags?: string[];
  document_count: number;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKnowledgeBaseInput {
  group_id?: string;
  name: string;
  description?: string;
  type?: 'manual' | 'ai_generated' | 'imported';
  tags?: string[];
}

export interface UpdateKnowledgeBaseInput {
  group_id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface KnowledgeBaseListParams {
  group_id?: string;
  type?: 'manual' | 'ai_generated' | 'imported';
  is_active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// 知识库文档类型
// ============================================
export interface KnowledgeBaseDocument {
  id: string;
  knowledge_base_id: string;
  title: string;
  content?: string;
  source_type: 'url' | 'pdf' | 'word' | 'excel' | 'markdown' | 'image' | 'text';
  source_url?: string;
  file_path?: string;
  file_size?: number;
  file_mime_type?: string;
  word_count?: number;
  current_version_id?: string;
  status: 'draft' | 'active' | 'archived';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKnowledgeBaseDocumentInput {
  knowledge_base_id: string;
  title: string;
  content?: string;
  source_type: 'url' | 'pdf' | 'word' | 'excel' | 'markdown' | 'image' | 'text';
  source_url?: string;
  file_path?: string;
}

export interface UpdateKnowledgeBaseDocumentInput {
  title?: string;
  content?: string;
  status?: 'draft' | 'active' | 'archived';
}

export interface ImportDocumentFromUrlInput {
  knowledge_base_id: string;
  url: string;
  title?: string;
}

export interface ImportDocumentFromFileInput {
  knowledge_base_id: string;
  file_path: string;
  title?: string;
}

// ============================================
// 文档版本类型
// ============================================
export interface KnowledgeBaseDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  title?: string;
  content?: string;
  file_path?: string;
  change_summary?: string;
  created_by?: string;
  created_at: Date;
}

export interface CreateDocumentVersionInput {
  document_id: string;
  title?: string;
  content?: string;
  file_path?: string;
  change_summary?: string;
}

// ============================================
// 向量嵌入类型
// ============================================
export interface KnowledgeBaseEmbedding {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  model_name: string;
  created_at: Date;
}

// ============================================
// 搜索结果类型
// ============================================
export interface KnowledgeSearchResult {
  document_id: string;
  document_title: string;
  chunk_text: string;
  similarity: number;
  knowledge_base_id: string;
  knowledge_base_name: string;
}
