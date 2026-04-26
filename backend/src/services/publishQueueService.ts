import Bull, { Job, Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, remove } from '../utils/db';
import { config } from '../config';
import { PublishTask } from '../models/types';

/**
 * 发布任务数据接口
 */
interface PublishJobData {
  contentId: string;
  platform: string;
  scheduledAt?: Date;
  publishOptions?: Record<string, any>;
  userId: string;
}

/**
 * 发布队列服务 - 使用Bull管理发布任务
 */
export class PublishQueueService {
  private queue: Queue<PublishJobData>;
  private platformHandlers: Map<string, (content: any, options?: any) => Promise<any>>;

  constructor() {
    // 创建Bull队列
    this.queue = new Bull('publish-queue', {
      redis: config.redis.url,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 保留24小时
          count: 1000, // 最多保留1000个已完成任务
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 保留7天
        },
      },
    });

    // 初始化平台处理器
    this.platformHandlers = new Map();
    this.initializePlatformHandlers();

    // 处理队列任务
    this.processQueue();

    // 监听队列事件
    this.setupEventListeners();
  }

  /**
   * 初始化各平台的发布处理器
   */
  private initializePlatformHandlers(): void {
    // YouTube发布处理器
    this.platformHandlers.set('youtube', async (content, options) => {
      // TODO: 实现YouTube API发布逻辑
      console.log('Publishing to YouTube:', content.title);
      return {
        success: true,
        postId: 'yt_' + Date.now(),
        postUrl: 'https://youtube.com/watch?v=mock',
      };
    });

    // TikTok发布处理器
    this.platformHandlers.set('tiktok', async (content, options) => {
      // TODO: 实现TikTok API发布逻辑
      console.log('Publishing to TikTok:', content.title);
      return {
        success: true,
        postId: 'tt_' + Date.now(),
        postUrl: 'https://tiktok.com/@user/video/mock',
      };
    });

    // Blog发布处理器
    this.platformHandlers.set('blog', async (content, options) => {
      // TODO: 实现博客发布逻辑
      console.log('Publishing to Blog:', content.title);
      return {
        success: true,
        postId: 'blog_' + Date.now(),
        postUrl: 'https://blog.example.com/post/mock',
      };
    });

    // Twitter发布处理器
    this.platformHandlers.set('twitter', async (content, options) => {
      // TODO: 实现Twitter API发布逻辑
      console.log('Publishing to Twitter:', content.title);
      return {
        success: true,
        postId: 'tw_' + Date.now(),
        postUrl: 'https://twitter.com/user/status/mock',
      };
    });

    // LinkedIn发布处理器
    this.platformHandlers.set('linkedin', async (content, options) => {
      // TODO: 实现LinkedIn API发布逻辑
      console.log('Publishing to LinkedIn:', content.title);
      return {
        success: true,
        postId: 'li_' + Date.now(),
        postUrl: 'https://linkedin.com/feed/update/mock',
      };
    });

    // Reddit发布处理器
    this.platformHandlers.set('reddit', async (content, options) => {
      // TODO: 实现Reddit API发布逻辑
      console.log('Publishing to Reddit:', content.title);
      return {
        success: true,
        postId: 'rd_' + Date.now(),
        postUrl: 'https://reddit.com/r/subreddit/comments/mock',
      };
    });

    // Quora发布处理器
    this.platformHandlers.set('quora', async (content, options) => {
      // TODO: 实现Quora API发布逻辑
      console.log('Publishing to Quora:', content.title);
      return {
        success: true,
        postId: 'qo_' + Date.now(),
        postUrl: 'https://quora.com/answer/mock',
      };
    });
  }

  /**
   * 处理队列任务
   */
  private processQueue(): void {
    this.queue.process(async (job: Job<PublishJobData>) => {
      const { contentId, platform, publishOptions, userId } = job.data;

      try {
        // 获取内容详情
        const content = await queryOne(
          'SELECT * FROM contents WHERE id = ?',
          [contentId]
        );

        if (!content) {
          throw new Error(`Content not found: ${contentId}`);
        }

        // 获取对应的平台处理器
        const handler = this.platformHandlers.get(platform);
        if (!handler) {
          throw new Error(`No handler found for platform: ${platform}`);
        }

        // 执行发布
        const result = await handler(content, publishOptions);

        // 更新发布任务状态
        await this.updatePublishTask(contentId, {
          status: 'published',
          platform_post_id: result.postId,
          platform_post_url: result.postUrl,
          published_at: new Date(),
        });

        // 更新内容状态
        await query(
          `UPDATE contents SET status = 'published', published_at = NOW() WHERE id = ?`,
          [contentId]
        );

        return result;
      } catch (error) {
        // 更新发布任务状态为失败
        await this.updatePublishTask(contentId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    });
  }

  /**
   * 设置队列事件监听
   */
  private setupEventListeners(): void {
    // 任务完成
    this.queue.on('completed', async (job: Job, result: any) => {
      console.log(`Publish job completed: ${job.id}`, result);
    });

    // 任务失败
    this.queue.on('failed', async (job: Job | undefined, error: Error) => {
      console.error(`Publish job failed: ${job?.id}`, error.message);

      // 更新重试次数
      if (job) {
        const { contentId } = job.data;
        await this.incrementRetryCount(contentId);
      }
    });

    // 任务停滞
    this.queue.on('stalled', async (job: Job) => {
      console.warn(`Publish job stalled: ${job.id}`);
    });
  }

  /**
   * 添加发布任务到队列
   */
  async addPublishJob(data: PublishJobData, scheduledAt?: Date): Promise<Job<PublishJobData>> {
    const taskId = uuidv4();

    // 创建发布任务记录
    await query(
      `INSERT INTO publish_tasks (id, content_id, platform, status, scheduled_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [taskId, data.contentId, data.platform, 'pending', scheduledAt || null, data.userId]
    );

    // 添加到队列
    const jobOptions = scheduledAt ? {
      delay: scheduledAt.getTime() - Date.now(),
      jobId: taskId,
    } : {
      jobId: taskId,
    };

    const job = await this.queue.add(data, jobOptions);

    // 更新任务状态
    await query(
      `UPDATE publish_tasks SET status = 'scheduled' WHERE id = ?`,
      [taskId]
    );

    return job;
  }

  /**
   * 取消发布任务
   */
  async cancelPublishJob(taskId: string): Promise<boolean> {
    const job = await this.queue.getJob(taskId);
    if (job) {
      await job.remove();
    }

    // 更新数据库状态
    const result = await remove(
      `UPDATE publish_tasks SET status = 'cancelled' WHERE id = ?`,
      [taskId]
    );

    return result > 0;
  }

  /**
   * 重试发布任务
   */
  async retryPublishJob(taskId: string): Promise<Job<PublishJobData> | null> {
    // 获取任务信息
    const task = await queryOne<any>(
      `SELECT pt.*, c.content_text, c.title, c.content_type
       FROM publish_tasks pt
       JOIN contents c ON pt.content_id = c.id
       WHERE pt.id = ?`,
      [taskId]
    );

    if (!task) {
      return null;
    }

    // 重新添加到队列
    const jobData: PublishJobData = {
      contentId: task.content_id,
      platform: task.platform,
      scheduledAt: task.scheduled_at,
      publishOptions: {},
      userId: task.created_by,
    };

    const job = await this.queue.add(jobData, {
      jobId: taskId,
      attempts: 3,
    });

    // 更新数据库状态
    await query(
      `UPDATE publish_tasks SET status = 'pending', retry_count = 0 WHERE id = ?`,
      [taskId]
    );

    return job;
  }

  /**
   * 更新发布任务
   */
  private async updatePublishTask(contentId: string, updates: Partial<PublishTask>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (sets.length === 0) return;

    values.push(contentId);

    await query(
      `UPDATE publish_tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE content_id = ?`,
      values
    );
  }

  /**
   * 增加重试次数
   */
  private async incrementRetryCount(contentId: string): Promise<void> {
    await query(
      `UPDATE publish_tasks SET retry_count = retry_count + 1 WHERE content_id = ?`,
      [contentId]
    );
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * 暂停队列
   */
  async pause(): Promise<void> {
    await this.queue.pause();
  }

  /**
   * 恢复队列
   */
  async resume(): Promise<void> {
    await this.queue.resume();
  }

  /**
   * 清空队列
   */
  async obliterate(): Promise<void> {
    await this.queue.obliterate({ force: true });
  }

  /**
   * 获取队列实例
   */
  getQueue(): Queue<PublishJobData> {
    return this.queue;
  }

  /**
   * 获取发布任务列表
   */
  async getPublishTasks(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    platform?: string;
  } = {}): Promise<{ tasks: PublishTask[]; total: number }> {
    const { page = 1, pageSize = 20, status, platform } = options;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`status = ?`);
      params.push(status);
    }

    if (platform) {
      conditions.push(`platform = ?`);
      params.push(platform);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM publish_tasks ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // 获取列表
    const tasks = await query<PublishTask>(
      `SELECT * FROM publish_tasks
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      tasks,
      total,
    };
  }
}

// 导出单例
export const publishQueueService = new PublishQueueService();
