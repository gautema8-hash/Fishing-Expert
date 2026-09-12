@echo off
chcp 65001 >nul
title 捕鱼达人后端服务 - 停止脚本

set APP_NAME=fishing-backend
set APP_PORT=8081

echo ========================================
echo   捕鱼达人·东海龙宫 后端服务停止
echo ========================================
echo.

echo [信息] 查找端口 %APP_PORT% 进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%APP_PORT%" ^| findstr "LISTENING"') do (
    echo [信息] 找到进程 PID: %%a
    taskkill /f /pid %%a
    echo [成功] 已终止进程 %%a
    goto :done
)

echo [提示] 未找到运行中的服务进程
:done
echo.
echo [完成] 服务已停止
pause
