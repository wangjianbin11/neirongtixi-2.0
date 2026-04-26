import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  created_at: string;
}

interface ProgressPayload {
  type: 'content_generation' | 'publish' | 'analysis';
  progress: number;
  message?: string;
}

interface SystemMessagePayload {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface UseWebSocketOptions {
  onNotification?: (notification: NotificationPayload) => void;
  onProgress?: (progress: ProgressPayload) => void;
  onSystemMessage?: (message: SystemMessagePayload) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();

  // 使用 ref 存储回调函数，避免它们作为依赖项
  const callbacksRef = useRef(options);

  // 更新回调函数引用
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!accessToken || socketRef.current?.connected) {
      return;
    }

    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setIsConnected(true);
      callbacksRef.current.onConnected?.();
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      callbacksRef.current.onDisconnected?.();
    });

    socket.on('connected', (data) => {
      console.log('WebSocket handshake:', data);
    });

    socket.on('notification', (notification: NotificationPayload) => {
      console.log('New notification:', notification);
      callbacksRef.current.onNotification?.(notification);
    });

    socket.on('progress', (progress: ProgressPayload) => {
      console.log('Progress update:', progress);
      callbacksRef.current.onProgress?.(progress);
    });

    socket.on('system_message', (message: SystemMessagePayload) => {
      console.log('System message:', message);
      callbacksRef.current.onSystemMessage?.(message);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    socketRef.current = socket;
  }, [accessToken]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // 发送消息
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // 当 token 变化时重连
  useEffect(() => {
    if (accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [accessToken, connect, disconnect]);

  return {
    isConnected,
    socket: socketRef.current,
    emit,
  };
};

export default useWebSocket;
