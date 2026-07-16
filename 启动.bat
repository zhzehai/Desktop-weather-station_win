@echo off
chcp 65001 >nul
title 天气显示台 - 一键启动

echo ========================================
echo    天气显示台 - 一键启动部署脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [0/4] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    echo [清理] 端口 3000 被占用，正在关闭进程 PID: %%a
    taskkill /PID %%a /F >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] 进程已关闭
    ) else (
        echo [错误] 关闭进程失败，请手动关闭
    )
)
echo [OK] 端口检查完成
echo.

echo [1/4] 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18.0.0 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=v" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js 版本: v%NODE_VER%
echo.

echo [2/4] 检查 .env 配置文件...
if not exist ".env" (
    echo [提示] 未找到 .env 文件，正在从 .env.example 复制...
    copy ".env.example" ".env" >nul
    if %errorlevel% neq 0 (
        echo [错误] 复制失败，请手动创建 .env 文件
        pause
        exit /b 1
    )
    echo [OK] 已创建 .env 文件，请配置 API 密钥后重新运行
    echo.
    echo 请编辑 .env 文件，填入正确的 API 密钥：
    echo   - QWEATHER_KEY
    echo   - QWEATHER_HOST
    echo.
    pause
    exit /b 0
)
echo [OK] .env 配置文件已存在
echo.

echo [3/4] 安装项目依赖...
if not exist "node_modules" (
    echo 正在安装依赖，请稍候...
    call npm install --production
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo [OK] 依赖安装完成
) else (
    echo [OK] 依赖已安装
)
echo.

echo [4/4] 启动服务...
echo.
echo ========================================
echo   服务启动中，请在浏览器访问:
echo   http://localhost:3000
echo   按 Ctrl+C 停止服务
echo ========================================
echo.

call npm start

pause
