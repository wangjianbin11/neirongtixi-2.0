import { v4 as uuidv4 } from 'uuid';
import { workflowService } from './workflowService';
import { draftService } from './draftService';
import { skillExecutor } from '../skills/skillExecutor';
import { skillRegistry } from '../skills/skillRegistry';
import {
  Workflow,
  WorkflowNode,
  WorkflowExecution,
  SkillExecutionContext,
  SkillExecutionResult,
} from '../models/types';

/**
 * WebSocket通知接口
 */
export interface ProgressNotifier {
  onProgress(executionId: string, nodeId: string, progress: number, message: string): void;
  onNodeCompleted(executionId: string, nodeId: string, output: any): void;
  onNodeFailed(executionId: string, nodeId: string, error: string): void;
  onCompleted(executionId: string, result: any): void;
  onFailed(executionId: string, error: string): void;
}

/**
 * 工作流执行引擎
 */
export class WorkflowExecutor {
  private notifier: ProgressNotifier;
  private cancellationTokens: Map<string, boolean> = new Map();

  constructor(notifier: ProgressNotifier) {
    this.notifier = notifier;
  }

  /**
   * 执行工作流
   */
  async execute(
    executionId: string,
    workflowId: string,
    inputData: any,
    userId?: string
  ): Promise<any> {
    // 初始化取消标记
    this.cancellationTokens.set(executionId, false);

    try {
      // 获取工作流定义
      const workflow = await workflowService.findById(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // 更新执行状态为running
      await workflowService.updateExecutionStatus(executionId, 'running', {
        started_at: new Date(),
        progress: 0,
      });

      // 解析节点依赖图
      const nodes = workflow.nodes_json;
      const executionOrder = this.topologicalSort(nodes);

      // 构建执行上下文
      const context: SkillExecutionContext = {
        execution_id: executionId,
        workflow_id: workflowId,
        user_id: userId,
        variables: workflow.default_params || {},
        node_outputs: {},
      };

      // 合并输入数据到变量
      if (inputData) {
        context.variables = { ...context.variables, ...inputData };
      }

      // 按顺序执行节点
      const totalNodes = executionOrder.length;
      let completedNodes = 0;
      const results: any = {};

      console.log('[Workflow Executor] Starting execution of', totalNodes, 'nodes');
      console.log('[Workflow Executor] Execution order:', executionOrder);

      for (const nodeId of executionOrder) {
        // 检查是否取消
        if (this.cancellationTokens.get(executionId)) {
          await workflowService.updateExecutionStatus(executionId, 'cancelled');
          this.notifier.onFailed(executionId, 'Execution cancelled');
          return { cancelled: true };
        }

        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        console.log('[Workflow Executor] Executing node:', nodeId, 'skill:', node.skill_id);

        // 准备节点输入
        const nodeInput = this.prepareNodeInput(node, context);

        // 创建节点日志
        const logId = uuidv4();
        await workflowService.createLog({
          execution_id: executionId,
          node_id: node.id,
          skill_id: node.skill_id,
          status: 'running',
          message: `执行节点: ${node.name || node.skill_id}`,
          input_data: nodeInput,
          started_at: new Date(),
        });

        // 通知进度
        const progress = Math.floor((completedNodes / totalNodes) * 100);
        this.notifier.onProgress(
          executionId,
          node.id,
          progress,
          `正在执行: ${node.name || node.skill_id}`
        );

        // 执行节点（支持重试）
        const maxRetries = node.max_retries ?? (node.retry_on_failure ? 3 : 0);
        let lastError: string | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            await workflowService.updateLogStatus(logId, 'running', {
              message: `重试 (${attempt}/${maxRetries}): ${node.name || node.skill_id}`,
            });
          }

          const result: SkillExecutionResult = await skillExecutor.execute(
            node.skill_id,
            nodeInput,
            context
          );

          if (result.success) {
            // 成功
            await workflowService.updateLogStatus(logId, 'completed', {
              output_data: result.output,
              completed_at: new Date(),
              duration_ms: result.execution_time_ms,
            });

            // 保存输出到上下文
            context.node_outputs[node.id] = result.output;
            results[node.id] = result.output;

            this.notifier.onNodeCompleted(executionId, node.id, result.output);
            lastError = null;
            break;
          } else {
            lastError = result.error || 'Unknown error';

            if (attempt < maxRetries) {
              // 等待后重试
              await this.sleep(1000 * (attempt + 1));
            } else {
              // 最终失败
              await workflowService.updateLogStatus(logId, 'failed', {
                error_detail: lastError,
                completed_at: new Date(),
              });

              // 标记整个执行失败
              await workflowService.updateExecutionStatus(executionId, 'failed', {
                progress,
                error_message: `节点 ${node.name || node.id} 执行失败: ${lastError}`,
                completed_at: new Date(),
              });

              this.notifier.onNodeFailed(executionId, node.id, lastError);
              this.notifier.onFailed(executionId, lastError);

              return {
                success: false,
                failed_at: node.id,
                error: lastError,
                partial_results: results,
              };
            }
          }
        }

        completedNodes++;
      }

      // 执行完成
      await workflowService.updateExecutionStatus(executionId, 'completed', {
        progress: 100,
        result_json: results,
        completed_at: new Date(),
      });

      this.notifier.onCompleted(executionId, results);

      return {
        success: true,
        results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await workflowService.updateExecutionStatus(executionId, 'failed', {
        error_message: errorMessage,
        completed_at: new Date(),
      });

      this.notifier.onFailed(executionId, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // 清理取消标记
      this.cancellationTokens.delete(executionId);
    }
  }

  /**
   * 取消执行
   */
  cancel(executionId: string): void {
    this.cancellationTokens.set(executionId, true);
  }

  /**
   * 拓扑排序（确定节点执行顺序）
   */
  private topologicalSort(nodes: WorkflowNode[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const allNodes = new Set<string>();

    // 构建图
    for (const node of nodes) {
      allNodes.add(node.id);
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // 添加边
    for (const node of nodes) {
      if (node.dependencies && node.dependencies.length > 0) {
        for (const dep of node.dependencies) {
          graph.get(dep)?.push(node.id);
          inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
        }
      }
    }

    // Kahn算法
    const queue: string[] = [];
    const result: string[] = [];

    // 找到所有入度为0的节点
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      // 减少依赖此节点的其他节点的入度
      for (const dependent of graph.get(node) || []) {
        const newDegree = (inDegree.get(dependent) || 0) - 1;
        inDegree.set(dependent, newDegree);

        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // 检查是否有环
    if (result.length !== allNodes.size) {
      throw new Error('Workflow contains cycles');
    }

    return result;
  }

  /**
   * 准备节点输入
   */
  private prepareNodeInput(
    node: WorkflowNode,
    context: SkillExecutionContext
  ): any {
    const skill = skillRegistry.get(node.skill_id);
    if (!skill) {
      throw new Error(`Skill not found: ${node.skill_id}`);
    }

    const input: any = {};

    // 优先使用节点配置
    if (node.config) {
      Object.assign(input, node.config);
    }

    // 解析依赖节点的输出引用
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.startsWith('$.')) {
        // 引用语法: $.nodeId.field
        const path = value.slice(2).split('.');
        const nodeId = path[0];
        const field = path.slice(1).join('.');

        if (context.node_outputs[nodeId]) {
          let refValue: any = context.node_outputs[nodeId];
          for (const part of path.slice(1)) {
            refValue = refValue?.[part];
          }
          input[key] = refValue;
        }
      }
    }

    // 添加工作流变量
    for (const [key, value] of Object.entries(context.variables)) {
      if (input[key] === undefined) {
        input[key] = value;
      }
    }

    // 设置默认值
    for (const [key, def] of Object.entries(skill.input_schema)) {
      if (typeof def === 'object' && def !== null) {
        const schemaDef = def as any;
        if (input[key] === undefined && schemaDef.default !== undefined) {
          input[key] = schemaDef.default;
        }
      }
    }

    return input;
  }

  /**
   * 休眠指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * WebSocket进度通知器
 */
export class WebSocketProgressNotifier implements ProgressNotifier {
  private io: any;

  constructor(io: any) {
    this.io = io;
  }

  onProgress(executionId: string, nodeId: string, progress: number, message: string): void {
    this.io.emit('workflow:progress', {
      executionId,
      nodeId,
      progress,
      message,
    });
  }

  onNodeCompleted(executionId: string, nodeId: string, output: any): void {
    this.io.emit('workflow:node:completed', {
      executionId,
      nodeId,
      output,
    });
  }

  onNodeFailed(executionId: string, nodeId: string, error: string): void {
    this.io.emit('workflow:node:failed', {
      executionId,
      nodeId,
      error,
    });
  }

  onCompleted(executionId: string, result: any): void {
    this.io.emit('workflow:completed', {
      executionId,
      result,
    });
  }

  onFailed(executionId: string, error: string): void {
    this.io.emit('workflow:failed', {
      executionId,
      error,
    });
  }
}

// 导出单例（延迟初始化，需要传入io实例）
let executorInstance: WorkflowExecutor | null = null;

export function initWorkflowExecutor(io: any): WorkflowExecutor {
  if (!executorInstance) {
    const notifier = new WebSocketProgressNotifier(io);
    executorInstance = new WorkflowExecutor(notifier);
  }
  return executorInstance;
}

export function getWorkflowExecutor(): WorkflowExecutor | null {
  return executorInstance;
}
