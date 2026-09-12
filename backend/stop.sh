#!/bin/bash
# 捕鱼达人后端服务 - Linux停止脚本
APP_NAME="fishing-backend"
APP_PORT=8081
PID_FILE="${APP_NAME}.pid"

echo "========================================"
echo "  捕鱼达人·东海龙宫 后端服务停止"
echo "========================================"
echo ""

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[信息] 停止服务 PID: $PID"
        kill "$PID"
        sleep 3
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "[警告] 强制终止进程"
            kill -9 "$PID"
        fi
        echo "[成功] 服务已停止"
    else
        echo "[提示] 进程 $PID 未运行"
    fi
    rm -f "$PID_FILE"
else
    # 通过端口查找
    if lsof -i :$APP_PORT > /dev/null 2>&1; then
        PID=$(lsof -t -i :$APP_PORT)
        echo "[信息] 通过端口找到进程 PID: $PID"
        kill -9 "$PID"
        echo "[成功] 服务已停止"
    else
        echo "[提示] 未找到运行中的服务"
    fi
fi
