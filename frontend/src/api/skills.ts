import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================
export type SkillCategory = 'data_input' | 'content_production' | 'distribution' | 'optimization' | 'support';

export interface SkillTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  prompt_template: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillInput {
  code: string;
  name: string;
  description?: string;
  category: SkillCategory;
  prompt_template: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  version?: string;
  is_active?: boolean;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  category?: SkillCategory;
  prompt_template?: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  version?: string;
  is_active?: boolean;
}

export interface SkillExecutionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SkillExecutionResult {
  output_data: Record<string, any>;
  execution_time_ms: number;
  cost_usd?: number;
}

export interface SkillExecution {
  id: string;
  skill_code: string;
  input_data: Record<string, any>;
  output_data: Record<string, any> | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  execution_time_ms: number | null;
  cost_usd: number | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SkillStats {
  total: number;
  byCategory: Record<string, number>;
  active: number;
  totalExecutions: number;
}

// ============================================
// API 函数
// ============================================
export const skillsApi = {
  /**
   * 获取技能列表
   */
  list: async (options?: {
    category?: SkillCategory;
    is_active?: boolean;
  }): Promise<SkillTemplate[]> => {
    const response = await apiClient.get<{ success: true; data: { skills: SkillTemplate[] } }>(
      '/skills',
      { params: options }
    );
    return response.data?.skills || [];
  },

  /**
   * 获取技能统计
   */
  getStats: async (): Promise<SkillStats> => {
    const response = await apiClient.get<{ success: true; data: SkillStats }>(
      '/skills/stats'
    );
    return response.data || {
      total: 0,
      active: 0,
      totalExecutions: 0,
    };
  },

  /**
   * 搜索技能
   */
  search: async (query: string): Promise<SkillTemplate[]> => {
    const response = await apiClient.get<{ success: true; data: { skills: SkillTemplate[] } }>(
      '/skills/search',
      { params: { q: query } }
    );
    return response.data?.skills || [];
  },

  /**
   * 获取技能详情
   */
  getByCode: async (code: string): Promise<SkillTemplate> => {
    const response = await apiClient.get<{ success: true; data: { skill: SkillTemplate } }>(
      `/skills/${code}`
    );
    return response.data.skill;
  },

  /**
   * 执行技能
   */
  execute: async (
    code: string,
    inputData: Record<string, any>,
    options?: SkillExecutionOptions
  ): Promise<SkillExecutionResult> => {
    const response = await apiClient.post<{ success: true; data: SkillExecutionResult }>(
      `/skills/${code}/execute`,
      { inputData, options }
    );
    return response.data.data;
  },

  /**
   * 获取技能执行历史
   */
  getExecutions: async (
    code: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{ executions: SkillExecution[]; page: number; pageSize: number; total: number }> => {
    const response = await apiClient.get<{
      success: true;
      data: { executions: SkillExecution[]; page: number; pageSize: number; total: number }
    }>(
      `/skills/${code}/executions`,
      { params: options }
    );
    return response.data;
  },

  /**
   * 获取最近的执行记录
   */
  getRecentExecutions: async (limit: number = 20): Promise<SkillExecution[]> => {
    const response = await apiClient.get<{ success: true; data: { executions: SkillExecution[] } }>(
      '/skills/executions/recent',
      { params: { limit } }
    );
    return response.data?.executions || [];
  },

  /**
   * 创建技能模板
   */
  create: async (input: CreateSkillInput): Promise<SkillTemplate> => {
    const response = await apiClient.post<{ success: true; data: { skill: SkillTemplate } }>(
      '/skills',
      input
    );
    return response.data.data.skill;
  },

  /**
   * 更新技能模板
   */
  update: async (code: string, input: UpdateSkillInput): Promise<SkillTemplate> => {
    const response = await apiClient.put<{ success: true; data: { skill: SkillTemplate } }>(
      `/skills/${code}`,
      input
    );
    return response.data.data.skill;
  },

  /**
   * 删除技能模板
   */
  delete: async (code: string): Promise<void> => {
    await apiClient.delete<{ success: true; data: { message: string } }>(
      `/skills/${code}`
    );
  },
};
