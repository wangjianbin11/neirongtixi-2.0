#!/bin/bash

# ================================
# ASG内容系统 - 后端优化部署脚本
# ================================

set -e

echo "================================"
echo "ASG后端部署脚本"
echo "================================"
echo ""

PROJECT_DIR="/www/wwwroot/asgbook/backend"
cd "$PROJECT_DIR"

echo "[1/6] 清理旧文件..."
rm -rf dist
rm -rf node_modules
rm -f package-lock.json pnpm-lock.yaml
echo "✓ 清理完成"

echo ""
echo "[2/6] 安装所有依赖（包含构建工具）..."
npm install
echo "✓ 依赖安装完成"

echo ""
echo "[3/6] 构建项目..."
npm run build
echo "✓ 构建完成"

echo ""
echo "[4/6] 清理开发依赖，只保留生产依赖..."
npm prune --production
echo "✓ 清理完成"

echo ""
echo "[5/6] 检查环境配置..."
if [ ! -f .env ]; then
  echo "警告: .env 文件不存在"
  if [ -f .env.example ]; then
    echo "从 .env.example 创建 .env"
    cp .env.example .env
    echo "请编辑 .env 文件配置数据库连接"
  fi
else
  echo "✓ 环境配置已存在"
fi

echo ""
echo "[6/6] 启动服务..."
if command -v pm2 &> /dev/null; then
  # 停止旧进程
  pm2 delete asg-backend 2>/dev/null || true

  # 启动新进程
  pm2 start dist/index.js --name asg-backend

  # 保存进程列表
  pm2 save

  echo "✓ 服务已启动"
  echo ""
  echo "服务状态:"
  pm2 status
else
  echo "PM2未安装，请先安装: npm install -g pm2"
  exit 1
fi

echo ""
echo "================================"
echo "部署完成！"
echo "================================"
echo ""
echo "测试服务:"
echo "  curl http://localhost:4000/health"
echo ""
echo "查看日志:"
echo "  pm2 logs asg-backend"
echo ""
