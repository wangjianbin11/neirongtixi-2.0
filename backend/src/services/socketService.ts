import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { initWorkflowExecutor } from './workflowExecutor';

let io: SocketIOServer | null = null;

/**
 * 初始化 Socket.io 服务器
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin.split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // 初始化工作流执行器（传入io实例）
  initWorkflowExecutor(io);

  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role: string };
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // 连接处理
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`Socket connected: ${socket.id} (User: ${userId})`);

    // 加入用户个人房间
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // 根据角色加入房间
    if (socket.data.role === 'admin') {
      socket.join('admin');
    }

    // 发送欢迎消息
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    // 监听断开连接
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${userId})`);
      socket.leave(userRoom);
    });

    // 监听错误
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

/**
 * 获取 Socket.io 实例
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * 发送通知给指定用户
 */
export const sendNotificationToUser = (userId: string, notification: any): void => {
  const io = getIO();
  io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * 发送通知给所有管理员
 */
export const sendNotificationToAdmins = (notification: any): void => {
  const io = getIO();
  io.to('admin').emit('notification', notification);
};

/**
 * 广播通知给所有连接的用户
 */
export const broadcastNotification = (notification: any): void => {
  const io = getIO();
  io.emit('notification', notification);
};

/**
 * 发送进度更新
 */
export const sendProgressUpdate = (userId: string, progress: {
  type: 'content_generation' | 'publish' | 'analysis';
  progress: number;
  message?: string;
}): void => {
  const io = getIO();
  io.to(`user:${userId}`).emit('progress', progress);
};

/**
 * 发送调研进度更新
 */
export const sendResearchProgress = (userId: string, taskId: string, progress: {
  topic: string;
  status: string;
  progress: number; // 0-100
  current_channel: string;
  completed_channels: number;
  total_channels: number;
  results_summary: {
    total_results: number;
    by_channel: Record<string, number>;
  };
}): void => {
  const io = getIO();
  io.to(`user:${userId}`).emit('research_progress', {
    task_id: taskId,
    ...progress,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 发送调研完成通知
 */
export const sendResearchComplete = (userId: string, taskId: string, result: {
  topic: string;
  total_results: number;
  platform_candidates: any[];
}): void => {
  const io = getIO();
  io.to(`user:${userId}`).emit('research_complete', {
    task_id: taskId,
    ...result,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 发送调研错误通知
 */
export const sendResearchError = (userId: string, taskId: string, error: {
  message: string;
  channel?: string;
}): void => {
  const io = getIO();
  io.to(`user:${userId}`).emit('research_error', {
    task_id: taskId,
    ...error,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 发送系统消息
 */
export const sendSystemMessage = (message: {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}): void => {
  const io = getIO();
  io.emit('system_message', message);
};
