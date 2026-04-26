import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type KnowledgeBaseType = 'manual' | 'ai_generated' | 'imported';
export type DocumentSourceType = 'url' | 'pdf' | 'word' | 'excel' | 'markdown' | 'image' | 'text';
export type DocumentStatus = 'draft' | 'active' | 'archived';

export interface KnowledgeBaseGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  base_count?: number;
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

export interface KnowledgeBase {
  id: string;
  group_id?: string;
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  tags?: string[];
  document_count: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBaseInput {
  group_id?: string;
  name: string;
  description?: string;
  type?: KnowledgeBaseType;
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
  type?: KnowledgeBaseType;
  is_active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface KnowledgeBaseDocument {
  id: string;
  knowledge_base_id: string;
  title: string;
  content?: string;
  source_type: DocumentSourceType;
  source_url?: string;
  file_path?: string;
  file_size?: number;
  file_mime_type?: string;
  word_count?: number;
  current_version_id?: string;
  status: DocumentStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBaseDocumentInput {
  knowledge_base_id: string;
  title: string;
  content?: string;
  source_type: DocumentSourceType;
  source_url?: string;
  file_path?: string;
}

export interface UpdateKnowledgeBaseDocumentInput {
  title?: string;
  content?: string;
  status?: DocumentStatus;
}

export interface DocumentListParams {
  page?: number;
  pageSize?: number;
  source_type?: DocumentSourceType;
  status?: DocumentStatus;
  search?: string;
}

export interface DocumentListResponse {
  documents: KnowledgeBaseDocument[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// 知识库分组 API
// ============================================
export const knowledgeBaseGroupsApi = {
  /**
   * 获取分组列表
   */
  list: async (params?: { search?: string }): Promise<{ groups: KnowledgeBaseGroup[]; total: number }> => {
    const response = await apiClient.get<{ success: true; data: { groups: KnowledgeBaseGroup[]; total: number } }>(
      '/knowledge-base-groups',
      params
    );
    return response.data;
  },

  /**
   * 获取分组详情
   */
  getById: async (id: string): Promise<KnowledgeBaseGroup & { base_count?: number }> => {
    const response = await apiClient.get<{ success: true; data: { group: KnowledgeBaseGroup & { base_count?: number } } }>(
      `/knowledge-base-groups/${id}`
    );
    return response.data.group;
  },

  /**
   * 创建分组
   */
  create: async (input: CreateKnowledgeBaseGroupInput): Promise<KnowledgeBaseGroup> => {
    const response = await apiClient.post<{ success: true; data: { group: KnowledgeBaseGroup } }>(
      '/knowledge-base-groups',
      input
    );
    return response.data.data.group;
  },

  /**
   * 更新分组
   */
  update: async (id: string, input: UpdateKnowledgeBaseGroupInput): Promise<KnowledgeBaseGroup> => {
    const response = await apiClient.put<{ success: true; data: { group: KnowledgeBaseGroup } }>(
      `/knowledge-base-groups/${id}`,
      input
    );
    return response.data.data.group;
  },

  /**
   * 删除分组
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/knowledge-base-groups/${id}`
    );
  },
};

// ============================================
// 知识库 API
// ============================================
export const knowledgeBasesApi = {
  /**
   * 获取知识库列表
   */
  list: async (params?: KnowledgeBaseListParams): Promise<{ bases: KnowledgeBase[]; total: number }> => {
    const response = await apiClient.get<{ success: true; data: { bases: KnowledgeBase[]; total: number } }>(
      '/knowledge-bases',
      params
    );
    return response.data;
  },

  /**
   * 获取知识库详情
   */
  getById: async (id: string): Promise<KnowledgeBase> => {
    const response = await apiClient.get<{ success: true; data: { base: KnowledgeBase } }>(
      `/knowledge-bases/${id}`
    );
    return response.data.base;
  },

  /**
   * 创建知识库
   */
  create: async (input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> => {
    const response = await apiClient.post<{ success: true; data: { base: KnowledgeBase } }>(
      '/knowledge-bases',
      input
    );
    return response.data.data.base;
  },

  /**
   * 更新知识库
   */
  update: async (id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBase> => {
    const response = await apiClient.put<{ success: true; data: { base: KnowledgeBase } }>(
      `/knowledge-bases/${id}`,
      input
    );
    return response.data.data.base;
  },

  /**
   * 删除知识库
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/knowledge-bases/${id}`
    );
  },
};

// ============================================
// 知识库文档 API
// ============================================
export const knowledgeBaseDocumentsApi = {
  /**
   * 获取知识库的文档列表
   */
  listByKnowledgeBase: async (
    knowledgeBaseId: string,
    params?: DocumentListParams
  ): Promise<DocumentListResponse> => {
    const response = await apiClient.get<{ success: true; data: DocumentListResponse }>(
      `/knowledge-bases/${knowledgeBaseId}/documents`,
      params
    );
    return response.data;
  },

  /**
   * 获取文档详情
   */
  getById: async (id: string): Promise<KnowledgeBaseDocument> => {
    const response = await apiClient.get<{ success: true; data: { document: KnowledgeBaseDocument } }>(
      `/knowledge-base-documents/${id}`
    );
    return response.data.document;
  },

  /**
   * 创建文档
   */
  create: async (input: CreateKnowledgeBaseDocumentInput): Promise<KnowledgeBaseDocument> => {
    const response = await apiClient.post<{ success: true; data: { document: KnowledgeBaseDocument } }>(
      '/knowledge-base-documents',
      input
    );
    return response.data.data.document;
  },

  /**
   * 更新文档
   */
  update: async (id: string, input: UpdateKnowledgeBaseDocumentInput): Promise<KnowledgeBaseDocument> => {
    const response = await apiClient.put<{ success: true; data: { document: KnowledgeBaseDocument } }>(
      `/knowledge-base-documents/${id}`,
      input
    );
    return response.data.data.document;
  },

  /**
   * 删除文档
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/knowledge-base-documents/${id}`
    );
  },

  /**
   * 从URL导入文档
   */
  importFromUrl: async (knowledgeBaseId: string, url: string, title?: string): Promise<KnowledgeBaseDocument> => {
    const response = await apiClient.post<{ success: true; data: { document: KnowledgeBaseDocument } }>(
      '/knowledge-base-documents/import/url',
      { knowledge_base_id: knowledgeBaseId, url, title }
    );
    return response.data.data.document;
  },

  /**
   * 从文件导入文档
   */
  importFromFile: async (
    knowledgeBaseId: string,
    file: File,
    sourceType: DocumentSourceType,
    title?: string
  ): Promise<KnowledgeBaseDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('knowledge_base_id', knowledgeBaseId);
    formData.append('source_type', sourceType);
    if (title) formData.append('title', title);

    const response = await apiClient.post<{ success: true; data: { document: KnowledgeBaseDocument } }>(
      '/knowledge-base-documents/import/file',
      formData,
      undefined,
      { 'Content-Type': 'multipart/form-data' }
    );
    return response.data.data.document;
  },

  /**
   * 批量导入文件
   */
  importBatch: async (
    knowledgeBaseId: string,
    files: File[]
  ): Promise<{ imported: number; failed: number; results: any[]; errors: any[] }> => {
    const formData = new FormData();
    formData.append('knowledge_base_id', knowledgeBaseId);
    files.forEach(file => formData.append('files', file));

    const response = await apiClient.post<{ success: true; data: any }>(
      '/knowledge-base-documents/import/batch',
      formData,
      undefined,
      { 'Content-Type': 'multipart/form-data' }
    );
    return response.data.data;
  },
};

// 导出所有类型
export type {
  KnowledgeBaseGroup,
  CreateKnowledgeBaseGroupInput,
  UpdateKnowledgeBaseGroupInput,
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
  KnowledgeBaseListParams,
  KnowledgeBaseDocument,
  CreateKnowledgeBaseDocumentInput,
  UpdateKnowledgeBaseDocumentInput,
  DocumentListParams,
  DocumentListResponse,
};
