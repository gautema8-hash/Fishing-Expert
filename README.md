# 虾堡捕鱼达人

> 商用级国风捕鱼H5网页游戏 + Spring Boot后端服务

## 项目简介

《捕鱼达人·东海龙宫》是一款商用级休闲捕鱼H5网页游戏，采用国风东海龙宫主题，暗调深海墨蓝为主色调，搭配青金琉璃流光、金色龙纹粒子高光。游戏支持移动端优先，同时兼容PC浏览器。

本项目包含完整的前端游戏和Java后端服务，采用DDD领域驱动设计，代码符合阿里巴巴规范，可直接上线运营。

## 项目结构

```
Fishing-Expert-doubao/
├── frontend/              # 前端H5游戏
│   ├── index.html         # 入口HTML
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript模块
│   │   ├── core/          # 核心模块（游戏主类/事件总线/对象池等）
│   │   ├── config/        # 配置文件（鱼类/关卡/商城/VIP等）
│   │   ├── render/        # 渲染模块（渲染器/场景/粒子/水波纹/焦散）
│   │   ├── entities/      # 实体模块（鱼类/BOSS/炮台/炮弹/金币）
│   │   ├── systems/       # 系统模块（经济/关卡/音频/VIP/任务等26个子系统）
│   │   ├── ui/            # UI模块（UI管理/顶部栏/21种弹窗）
│   │   └── api/           # API模块（后端API客户端/同步服务）
│   ├── assets/            # 静态资源
│   ├── manifest.json      # PWA配置
│   ├── sw.js              # Service Worker
│   └── server.js          # 本地测试HTTP服务器
├── backend/               # 后端Spring Boot服务
│   ├── src/main/java/com/fishing/
│   │   ├── interfaces/    # 接口层（Controller/DTO/VO）
│   │   ├── application/   # 应用层（AppService）
│   │   ├── domain/        # 领域层（领域模型/Repository接口）
│   │   └── infrastructure/# 基础设施层（持久化/配置/工具）
│   ├── src/main/resources/
│   │   ├── application.yml # 应用配置
│   │   ├── logback-spring.xml # 日志配置
│   │   └── db/migration/  # 数据库迁移脚本（Flyway）
│   ├── pom.xml            # Maven配置
│   ├── docker-compose.yml # Docker Compose
│   └── Dockerfile         # Docker镜像
├── docs/                  # 项目文档
│   ├── 01-execution-plan.md    # 执行计划
│   ├── 02-requirements.md      # 需求文档
│   ├── 03-architecture.md      # 架构文档
│   ├── 04-environment.md       # 环境文档
│   ├── 05-market-research.md   # 市场调研
│   └── PROJECT-DELIVERY-SUMMARY.md # 项目交付总结
├── admin/                 # 后端管理系统（数据看板）
├── start-all.bat          # 一键启动前后端
└── README.md              # 本文件
```

## 技术栈

### 前端
- **核心**: 原生JavaScript + HTML5 Canvas + CSS3
- **渲染**: 多层Canvas渲染，对象池复用，视差滚动
- **PWA**: Service Worker离线缓存，可添加到桌面
- **兼容**: 移动端优先，兼容PC浏览器，支持微信内置/Safari/Chrome

### 后端
- **框架**: Spring Boot 2.7.18
- **JDK**: 1.8
- **构建**: Maven 3.3.9+
- **ORM**: MyBatis-Plus 3.5.3.2
- **数据库**: PostgreSQL 12+
- **缓存**: Redis 5.0+
- **认证**: JWT (jjwt 0.9.1)
- **数据库迁移**: Flyway
- **API文档**: Knife4j 4.3.0
- **监控**: Spring Boot Actuator + Prometheus
- **实时通信**: Spring WebSocket

## 核心功能

### 游戏功能
- 玩家金币系统（初始赠送/实时展示/消耗/奖励/磁吸特效）
- 炮台系统（1-10倍炮/瞄准/发射/鎏金电光拖尾/3套皮肤）
- 暴击机制（随机触发/红金烈焰/双倍金币/屏幕震动）
- 13种鱼类（骨骼动画/鱼群AI/BOSS东海龙王）
- 捕获判定（碰撞检测/水墨爆炸/金珠四散/屏幕震动）
- 场次闯关（关卡递进/星级评分/积分统计）
- 道具系统（锁定道具/狂暴道具）
- 技能系统（全屏冰冻/闪电链/金币雨）

### 商用系统
- VIP等级系统（累计充值/特权/专属皮肤/暴击提升）
- 留存系统（每日签到/离线收益/幸运转盘/首充双倍）
- 付费产品（周卡/月卡/限时折扣/节日礼包）
- 支付系统（6档商品/订单管理/模拟支付）
- 排行榜（金币/击杀/关卡/周榜）
- 公会系统（渔场公会/公会BOSS/公会红包）
- 好友系统（添加/删除/互赠/聊天）
- 世界BOSS（全服共同击杀/伤害排名）

### 安全合规
- 防沉迷系统（实名认证/未成年时段限制/消费限额）
- 反作弊系统（服务端校验/异常检测/自动封号）
- 接口限流/幂等性/XSS防护/操作审计
- 数据加密/脱敏/IP封禁
- 无赌博元素/无真实货币兑换/概率明示

## 快速开始

### 环境要求
- JDK 1.8+
- Maven 3.3.9+
- PostgreSQL 12+
- Redis 5.0+
- Node.js（可选，用于前端本地HTTP服务器）

### 一键启动（Windows）
```bash
# 确保PostgreSQL和Redis已启动
# 双击运行
start-all.bat
```

### 手动启动

#### 1. 启动后端
```bash
cd backend
mvn clean package -DskipTests
java -jar target/fishing-backend.jar --spring.profiles.active=dev
```
后端服务: http://localhost:8081/api

#### 2. 启动前端
```bash
cd frontend
node server.js
```
前端游戏: http://localhost:8080

### 数据库配置
编辑 `backend/src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/fishing_db
    username: postgres
    password: postgres
  redis:
    host: localhost
    port: 6379
```

首次启动会自动执行Flyway数据库迁移，创建24张表。

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端游戏 | http://localhost:8080 |
| 后端API | http://localhost:8081/api |
| API文档 | http://localhost:8081/api/doc.html |
| 管理后台 | http://localhost:8081/admin |
| 健康检查 | http://localhost:8081/api/actuator/health |
| Prometheus指标 | http://localhost:8081/api/actuator/prometheus |

## 项目规模

| 指标 | 数值 |
|------|------|
| 前端JS模块 | 49个 |
| 后端Java文件 | 150+个 |
| Controller | 30个 |
| AppService | 30个 |
| 数据库表 | 24张 |
| API接口 | 130+个 |
| 单元测试 | 44个（全部通过） |
| 鱼类种类 | 13种 |
| 弹窗类型 | 21种 |
| 子系统 | 26个 |

## 开发团队

- 顶级前端游戏UI工程师
- 休闲游戏美术设计师
- 资深游戏工程师
- 商业化游戏主程
- 资深后端架构师
- 资深测试工程师
- 资深产品经理
- 资深项目经理

## 重要声明

1. **游戏内金币为纯游戏虚拟道具，不可兑换现金，仅游戏内部消耗使用。**
2. 本游戏不包含任何赌博元素，不涉及真实货币兑换。
3. 所有抽奖类玩法均明示概率，符合相关法规要求。
4. 未成年人用户受防沉迷系统限制，仅周五/六/日及法定节假日20:00-21:00可游戏。
5. 用户隐私数据严格按照《个人信息保护法》处理。

## License

商业项目，未经授权不得用于商业用途。
