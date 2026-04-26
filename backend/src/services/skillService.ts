import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import { SkillTemplate, CreateSkillInput, UpdateSkillInput } from '../models/types';
import { aiService } from './aiService';

/**
 * 技能执行数据接口
 */
interface SkillExecutionData {
  skill_code: string;
  input_data: Record<string, any>;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

/**
 * 技能服务
 */
export class SkillService {
  /**
   * 创建技能模板
   */
  async create(input: CreateSkillInput): Promise<SkillTemplate> {
    const id = uuidv4();
    const {
      code,
      name,
      description,
      category,
      prompt_template,
      input_schema,
      output_schema,
      version = '1.0.0',
      is_active = true,
    } = input;

    await query(
      `INSERT INTO skill_templates (id, code, name, description, category, prompt_template, input_schema, output_schema, version, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, description, category, prompt_template, input_schema, output_schema, version, is_active ? 1 : 0]
    );

    const result = await this.findByCode(code);
    return result!;
  }

  /**
   * 根据代码查找技能模板
   */
  async findByCode(code: string): Promise<SkillTemplate | null> {
    return await queryOne<SkillTemplate>(
      'SELECT * FROM skill_templates WHERE code = ?',
      [code]
    );
  }

  /**
   * 获取技能模板列表
   */
  async list(options: {
    category?: string;
    is_active?: boolean;
  } = {}): Promise<SkillTemplate[]> {
    const { category, is_active } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      conditions.push(`category = ?`);
      params.push(category);
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = ?`);
      params.push(is_active ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return await query<SkillTemplate>(
      `SELECT * FROM skill_templates ${whereClause} ORDER BY code`,
      params
    );
  }

  /**
   * 更新技能模板
   */
  async update(code: string, input: UpdateSkillInput): Promise<SkillTemplate | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findByCode(code);
    }

    values.push(code);

    await query(
      `UPDATE skill_templates
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE code = ?`,
      values
    );

    return this.findByCode(code);
  }

  /**
   * 删除技能模板
   */
  async delete(code: string): Promise<boolean> {
    const result = await remove(
      'DELETE FROM skill_templates WHERE code = ?',
      [code]
    );
    return result > 0;
  }

  /**
   * 执行技能
   */
  async execute(
    skillCode: string,
    inputData: Record<string, any>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      userId?: string;
    }
  ): Promise<{
    output_data: Record<string, any>;
    execution_time_ms: number;
    cost_usd?: number;
  }> {
    // 获取技能模板
    const skill = await this.findByCode(skillCode);
    if (!skill) {
      throw new Error(`Skill not found: ${skillCode}`);
    }

    if (!skill.is_active) {
      throw new Error(`Skill is not active: ${skillCode}`);
    }

    // 构建提示词（替换模板变量）
    const prompt = this.buildPromptFromTemplate(skill.prompt_template, inputData);

    // 调用AI服务
    const startTime = Date.now();
    const aiResponse = await aiService.generate({
      prompt,
      provider: 'anthropic',
      model: options?.model || 'claude-3-5-sonnet-20241022',
      maxTokens: options?.maxTokens || 3000,
      temperature: options?.temperature || 0.7,
    });
    const executionTime = Date.now() - startTime;

    // 解析AI响应为JSON
    let outputData: Record<string, any>;
    try {
      outputData = JSON.parse(aiResponse.content);
    } catch (error) {
      // 如果解析失败，返回原始文本
      outputData = { text: aiResponse.content, raw: true };
    }

    // 记录执行历史
    await this.recordExecution({
      skill_code: skillCode,
      input_data: inputData,
      output_data: outputData,
      status: 'completed',
      execution_time_ms: executionTime,
      cost_usd: this.calculateCost(aiResponse.tokensUsed),
      created_by: options?.userId,
    });

    return {
      output_data: outputData,
      execution_time_ms: executionTime,
      cost_usd: this.calculateCost(aiResponse.tokensUsed),
    };
  }

  /**
   * 从模板构建提示词
   */
  private buildPromptFromTemplate(template: string, data: Record<string, any>): string {
    let prompt = template;

    // 替换 {{variable}} 格式的变量
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, String(data[key]));
    });

    return prompt;
  }

  /**
   * 计算成本（简化版）
   */
  private calculateCost(tokensUsed: number): number {
    // Claude-3.5-Sonnet 定价（大约）
    // Input: $3/1M tokens, Output: $15/1M tokens
    // 假设50%是input, 50%是output
    const inputCost = (tokensUsed * 0.5 / 1000000) * 3;
    const outputCost = (tokensUsed * 0.5 / 1000000) * 15;
    return inputCost + outputCost;
  }

  /**
   * 记录技能执行历史
   */
  private async recordExecution(data: {
    skill_code: string;
    input_data: Record<string, any>;
    output_data: Record<string, any>;
    status: string;
    execution_time_ms: number;
    cost_usd?: number;
    error_message?: string;
    created_by?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO skill_executions (id, skill_code, input_data, output_data, status, execution_time_ms, cost_usd, error_message, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        data.skill_code,
        JSON.stringify(data.input_data),
        JSON.stringify(data.output_data),
        data.status,
        data.execution_time_ms,
        data.cost_usd,
        data.error_message || null,
        data.created_by || null,
      ]
    );
  }

  /**
   * 获取技能执行历史
   */
  async getExecutions(options: {
    skill_code?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const { skill_code, limit = 50, offset = 0 } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (skill_code) {
      conditions.push(`skill_code = ?`);
      params.push(skill_code);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return await query(
      `SELECT * FROM skill_executions ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  }

  /**
   * 获取技能统计
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    active: number;
    totalExecutions: number;
  }> {
    // 总技能数
    const totalResult = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM skill_templates');
    const total = totalResult?.count || 0;

    // 按分类统计
    const categoryResult = await query<{ category: string; count: number }>(
      'SELECT category, COUNT(*) as count FROM skill_templates GROUP BY category'
    );
    const byCategory: Record<string, number> = {};
    categoryResult.forEach((row) => {
      byCategory[row.category] = row.count;
    });

    // 活跃技能数
    const activeResult = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM skill_templates WHERE is_active = 1"
    );
    const active = activeResult?.count || 0;

    // 总执行次数
    const executionsResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM skill_executions'
    );
    const totalExecutions = executionsResult?.count || 0;

    return {
      total,
      byCategory,
      active,
      totalExecutions,
    };
  }

  /**
   * 搜索技能
   */
  async search(queryStr: string): Promise<SkillTemplate[]> {
    const searchTerm = `%${queryStr}%`;
    return await query<SkillTemplate>(
      `SELECT * FROM skill_templates
       WHERE code LIKE ? OR name LIKE ? OR description LIKE ?
       ORDER BY code`,
      [searchTerm, searchTerm, searchTerm]
    );
  }
}

// 导出单例
export const skillService = new SkillService();
