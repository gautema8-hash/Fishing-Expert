@echo off
chcp 65001 >nul
title 捕鱼达人·东海龙宫 - 本地开发环境一键启动

echo ============================================================
echo   捕鱼达人·东海龙宫 - 本地开发环境一键启动
echo ============================================================
echo.

:: 设置环境变量
set JAVA_HOME=D:\sofa\jdk\jdk8
set PATH=%JAVA_HOME%\bin;D:\sofa\maven\apache-maven-3.3.9\bin;D:\sofa\qianduan\nodejs;%PATH%

echo [1/6] 检查Java环境...
java -version 2>&1 | findstr "1.8" >nul
if errorlevel 1 (
    echo   ❌ Java 8 未找到，请检查 JAVA_HOME
    pause
    exit /b 1
)
echo   ✅ Java 8 就绪

echo.
echo [2/6] 检查Maven环境...
mvn -version 2>&1 | findstr "3.3.9" >nul
if errorlevel 1 (
    echo   ⚠️  Maven版本可能不正确，继续尝试...
) else (
    echo   ✅ Maven 3.3.9 就绪
)

echo.
echo [3/6] 检查PostgreSQL...
"D:\sofa\pg\bin\psql.exe" -U postgres -h localhost -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  PostgreSQL未运行，尝试启动...
    cd /d D:\sofa\pg\bin
    start "PostgreSQL" pg_ctl.exe -D "D:\sofa\pg\data" start
    timeout /t 3 /nobreak >nul
) else (
    echo   ✅ PostgreSQL 运行中
)

echo.
echo [4/6] 检查Redis...
"D:\sofa\redis\redis\redis-cli.exe" ping >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  Redis未运行，尝试启动...
    cd /d D:\sofa\redis\redis
    start "Redis" redis-server.exe
    timeout /t 2 /nobreak >nul
) else (
    echo   ✅ Redis 运行中
)

echo.
echo [5/6] 启动后端服务 (端口8081)...
cd /d D:\sofa\aiproject\Fishing-Expert-doubao\backend
if not exist target\fishing-backend.jar (
    echo   首次运行，正在编译打包...
    call mvn clean package -DskipTests -q
)
start "捕鱼达人-后端" java -jar -Xms256m -Xmx512m -Dfile.encoding=UTF-8 target\fishing-backend.jar --spring.profiles.active=dev
echo   ✅ 后端启动中...

echo.
echo [6/6] 启动前端服务 (端口8080)...
cd /d D:\sofa\aiproject\Fishing-Expert-doubao\frontend
start "捕鱼达人-前端" node server.js
echo   ✅ 前端启动中...

echo.
timeout /t 8 /nobreak >nul

echo ============================================================
echo   ✅ 全部服务启动完成!
echo ============================================================
echo.
echo   🌐 前端游戏:   http://localhost:8080
echo   🔧 后端API:    http://localhost:8081/api
echo   📊 管理后台:   http://localhost:8081/api/admin/
echo   📖 API文档:    http://localhost:8081/api/doc.html
echo   💚 健康检查:   http://localhost:8081/api/actuator/health
echo.
echo   关闭窗口即可停止对应服务
echo ============================================================
echo.
pause
