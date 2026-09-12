@echo off
chcp 65001 >nul
title 停止捕鱼达人所有服务

echo ============================================================
echo   停止捕鱼达人·东海龙宫 所有服务
echo ============================================================
echo.

echo [1/3] 停止后端Java进程...
taskkill /f /im java.exe 2>nul
echo   ✅ 后端已停止

echo.
echo [2/3] 停止前端Node进程...
taskkill /f /im node.exe 2>nul
echo   ✅ 前端已停止

echo.
echo [3/3] 关闭相关窗口...
taskkill /f /fi "WINDOWTITLE eq 捕鱼达人*" 2>nul
echo   ✅ 窗口已关闭

echo.
echo ============================================================
echo   ✅ 所有服务已停止
echo ============================================================
echo.
pause
