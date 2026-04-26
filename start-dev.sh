#!/bin/bash

# ASG内容系统 - 开发环境启动脚本

echo "============================================"
echo "ASG内容系统 - 开发环境启动"
echo "============================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查并安装后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}[1/4]${NC} 安装后端依赖..."
    cd backend
    npm install
    cd ..
else
    echo -e "${GREEN}[1/4]${NC} 后端依赖已安装"
fi

# 检查并安装前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[2/4]${NC} 安装前端依赖..."
    cd frontend
    npm install
    cd ..
else
    echo -e "${GREEN}[2/4]${NC} 前端依赖已安装"
fi

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}[3/4]${NC} Docker未运行，请先启动Docker"
    exit 1
fi

# 启动数据库服务
echo -e "${GREEN}[3/4]${NC} 启动数据库服务..."
docker-compose -f docker-compose.dev.yml up -d

# 等待数据库启动
echo "等待数据库启动..."
sleep 5

echo ""
echo "============================================"
echo "启动开发服务器"
echo "============================================"
echo ""

# 在后台启动后端服务
echo -e "${GREEN}启动后端服务...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 在后台启动前端服务
echo -e "${GREEN}启动前端服务...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo -e "${GREEN}开发环境已启动${NC}"
echo "============================================"
echo ""
echo "后端 API: http://localhost:4000/api/v1"
echo "前端页面: http://localhost:3000"
echo "健康检查: http://localhost:4000/health"
echo ""
echo "默认账户:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 捕获退出信号
trap "echo ''; echo '停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose -f docker-compose.dev.yml down; exit 0" INT TERM

# 等待后台进程
wait
