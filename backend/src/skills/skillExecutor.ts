import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  SkillExecutionContext,
  SkillExecutionResult,
  SkillMetadata,
} from '../models/types';
import { skillRegistry } from './skillRegistry';

/**
 * 技能执行器
 * 统一的技能执行接口，调用AI模型执行具体技能
 */
export class SkillExecutor {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private ollama: OpenAI;

  constructor() {
    // 初始化AI客户端
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // 初始化 Ollama 客户端（使用 OpenAI 兼容接口）
    this.ollama = new OpenAI({
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    });
  }

  /**
   * 执行技能
   */
  async execute(
    skillId: string,
    input: any,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取技能元数据
      const skill = skillRegistry.get(skillId);
      if (!skill) {
        return {
          success: false,
          error: `Skill not found: ${skillId}`,
        };
      }

      if (!skill.is_active) {
        return {
          success: false,
          error: `Skill is not active: ${skillId}`,
        };
      }

      // 验证输入
      const validationError = this.validateInput(skill, input);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // 根据AI提供商执行
      let output: any;
      switch (skill.ai_provider) {
        case 'claude':
          output = await this.executeWithClaude(skill, input, context);
          break;
        case 'openai':
          output = await this.executeWithOpenAI(skill, input, context);
          break;
        case 'ollama':
          output = await this.executeWithOllama(skill, input, context);
          break;
        case 'local':
          output = await this.executeLocal(skill, input, context);
          break;
        default:
          return {
            success: false,
            error: `Unknown AI provider: ${skill.ai_provider}`,
          };
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        output,
        execution_time_ms: executionTimeMs,
        cost_usd: this.estimateCost(skill, executionTimeMs),
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        execution_time_ms: executionTimeMs,
      };
    }
  }

  /**
   * 使用Claude执行
   */
  private async executeWithClaude(
    skill: SkillMetadata,
    input: any,
    context: SkillExecutionContext
  ): Promise<any> {
    const prompt = this.buildPrompt(skill, input, context);

    const response = await this.anthropic.messages.create({
      model: skill.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // 解析响应
    const content = response.content[0];
    if (content.type === 'text') {
      return this.parseOutput(content.text, skill);
    }

    throw new Error('Unexpected response type from Claude');
  }

  /**
   * 使用OpenAI执行
   */
  private async executeWithOpenAI(
    skill: SkillMetadata,
    input: any,
    context: SkillExecutionContext
  ): Promise<any> {
    const prompt = this.buildPrompt(skill, input, context);

    const response = await this.openai.chat.completions.create({
      model: skill.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(skill),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseOutput(content, skill);
  }

  /**
   * 使用Ollama本地模型执行
   */
  private async executeWithOllama(
    skill: SkillMetadata,
    input: any,
    context: SkillExecutionContext
  ): Promise<any> {
    console.log('[Skill Executor] executeWithOllama called for skill:', skill.id);
    console.log('[Skill Executor] Input:', JSON.stringify(input));
    console.log('[Skill Executor] Model:', skill.model || process.env.OLLAMA_MODEL || 'gemma3:12b');

    const prompt = this.buildPrompt(skill, input, context);
    console.log('[Skill Executor] Calling Ollama API...');

    const response = await this.ollama.chat.completions.create({
      model: skill.model || process.env.OLLAMA_MODEL || 'gemma3:12b',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(skill),
        },
        {
          role: 'user',
          content: prompt + '\n\n请严格按照JSON格式输出，不要添加任何其他文字。',
        },
      ],
      // Ollama 不支持 response_format，我们会在 prompt 中要求 JSON 格式
    });

    console.log('[Skill Executor] Ollama response received');

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    console.log('[Skill Executor] Parsing output...');
    const result = this.parseOutput(content, skill);
    console.log('[Skill Executor] Execution completed successfully');
    return result;
  }

  /**
   * 执行本地技能（无需AI调用）
   */
  private async executeLocal(
    skill: SkillMetadata,
    input: any,
    context: SkillExecutionContext
  ): Promise<any> {
    // 本地技能实现
    switch (skill.id) {
      case 'format-converter':
        return this.formatContent(input.content, input.target_platform);

      default:
        throw new Error(`Local skill not implemented: ${skill.id}`);
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    skill: SkillMetadata,
    input: any,
    context: SkillExecutionContext
  ): string {
    let prompt = `你是一个专业的内容创作助手。

## 技能: ${skill.name}
${skill.description}

## 输入数据:
${JSON.stringify(input, null, 2)}`;

    // 添加上下文信息
    if (Object.keys(context.node_outputs).length > 0) {
      prompt += `

## 上下文数据（来自前序节点）:
${JSON.stringify(context.node_outputs, null, 2)}`;
    }

    prompt += `

## 输出要求:
请严格按照以下JSON格式输出，不要添加任何其他文字:
${JSON.stringify(skill.output_schema, null, 2)}

## 现在请执行:`;

    return prompt;
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(skill: SkillMetadata): string {
    const systemPrompts: Record<string, string> = {
      'research': '你是一个专业的研究分析师，擅长数据收集和分析。',
      'content': '你是一个专业的内容创作者，擅长撰写高质量的文章和文案。',
      'optimization': '你是一个SEO专家，擅长优化内容以提高搜索引擎排名。',
      'publishing': '你是一个社交媒体运营专家，熟悉各平台的发布规则。',
      'utility': '你是一个高效的内容创作助手。',
    };

    return systemPrompts[skill.category] || '你是一个专业的内容创作助手。';
  }

  /**
   * 解析输出
   */
  private parseOutput(text: string, skill: SkillMetadata): any {
    try {
      // 尝试解析JSON
      const cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      }
      if (cleaned.startsWith('```')) {
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      }
      return JSON.parse(cleaned);
    } catch (error) {
      // 如果不是JSON，返回原始文本
      return { raw_output: text };
    }
  }

  /**
   * 验证输入
   */
  private validateInput(skill: SkillMetadata, input: any): string | null {
    const schema = skill.input_schema;

    // 检查必填字段
    for (const [key, def] of Object.entries(schema)) {
      if (typeof def === 'object' && def !== null) {
        if ((def as any).required && input[key] === undefined) {
          return `Missing required field: ${key}`;
        }

        // 检查枚举值
        if (input[key] !== undefined && (def as any).enum) {
          const enumValues = (def as any).enum as string[];
          if (!enumValues.includes(input[key])) {
            return `Invalid value for ${key}: must be one of ${enumValues.join(', ')}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * 估算成本
   */
  private estimateCost(skill: SkillMetadata, executionTimeMs: number): number {
    // 使用预设成本，如果执行时间过长则按比例增加
    const baseCost = skill.estimated_cost;
    const expectedTime = skill.estimated_time * 1000;

    if (executionTimeMs > expectedTime * 2) {
      return baseCost * 1.5;
    }

    return baseCost;
  }

  /**
   * 格式转换（本地实现）
   */
  private formatContent(content: string, platform: string): any {
    let formatted = content;
    const tips: string[] = [];

    switch (platform) {
      case 'xiaohongshu':
        formatted = content.replace(/\n/g, '\n\n');
        tips.push('小红书建议使用emoji增加视觉效果');
        tips.push('建议添加3-5个相关标签');
        break;

      case 'wechat':
        formatted = content.replace(/\n\n\n+/g, '\n\n');
        tips.push('公众号建议使用引用格式突出重点');
        tips.push('建议添加分隔线区分章节');
        break;

      case 'douyin':
        // 简化为口播格式
        formatted = content.replace(/#+\s/g, '').replace(/\n+/g, ' ');
        tips.push('抖音文案建议控制在50字以内');
        tips.push('建议在开头3秒吸引注意力');
        break;

      case 'weibo':
        formatted = content.substring(0, 140);
        tips.push('微博有140字限制');
        tips.push('建议添加2-3个话题标签');
        break;

      case 'linkedin':
        formatted = content.replace(/\n\n\n+/g, '\n\n');
        tips.push('LinkedIn建议使用专业语气');
        tips.push('建议添加3-5个行业相关标签');
        break;

      default:
        tips.push('通用格式');
    }

    return {
      formatted_content: formatted,
      platform_specific_tips: tips,
    };
  }
}

// 导出单例
export const skillExecutor = new SkillExecutor();
