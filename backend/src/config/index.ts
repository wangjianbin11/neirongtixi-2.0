import dotenv from 'dotenv';
import path from 'path';

// 明确指定 .env 文件路径
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  server: {
    port: parseInt(process.env.PORT || '4000'),
    env: process.env.NODE_ENV || 'development',
  },
  api: {
    prefix: process.env.API_PREFIX || '/api/v1',
  },
  database: {
    // MySQL配置
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asgbook',
    // 连接池配置
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    // MongoDB仍用于文档存储
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/asg_content',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
    accessExpiry: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiry: '30d',
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    cseId: process.env.GOOGLE_CSE_ID || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  external: {
    ahrefsApiKey: process.env.AHREFS_API_KEY || '',
    semrushApiKey: process.env.SEMRUSH_API_KEY || '',
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
  },
  reddit: {
    appId: process.env.REDDIT_APP_ID || '',
    appSecret: process.env.REDDIT_APP_SECRET || '',
    userAgent: process.env.REDDIT_USER_AGENT || 'ContentResearchSystem/1.0',
  },
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000'),
  },
  search: {
    enableCache: process.env.SEARCH_ENABLE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.SEARCH_CACHE_TTL || '300000'), // 5分钟
    maxConcurrent: parseInt(process.env.SEARCH_MAX_CONCURRENT || '5'),
  },
  storage: {
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET || '',
  },
};
