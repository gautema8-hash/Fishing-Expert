-- ============================================
-- 捕鱼达人·东海龙宫 数据库一键初始化脚本
-- 包含：建库 + V1表结构 + V2防沉迷 + V3索引
-- 执行方式：psql -U postgres -f init_database.sql
-- ============================================

-- 1. 创建数据库
SELECT 'CREATE DATABASE fishing_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fishing_db')\gexec

\c fishing_db

-- ============================================
-- V1: 基础表结构
-- ============================================

-- 玩家表
CREATE TABLE IF NOT EXISTS t_player (
    player_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE,
    password_hash VARCHAR(128),
    nickname VARCHAR(64),
    avatar VARCHAR(255),
    phone VARCHAR(20),
    coins BIGINT DEFAULT 10000,
    diamonds INTEGER DEFAULT 10,
    level INTEGER DEFAULT 1,
    exp BIGINT DEFAULT 0,
    vip_level INTEGER DEFAULT 0,
    total_recharge NUMERIC(12,2) DEFAULT 0,
    total_kills BIGINT DEFAULT 0,
    total_bullets BIGINT DEFAULT 0,
    total_crits BIGINT DEFAULT 0,
    total_coins_earned BIGINT DEFAULT 0,
    active_pet VARCHAR(32),
    is_new_player BOOLEAN DEFAULT true,
    newbie_protection_left INTEGER DEFAULT 3,
    status INTEGER DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 玩家道具表
CREATE TABLE IF NOT EXISTS t_player_item (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    item_type VARCHAR(32) NOT NULL,
    item_name VARCHAR(64),
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_item_player ON t_player_item(player_id);

-- 玩家装备表
CREATE TABLE IF NOT EXISTS t_player_equipment (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    equip_uid VARCHAR(64) UNIQUE,
    equip_id VARCHAR(32) NOT NULL,
    equip_name VARCHAR(64),
    slot_type VARCHAR(32),
    rarity VARCHAR(16),
    enhance_level INTEGER DEFAULT 0,
    is_equipped BOOLEAN DEFAULT false,
    stats_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 玩家宠物表
CREATE TABLE IF NOT EXISTS t_player_pet (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    pet_type VARCHAR(32) NOT NULL,
    pet_name VARCHAR(64),
    pet_level INTEGER DEFAULT 1,
    pet_exp INTEGER DEFAULT 0,
    star_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 玩家升级表
CREATE TABLE IF NOT EXISTS t_player_upgrade (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    upgrade_type VARCHAR(32),
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 玩家成就表
CREATE TABLE IF NOT EXISTS t_player_achievement (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    achievement_id VARCHAR(64) NOT NULL,
    progress INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 玩家邮件表
CREATE TABLE IF NOT EXISTS t_player_mail (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    mail_type VARCHAR(32),
    title VARCHAR(128),
    sender VARCHAR(64),
    content TEXT,
    attachments TEXT,
    is_read BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 好友关系表
CREATE TABLE IF NOT EXISTS t_friend_relation (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    friend_id VARCHAR(64) NOT NULL,
    status INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 公会表
CREATE TABLE IF NOT EXISTS t_guild (
    guild_id VARCHAR(64) PRIMARY KEY,
    guild_name VARCHAR(64) UNIQUE,
    description VARCHAR(255),
    leader_id VARCHAR(64),
    level INTEGER DEFAULT 1,
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 公会成员表
CREATE TABLE IF NOT EXISTS t_guild_member (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL,
    player_id VARCHAR(64) NOT NULL,
    role VARCHAR(16) DEFAULT 'member',
    join_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 赛季表
CREATE TABLE IF NOT EXISTS t_season (
    season_id VARCHAR(64) PRIMARY KEY,
    season_name VARCHAR(64),
    status VARCHAR(16) DEFAULT 'active',
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 玩家赛季表
CREATE TABLE IF NOT EXISTS t_player_season (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    season_id VARCHAR(64) NOT NULL,
    level INTEGER DEFAULT 1,
    exp BIGINT DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 商城订单表
CREATE TABLE IF NOT EXISTS t_shop_order (
    order_no VARCHAR(64) PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64),
    product_name VARCHAR(128),
    amount NUMERIC(12,2),
    pay_type VARCHAR(16),
    pay_status INTEGER DEFAULT 0,
    pay_time TIMESTAMP,
    transaction_id VARCHAR(128),
    reward_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 兑换码表
CREATE TABLE IF NOT EXISTS t_redemption_code (
    code VARCHAR(64) PRIMARY KEY,
    description VARCHAR(255),
    reward_json TEXT,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 兑换记录表
CREATE TABLE IF NOT EXISTS t_redemption_record (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL,
    reward_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 签到记录表
CREATE TABLE IF NOT EXISTS t_sign_in_record (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    sign_date DATE NOT NULL,
    continuous_days INTEGER DEFAULT 1,
    reward_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false,
    UNIQUE(player_id, sign_date)
);

-- 任务进度表
CREATE TABLE IF NOT EXISTS t_task_progress (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64) NOT NULL,
    task_type VARCHAR(32),
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    reset_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 游戏记录表
CREATE TABLE IF NOT EXISTS t_game_record (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    level INTEGER,
    score BIGINT,
    kills INTEGER,
    bullets_fired INTEGER,
    coins_earned BIGINT,
    boss_killed INTEGER,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT false
);

-- 埋点事件表
CREATE TABLE IF NOT EXISTS t_analytics_event (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64),
    event_name VARCHAR(64),
    event_type VARCHAR(32),
    event_data TEXT,
    session_id VARCHAR(64),
    device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 玩家登录日志表
CREATE TABLE IF NOT EXISTS t_player_login_log (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    login_type VARCHAR(16),
    login_ip VARCHAR(64),
    device_info VARCHAR(255),
    login_result INTEGER DEFAULT 1,
    fail_reason VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- V2: 防沉迷字段
-- ============================================
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS real_name VARCHAR(64);
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS id_card_hash VARCHAR(128);
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- ============================================
-- V3: 索引优化
-- ============================================
CREATE INDEX IF NOT EXISTS idx_player_status ON t_player(status);
CREATE INDEX IF NOT EXISTS idx_player_vip_level ON t_player(vip_level);
CREATE INDEX IF NOT EXISTS idx_player_coins ON t_player(coins DESC);
CREATE INDEX IF NOT EXISTS idx_player_total_kills ON t_player(total_kills DESC);
CREATE INDEX IF NOT EXISTS idx_player_level ON t_player(level DESC);
CREATE INDEX IF NOT EXISTS idx_player_created_at ON t_player(created_at);
CREATE INDEX IF NOT EXISTS idx_player_phone ON t_player(phone);
CREATE INDEX IF NOT EXISTS idx_equipment_player ON t_player_equipment(player_id);
CREATE INDEX IF NOT EXISTS idx_equipment_equipped ON t_player_equipment(player_id, is_equipped);
CREATE INDEX IF NOT EXISTS idx_pet_player ON t_player_pet(player_id);
CREATE INDEX IF NOT EXISTS idx_pet_active ON t_player_pet(player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_achievement_player ON t_player_achievement(player_id);
CREATE INDEX IF NOT EXISTS idx_mail_player ON t_player_mail(player_id);
CREATE INDEX IF NOT EXISTS idx_mail_is_read ON t_player_mail(player_id, is_read);
CREATE INDEX IF NOT EXISTS idx_task_player ON t_task_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_task_reset_date ON t_task_progress(player_id, reset_date);
CREATE INDEX IF NOT EXISTS idx_shop_order_player ON t_shop_order(player_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_status ON t_shop_order(pay_status);
CREATE INDEX IF NOT EXISTS idx_game_record_player ON t_game_record(player_id);
CREATE INDEX IF NOT EXISTS idx_login_player ON t_player_login_log(player_id);
CREATE INDEX IF NOT EXISTS idx_login_time ON t_player_login_log(created_at);

-- ============================================
-- 初始化数据
-- ============================================

-- 初始化赛季
INSERT INTO t_season (season_id, season_name, status, start_at, end_at)
SELECT 'S1', 'S1东海龙宫赛季', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days'
WHERE NOT EXISTS (SELECT 1 FROM t_season WHERE season_id = 'S1');

-- 初始化兑换码
INSERT INTO t_redemption_code (code, description, reward_json, max_uses, expired_at)
SELECT 'FISHING2024', '新用户礼包', '{"coins":5000,"diamonds":5}', 10000, CURRENT_TIMESTAMP + INTERVAL '365 days'
WHERE NOT EXISTS (SELECT 1 FROM t_redemption_code WHERE code = 'FISHING2024');

INSERT INTO t_redemption_code (code, description, reward_json, max_uses, expired_at)
SELECT 'DRAGONKING', '龙王礼包', '{"coins":10000,"diamonds":10}', 5000, CURRENT_TIMESTAMP + INTERVAL '365 days'
WHERE NOT EXISTS (SELECT 1 FROM t_redemption_code WHERE code = 'DRAGONKING');

INSERT INTO t_redemption_code (code, description, reward_json, max_uses, expired_at)
SELECT 'VIPGIFT', 'VIP专属礼包', '{"coins":20000,"diamonds":20}', 1000, CURRENT_TIMESTAMP + INTERVAL '365 days'
WHERE NOT EXISTS (SELECT 1 FROM t_redemption_code WHERE code = 'VIPGIFT');

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_player_updated') THEN
        CREATE TRIGGER trg_player_updated BEFORE UPDATE ON t_player
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- ============================================
-- 数据库初始化完成
-- ============================================
SELECT '数据库初始化完成！共20张表，3个兑换码，1个赛季' AS result;
