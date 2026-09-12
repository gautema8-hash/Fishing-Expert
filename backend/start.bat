@echo off
chcp 65001 >nul
title 捕鱼达人后端服务 - Windows启动脚本

set APP_NAME=fishing-backend
set APP_JAR=target\%APP_NAME%.jar
set APP_PORT=8081
set LOG_DIR=logs
set PID_FILE=%APP_NAME%.pid

echo ========================================
echo   捕鱼达人·东海龙宫 后端服务启动
echo ========================================
echo.

if not exist "%APP_JAR%" (
    echo [错误] 未找到 %APP_JAR%，请先执行 mvn package -DskipTests
    pause
    exit /b 1
)

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [信息] 检查端口 %APP_PORT% 占用情况...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%APP_PORT%" ^| findstr "LISTENING"') do (
    echo [警告] 端口 %APP_PORT% 已被进程 %%a 占用
    set /p kill=是否终止该进程？(y/n):
    if /i "%kill%"=="y" (
        taskkill /f /pid %%a
        echo [信息] 已终止进程 %%a
    ) else (
        echo [错误] 请手动释放端口后重试
        pause
        exit /b 1
    )
)

echo [信息] 启动服务...
echo [信息] 日志目录: %LOG_DIR%
echo [信息] 服务地址: http://localhost:%APP_PORT%/api
echo [信息] API文档: http://localhost:%APP_PORT%/api/doc.html
echo.

start "捕鱼达人后端" /min java -jar -Xms512m -Xmx1024m -Dfile.encoding=UTF-8 %APP_JAR% --spring.profiles.active=dev

echo %APP_NAME% 已启动
echo [提示] 按 Ctrl+C 可停止本窗口，服务在后台继续运行
echo [提示] 运行 stop.bat 可停止服务
pause
