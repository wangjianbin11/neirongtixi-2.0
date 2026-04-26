# ASG内容系统

一个基于AI驱动的内容管理和发布平台，支持多平台内容创作、SEO优化、数据分析等功能。

## 📊 系统状态

**开发进度**: 90% ✅

```
✅ 前端UI          100% ████████████
✅ 后端API         100% ████████████
✅ 数据库设计      100% ████████████
✅ 核心功能        100% ████████████
✅ Google搜索      100% ████████████
⏳ 第三方集成      50% ██████████░░░
⏳ AI生成          80% ███████████░░
```

## 🎯 核心功能

### 已完成功能

| 模块 | 功能 | 状态 |
|------|------|------|
| **用户系统** | 登录注册、权限管理、个人中心 | ✅ |
| **关键词管理** | CRUD、批量操作、导入导出 | ✅ |
| **话题管理** | CRUD、关联关键词、平台分配 | ✅ |
| **内容管理** | CRUD、编辑详情、状态流转 | ✅ |
| **内容生成** | AI生成入口（待集成） | ⏳ |
| **技能管理** | 技能模板、执行历史 | ✅ |
| **发布管理** | 发布队列、状态追踪 | ✅ |
| **数据分析** | 仪表板、多维度统计 | ✅ |
| **素材管理** | CRUD、文件上传、分类 | ✅ |
| **通知系统** | 实时通知、已读状态 | ✅ |
| **系统设置** | 通用/AI/通知/发布设置 | ✅ |
| **Google搜索** | 深度搜索、批量查询 | ✅ |

## 🏗️ 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Ant Design 5 (UI组件)
- React Router v6 (路由)
- Zustand (状态管理)
- Axios (HTTP客户端)

### 后端
- Node.js 20 + Express
- TypeScript
- PostgreSQL (主数据库)
- MongoDB (文档存储)
- Redis (缓存/队列)
- JWT (认证)

### AI服务
- Python 3.11 + FastAPI
- OpenAI API
- Anthropic API

## 📁 项目结构

```
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── api/             # API客户端
│   │   ├── components/      # React组件
│   │   ├── pages/           # 页面组件
│   │   ├── stores/          # Zustand状态
│   │   └── styles/          # 样式文件
│   └── package.json
│
├── backend/                  # 后端项目
│   ├── src/
│   │   ├── api/             # API路由
│   │   ├── services/        # 业务服务
│   │   ├── models/          # 数据模型
│   │   ├── middleware/      # 中间件
│   │   └── config/          # 配置
│   └── package.json
│
├── database/                 # 数据库
│   └── migrations/
│       └── 001_init.sql     # 初始化脚本
│
├── docs/                     # 文档
│   ├── skills/               # 技能模板
│   ├── keywords/             # 关键词库
│   ├── topics/               # 话题库
│   └── templates/            # 内容模板
│
└── docker-compose.dev.yml    # 开发环境配置
```

## 🚀 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+
- Python 3.11+

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd 内容系统
```

2. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置必要的API密钥
```

3. **启动数据库**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

4. **初始化数据库**
```bash
# 执行数据库迁移
psql -h localhost -U postgres -d asg_content -f database/migrations/001_init.sql
```

5. **安装依赖**
```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

6. **启动服务**
```bash
# 终端1: 后端 (http://localhost:4000)
cd backend
npm run dev

# 终端2: 前端 (http://localhost:3000)
cd frontend
npm run dev
```

### 访问地址

- 前端: http://localhost:3000
- 后端API: http://localhost:4000/api/v1
- 健康检查: http://localhost:4000/health

### 默认账户

```
用户名: admin
邮箱: admin@asg.com
密码: admin123 (首次登录后请修改)
```

## 📡 API端点

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `GET /api/v1/auth/me` - 获取当前用户
- `PUT /api/v1/auth/password` - 修改密码

### 用户
- `GET /api/v1/users/me` - 获取个人信息
- `PUT /api/v1/users/me` - 更新个人信息
- `GET /api/v1/users` - 获取用户列表（管理员）

### 设置
- `GET /api/v1/settings/general` - 获取通用设置
- `PUT /api/v1/settings/general` - 更新通用设置
- `GET /api/v1/settings/ai` - 获取AI设置
- `PUT /api/v1/settings/ai` - 更新AI设置

### 关键词
- `GET /api/v1/keywords` - 获取关键词列表
- `POST /api/v1/keywords` - 创建关键词
- `PUT /api/v1/keywords/:id` - 更新关键词
- `DELETE /api/v1/keywords/:id` - 删除关键词

### 话题
- `GET /api/v1/topics` - 获取话题列表
- `POST /api/v1/topics` - 创建话题
- `PUT /api/v1/topics/:id` - 更新话题
- `DELETE /api/v1/topics/:id` - 删除话题

### 内容
- `GET /api/v1/contents` - 获取内容列表
- `GET /api/v1/contents/:id` - 获取内容详情
- `POST /api/v1/contents` - 创建内容
- `PUT /api/v1/contents/:id` - 更新内容
- `DELETE /api/v1/contents/:id` - 删除内容
- `POST /api/v1/contents/:id/approve` - 批准内容
- `POST /api/v1/contents/:id/publish` - 发布内容

### 搜索
- `POST /api/v1/search` - Google深度搜索
- `GET /api/v1/search` - Google单页搜索
- `POST /api/v1/search/batch` - 批量搜索

### 通知
- `GET /api/v1/notifications` - 获取通知列表
- `PUT /api/v1/notifications/:id/read` - 标记已读

### 文件上传
- `POST /api/v1/upload/single` - 单文件上传
- `POST /api/v1/upload/multiple` - 多文件上传

## 🎨 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 用户登录 |
| `/dashboard` | 仪表板 | 数据概览 |
| `/keywords` | 关键词管理 | 关键词CRUD |
| `/topics` | 话题管理 | 话题CRUD |
| `/contents` | 内容列表 | 内容列表 |
| `/contents/:id` | 内容详情 | 内容编辑详情 |
| `/contents/generate` | AI生成 | AI内容生成 |
| `/skills` | 技能管理 | 技能模板 |
| `/search` | Google搜索 | 搜索工具 |
| `/publish` | 发布中心 | 发布队列 |
| `/analytics` | 数据分析 | 数据分析 |
| `/assets` | 素材库 | 素材管理 |
| `/profile` | 个人中心 | 用户资料 |
| `/settings` | 系统设置 | 系统配置 |
| `/notifications` | 通知中心 | 通知列表 |

## 🔧 配置说明

### 环境变量

主要环境变量说明：

```bash
# 服务配置
NODE_ENV=development
PORT=4000

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/asg_content
REDIS_URL=redis://localhost:6379

# JWT认证
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Google搜索
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CSE_ID=your_cse_id

# AI服务
ANTHROPIC_API_KEY=your_anthropic_key
```

### 数据库配置

PostgreSQL主要表：
- `users` - 用户表
- `keywords` - 关键词表
- `topics` - 话题表
- `contents` - 内容表
- `skill_templates` - 技能模板
- `skill_executions` - 技能执行记录
- `publish_tasks` - 发布任务
- `notifications` - 通知表
- `system_configs` - 系统配置

## 📊 数据统计

### 内容资源
- ✅ 30+ 技能模板
- ✅ 500+ 关键词库
- ✅ 100+ 话题库
- ✅ 10+ 内容模板
- ✅ 75+ 行业金句

### 功能模块
- ✅ 16个前端页面
- ✅ 13个后端API路由
- ✅ 11个后端服务
- ✅ 23张数据库表

## 🚧 待完成功能

### P2 优先级
- [ ] AI内容生成实际集成
- [ ] 第三方平台发布集成（YouTube、TikTok等）
- [ ] SEO工具API集成（Ahrefs、SEMrush）
- [ ] WebSocket实时通知
- [ ] 文件导出优化

### 增强功能
- [ ] 内容版本历史对比
- [ ] 高级搜索和筛选
- [ ] 自定义报表
- [ ] 工作流自动化
- [ ] 多语言支持

## 📝 开发日志

### 2025-01-28
- ✅ 完成用户系统API
- ✅ 完成系统设置API
- ✅ 完成Google搜索集成
- ✅ 完成前端所有页面
- ✅ 更新环境变量配置

### 2025-01-27
- ✅ 项目初始化
- ✅ 数据库设计
- ✅ 基础框架搭建

## 📄 许可证

Copyright © 2025 ASG. All rights reserved.

## 🤝 贡献

欢迎提交Issue和Pull Request。

---

**版本**: v2.0
**最后更新**: 2025-01-28
