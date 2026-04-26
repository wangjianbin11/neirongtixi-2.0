@echo off
REM ASG内容系统 - 开发环境启动脚本
echo ============================================
echo ASG内容系统 - 开发环境启动
echo ============================================
echo.

REM 检查是否安装了依赖
if not exist "backend\node_modules" (
    echo [1/4] 安装后端依赖...
    cd backend
    call npm install
    cd ..
) else (
    echo [1/4] 后端依赖已安装
)

if not exist "frontend\node_modules" (
    echo [2/4] 安装前端依赖...
    cd frontend
    call npm install
    cd ..
) else (
    echo [2/4] 前端依赖已安装
)

echo [3/4] 启动开发服务器...
echo.
echo ============================================
echo 服务将在新窗口中启动
echo ============================================
echo.
echo 后端 API: http://localhost:4000
echo 前端页面: http://localhost:3000
echo.
echo 按任意键启动服务...
pause > nul

REM 启动后端服务
start "ASG Backend" cmd /k "cd backend && npm run dev"

REM 等待一下确保后端先启动
timeout /t 3 /nobreak > nul

REM 启动前端服务
start "ASG Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo [4/4] 服务启动完成！
echo.
echo ============================================
echo 开发环境已启动
echo ============================================
echo.
echo 后端 API: http://localhost:4000/api/v1
echo 前端页面: http://localhost:3000
echo 健康检查: http://localhost:4000/health
echo.
echo 默认账户:
echo   用户名: admin
echo   密码: admin123
echo.
echo 按Ctrl+C停止窗口中的服务
echo.
pause
