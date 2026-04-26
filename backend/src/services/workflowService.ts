import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, insert, update, remove } from '../utils/db';
import {
  Workflow,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowListParams,
  WorkflowExecution,
  CreateExecutionInput,
  ExecutionListParams,
  WorkflowExecutionLog,
} from '../models/types';

/**
 * 工作流服务
 */
export class WorkflowService {
  /**
   * 获取工作流列表
   */
  async list(params: WorkflowListParams = {}): Promise<{
    workflows: Workflow[];
    total: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      category,
      is_template,
      search,
    } = params;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    if (is_template !== undefined) {
      whereConditions.push('is_template = ?');
      queryParams.push(is_template ? 1 : 0);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM workflows ${whereClause}`,
      queryParams
    );
    const total = countResult?.count || 0;

    // 获取列表
    const workflows = await query<any>(
      `SELECT * FROM workflows ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 转换数据类型
    const typedWorkflows: Workflow[] = workflows.map((w: any) => ({
      ...w,
      is_template: Boolean(w.is_template),
      nodes_json: typeof w.nodes_json === 'string'
        ? JSON.parse(w.nodes_json)
        : w.nodes_json,
      default_params: w.default_params
        ? (typeof w.default_params === 'string'
          ? JSON.parse(w.default_params)
          : w.default_params)
        : undefined,
      estimated_cost: w.estimated_cost ? parseFloat(w.estimated_cost) : undefined,
    }));

    return { workflows: typedWorkflows, total };
  }

  /**
   * 根据ID获取工作流
   */
  async findById(id: string): Promise<Workflow | null> {
    const workflow = await queryOne<any>(
      'SELECT * FROM workflows WHERE id = ?',
      [id]
    );

    if (!workflow) return null;

    return {
      ...workflow,
      is_template: Boolean(workflow.is_template),
      nodes_json: typeof workflow.nodes_json === 'string'
        ? JSON.parse(workflow.nodes_json)
        : workflow.nodes_json,
      default_params: workflow.default_params
        ? (typeof workflow.default_params === 'string'
          ? JSON.parse(workflow.default_params)
          : workflow.default_params)
        : undefined,
      estimated_cost: workflow.estimated_cost ? parseFloat(workflow.estimated_cost) : undefined,
    };
  }

  /**
   * 创建工作流
   */
  async create(input: CreateWorkflowInput, userId?: string): Promise<Workflow> {
    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO workflows (
        id, name, description, category, is_template,
        nodes_json, default_params, estimated_time, estimated_cost,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id,
      input.name,
      input.description || null,
      input.category || null,
      input.is_template ?? false,
      JSON.stringify(input.nodes_json),
      input.default_params ? JSON.stringify(input.default_params) : null,
      input.estimated_time || null,
      input.estimated_cost || null,
      userId || null,
      now,
      now,
    ]);

    return (await this.findById(id))!;
  }

  /**
   * 更新工作流
   */
  async update(id: string, input: UpdateWorkflowInput): Promise<Workflow | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      params.push(input.category);
    }
    if (input.nodes_json !== undefined) {
      updates.push('nodes_json = ?');
      params.push(JSON.stringify(input.nodes_json));
    }
    if (input.default_params !== undefined) {
      updates.push('default_params = ?');
      params.push(JSON.stringify(input.default_params));
    }
    if (input.estimated_time !== undefined) {
      updates.push('estimated_time = ?');
      params.push(input.estimated_time);
    }
    if (input.estimated_cost !== undefined) {
      updates.push('estimated_cost = ?');
      params.push(input.estimated_cost);
    }

    updates.push('updated_at = ?');
    params.push(new Date());
    params.push(id);

    await query(
      `UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  /**
   * 删除工作流
   */
  async delete(id: string): Promise<boolean> {
    const result = await remove('DELETE FROM workflows WHERE id = ?', [id]);
    return result > 0;
  }

  /**
   * 获取模板列表
   */
  async getTemplates(): Promise<Workflow[]> {
    const { workflows } = await this.list({
      is_template: true,
      pageSize: 100,
    });
    return workflows;
  }

  /**
   * 复制工作流（从模板创建实例）
   */
  async duplicate(id: string, userId?: string): Promise<Workflow | null> {
    const original = await this.findById(id);
    if (!original) return null;

    return this.create({
      name: `${original.name} (副本)`,
      description: original.description,
      category: original.category,
      is_template: false,
      nodes_json: original.nodes_json,
      default_params: original.default_params,
      estimated_time: original.estimated_time,
      estimated_cost: original.estimated_cost,
    }, userId);
  }

  // ============================================
  // 执行相关方法
  // ============================================

  /**
   * 创建执行记录
   */
  async createExecution(
    input: CreateExecutionInput,
    userId?: string
  ): Promise<WorkflowExecution> {
    const id = uuidv4();
    const workflow = await this.findById(input.workflow_id);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const now = new Date();

    await query(`
      INSERT INTO workflow_executions (
        id, workflow_id, workflow_name, status, input_data,
        progress, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      input.workflow_id,
      workflow.name,
      'pending',
      JSON.stringify(input.input_data),
      0,
      userId || null,
      now,
      now,
    ]);

    return (await this.findExecutionById(id))!;
  }

  /**
   * 获取执行记录
   */
  async findExecutionById(id: string): Promise<WorkflowExecution | null> {
    const execution = await queryOne<any>(
      'SELECT * FROM workflow_executions WHERE id = ?',
      [id]
    );

    if (!execution) return null;

    return {
      ...execution,
      input_data: execution.input_data
        ? (typeof execution.input_data === 'string'
          ? JSON.parse(execution.input_data)
          : execution.input_data)
        : undefined,
      result_json: execution.result_json
        ? (typeof execution.result_json === 'string'
          ? JSON.parse(execution.result_json)
          : execution.result_json)
        : undefined,
      progress: parseInt(execution.progress) || 0,
    };
  }

  /**
   * 获取执行列表
   */
  async listExecutions(
    params: ExecutionListParams = {}
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      status,
      workflow_id,
    } = params;

    const limit = pageSize;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (workflow_id) {
      whereConditions.push('workflow_id = ?');
      queryParams.push(workflow_id);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM workflow_executions ${whereClause}`,
      queryParams
    );
    const total = countResult?.count || 0;

    // 获取列表
    const executions = await query<any>(
      `SELECT * FROM workflow_executions ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const typedExecutions: WorkflowExecution[] = executions.map((e: any) => ({
      ...e,
      input_data: e.input_data
        ? (typeof e.input_data === 'string'
          ? JSON.parse(e.input_data)
          : e.input_data)
        : undefined,
      result_json: e.result_json
        ? (typeof e.result_json === 'string'
          ? JSON.parse(e.result_json)
          : e.result_json)
        : undefined,
      progress: parseInt(e.progress) || 0,
    }));

    return { executions: typedExecutions, total };
  }

  /**
   * 更新执行状态
   */
  async updateExecutionStatus(
    id: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
    data?: {
      progress?: number;
      error_message?: string;
      result_json?: any;
      started_at?: Date;
      completed_at?: Date;
    }
  ): Promise<void> {
    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, new Date()];

    if (data?.progress !== undefined) {
      updates.push('progress = ?');
      params.push(data.progress);
    }
    if (data?.error_message !== undefined) {
      updates.push('error_message = ?');
      params.push(data.error_message);
    }
    if (data?.result_json !== undefined) {
      updates.push('result_json = ?');
      params.push(JSON.stringify(data.result_json));
    }
    if (data?.started_at !== undefined) {
      updates.push('started_at = ?');
      params.push(data.started_at);
    }
    if (data?.completed_at !== undefined) {
      updates.push('completed_at = ?');
      params.push(data.completed_at);
    }

    // 将id放到最后
    params.push(id);

    await query(
      `UPDATE workflow_executions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  /**
   * 取消执行
   */
  async cancelExecution(id: string): Promise<boolean> {
    const execution = await this.findExecutionById(id);
    if (!execution) return false;
    if (execution.status !== 'pending' && execution.status !== 'running') {
      return false;
    }

    await this.updateExecutionStatus(id, 'cancelled');
    return true;
  }

  // ============================================
  // 执行日志相关方法
  // ============================================

  /**
   * 创建日志记录
   */
  async createLog(
    log: Omit<WorkflowExecutionLog, 'id' | 'created_at'>
  ): Promise<WorkflowExecutionLog> {
    const id = uuidv4();

    await query(`
      INSERT INTO workflow_execution_logs (
        id, execution_id, node_id, skill_id, status,
        message, input_data, output_data, error_detail,
        started_at, completed_at, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      log.execution_id,
      log.node_id || null,
      log.skill_id || null,
      log.status,
      log.message || null,
      log.input_data ? JSON.stringify(log.input_data) : null,
      log.output_data ? JSON.stringify(log.output_data) : null,
      log.error_detail || null,
      log.started_at || null,
      log.completed_at || null,
      log.duration_ms || null,
      new Date(),
    ]);

    return (await this.findLogById(id))!;
  }

  /**
   * 更新日志状态
   */
  async updateLogStatus(
    id: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
    data?: {
      message?: string;
      output_data?: any;
      error_detail?: string;
      completed_at?: Date;
      duration_ms?: number;
    }
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (data?.message !== undefined) {
      updates.push('message = ?');
      params.push(data.message);
    }
    if (data?.output_data !== undefined) {
      updates.push('output_data = ?');
      params.push(JSON.stringify(data.output_data));
    }
    if (data?.error_detail !== undefined) {
      updates.push('error_detail = ?');
      params.push(data.error_detail);
    }
    if (data?.completed_at !== undefined) {
      updates.push('completed_at = ?');
      params.push(data.completed_at);
    }
    if (data?.duration_ms !== undefined) {
      updates.push('duration_ms = ?');
      params.push(data.duration_ms);
    }

    params.push(id);

    await query(
      `UPDATE workflow_execution_logs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  /**
   * 获取日志
   */
  async findLogById(id: string): Promise<WorkflowExecutionLog | null> {
    const log = await queryOne<any>(
      'SELECT * FROM workflow_execution_logs WHERE id = ?',
      [id]
    );

    if (!log) return null;

    return {
      ...log,
      input_data: log.input_data
        ? (typeof log.input_data === 'string'
          ? JSON.parse(log.input_data)
          : log.input_data)
        : undefined,
      output_data: log.output_data
        ? (typeof log.output_data === 'string'
          ? JSON.parse(log.output_data)
          : log.output_data)
        : undefined,
      duration_ms: log.duration_ms ? parseInt(log.duration_ms) : undefined,
    };
  }

  /**
   * 获取执行的所有日志
   */
  async getExecutionLogs(executionId: string): Promise<WorkflowExecutionLog[]> {
    const logs = await query<any>(
      `SELECT * FROM workflow_execution_logs
       WHERE execution_id = ?
       ORDER BY created_at ASC`,
      [executionId]
    );

    return logs.map((log: any) => ({
      ...log,
      input_data: log.input_data
        ? (typeof log.input_data === 'string'
          ? JSON.parse(log.input_data)
          : log.input_data)
        : undefined,
      output_data: log.output_data
        ? (typeof log.output_data === 'string'
          ? JSON.parse(log.output_data)
          : log.output_data)
        : undefined,
      duration_ms: log.duration_ms ? parseInt(log.duration_ms) : undefined,
    }));
  }

  /**
   * 清理旧的执行记录（超过指定天数）
   */
  async cleanOldExecutions(days: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await remove(
      `DELETE FROM workflow_executions WHERE created_at < ?`,
      [cutoffDate]
    );

    return result;
  }
}

// 导出单例
export const workflowService = new WorkflowService();
