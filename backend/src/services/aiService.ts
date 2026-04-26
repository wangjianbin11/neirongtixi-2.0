import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

// AI服务类型
type AIProvider = 'openai' | 'anthropic';

// AI生成请求接口
interface AIGenerateRequest {
  prompt: string;
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// AI生成响应接口
interface AIGenerateResponse {
  content: string;
  model: string;
  tokensUsed: number;
  provider: AIProvider;
}

/**
 * AI服务 - 用于调用OpenAI和Anthropic API生成内容
 */
export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    // 初始化OpenAI客户端
    if (config.ai.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.ai.openaiApiKey,
      });
    }

    // 初始化Anthropic客户端
    if (config.ai.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.ai.anthropicApiKey,
      });
    }
  }

  /**
   * 使用OpenAI生成内容
   */
  private async generateWithOpenAI(
    prompt: string,
    model: string = 'gpt-4o',
    maxTokens: number = 2000,
    temperature: number = 0.7
  ): Promise<AIGenerateResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的内容创作助手，擅长为跨境电商卖家创作高质量的营销内容。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      content,
      model,
      tokensUsed,
      provider: 'openai',
    };
  }

  /**
   * 使用Anthropic生成内容
   */
  private async generateWithAnthropic(
    prompt: string,
    model: string = 'claude-3-5-sonnet-20241022',
    maxTokens: number = 2000,
    temperature: number = 0.7
  ): Promise<AIGenerateResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: '你是一个专业的内容创作助手，擅长为跨境电商卖家创作高质量的营销内容。',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;

    return {
      content,
      model,
      tokensUsed,
      provider: 'anthropic',
    };
  }

  /**
   * 生成内容（自动选择可用提供商）
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const {
      prompt,
      provider = 'anthropic',
      model,
      maxTokens = 2000,
      temperature = 0.7,
    } = request;

    // 根据provider选择生成方法
    if (provider === 'openai' && this.openai) {
      return this.generateWithOpenAI(prompt, model || 'gpt-4o', maxTokens, temperature);
    } else if (provider === 'anthropic' && this.anthropic) {
      return this.generateWithAnthropic(prompt, model || 'claude-3-5-sonnet-20241022', maxTokens, temperature);
    }

    // 如果首选provider不可用，尝试fallback
    if (provider === 'openai' && this.anthropic) {
      return this.generateWithAnthropic(prompt, model || 'claude-3-5-sonnet-20241022', maxTokens, temperature);
    } else if (provider === 'anthropic' && this.openai) {
      return this.generateWithOpenAI(prompt, model || 'gpt-4o', maxTokens, temperature);
    }

    throw new Error('No AI provider available');
  }

  /**
   * 基于话题生成内容
   */
  async generateFromTopic(
    topicTitle: string,
    topicDescription: string | null,
    contentType: string,
    platform: string,
    targetCustomer: string
  ): Promise<AIGenerateResponse> {
    // 根据内容类型和平台构建prompt
    const prompt = this.buildPromptForContent(
      topicTitle,
      topicDescription,
      contentType,
      platform,
      targetCustomer
    );

    return this.generate({
      prompt,
      provider: 'anthropic',
      maxTokens: 3000,
    });
  }

  /**
   * 构建内容生成prompt
   */
  private buildPromptForContent(
    topicTitle: string,
    topicDescription: string | null,
    contentType: string,
    platform: string,
    targetCustomer: string
  ): string {
    const targetCustomerMap: Record<string, string> = {
      startup: '刚开始创业的跨境电商新手',
      experienced: '有一定经验的跨境电商卖家',
      team: '运营团队的跨境电商企业',
      local: '希望拓展全球市场的本地卖家',
    };

    const platformMap: Record<string, string> = {
      youtube: 'YouTube长视频',
      tiktok: 'TikTok短视频',
      blog: '博客文章',
      twitter: 'Twitter推文',
      linkedin: 'LinkedIn动态',
      reddit: 'Reddit回答',
      quora: 'Quora回答',
    };

    const customerDesc = targetCustomerMap[targetCustomer] || targetCustomer;
    const platformDesc = platformMap[platform] || platform;

    let prompt = `请为主题"${topicTitle}"创作${platformDesc}内容。\n\n`;
    prompt += `目标受众：${customerDesc}\n\n`;

    if (topicDescription) {
      prompt += `背景信息：${topicDescription}\n\n`;
    }

    prompt += `请确保内容：\n`;
    prompt += `1. 针对${customerDesc}的需求和痛点\n`;
    prompt += `2. 适合${platformDesc}的风格和格式\n`;
    prompt += `3. 提供实用的建议和价值\n`;
    prompt += `4. 语言自然、专业且易于理解\n\n`;

    // 根据平台添加特定要求
    switch (platform) {
      case 'youtube':
        prompt += `请包含以下结构：\n- 开场钩子\n- 主要内容（3-5个要点）\n- 实操建议\n- 总结和行动号召`;
        break;
      case 'tiktok':
        prompt += `请保持简短有力（30-60秒）：\n- 前3秒钩子\n- 核心信息\n- 行动号召`;
        break;
      case 'blog':
        prompt += `请包含：\n- 吸引人的标题\n- 引言\n- 主体内容（小标题分段）\n- 总结`;
        break;
      case 'twitter':
        prompt += `请控制在280字符以内，简洁有力，包含相关标签。`;
        break;
      default:
        prompt += `请根据平台特点调整内容风格。`;
    }

    return prompt;
  }

  /**
   * 检查AI服务是否可用
   */
  isAvailable(): boolean {
    return !!(this.openai || this.anthropic);
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    return providers;
  }
}

// 导出单例
export const aiService = new AIService();
