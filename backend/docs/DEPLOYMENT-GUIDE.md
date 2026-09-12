# 捕鱼达人·东海龙宫 - 部署运维手册

## 一、环境要求

### 1.1 硬件要求
| 环境 | CPU | 内存 | 硬盘 | 带宽 |
|------|-----|------|------|------|
| 开发/测试 | 2核 | 4GB | 40GB | 5Mbps |
| 生产（小型） | 4核 | 8GB | 100GB | 10Mbps |
| 生产（中型） | 8核 | 16GB | 200GB | 50Mbps |
| 生产（大型） | 16核 | 32GB | 500GB | 100Mbps+ |

### 1.2 软件要求
| 组件 | 版本要求 | 说明 |
|------|----------|------|
| JDK | 1.8+ | 推荐OpenJDK 8u202+ |
| Maven | 3.3.9+ | 构建工具 |
| PostgreSQL | 12+ | 主数据库 |
| Redis | 5.0+ | 缓存/会话/排行榜 |
| Nginx | 1.18+ | 反向代理/静态资源 |
| Docker | 20.10+ | 容器化部署（可选） |

---

## 二、快速部署（Docker Compose）

### 2.1 一键启动
```bash
cd fishing-backend
docker-compose up -d
```

### 2.2 服务清单
| 服务 | 端口 | 说明 |
|------|------|------|
| fishing-backend | 8081 | Spring Boot应用 |
| postgresql | 5432 | 数据库 |
| redis | 6379 | 缓存 |
| nginx | 80 | 反向代理 |

### 2.3 查看日志
```bash
docker-compose logs -f fishing-backend
```

### 2.4 停止服务
```bash
docker-compose down
```

---

## 三、传统部署（Linux）

### 3.1 安装JDK 8
```bash
# Ubuntu/Debian
sudo apt-get install openjdk-8-jdk

# CentOS/RHEL
sudo yum install java-1.8.0-openjdk
```

### 3.2 安装PostgreSQL
```bash
# Ubuntu
sudo apt-get install postgresql postgresql-contrib

# 启动
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE fishing_db;
CREATE USER fishing WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fishing_db TO fishing;
\q
```

### 3.3 安装Redis
```bash
# Ubuntu
sudo apt-get install redis-server

# 配置密码
sudo sed -i 's/# requirepass foobared/requirepass your_redis_password/' /etc/redis/redis.conf
sudo systemctl restart redis
```

### 3.4 构建项目
```bash
cd fishing-backend
mvn clean package -DskipTests
```

### 3.5 配置应用
```bash
# 复制配置文件
cp src/main/resources/application.yml /opt/fishing/application.yml

# 修改配置
vim /opt/fishing/application.yml
# 修改数据库连接、Redis连接、JWT密钥等
```

### 3.6 启动服务
```bash
# 创建启动脚本
cat > /opt/fishing/start.sh << 'EOF'
#!/bin/bash
nohup java -jar fishing-backend.jar \
  --spring.config.location=/opt/fishing/application.yml \
  > /opt/fishing/logs/app.log 2>&1 &
echo $! > /opt/fishing/app.pid
EOF

chmod +x /opt/fishing/start.sh
/opt/fishing/start.sh
```

### 3.7 配置Systemd服务
```bash
sudo cat > /etc/systemd/system/fishing.service << 'EOF'
[Unit]
Description=Fishing Game Backend
After=network.target postgresql.service redis.service

[Service]
Type=forking
User=fishing
WorkingDirectory=/opt/fishing
ExecStart=/opt/fishing/start.sh
ExecStop=/bin/kill -15 $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable fishing
sudo systemctl start fishing
```

---

## 四、Nginx配置

### 4.1 反向代理配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    location / {
        root /var/www/fishing-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8081/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # WebSocket支持
    location /api/ws/ {
        proxy_pass http://127.0.0.1:8081/api/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}
```

### 4.2 HTTPS配置（Let's Encrypt）
```bash
# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 五、数据库运维

### 5.1 数据库备份
```bash
# 手动备份
pg_dump -U fishing -h localhost fishing_db > backup_$(date +%Y%m%d).sql

# 自动备份脚本（deploy/backup.sh）
#!/bin/bash
BACKUP_DIR=/opt/fishing/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U fishing -h localhost fishing_db > $BACKUP_DIR/fishing_$DATE.sql
gzip $BACKUP_DIR/fishing_$DATE.sql
# 保留最近30天
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 5.2 数据库恢复
```bash
# 恢复备份
gunzip backup_20240101.sql.gz
psql -U fishing -h localhost -d fishing_db -f backup_20240101.sql
```

### 5.3 Flyway迁移
```bash
# 应用会自动执行Flyway迁移
# 手动校验
mvn flyway:info

# 手动迁移
mvn flyway:migrate
```

### 5.4 常用SQL
```sql
-- 查看玩家数
SELECT COUNT(*) FROM t_player WHERE deleted = 0;

-- 查看今日新增
SELECT COUNT(*) FROM t_player WHERE created_at >= CURRENT_DATE;

-- 查看总充值
SELECT SUM(amount) FROM t_recharge_order WHERE status = 2;

-- 查看在线玩家（需Redis配合）
SELECT COUNT(*) FROM t_player WHERE last_login_at > NOW() - INTERVAL '5 minutes';

-- 清理过期操作日志
DELETE FROM t_operation_log WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 六、Redis运维

### 6.1 常用命令
```bash
# 连接Redis
redis-cli -h localhost -p 6379 -a your_password

# 查看内存使用
INFO memory

# 查看Key数量
DBSIZE

# 查看慢查询
SLOWLOG GET 10

# 清空缓存（谨慎！）
FLUSHDB
```

### 6.2 数据结构说明
| Key模式 | 类型 | 说明 | 过期时间 |
|---------|------|------|----------|
| `fishing:player:{id}` | String/Hash | 玩家缓存 | 30分钟 |
| `fishing:leaderboard:{type}` | ZSet | 排行榜 | 24小时 |
| `fishing:token:{playerId}` | String | JWT Token | 24小时 |
| `fishing:rate:{ip}:{api}` | String | 限流计数 | 1分钟 |
| `fishing:worldboss:status` | Hash | 世界BOSS状态 | 10分钟 |
| `fishing:worldboss:damage` | ZSet | BOSS伤害排名 | 10分钟 |
| `fishing:feature:flags` | Hash | 功能开关 | 永久 |
| `fishing:system:config` | Hash | 系统配置 | 永久 |
| `fishing:ip:blacklist` | Hash | IP黑名单缓存 | 5分钟 |
| `fishing:notification:*` | Hash/List | 通知公告 | 按配置 |

---

## 七、监控告警

### 7.1 Actuator端点
| 端点 | 说明 |
|------|------|
| `/api/actuator/health` | 健康检查（含数据库/Redis） |
| `/api/actuator/metrics` | 应用指标 |
| `/api/actuator/prometheus` | Prometheus指标 |
| `/api/actuator/info` | 应用信息 |
| `/api/actuator/loggers` | 日志级别管理 |

### 7.2 Prometheus指标
| 指标名 | 类型 | 说明 |
|--------|------|------|
| `fishing_player_register_total` | Counter | 注册总数 |
| `fishing_player_login_total` | Counter | 登录总数 |
| `fishing_coins_earned_total` | Counter | 金币获得总数 |
| `fishing_coins_spent_total` | Counter | 金币消耗总数 |
| `fishing_bullets_fired_total` | Counter | 炮弹发射总数 |
| `fishing_fish_killed_total` | Counter | 鱼类击杀总数 |
| `fishing_boss_killed_total` | Counter | BOSS击杀总数 |
| `fishing_recharge_total` | Counter | 充值总数 |
| `fishing_recharge_amount_total` | Counter | 充值金额总数 |
| `fishing_crit_hit_total` | Counter | 暴击总数 |
| `fishing_api_request_duration_seconds` | Histogram | API请求耗时 |
| `fishing_online_players` | Gauge | 在线玩家数 |

### 7.3 日志文件
| 文件 | 说明 | 路径 |
|------|------|------|
| 应用日志 | 主日志 | `logs/app.log` |
| 错误日志 | 错误堆栈 | `logs/error.log` |
| 审计日志 | 操作审计 | `logs/audit.log` |
| 慢查询日志 | 慢SQL | `logs/slow.log` |

---

## 八、故障排查

### 8.1 服务无法启动
```bash
# 1. 检查端口占用
netstat -tlnp | grep 8081

# 2. 检查数据库连接
psql -U fishing -h localhost -d fishing_db -c "SELECT 1"

# 3. 检查Redis连接
redis-cli -h localhost -p 6379 ping

# 4. 查看启动日志
tail -200 logs/app.log
```

### 8.2 数据库连接失败
- 检查PostgreSQL是否运行：`systemctl status postgresql`
- 检查连接配置：`application.yml`中的spring.datasource
- 检查防火墙：`ufw allow 5432`
- 检查最大连接数：`SHOW max_connections;`

### 8.3 Redis连接失败
- 检查Redis是否运行：`systemctl status redis`
- 检查密码配置：`requirepass` in redis.conf
- 检查内存：`INFO memory`
- 清理缓存：`FLUSHDB`（谨慎）

### 8.4 内存溢出（OOM）
- 调整JVM参数：`-Xms2g -Xmx4g`
- 检查大对象：`jmap -histo:live <pid> | head -20`
- 导出堆转储：`jmap -dump:format=b,file=heap.hprof <pid>`
- 分析：使用MAT或JProfiler

### 8.5 接口响应慢
- 查看慢查询：`logs/slow.log`
- 查看API耗时：Actuator metrics
- 检查数据库索引：`EXPLAIN ANALYZE SELECT ...`
- 检查Redis命中率：`INFO stats`

### 8.6 玩家数据异常
- 检查金币流水：`t_economy_transaction`
- 检查操作日志：`t_operation_log`
- 检查反作弊记录：`t_anti_cheat_log`
- 手动修正：使用EconomyAppService接口

---

## 九、性能优化

### 9.1 JVM参数调优
```bash
java -jar fishing-backend.jar \
  -Xms4g -Xmx4g \
  -XX:MetaspaceSize=256m \
  -XX:MaxMetaspaceSize=512m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/opt/fishing/heapdump/
```

### 9.2 数据库优化
- 确保所有查询字段有索引
- 大表分区（按月）
- 定期VACUUM：`VACUUM ANALYZE;`
- 连接池调优：HikariCP maximum-pool-size=20

### 9.3 Redis优化
- 开启RDB+AOF持久化
- 配置maxmemory-policy allkeys-lru
- 使用Pipeline批量操作
- 大Key拆分

### 9.4 应用优化
- 开启Redis缓存（玩家信息/排行榜）
- 使用对象池（游戏内实体）
- 异步处理非关键路径（日志/邮件/统计）
- 接口限流保护

---

## 十、安全加固

### 10.1 服务器安全
- 禁用root远程登录
- 使用SSH密钥认证
- 配置防火墙（只开放80/443）
- 定期更新系统补丁
- 安装fail2ban防暴力破解

### 10.2 应用安全
- JWT密钥使用强随机字符串
- 数据库密码加密存储
- 接口限流防刷
- SQL注入防护（MyBatis参数化查询）
- XSS防护（XssFilter）
- 敏感数据加密（AES-256）
- 操作审计日志

### 10.3 数据安全
- 定期备份（每日全量+增量）
- 备份文件加密
- 异地容灾
- 敏感字段脱敏

---

## 十一、日常运维 checklist

### 每日
- [ ] 检查服务健康状态
- [ ] 查看错误日志
- [ ] 检查数据库备份
- [ ] 查看在线人数
- [ ] 检查充值订单

### 每周
- [ ] 清理过期日志
- [ ] 清理过期操作日志
- [ ] 检查慢查询
- [ ] 查看数据统计报表
- [ ] 检查反作弊告警

### 每月
- [ ] 数据库性能优化
- [ ] 安全补丁更新
- [ ] 备份恢复演练
- [ ] 容量评估
- [ ] 代码Review

---

## 十二、联系方式

- **技术支持**: tech@fishing-game.com
- **运营支持**: ops@fishing-game.com
- **紧急联系**: 24小时值班电话

> 游戏内金币为纯游戏虚拟道具，不可兑换现金，仅游戏内部消耗使用。
