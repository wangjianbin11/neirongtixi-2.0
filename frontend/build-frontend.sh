#!/bin/bash

# ================================
# ASG内容系统 - 前端构建脚本
# 使用方法: bash build-frontend.sh
# ================================

set -e  # 遇到错误立即退出

echo "================================"
echo "ASG内容系统 - 前端构建脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取域名
DOMAIN=${1:-"your-domain.com"}

echo -e "${BLUE}请输入你的域名（默认: $DOMAIN）:${NC}"
read -e INPUT_DOMAIN
DOMAIN=${INPUT_DOMAIN:-$DOMAIN}

echo ""
echo "================================"
echo "域名: $DOMAIN"
echo "================================"
echo ""

# 1. 检查Node.js
echo -e "${YELLOW}[1/5] 检查Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js未安装${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js版本: $(node -v)${NC}"

# 2. 进入前端目录
echo -e "${YELLOW}[2/5] 进入前端目录...${NC}"
FRONTEND_DIR="/www/wwwroot/asg-content-system/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  echo -e "${RED}前端目录不存在: $FRONTEND_DIR${NC}"
  exit 1
fi
cd "$FRONTEND_DIR"
echo -e "${GREEN}✓ 当前目录: $(pwd)${NC}"

# 3. 更新API地址
echo -e "${YELLOW}[3/5] 配置生产环境API地址...${NC}"
API_URL="https://$DOMAIN/api/v1"
echo "API地址: $API_URL"

# 检查是否有.env文件
if [ -f ".env.production" ]; then
  echo "发现.env.production，使用现有配置"
else
  # 创建生产环境变量
  cat > .env.production << EOF
VITE_API_BASE_URL=$API_URL
EOF
  echo -e "${GREEN}✓ 已创建.env.production${NC}"
fi

# 4. 安装依赖
echo -e "${YELLOW}[4/5] 安装依赖...${NC}"
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 5. 构建项目
echo -e "${YELLOW}[5/5] 构建生产版本...${NC}"
npm run build
echo -e "${GREEN}✓ 构建完成${NC}"

# 6. 部署到网站目录
echo ""
echo -e "${YELLOW}[6/6] 部署到网站目录...${NC}"
WEB_DIR="/www/wwwroot/$DOMAIN"

if [ ! -d "$WEB_DIR" ]; then
  echo "创建网站目录: $WEB_DIR"
  mkdir -p "$WEB_DIR"
fi

# 复制构建文件
echo "复制文件到 $WEB_DIR"
cp -r dist/* "$WEB_DIR/"

echo -e "${GREEN}✓ 文件已部署${NC}"

echo ""
echo "================================"
echo -e "${GREEN}构建完成！${NC}"
echo "================================"
echo ""
echo "下一步操作："
echo "  1. 在宝塔面板创建站点: $DOMAIN"
echo "  2. 配置Nginx反向代理（参考DEPLOYMENT.md）"
echo "  3. 安装SSL证书"
echo ""
echo "构建文件位置: $WEB_DIR"
echo ""
