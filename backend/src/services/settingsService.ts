import { query, queryOne, update } from '../utils/db';

/**
 * 系统设置类型
 */
export interface SystemConfig {
  key: string;
  value: any;
  description?: string;
  is_public: boolean;
  updated_at: Date;
}

/**
 * 系统设置服务
 */
export class SettingsService {
  /**
   * 获取设置值
   */
  async get(key: string): Promise<any | null> {
    const result = await queryOne<{ value: any }>(
      'SELECT value FROM system_configs WHERE `key` = ?',
      [key]
    );

    return result?.value || null;
  }

  /**
   * 获取多个设置值
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    if (keys.length === 0) return {};

    const placeholders = keys.map(() => '?').join(',');
    const result = await query<{ key: string; value: any }>(
      `SELECT \`key\`, value FROM system_configs WHERE \`key\` IN (${placeholders})`,
      keys
    );

    const configs: Record<string, any> = {};
    for (const row of result) {
      configs[row.key] = row.value;
    }

    return configs;
  }

  /**
   * 获取所有公开设置
   */
  async getPublic(): Promise<Record<string, any>> {
    const result = await query<{ key: string; value: any }>(
      'SELECT `key`, value FROM system_configs WHERE is_public = 1'
    );

    const configs: Record<string, any> = {};
    for (const row of result) {
      configs[row.key] = row.value;
    }

    return configs;
  }

  /**
   * 获取所有设置（管理员）
   */
  async getAll(): Promise<SystemConfig[]> {
    return await query<SystemConfig>(
      'SELECT * FROM system_configs ORDER BY `key`'
    );
  }

  /**
   * 设置单个配置值
   */
  async set(key: string, value: any, description?: string, isPublic = false): Promise<SystemConfig> {
    // 检查是否已存在
    const existing = await queryOne<any>(
      'SELECT id FROM system_configs WHERE `key` = ?',
      [key]
    );

    if (existing) {
      // 更新
      await query(
        `UPDATE system_configs SET value = ?, description = COALESCE(?, description), is_public = ?, updated_at = NOW() WHERE \`key\` = ?`,
        [JSON.stringify(value), description, isPublic ? 1 : 0, key]
      );
    } else {
      // 插入
      await query(
        `INSERT INTO system_configs (\`key\`, value, description, is_public) VALUES (?, ?, ?, ?)`,
        [key, JSON.stringify(value), description || null, isPublic ? 1 : 0]
      );
    }

    const result = await queryOne<SystemConfig>(
      'SELECT * FROM system_configs WHERE `key` = ?',
      [key]
    );

    return result!;
  }

  /**
   * 批量设置配置值
   */
  async setMultiple(configs: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      await this.set(key, value);
    }
  }

  /**
   * 删除配置
   */
  async delete(key: string): Promise<boolean> {
    const result = await update(
      'DELETE FROM system_configs WHERE `key` = ?',
      [key]
    );
    return result > 0;
  }

  /**
   * 获取通用设置
   */
  async getGeneralSettings(): Promise<{
    siteName: string;
    siteUrl: string;
    language: string;
    timezone: string;
  }> {
    const configs = await this.getMultiple(['site_name', 'site_url', 'language', 'timezone']);
    return {
      siteName: configs.site_name || 'ASG内容系统',
      siteUrl: configs.site_url || 'https://example.com',
      language: configs.language || 'zh-CN',
      timezone: configs.timezone || 'Asia/Shanghai',
    };
  }

  /**
   * 更新通用设置
   */
  async updateGeneralSettings(settings: {
    siteName?: string;
    siteUrl?: string;
    language?: string;
    timezone?: string;
  }): Promise<void> {
    const configs: Record<string, any> = {};
    if (settings.siteName !== undefined) configs.site_name = settings.siteName;
    if (settings.siteUrl !== undefined) configs.site_url = settings.siteUrl;
    if (settings.language !== undefined) configs.language = settings.language;
    if (settings.timezone !== undefined) configs.timezone = settings.timezone;

    await this.setMultiple(configs);
  }

  /**
   * 获取通知设置
   */
  async getNotificationSettings(): Promise<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    contentPublished: boolean;
    publishFailed: boolean;
    systemUpdates: boolean;
  }> {
    const configs = await this.getMultiple([
      'notif_email_enabled',
      'notif_push_enabled',
      'notif_sms_enabled',
      'notif_content_published',
      'notif_publish_failed',
      'notif_system_updates',
    ]);
    return {
      emailEnabled: configs.notif_email_enabled ?? true,
      pushEnabled: configs.notif_push_enabled ?? true,
      smsEnabled: configs.notif_sms_enabled ?? false,
      contentPublished: configs.notif_content_published ?? true,
      publishFailed: configs.notif_publish_failed ?? true,
      systemUpdates: configs.notif_system_updates ?? true,
    };
  }

  /**
   * 更新通知设置
   */
  async updateNotificationSettings(settings: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    contentPublished?: boolean;
    publishFailed?: boolean;
    systemUpdates?: boolean;
  }): Promise<void> {
    const configs: Record<string, any> = {};
    if (settings.emailEnabled !== undefined) configs.notif_email_enabled = settings.emailEnabled;
    if (settings.pushEnabled !== undefined) configs.notif_push_enabled = settings.pushEnabled;
    if (settings.smsEnabled !== undefined) configs.notif_sms_enabled = settings.smsEnabled;
    if (settings.contentPublished !== undefined) configs.notif_content_published = settings.contentPublished;
    if (settings.publishFailed !== undefined) configs.notif_publish_failed = settings.publishFailed;
    if (settings.systemUpdates !== undefined) configs.notif_system_updates = settings.systemUpdates;

    await this.setMultiple(configs);
  }

  /**
   * 获取AI设置
   */
  async getAISettings(): Promise<{
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
  }> {
    const configs = await this.getMultiple(['ai_provider', 'ai_model', 'ai_max_tokens', 'ai_temperature']);
    return {
      provider: configs.ai_provider || 'anthropic',
      model: configs.ai_model || 'claude-3-5-sonnet-20241022',
      maxTokens: configs.ai_max_tokens || 3000,
      temperature: configs.ai_temperature ?? 0.7,
    };
  }

  /**
   * 更新AI设置
   */
  async updateAISettings(settings: {
    provider?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<void> {
    const configs: Record<string, any> = {};
    if (settings.provider !== undefined) configs.ai_provider = settings.provider;
    if (settings.model !== undefined) configs.ai_model = settings.model;
    if (settings.maxTokens !== undefined) configs.ai_max_tokens = settings.maxTokens;
    if (settings.temperature !== undefined) configs.ai_temperature = settings.temperature;

    await this.setMultiple(configs);
  }

  /**
   * 获取发布设置
   */
  async getPublishSettings(): Promise<{
    autoPublish: boolean;
    retryAttempts: number;
    retryDelay: number;
    queuePaused: boolean;
  }> {
    const configs = await this.getMultiple([
      'publish_auto',
      'publish_retry_attempts',
      'publish_retry_delay',
      'publish_queue_paused',
    ]);
    return {
      autoPublish: configs.publish_auto ?? false,
      retryAttempts: configs.publish_retry_attempts || 3,
      retryDelay: configs.publish_retry_delay || 5,
      queuePaused: configs.publish_queue_paused ?? false,
    };
  }

  /**
   * 更新发布设置
   */
  async updatePublishSettings(settings: {
    autoPublish?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
    queuePaused?: boolean;
  }): Promise<void> {
    const configs: Record<string, any> = {};
    if (settings.autoPublish !== undefined) configs.publish_auto = settings.autoPublish;
    if (settings.retryAttempts !== undefined) configs.publish_retry_attempts = settings.retryAttempts;
    if (settings.retryDelay !== undefined) configs.publish_retry_delay = settings.retryDelay;
    if (settings.queuePaused !== undefined) configs.publish_queue_paused = settings.queuePaused;

    await this.setMultiple(configs);
  }

  /**
   * 测试数据库连接
   */
  async testDatabaseConnection(): Promise<boolean> {
    try {
      await query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * 测试Redis连接
   */
  async testRedisConnection(): Promise<boolean> {
    // TODO: 实现Redis连接测试
    return true;
  }
}

// 导出单例
export const settingsService = new SettingsService();
