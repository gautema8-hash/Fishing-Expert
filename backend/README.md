# 捕鱼达人·东海龙宫 - 后端服务

## 项目简介

《捕鱼达人·东海龙宫》后端服务，基于Spring Boot 2.7 + MyBatis-Plus + PostgreSQL + Redis构建，采用DDD领域驱动设计，代码符合阿里巴巴规范。提供完整的游戏后端API，支持商业化运营。

## 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| Spring Boot | 2.7.18 | 核心框架 |
| JDK | 1.8 | 运行环境 |
| Maven | 3.3.9+ | 构建工具 |
| MyBatis-Plus | 3.5.3.2 | ORM框架 |
| PostgreSQL | 12+ | 主数据库 |
| Redis | 5.0+ | 缓存/会话/排行榜 |
| JWT (jjwt) | 0.9.1 | 认证授权 |
| Flyway | - | 数据库版本迁移 |
| Knife4j | 4.3.0 | API文档 |
| Apache POI | 5.2.3 | Excel导出 |
| Spring WebSocket | - | 实时通信 |
| Spring Boot Actuator | - | 应用监控 |
| Prometheus | - | 指标监控 |
| Logback | - | 日志框架 |
| HikariCP | - | 数据库连接池 |
| Hutool | 5.8.22 | 工具库 |

## 架构设计

### DDD分层架构

```
com.fishing/
├── interfaces/          # 接口层（表现层）
│   ├── controller/      # REST Controller（30个）
│   ├── dto/             # 数据传输对象
│   └── vo/              # 视图对象
├── application/         # 应用层（用例编排）
│   └── service/         # AppService（30个）
├── domain/              # 领域层（业务核心）
│   ├── model/           # 领域模型（聚合根/实体/值对象）
│   └── repository/      # 仓储接口
└── infrastructure/      # 基础设施层
    ├── persistence/     # 持久化
    │   ├── entity/      # 数据库实体（25个）
    │   └── repository/  # Mapper（25个）
    ├── config/          # 配置类（18个）
    ├── util/            # 工具类
    └── websocket/       # WebSocket模块
```

### 核心设计原则
- **依赖倒置**: 领域层定义Repository接口，基础设施层实现
- **领域驱动**: 核心业务逻辑在领域模型中，应用层负责编排
- **配置驱动**: 所有数值/鱼种/关卡/礼包由配置驱动，策划可调参
- **安全优先**: 关键逻辑（金币增减/捕获判定/付费）走服务端校验
- **高可用**: Redis缓存/分布式锁/接口限流/幂等性/熔断降级

## 核心模块

### 业务模块（30个Controller）

| 模块 | Controller | 说明 |
|------|------------|------|
| 认证 | AuthController | 注册/登录/游客登录 |
| 玩家 | PlayerController | 玩家信息/资料/背包/统计 |
| 经济 | EconomyController | 金币/钻石/流水/反作弊校验 |
| 游戏记录 | GameController | 游戏记录保存/查询/最佳记录 |
| 签到 | SignInController | 每日签到/连续签到奖励 |
| 邮件 | MailController | 邮件列表/读取/领取附件 |
| 兑换码 | RedemptionController | 兑换码使用/记录 |
| 公会 | GuildController | 创建/加入/退出/捐献 |
| 好友 | FriendController | 添加/删除/搜索/请求 |
| 赛季 | SeasonController | 赛季信息/奖励/通行证 |
| 商城 | ShopController | 商品/订单/支付回调 |
| 支付 | PaymentController | 6档商品/充值订单/模拟支付 |
| 排行榜 | LeaderboardController | 金币/击杀/关卡/周榜（Redis ZSet） |
| 防沉迷 | AntiAddictionController | 实名认证/未成年时段限制 |
| 反作弊 | AntiCheatController | 风控检测/异常行为/自动封号 |
| 装备 | EquipmentController | 装备列表/穿戴/强化/分解 |
| 宠物 | PetController | 宠物列表/激活/升级/出战 |
| 成就 | AchievementController | 成就列表/领取/进度 |
| 任务 | TaskController | 任务列表/领取/进度更新 |
| VIP | VIPController | VIP信息/每日礼包/特权 |
| 世界BOSS | WorldBossController | BOSS状态/伤害/排名/召唤 |
| 功能开关 | FeatureFlagController | 灰度发布/特性开关 |
| 通知推送 | NotificationController | 系统公告/滚动消息/活动 |
| 系统配置 | SystemConfigController | 动态配置/热更新 |
| 数据看板 | DashboardController | 玩家/游戏/经济/在线统计 |
| 数据导出 | DataExportController | Excel导出玩家/游戏记录 |
| 运营管理 | AdminController | 操作日志/IP封禁/数据统计 |
| 批量操作 | BatchOperationController | 批量发放/封禁/解封/查询 |
| 埋点分析 | AnalyticsController | 事件上报/统计 |

### 基础设施

| 组件 | 说明 |
|------|------|
| Redis缓存 | 玩家信息/排行榜/会话/限流/分布式锁 |
| WebSocket | 多人联机实时通信（2-4人房间） |
| Flyway | 数据库版本管理（4个迁移脚本，24张表） |
| Knife4j | API文档（3个分组：玩家/社交/系统） |
| Actuator | 健康检查/指标/日志级别管理 |
| Prometheus | 15个自定义业务指标 |
| 异步线程池 | 3个专用线程池（业务/邮件/日志） |
| 定时任务 | 数据归档/世界BOSS超时/IP封禁清理/每日统计 |

### 安全体系

| 特性 | 说明 |
|------|------|
| JWT认证 | Token认证+拦截器，24小时过期 |
| 接口限流 | 注解式限流（@RateLimit），默认60次/分钟 |
| 接口幂等 | Redis SETNX幂等控制，防重复提交 |
| XSS防护 | XssFilter+请求包装，防跨站脚本 |
| 操作审计 | AOP自动记录+数据库落库，敏感操作可追溯 |
| 数据加密 | AES-256敏感字段加密，密钥可配置 |
| 数据脱敏 | 手机号/身份证/姓名/邮箱自动脱敏 |
| IP封禁 | 永久/临时封禁，频率限制，自动解封 |
| 反作弊 | 风控检测，异常行为分析，风险分阈值自动封号 |
| 防沉迷 | 实名认证，未成年时段限制，消费限额 |

## 数据库设计

### 24张数据表

| 表名 | 说明 |
|------|------|
| t_player | 玩家主表 |
| t_economy_transaction | 经济流水表 |
| t_game_record | 游戏记录表 |
| t_sign_in | 签到记录表 |
| t_player_mail | 玩家邮件表 |
| t_redemption_code | 兑换码表 |
| t_guild | 公会表 |
| t_guild_member | 公会成员表 |
| t_friend | 好友关系表 |
| t_season | 赛季表 |
| t_player_season | 玩家赛季表 |
| t_shop_order | 商城订单表 |
| t_recharge_order | 充值订单表 |
| t_equipment | 装备表 |
| t_player_equipment | 玩家装备表 |
| t_pet | 宠物表 |
| t_player_pet | 玩家宠物表 |
| t_achievement | 成就表 |
| t_player_achievement | 玩家成就表 |
| t_task | 任务表 |
| t_player_task | 玩家任务表 |
| t_operation_log | 操作日志表 |
| t_ip_blacklist | IP黑名单表 |
| t_daily_stats | 每日统计表 |

### 数据库迁移
- V1__init_schema.sql: 初始化20张表+触发器+索引
- V2__anti_addiction.sql: 防沉迷实名认证字段
- V3__index_optimization.sql: 索引优化（约40个索引）
- V4__payment_and_operation.sql: 充值订单/操作日志/IP封禁/每日统计表

## 快速开始

### 环境要求
- JDK 1.8+
- Maven 3.3.9+
- PostgreSQL 12+
- Redis 5.0+

### 1. 配置数据库
```sql
-- 创建数据库
CREATE DATABASE fishing_db;
-- 创建用户（可选）
CREATE USER fishing WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fishing_db TO fishing;
```

### 2. 修改配置
编辑 `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/fishing_db
    username: postgres
    password: postgres
  redis:
    host: localhost
    port: 6379
    password: 
fishing:
  jwt:
    secret: your-strong-secret-key-at-least-256-bits
    expiration: 86400000
```

### 3. 构建运行
```bash
# 编译
mvn clean compile

# 测试
mvn test

# 打包
mvn clean package -DskipTests

# 运行
java -jar target/fishing-backend.jar --spring.profiles.active=dev

# 或用Maven直接运行
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### 4. Docker部署
```bash
# 构建镜像
docker build -t fishing-backend:latest .

# Docker Compose一键启动（含PostgreSQL+Redis）
docker-compose up -d
```

## 访问地址

| 服务 | 地址 |
|------|------|
| API基础路径 | http://localhost:8081/api |
| API文档（Knife4j） | http://localhost:8081/api/doc.html |
| 管理后台 | http://localhost:8081/admin |
| 健康检查 | http://localhost:8081/api/actuator/health |
| 应用信息 | http://localhost:8081/api/actuator/info |
| 指标监控 | http://localhost:8081/api/actuator/metrics |
| Prometheus指标 | http://localhost:8081/api/actuator/prometheus |
| 日志级别 | http://localhost:8081/api/actuator/loggers |

## API响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1694567890123
}
```

### 状态码
| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证/Token过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 认证方式

所有需要认证的接口在Header中携带JWT Token：
```
Authorization: Bearer {token}
```

登录/注册接口无需认证，在WebMvcConfig中放行。

## 项目规模

| 指标 | 数值 |
|------|------|
| Java源文件 | 150+个 |
| Controller | 30个 |
| AppService | 30个 |
| Config配置 | 18个 |
| Entity | 25个 |
| Mapper | 25个 |
| 数据库表 | 24张 |
| API接口 | 130+个 |
| 单元测试 | 44个（全部通过） |
| WebSocket模块 | 3个 |
| 数据库迁移脚本 | 4个 |

## 监控指标

### Prometheus自定义指标（15个）
- fishing_player_register_total: 注册总数
- fishing_player_login_total: 登录总数
- fishing_coins_earned_total: 金币获得总数
- fishing_coins_spent_total: 金币消耗总数
- fishing_bullets_fired_total: 炮弹发射总数
- fishing_fish_killed_total: 鱼类击杀总数
- fishing_boss_killed_total: BOSS击杀总数
- fishing_recharge_total: 充值总数
- fishing_recharge_amount_total: 充值金额总数
- fishing_crit_hit_total: 暴击总数
- fishing_api_request_duration_seconds: API请求耗时
- fishing_online_players: 在线玩家数

### 健康检查
自定义GameHealthIndicator检查数据库和Redis连接状态。

## 日志配置

多文件输出（logback-spring.xml）：
- app.log: 应用主日志
- error.log: 错误堆栈
- audit.log: 操作审计日志
- slow.log: 慢查询日志

## 部署脚本

| 文件 | 说明 |
|------|------|
| start.bat / stop.bat | Windows启动停止 |
| start.sh / stop.sh | Linux启动停止 |
| docker-compose.yml | Docker Compose编排 |
| Dockerfile | Docker镜像构建 |
| deploy/nginx.conf | Nginx反向代理配置 |
| deploy/backup.bat / backup.sh | 数据库备份 |
| deploy/perf-test.sh | 性能压测脚本 |
| .github/workflows/ci-cd.yml | CI/CD流水线 |

## 开发规范

- 代码符合阿里巴巴Java开发规范
- DDD领域驱动设计，分层清晰
- 所有接口返回统一响应格式Result
- 关键操作使用分布式锁（RedisLockUtil）
- 经济操作集成反作弊校验
- 敏感数据加密存储，日志脱敏
- 完整的单元测试覆盖核心逻辑

## 重要声明

1. **游戏内金币为纯游戏虚拟道具，不可兑换现金，仅游戏内部消耗使用。**
2. 关键逻辑（金币增减、捕获判定、付费）走服务端校验，防止客户端篡改。
3. 本服务不包含任何赌博元素，不涉及真实货币兑换。
4. 支付接口当前为模拟支付，上线前需接入微信/支付宝真实支付。

## License

商业项目，未经授权不得用于商业用途。
