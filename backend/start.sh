#!/bin/bash
# 捕鱼达人后端服务 - Linux启动脚本
APP_NAME="fishing-backend"
APP_JAR="target/${APP_NAME}.jar"
APP_PORT=8081
LOG_DIR="logs"
PID_FILE="${APP_NAME}.pid"

echo "========================================"
echo "  捕鱼达人·东海龙宫 后端服务启动"
echo "========================================"
echo ""

if [ ! -f "$APP_JAR" ]; then
    echo "[错误] 未找到 $APP_JAR，请先执行 mvn package -DskipTests"
    exit 1
fi

mkdir -p "$LOG_DIR"

# 检查端口占用
if lsof -i :$APP_PORT > /dev/null 2>&1; then
    echo "[警告] 端口 $APP_PORT 已被占用"
    OLD_PID=$(lsof -t -i :$APP_PORT)
    echo "[信息] 终止旧进程 PID: $OLD_PID"
    kill -9 $OLD_PID 2>/dev/null
    sleep 2
fi

echo "[信息] 启动服务..."
echo "[信息] 日志目录: $LOG_DIR"
echo "[信息] 服务地址: http://localhost:$APP_PORT/api"
echo "[信息] API文档: http://localhost:$APP_PORT/api/doc.html"

nohup java -jar -Xms512m -Xmx1024m -Dfile.encoding=UTF-8 \
    -Dspring.profiles.active=prod \
    "$APP_JAR" > "$LOG_DIR/startup.log" 2>&1 &

echo $! > "$PID_FILE"
echo "[成功] 服务已启动，PID: $(cat $PID_FILE)"
echo "[提示] 查看日志: tail -f $LOG_DIR/fishing-backend-info.log"
echo "[提示] 停止服务: ./stop.sh"
