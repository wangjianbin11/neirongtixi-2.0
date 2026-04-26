#!/bin/bash

# ================================
# ASG内容系统 - 后端快速部署脚本
# 使用方法: bash deploy.sh
# ================================

set -e  # 遇到错误立即退出

echo "================================"
echo "ASG内容系统 - 后端部署脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="/www/wwwroot/asg-content-system/backend"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用root用户或sudo运行此脚本${NC}"
  exit 1
fi

# 1. 检查Node.js版本
echo -e "${YELLOW}[1/8] 检查Node.js版本...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js未安装，请先在宝塔面板安装Node.js${NC}"
  exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo -e "${RED}Node.js版本过低，需要16.x或更高版本${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js版本: $(node -v)${NC}"

# 2. 检查PM2
echo -e "${YELLOW}[2/8] 检查PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
  echo "安装PM2..."
  npm install -g pm2
fi
echo -e "${GREEN}✓ PM2已安装${NC}"

# 3. 进入项目目录
echo -e "${YELLOW}[3/8] 进入项目目录...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}项目目录不存在: $PROJECT_DIR${NC}"
  echo "请先上传代码到服务器"
  exit 1
fi
cd "$PROJECT_DIR"
echo -e "${GREEN}✓ 当前目录: $(pwd)${NC}"

# 4. 检查.env文件
echo -e "${YELLOW}[4/8] 检查环境变量配置...${NC}"
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}未找到.env文件，从.env.example创建...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${RED}请编辑.env文件，配置数据库连接和其他密钥${NC}"
    echo "nano .env"
    echo "配置完成后重新运行此脚本"
    exit 1
  else
    echo -e "${RED}未找到.env.example文件${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ 环境变量文件已配置${NC}"

# 5. 安装依赖
echo -e "${YELLOW}[5/8] 安装Node.js依赖...${NC}"
if [ -f "package-lock.json" ]; then
  npm ci --production
else
  npm install --production
fi
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 6. 构建项目
echo -e "${YELLOW}[6/8] 构建TypeScript代码...${NC}"
npm run build
echo -e "${GREEN}✓ 构建完成${NC}"

# 7. 运行数据库迁移
echo -e "${YELLOW}[7/8] 运行数据库迁移...${NC}"
read -p "是否运行数据库迁移? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm run migrate
  echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
  echo -e "${YELLOW}跳过数据库迁移${NC}"
fi

# 8. 启动PM2进程
echo -e "${YELLOW}[8/8] 启动后端服务...${NC}"
# 检查是否已有进程在运行
if pm2 list | grep -q "asg-backend"; then
  echo "发现已存在的进程，正在重启..."
  pm2 restart asg-backend
else
  echo "启动新进程..."
  if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
  else
    pm2 start dist/index.js --name asg-backend
  fi
fi

# 设置开机自启
pm2 startup systemd -u root --hp /root
pm2 save

echo ""
echo "================================"
echo -e "${GREEN}部署完成！${NC}"
echo "================================"
echo ""
echo "常用命令："
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs asg-backend"
echo "  重启服务: pm2 restart asg-backend"
echo "  停止服务: pm2 stop asg-backend"
echo ""
echo "测试服务："
echo "  curl http://localhost:4000/health"
echo ""
