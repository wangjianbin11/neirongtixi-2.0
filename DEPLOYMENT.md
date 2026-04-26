# 宝塔面板部署指南

## 目录

1. [服务器要求](#服务器要求)
2. [后端部署](#后端部署)
3. [前端部署](#前端部署)
4. [Nginx配置](#nginx配置)
5. [SSL证书配置](#ssl证书配置)
6. [PM2进程管理](#pm2进程管理)
7. [常见问题](#常见问题)

---

## 服务器要求

### 基础环境
- **操作系统**: Linux (推荐 CentOS 7+ / Ubuntu 18+)
- **内存**: 最低 2GB，推荐 4GB+
- **磁盘**: 最低 20GB
- **宝塔面板**: 7.7.0+

### 需要安装的软件（宝塔软件商店）
1. **Nginx** 1.20+
2. **MySQL** 5.7+ / 8.0+
3. **Node.js** 16.x+ / 18.x+
4. **PM2** (进程管理器)
5. **Redis** (可选，用于缓存)

---

## 后端部署

### 1. 上传代码到服务器

在宝塔面板中：

1. 进入 **网站** → **根目录**
2. 创建项目目录，例如：`/www/wwwroot/asg-content-system`
3. 通过 **文件管理** 上传后端代码，或使用 Git：

```bash
cd /www/wwwroot/asg-content-system
git clone <你的仓库地址> backend
```

### 2. 安装 Node.js 依赖

在宝塔 **终端** 或 **SSH** 中执行：

```bash
cd /www/wwwroot/asg-content-system/backend

# 安装依赖
npm install --production

# 或使用 pnpm（推荐）
pnpm install --prod
```

### 3. 创建环境变量文件

创建 `.env` 文件：

```bash
nano /www/wwwroot/asg-content-system/backend/.env
```

复制以下内容：

```env
# 服务器配置
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1

# 数据库配置（请修改为实际值）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=asg_content

# JWT密钥（请修改为随机字符串）
JWT_SECRET=your_random_jwt_secret_key_here_please_change_it
JWT_EXPIRES_IN=7d

# CORS配置（修改为你的前端域名）
CORS_ORIGIN=https://your-domain.com

# AI服务密钥
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Google搜索（可选）
GOOGLE_API_KEY=xxx
GOOGLE_CSE_ID=xxx

# Redis配置（可选）
REDIS_URL=redis://localhost:6379

# MongoDB配置（可选）
MONGO_URL=mongodb://localhost:27017/asg_content

# 外部API（可选）
AHREFS_API_KEY=
SEMRUSH_API_KEY=
YOUTUBE_API_KEY=

# AWS S3（可选）
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=
```

### 4. 创建数据库

1. 在宝塔面板进入 **数据库**
2. 创建新数据库：
   - 数据库名：`asg_content`
   - 用户名：`asg_content`
   - 密码：**设置强密码**
3. 记录数据库信息，更新 `.env` 文件

### 5. 运行数据库迁移

```bash
cd /www/wwwroot/asg-content-system/backend

# 运行迁移
npm run migrate
```

### 6. 构建后端代码

```bash
# 编译 TypeScript
npm run build
```

### 7. 使用 PM2 启动后端

在宝塔 **软件商店** → **PM2** 中配置，或使用命令行：

```bash
# 安装 PM2（如未安装）
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name asg-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs asg-backend

# 设置开机自启
pm2 startup
pm2 save
```

---

## 前端部署

### 1. 构建前端项目

在本地构建后上传，或直接在服务器构建：

**方式一：本地构建**

```bash
# 在本地项目目录
cd frontend

# 安装依赖
npm install

# 修改 API 地址（重要！）
# 编辑 frontend/src/api/client.ts 或 vite.config.ts
# 将 baseURL 改为服务器域名

# 构建生产版本
npm run build
```

构建完成后，将 `dist` 目录上传到服务器。

**方式二：服务器构建**

```bash
cd /www/wwwroot/asg-content-system

# 上传或 clone 前端代码
git clone <你的仓库地址> frontend
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 2. 修改前端 API 地址

在构建前，确保 API 地址正确指向服务器：

**修改 `frontend/src/api/client.ts`：**

```typescript
const baseURL = import.meta.env.PROD
  ? 'https://your-domain.com/api/v1'  // 生产环境
  : 'http://localhost:4000/api/v1';   // 开发环境
```

**或在 `vite.config.ts` 中配置：**

```typescript
export default defineConfig({
  // ... 其他配置
  base: '/',  // 确保基础路径正确
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
```

### 3. 部署静态文件

构建完成后，将 `dist` 目录的内容移动到网站根目录：

```bash
# 创建网站目录
mkdir -p /www/wwwroot/your-domain.com

# 复制构建文件
cp -r /www/wwwroot/asg-content-system/frontend/dist/* /www/wwwroot/your-domain.com/
```

---

## Nginx配置

### 1. 创建站点

1. 在宝塔 **网站** → **添加站点**
2. 域名：`your-domain.com`
3. 根目录：`/www/wwwroot/your-domain.com`
4. PHP版本：纯静态

### 2. 配置反向代理

进入站点设置 → **配置文件**，替换为：

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书配置（见下文）
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # 前端静态文件
    root /www/wwwroot/your-domain.com;
    index index.html;

    # 前端路由支持（React Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 支持（Socket.io）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 访问日志
    access_log /www/wwwlogs/your-domain.com_access.log;
    error_log /www/wwwlogs/your-domain.com_error.log;
}
```

### 3. 重载 Nginx

```bash
nginx -t  # 测试配置
nginx -s reload  # 重载配置
```

---

## SSL证书配置

### 方式一：宝塔自动申请 Let's Encrypt

1. 进入站点设置 → **SSL**
2. 选择 **Let's Encrypt**
3. 填写邮箱，点击申请
4. 开启 **强制HTTPS**

### 方式二：手动上传证书

1. 进入站点设置 → **SSL** → **其他证书**
2. 粘贴证书内容：
   - **证书(PEM格式)**
   - **密钥(KEY格式)**
3. 保存并开启强制HTTPS

---

## PM2进程管理

### 安装 PM2

```bash
npm install -g pm2
```

### PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'asg-backend',
    script: './dist/index.js',
    cwd: '/www/wwwroot/asg-content-system/backend',
    instances: 1,  // 单实例
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/www/wwwlogs/asg-backend-error.log',
    out_file: '/www/wwwlogs/asg-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### PM2 常用命令

```bash
# 启动
pm2 start ecosystem.config.js

# 停止
pm2 stop asg-backend

# 重启
pm2 restart asg-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs asg-backend

# 清除日志
pm2 flush

# 监控
pm2 monit

# 设置开机自启
pm2 startup
pm2 save
```

---

## 常见问题

### 1. 跨域问题

确保 `.env` 中的 `CORS_ORIGIN` 包含你的前端域名：

```env
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
```

### 2. 静态文件 404

检查 Nginx 配置中的 `root` 路径是否正确：

```nginx
root /www/wwwroot/your-domain.com;
```

### 3. API 请求失败

1. 检查后端是否启动：`pm2 status`
2. 检查端口是否占用：`netstat -tlnp | grep 4000`
3. 查看后端日志：`pm2 logs asg-backend`

### 4. WebSocket 连接失败

确保 Nginx 配置包含 WebSocket 支持（见上文配置）。

### 5. 数据库连接失败

1. 检查 MySQL 是否运行
2. 验证 `.env` 中的数据库配置
3. 确保数据库用户有足够权限

### 6. 内存不足

如果服务器内存不足，可以：

1. 减少实例数：`instances: 1`
2. 添加 swap 空间
3. 升级服务器配置

---

## 部署检查清单

### 后端
- [ ] 代码已上传到服务器
- [ ] Node.js 依赖已安装
- [ ] `.env` 文件已配置
- [ ] 数据库已创建
- [ ] 数据库迁移已运行
- [ ] 后端代码已构建
- [ ] PM2 进程已启动
- [ ] 后端服务可访问：`curl http://localhost:4000/health`

### 前端
- [ ] 代码已构建
- [ ] API 地址已修改为生产域名
- [ ] 构建文件已上传到网站根目录
- [ ] 静态文件可访问

### Nginx
- [ ] 站点已创建
- [ ] 反向代理已配置
- [ ] WebSocket 支持已配置
- [ ] SSL 证书已安装
- [ ] 强制 HTTPS 已开启

### 测试
- [ ] 前端页面可正常访问
- [ ] API 请求正常
- [ ] 用户登录功能正常
- [ ] WebSocket 连接正常
- [ ] 文件上传功能正常

---

## 维护建议

### 1. 定期备份

```bash
# 数据库备份（宝塔计划任务）
mysqldump -u root -p asg_content > backup_$(date +%Y%m%d).sql

# 代码备份
tar -czf backup_code_$(date +%Y%m%d).tar.gz /www/wwwroot/asg-content-system
```

### 2. 日志管理

```bash
# 定期清理日志
pm2 flush

# 或配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 监控

使用宝塔的 **监控** 功能或安装 Node.js 监控插件：

```bash
pm2 install pm2-server-monit
```

### 4. 更新部署

```bash
# 拉取最新代码
cd /www/wwwroot/asg-content-system/backend
git pull

# 安装新依赖
npm install --production

# 重新构建
npm run build

# 重启服务
pm2 restart asg-backend
```

---

## 联系支持

如有问题，请检查：
1. 宝塔面板日志
2. PM2 日志
3. Nginx 错误日志
4. 应用错误日志

日志位置：
- PM2 日志：`/www/wwwlogs/asg-backend-*.log`
- Nginx 日志：`/www/wwwlogs/your-domain.com_*.log`
- 应用日志：`/www/wwwroot/asg-content-system/backend/logs/`
