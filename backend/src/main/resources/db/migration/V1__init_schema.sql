-- ============================================================
-- 捕鱼达人·东海龙宫 - 数据库DDL
-- 数据库: PostgreSQL 12+
-- 字符集: UTF-8
-- 作者: 后端架构组
-- ============================================================

-- 创建数据库（需手动执行）
-- CREATE DATABASE fishing_db WITH ENCODING 'UTF8' LC_COLLATE 'zh_CN.UTF-8' LC_CTYPE 'zh_CN.UTF-8' TEMPLATE template0;

-- 注意：Flyway会自动连接到配置的数据库，无需手动\c切换

-- ============================================================
-- 1. 玩家表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL UNIQUE,
    nickname        VARCHAR(64)     NOT NULL DEFAULT '龙宫新手',
    avatar          VARCHAR(256),
    password_hash   VARCHAR(128),
    phone           VARCHAR(20),
    email           VARCHAR(128),
    vip_level       INT             NOT NULL DEFAULT 0,
    vip_exp         BIGINT          NOT NULL DEFAULT 0,
    level           INT             NOT NULL DEFAULT 1,
    exp             BIGINT          NOT NULL DEFAULT 0,
    coins           BIGINT          NOT NULL DEFAULT 10000,
    diamonds        INT             NOT NULL DEFAULT 10,
    energy          INT             NOT NULL DEFAULT 30,
    cannon_level    INT             NOT NULL DEFAULT 1,
    cannon_skin     VARCHAR(32)     NOT NULL DEFAULT 'dragon',
    active_pet      VARCHAR(32),
    total_recharge  DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total_kills     BIGINT          NOT NULL DEFAULT 0,
    total_bullets   BIGINT          NOT NULL DEFAULT 0,
    total_crits     BIGINT          NOT NULL DEFAULT 0,
    total_coins_earned BIGINT       NOT NULL DEFAULT 0,
    highest_level   INT             NOT NULL DEFAULT 1,
    play_count      INT             NOT NULL DEFAULT 0,
    consecutive_days INT            NOT NULL DEFAULT 1,
    is_new_player   BOOLEAN         NOT NULL DEFAULT TRUE,
    newbie_protection_left INT      NOT NULL DEFAULT 3,
    status          SMALLINT        NOT NULL DEFAULT 1,
    last_login_time TIMESTAMP,
    last_login_ip   VARCHAR(64),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_player_player_id ON t_player(player_id);
CREATE INDEX idx_player_phone ON t_player(phone);
CREATE INDEX idx_player_status ON t_player(status);
COMMENT ON TABLE t_player IS '玩家表';
COMMENT ON COLUMN t_player.status IS '状态:1正常 2封禁 3注销';

-- ============================================================
-- 2. 玩家道具表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_item (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    item_type       VARCHAR(32)     NOT NULL,
    item_count      INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(player_id, item_type)
);
CREATE INDEX idx_pitem_player ON t_player_item(player_id);
COMMENT ON TABLE t_player_item IS '玩家道具表';

-- ============================================================
-- 3. 玩家装备表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_equipment (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    equip_uid       VARCHAR(64)     NOT NULL UNIQUE,
    equip_id        VARCHAR(32)     NOT NULL,
    equip_name      VARCHAR(64)     NOT NULL,
    slot_type       VARCHAR(16)     NOT NULL,
    rarity          VARCHAR(16)     NOT NULL,
    enhance_level   INT             NOT NULL DEFAULT 0,
    is_equipped     BOOLEAN         NOT NULL DEFAULT FALSE,
    stats_json      TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_pequip_player ON t_player_equipment(player_id);
CREATE INDEX idx_pequip_equipped ON t_player_equipment(player_id, is_equipped);
COMMENT ON TABLE t_player_equipment IS '玩家装备表';

-- ============================================================
-- 4. 玩家宠物表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_pet (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    pet_type        VARCHAR(32)     NOT NULL,
    pet_name        VARCHAR(64)     NOT NULL,
    pet_level       INT             NOT NULL DEFAULT 1,
    pet_exp         INT             NOT NULL DEFAULT 0,
    star_level      INT             NOT NULL DEFAULT 1,
    is_active       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(player_id, pet_type)
);
CREATE INDEX idx_ppet_player ON t_player_pet(player_id);
COMMENT ON TABLE t_player_pet IS '玩家宠物表';

-- ============================================================
-- 5. 玩家炮台升级表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_upgrade (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL UNIQUE,
    firepower_level INT             NOT NULL DEFAULT 1,
    fire_rate_level INT             NOT NULL DEFAULT 1,
    crit_level      INT             NOT NULL DEFAULT 1,
    coin_bonus_level INT            NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
COMMENT ON TABLE t_player_upgrade IS '玩家炮台升级表';

-- ============================================================
-- 6. 玩家成就表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_achievement (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    achievement_id  VARCHAR(64)     NOT NULL,
    progress        INT             NOT NULL DEFAULT 0,
    is_unlocked     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_claimed      BOOLEAN         NOT NULL DEFAULT FALSE,
    unlocked_at     TIMESTAMP,
    claimed_at      TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(player_id, achievement_id)
);
CREATE INDEX idx_pachv_player ON t_player_achievement(player_id);
COMMENT ON TABLE t_player_achievement IS '玩家成就表';

-- ============================================================
-- 7. 玩家邮件表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_mail (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    mail_type       VARCHAR(16)     NOT NULL DEFAULT 'system',
    title           VARCHAR(128)    NOT NULL,
    sender          VARCHAR(64)     NOT NULL DEFAULT '系统',
    content         TEXT,
    attachments     TEXT,
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_claimed      BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP,
    claimed_at      TIMESTAMP,
    expired_at      TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_pmail_player ON t_player_mail(player_id);
CREATE INDEX idx_pmail_unread ON t_player_mail(player_id, is_read);
COMMENT ON TABLE t_player_mail IS '玩家邮件表';

-- ============================================================
-- 8. 好友关系表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_friend_relation (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    friend_id       VARCHAR(64)     NOT NULL,
    relation_type   SMALLINT        NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(player_id, friend_id)
);
CREATE INDEX idx_friend_player ON t_friend_relation(player_id);
COMMENT ON TABLE t_friend_relation IS '好友关系表';
COMMENT ON COLUMN t_friend_relation.relation_type IS '1好友 2黑名单';

-- ============================================================
-- 9. 公会表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_guild (
    id              BIGSERIAL       PRIMARY KEY,
    guild_id        VARCHAR(64)     NOT NULL UNIQUE,
    guild_name      VARCHAR(64)     NOT NULL,
    leader_id       VARCHAR(64)     NOT NULL,
    guild_level     INT             NOT NULL DEFAULT 1,
    guild_exp       BIGINT          NOT NULL DEFAULT 0,
    member_count    INT             NOT NULL DEFAULT 1,
    member_max      INT             NOT NULL DEFAULT 20,
    description     VARCHAR(512),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_guild_name ON t_guild(guild_name);
COMMENT ON TABLE t_guild IS '公会表';

-- ============================================================
-- 10. 公会成员表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_guild_member (
    id              BIGSERIAL       PRIMARY KEY,
    guild_id        VARCHAR(64)     NOT NULL,
    player_id       VARCHAR(64)     NOT NULL,
    role            VARCHAR(16)     NOT NULL DEFAULT 'member',
    contribution    BIGINT          NOT NULL DEFAULT 0,
    joined_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(guild_id, player_id)
);
CREATE INDEX idx_gmember_guild ON t_guild_member(guild_id);
CREATE INDEX idx_gmember_player ON t_guild_member(player_id);
COMMENT ON TABLE t_guild_member IS '公会成员表';
COMMENT ON COLUMN t_guild_member.role IS 'leader会长 vice_leader副会长 elder长老 elite精英 member成员';

-- ============================================================
-- 11. 赛季表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_season (
    id              BIGSERIAL       PRIMARY KEY,
    season_id       VARCHAR(32)     NOT NULL UNIQUE,
    season_name     VARCHAR(64)     NOT NULL,
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    max_level       INT             NOT NULL DEFAULT 50,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE t_season IS '赛季表';

-- ============================================================
-- 12. 玩家赛季进度表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_season (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    season_id       VARCHAR(32)     NOT NULL,
    season_level    INT             NOT NULL DEFAULT 1,
    season_xp       INT             NOT NULL DEFAULT 0,
    total_xp        BIGINT          NOT NULL DEFAULT 0,
    is_premium      BOOLEAN         NOT NULL DEFAULT FALSE,
    daily_xp        INT             NOT NULL DEFAULT 0,
    last_daily_reset DATE,
    claimed_free    TEXT,
    claimed_premium TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(player_id, season_id)
);
CREATE INDEX idx_pseason_player ON t_player_season(player_id);
COMMENT ON TABLE t_player_season IS '玩家赛季进度表';

-- ============================================================
-- 13. 商城订单表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_shop_order (
    id              BIGSERIAL       PRIMARY KEY,
    order_no        VARCHAR(64)     NOT NULL UNIQUE,
    player_id       VARCHAR(64)     NOT NULL,
    product_id      VARCHAR(64)     NOT NULL,
    product_name    VARCHAR(128)    NOT NULL,
    amount          DECIMAL(10,2)   NOT NULL,
    pay_type        VARCHAR(16),
    pay_status      SMALLINT        NOT NULL DEFAULT 0,
    pay_time        TIMESTAMP,
    transaction_id  VARCHAR(128),
    reward_json     TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_order_player ON t_shop_order(player_id);
CREATE INDEX idx_order_status ON t_shop_order(pay_status);
COMMENT ON TABLE t_shop_order IS '商城订单表';
COMMENT ON COLUMN t_shop_order.pay_status IS '0待支付 1已支付 2已发货 3已取消 4已退款';

-- ============================================================
-- 14. 兑换码表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_redemption_code (
    id              BIGSERIAL       PRIMARY KEY,
    code            VARCHAR(32)     NOT NULL UNIQUE,
    code_name       VARCHAR(64)     NOT NULL,
    reward_json     TEXT            NOT NULL,
    max_uses        INT             NOT NULL DEFAULT 1,
    used_count      INT             NOT NULL DEFAULT 0,
    expired_at      TIMESTAMP,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_code_active ON t_redemption_code(code, is_active);
COMMENT ON TABLE t_redemption_code IS '兑换码表';

-- ============================================================
-- 15. 兑换码使用记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_redemption_record (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    code            VARCHAR(32)     NOT NULL,
    reward_json     TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, code)
);
CREATE INDEX idx_rrecord_player ON t_redemption_record(player_id);
COMMENT ON TABLE t_redemption_record IS '兑换码使用记录表';

-- ============================================================
-- 16. 签到记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_sign_in_record (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    sign_date       DATE            NOT NULL,
    consecutive_days INT            NOT NULL DEFAULT 1,
    reward_json     TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, sign_date)
);
CREATE INDEX idx_sign_player ON t_sign_in_record(player_id);
COMMENT ON TABLE t_sign_in_record IS '签到记录表';

-- ============================================================
-- 17. 任务进度表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_task_progress (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    task_id         VARCHAR(64)     NOT NULL,
    task_type       VARCHAR(16)     NOT NULL,
    progress        INT             NOT NULL DEFAULT 0,
    is_completed    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_claimed      BOOLEAN         NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMP,
    claimed_at      TIMESTAMP,
    reset_date      DATE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT        NOT NULL DEFAULT 0,
    UNIQUE(player_id, task_id, reset_date)
);
CREATE INDEX idx_task_player ON t_task_progress(player_id);
COMMENT ON TABLE t_task_progress IS '任务进度表';

-- ============================================================
-- 18. 游戏记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_game_record (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    game_type       VARCHAR(32)     NOT NULL DEFAULT 'normal',
    level           INT             NOT NULL DEFAULT 1,
    kills           INT             NOT NULL DEFAULT 0,
    boss_kills      INT             NOT NULL DEFAULT 0,
    bullets_fired   INT             NOT NULL DEFAULT 0,
    crit_count      INT             NOT NULL DEFAULT 0,
    coins_earned    BIGINT          NOT NULL DEFAULT 0,
    coins_spent     BIGINT          NOT NULL DEFAULT 0,
    duration        INT             NOT NULL DEFAULT 0,
    score           BIGINT          NOT NULL DEFAULT 0,
    stars           INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_grecord_player ON t_game_record(player_id);
CREATE INDEX idx_grecord_time ON t_game_record(created_at);
COMMENT ON TABLE t_game_record IS '游戏记录表';

-- ============================================================
-- 19. 埋点事件表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_analytics_event (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64),
    event_type      VARCHAR(64)     NOT NULL,
    event_name      VARCHAR(128),
    event_data      TEXT,
    device_info     TEXT,
    ip_address      VARCHAR(64),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ae_type ON t_analytics_event(event_type);
CREATE INDEX idx_ae_player ON t_analytics_event(player_id);
CREATE INDEX idx_ae_time ON t_analytics_event(created_at);
COMMENT ON TABLE t_analytics_event IS '埋点事件表';

-- ============================================================
-- 20. 玩家登录日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_player_login_log (
    id              BIGSERIAL       PRIMARY KEY,
    player_id       VARCHAR(64)     NOT NULL,
    login_type      VARCHAR(16)     NOT NULL DEFAULT 'password',
    login_ip        VARCHAR(64),
    device_info     TEXT,
    login_result    SMALLINT        NOT NULL DEFAULT 1,
    fail_reason     VARCHAR(128),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_login_player ON t_player_login_log(player_id);
CREATE INDEX idx_login_time ON t_player_login_log(created_at);
COMMENT ON TABLE t_player_login_log IS '玩家登录日志表';

-- ============================================================
-- 创建更新时间触发器函数
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有含updated_at的表创建触发器
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns
             WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I
                        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- ============================================================
-- 初始化数据
-- ============================================================
INSERT INTO t_season (season_id, season_name, start_date, end_date, max_level, is_active)
VALUES ('S1', '东海龙宫·第一赛季', '2026-09-01', '2026-09-30', 50, TRUE)
ON CONFLICT (season_id) DO NOTHING;

INSERT INTO t_redemption_code (code, code_name, reward_json, max_uses, expired_at)
VALUES
('WELCOME', '新手欢迎码', '{"coins":10000,"diamonds":10,"items":{"lock":3,"rage":2}}', 999999, '2027-12-31 23:59:59'),
('DRAGON', '龙王礼包码', '{"coins":50000,"diamonds":20,"items":{"lock":5,"rage":5}}', 999999, '2027-12-31 23:59:59'),
('FISH2024', '捕鱼达人码', '{"coins":20000,"diamonds":5}', 999999, '2027-12-31 23:59:59')
ON CONFLICT (code) DO NOTHING;
