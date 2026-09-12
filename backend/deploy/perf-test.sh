#!/bin/bash
# ============================================
# 捕鱼达人后端API性能压测脚本
# 使用Apache Bench (ab) 进行压力测试
# 安装：yum install httpd-tools / apt install apache2-utils
# ============================================

BASE_URL="http://localhost:8081/api"
CONCURRENCY=100
REQUESTS=1000
RESULT_DIR="perf-results"

mkdir -p "$RESULT_DIR"

echo "========================================"
echo "  捕鱼达人后端API性能压测"
echo "  并发数: $CONCURRENCY  请求数: $REQUESTS"
echo "========================================"
echo ""

# 1. 健康检查接口
echo "[1/6] 健康检查接口..."
ab -n $REQUESTS -c $CONCURRENCY -g "$RESULT_DIR/health.tsv" "$BASE_URL/actuator/health" > "$RESULT_DIR/health.txt" 2>&1
grep "Requests per second\|Time per request\|Complete requests" "$RESULT_DIR/health.txt"

# 2. 登录接口
echo ""
echo "[2/6] 登录接口..."
ab -n $REQUESTS -c $CONCURRENCY -p /tmp/login.json -T "application/json" \
   -g "$RESULT_DIR/login.tsv" "$BASE_URL/auth/login" > "$RESULT_DIR/login.txt" 2>&1
grep "Requests per second\|Time per request\|Complete requests" "$RESULT_DIR/login.txt"

# 3. 玩家信息接口（需要Token）
echo ""
echo "[3/6] 玩家信息接口..."
# 先登录获取token
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"123456"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    ab -n $REQUESTS -c $CONCURRENCY -H "Authorization: Bearer $TOKEN" \
       -g "$RESULT_DIR/player.tsv" "$BASE_URL/player/info" > "$RESULT_DIR/player.txt" 2>&1
    grep "Requests per second\|Time per request\|Complete requests" "$RESULT_DIR/player.txt"
else
    echo "[跳过] 无法获取Token，请先创建测试账号"
fi

# 4. 经济信息接口
echo ""
echo "[4/6] 经济信息接口..."
if [ -n "$TOKEN" ]; then
    ab -n $REQUESTS -c $CONCURRENCY -H "Authorization: Bearer $TOKEN" \
       -g "$RESULT_DIR/economy.tsv" "$BASE_URL/economy/info" > "$RESULT_DIR/economy.txt" 2>&1
    grep "Requests per second\|Time per request\|Complete requests" "$RESULT_DIR/economy.txt"
fi

# 5. 排行榜接口
echo ""
echo "[5/6] 排行榜接口..."
ab -n $REQUESTS -c $CONCURRENCY \
   -g "$RESULT_DIR/leaderboard.tsv" "$BASE_URL/leaderboard/coins?top=10" > "$RESULT_DIR/leaderboard.txt" 2>&1
grep "Requests per second\|Time per request\|Complete requests" "$RESULT_DIR/leaderboard.txt"

# 6. 游戏记录提交
echo ""
echo "[6/6] 游戏记录提交接口..."
if [ -n "$TOKEN" ]; then
    echo '{"level":1,"score":1000,"kills":10,"bulletsFired":50,"coinsEarned":500,"bossKilled":0,"duration":60}' > /tmp/gamerecord.json
    ab -n $REQUESTS -c $CONCURRENCY -H "Authorization: Bearer $TOKEN" \
       -p /tmp/gamerecord.json -T "application/json" \
       -g "$RESULT_DIR/gamerecord.tsv" "$BASE_URL/game/record" > "$RESULT_DIR/gamerecord.txt" 2>&1
    grep "Requests per second\|Time per request\|Complete requests" "$RESULT_DIR/gamerecord.txt"
fi

echo ""
echo "========================================"
echo "  压测完成！结果保存在 $RESULT_DIR/ 目录"
echo "========================================"
echo ""
echo "性能指标说明："
echo "  Requests per second: 每秒处理请求数（越高越好）"
echo "  Time per request: 平均响应时间（越低越好）"
echo "  Complete requests: 成功完成请求数"
