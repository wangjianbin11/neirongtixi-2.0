# 宝塔部署检查清单

## 服务器准备

- [ ] 宝塔面板已安装（版本 7.7+）
- [ ] 服务器配置：内存 ≥ 2GB，磁盘 ≥ 20GB
- [ ] 域名已解析到服务器IP

## 软件安装（宝塔软件商店）

- [ ] Nginx 1.20+
- [ ] MySQL 5.7+ 或 8.0+
- [ ] Node.js 16.x+ 或 18.x+
- [ ] PM2（进程管理器）
- [ ] Redis（可选，用于缓存）

## 数据库配置

- [ ] 创建数据库：`asg_content`
- [ ] 创建数据库用户并授权
- [ ] 记录数据库信息：
  - 主机：`localhost` 或 `127.0.0.1`
  - 端口：`3306`
  - 数据库名：`asg_content`
  - 用户名：`__________`
  - 密码：`__________`

## 后端部署

### 代码上传
- [ ] 后端代码已上传到 `/www/wwwroot/asg-content-system/backend`
- [ ] 或使用 Git 克隆代码

### 环境配置
- [ ] 从 `.env.example` 创建 `.env` 文件
- [ ] 配置数据库连接信息
- [ ] 修改 `JWT_SECRET` 为强随机字符串
- [ ] 配置 `CORS_ORIGIN` 为你的域名
- [ ] 配置 API 密钥（OpenAI, Anthropic等）

### 构建与启动
- [ ] 运行 `npm install --production` 安装依赖
- [ ] 运行 `npm run build` 编译代码
- [ ] 运行 `npm run migrate` 执行数据库迁移
- [ ] 使用 PM2 启动服务
- [ ] 设置 PM2 开机自启：`pm2 startup && pm2 save`

### 后端验证
- [ ] PM2 状态正常：`pm2 status`
- [ ] 健康检查通过：`curl http://localhost:4000/health`
- [ ] 数据库连接正常
- [ ] 日志无错误：`pm2 logs asg-backend`

## 前端部署

### 本地构建
- [ ] 修改 API 地址为生产域名
- [ ] 运行 `npm install` 安装依赖
- [ ] 运行 `npm run build` 构建生产版本
- [ ] 将 `dist` 目录上传到服务器

### 或服务器构建
- [ ] 前端代码已上传到 `/www/wwwroot/asg-content-system/frontend`
- [ ] 配置 `.env.production` 中的 API 地址
- [ ] 运行 `npm install` 安装依赖
- [ ] 运行 `npm run build` 构建
- [ ] 复制 `dist/*` 到网站根目录

### 网站目录
- [ ] 网站根目录：`/www/wwwroot/your-domain.com`
- [ ] 构建文件已正确复制
- [ ] `index.html` 存在
- [ ] 静态资源目录存在（`assets/`）

## Nginx配置

### 站点创建
- [ ] 在宝塔创建站点：`your-domain.com`
- [ ] 选择纯静态（PHP版本选纯静态）

### 反向代理配置
- [ ] 配置 `/api` 路径代理到后端 `http://127.0.0.1:4000`
- [ ] 配置 `/socket.io/` 支持 WebSocket
- [ ] 配置前端路由支持：`try_files $uri $uri/ /index.html`
- [ ] 配置静态资源缓存

### 配置测试
- [ ] Nginx 配置测试通过：`nginx -t`
- [ ] Nginx 已重载：`nginx -s reload`

## SSL证书

- [ ] 申请 Let's Encrypt 证书（宝塔自动）
- [ ] 或手动上传 SSL 证书
- [ ] 开启强制 HTTPS
- [ ] HTTP 自动跳转 HTTPS

## 功能测试

### 基础功能
- [ ] 前端页面可正常访问
- [ ] 页面样式正常加载
- [ ] 路由跳转正常

### API功能
- [ ] 用户登录/注册正常
- [ ] 关键词列表可加载
- [ ] 创建/编辑关键词正常
- [ ] 批量操作正常

### 实时功能
- [ ] WebSocket 连接正常
- [ ] 实时通知正常
- [ ] 工作流执行状态更新

### 文件功能
- [ ] 文件上传正常
- [ ] 导出功能正常
- [ ] 导入功能正常

## 监控与维护

### 日志配置
- [ ] PM2 日志路径正确
- [ ] Nginx 访问日志正常
- [ ] Nginx 错误日志正常
- [ ] 应用日志正常

### 备份配置
- [ ] 数据库自动备份（宝塔计划任务）
- [ ] 代码定期备份
- [ ] 配置文件备份

### 监控告警
- [ ] 宝塔监控插件已安装
- [ ] 磁盘空间监控
- [ ] 内存使用监控
- [ ] CPU使用监控

## 安全检查

- [ ] JWT_SECRET 已修改为强随机值
- [ ] 数据库密码使用强密码
- [ ] API密钥不暴露在前端代码
- [ ] CORS_ORIGIN 只包含可信域名
- [ ] 防火墙已配置
- [ ] SSH端口已修改（可选）
- [ ] 禁用root远程登录（可选）

---

## 部署完成后记录

```
服务器IP: ____________
域名: ____________
SSH端口: ____________

数据库:
- 数据库名: asg_content
- 用户名: ____________
- 密码: ____________

API地址: https://__________/api/v1
管理后台: https://__________/

PM2命令:
- 查看状态: pm2 status
- 查看日志: pm2 logs asg-backend
- 重启服务: pm2 restart asg-backend
```

## 常用命令速查

```bash
# PM2管理
pm2 status              # 查看状态
pm2 logs asg-backend    # 查看日志
pm2 restart asg-backend # 重启服务
pm2 stop asg-backend    # 停止服务
pm2 monit               # 监控面板

# Nginx管理
nginx -t               # 测试配置
nginx -s reload        # 重载配置
nginx -s stop          # 停止服务
nginx -s start         # 启动服务

# 数据库
mysqldump -u root -p asg_content > backup.sql  # 备份
mysql -u root -p asg_content < backup.sql      # 恢复

# 系统监控
htop                   # 资源监控（需安装）
df -h                  # 磁盘使用
free -m                # 内存使用
netstat -tlnp          # 端口监听
```

## 问题排查

| 问题 | 检查项 |
|------|--------|
| 页面404 | Nginx root路径、文件权限 |
| API请求失败 | PM2状态、后端日志、CORS配置 |
| 数据库连接失败 | .env配置、MySQL服务状态 |
| WebSocket失败 | Nginx代理配置、防火墙端口 |
| 文件上传失败 | 目录权限、上传大小限制 |
| 内存溢出 | PM2 max_memory配置、实例数 |

---

## 更新日志

| 日期 | 操作 | 人员 |
|------|------|------|
| ____ | 初始部署 | ____ |
| ____ | | ____ |
