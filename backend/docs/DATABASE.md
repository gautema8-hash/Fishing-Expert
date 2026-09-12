# 捕鱼达人·东海龙宫 - 数据库设计文档

## 数据库概览

- **数据库名**：fishing_db
- **数据库类型**：PostgreSQL 14+
- **表数量**：20张
- **字符集**：UTF-8
- **命名规范**：表名t_前缀，字段小写下划线

## ER关系图

```
                        ┌─────────────┐
                        │  t_player   │  玩家主表（核心）
                        │  player_id  │◄──────────────────────────┐
                        └──────┬──────┘                           │
                               │                                    │
        ┌──────────────────────┼──────────────────────┐           │
        │                      │                      │           │
        ▼                      ▼                      ▼           │
┌───────────────┐    ┌───────────────┐    ┌───────────────┐    │
│t_player_item  │    │t_player_equip │    │t_player_pet   │    │
│  玩家道具      │    │  玩家装备      │    │  玩家宠物      │    │
└───────────────┘    └───────────────┘    └───────────────┘    │
        │                      │                      │           │
        ▼                      ▼                      ▼           │
┌───────────────┐    ┌───────────────┐    ┌───────────────┐    │
│t_player_upgra │    │t_player_achiev│    │t_player_mail  │    │
│  玩家升级      │    │  玩家成就      │    │  玩家邮件      │    │
└───────────────┘    └───────────────┘    └───────────────┘    │
                                                                   │
        ┌──────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│t_friend_relati│    │t_guild_member │    │t_player_season│
│  好友关系      │    │  公会成员      │    │  玩家赛季      │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                      │
        │              ┌───────▼───────┐
        │              │   t_guild     │
        │              │    公会        │
        │              └───────────────┘
        │
        ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│t_sign_in_recor│    │t_task_progress│    │t_game_record  │
│  签到记录      │    │  任务进度      │    │  游戏记录      │
└───────────────┘    └───────────────┘    └───────────────┘

┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│t_shop_order   │    │t_redemption_co│    │t_redemption_re│
│  商城订单      │    │  兑换码        │    │  兑换记录      │
└───────────────┘    └───────┬───────┘    └───────────────┘
                               │
                               └──────────────┐
                                              ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│t_season       │    │t_analytics_eve│    │t_player_login │
│  赛季          │    │  埋点事件      │    │  登录日志      │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 核心表关系

### 1. 玩家主表 t_player
- **主键**：player_id (VARCHAR 64)
- **核心字段**：金币/钻石/等级/VIP/实名认证/状态
- **关联表**：所有业务表均通过player_id关联
- **索引**：status/vip_level/coins/total_kills/level/created_at/phone

### 2. 经济相关表
| 表名 | 说明 | 关联 |
|------|------|------|
| t_player_item | 玩家道具（锁定/狂暴等） | player_id |
| t_shop_order | 商城订单 | player_id |
| t_redemption_code | 兑换码配置 | 独立表 |
| t_redemption_record | 兑换记录 | player_id + code |

### 3. 角色养成表
| 表名 | 说明 | 关联 |
|------|------|------|
| t_player_equipment | 玩家装备（4品质/强化/穿戴） | player_id |
| t_player_pet | 玩家宠物（升级/升星/激活） | player_id |
| t_player_upgrade | 炮台升级（火力/射速/暴击） | player_id |
| t_player_achievement | 成就进度（10项成就） | player_id |
| t_player_season | 赛季通行证（等级/经验/高级） | player_id + season_id |

### 4. 社交相关表
| 表名 | 说明 | 关联 |
|------|------|------|
| t_friend_relation | 好友关系（双向） | player_id + friend_id |
| t_guild | 公会信息 | 独立表 |
| t_guild_member | 公会成员 | guild_id + player_id |

### 5. 游戏记录表
| 表名 | 说明 | 关联 |
|------|------|------|
| t_game_record | 游戏对局记录 | player_id |
| t_sign_in_record | 签到记录（唯一约束player_id+date） | player_id |
| t_task_progress | 每日任务进度 | player_id + reset_date |
| t_player_mail | 玩家邮件（系统/补偿/附件） | player_id |

### 6. 系统表
| 表名 | 说明 | 关联 |
|------|------|------|
| t_season | 赛季配置 | 独立表 |
| t_analytics_event | 数据埋点事件 | player_id（可空） |
| t_player_login_log | 登录日志 | player_id |

## 关键设计说明

### 1. 逻辑删除
- 所有业务表均含 `deleted` 字段（BOOLEAN DEFAULT false）
- MyBatis-Plus `@TableLogic` 自动处理
- 查询自动过滤已删除数据

### 2. 时间戳自动更新
- 所有表含 `created_at` 和 `updated_at`
- `updated_at` 通过PostgreSQL触发器自动更新
- MyBatis-Plus `@TableField(fill=INSERT/UPDATE)` 自动填充

### 3. 防沉迷字段（V2迁移）
- `real_name`：真实姓名
- `id_card_hash`：身份证SHA256哈希（不存明文）
- `is_verified`：是否已认证
- `is_minor`：是否未成年
- `verified_at`：认证时间

### 4. 索引优化（V3迁移）
- 共创建约40个索引
- 覆盖所有高频查询场景
- 复合索引优化联合查询
- 全部使用 `CREATE INDEX IF NOT EXISTS` 幂等执行

### 5. 唯一约束
- t_player: username唯一、phone唯一
- t_sign_in_record: (player_id, sign_date)联合唯一
- t_player_equipment: equip_uid唯一
- t_guild: guild_name唯一
- t_redemption_code: code唯一
- t_shop_order: order_no唯一

## 数据量预估

| 表名 | 单玩家记录数 | 10万玩家预估 |
|------|-------------|-------------|
| t_player | 1 | 10万 |
| t_player_equipment | 5-20 | 50-200万 |
| t_player_pet | 1-4 | 10-40万 |
| t_player_mail | 10-50 | 100-500万 |
| t_game_record | 100+ | 1000万+ |
| t_analytics_event | 1000+ | 1亿+ |
| t_player_login_log | 50+ | 500万+ |

**建议**：t_game_record、t_analytics_event、t_player_login_log 大表建议按月分区或定期归档。

## 备份策略

- **全量备份**：每天凌晨2点执行 `pg_dump`
- **备份保留**：7天（可配置）
- **备份压缩**：gzip压缩
- **备份脚本**：`deploy/backup.sh`（Linux）/ `deploy/backup.bat`（Windows）
