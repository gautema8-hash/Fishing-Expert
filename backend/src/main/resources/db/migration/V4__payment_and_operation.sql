-- V4: 充值订单表 + 操作日志表 + IP封禁表
-- 作者: 后端架构组

-- 充值订单表
CREATE TABLE IF NOT EXISTS t_recharge_order (
    id              BIGSERIAL PRIMARY KEY,
    order_no        VARCHAR(64) NOT NULL UNIQUE,
    player_id       VARCHAR(64) NOT NULL,
    product_id      VARCHAR(32) NOT NULL,
    product_name    VARCHAR(128),
    amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
    coins           BIGINT NOT NULL DEFAULT 0,
    diamonds        INTEGER NOT NULL DEFAULT 0,
    pay_method      VARCHAR(16) DEFAULT 'wechat',
    status          SMALLINT NOT NULL DEFAULT 0,
    transaction_id  VARCHAR(128),
    paid_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE t_recharge_order IS '充值订单表';
COMMENT ON COLUMN t_recharge_order.status IS '0待支付 1已支付 2已发货 3已取消 4已退款';
COMMENT ON COLUMN t_recharge_order.pay_method IS 'wechat/alipay/apple';

CREATE INDEX IF NOT EXISTS idx_recharge_order_player ON t_recharge_order(player_id);
CREATE INDEX IF NOT EXISTS idx_recharge_order_status ON t_recharge_order(status);
CREATE INDEX IF NOT EXISTS idx_recharge_order_created ON t_recharge_order(created_at);

-- 操作日志表
CREATE TABLE IF NOT EXISTS t_operation_log (
    id              BIGSERIAL PRIMARY KEY,
    player_id       VARCHAR(64),
    operation       VARCHAR(128) NOT NULL,
    op_type         VARCHAR(32) DEFAULT 'other',
    method          VARCHAR(256),
    params          TEXT,
    result          TEXT,
    ip              VARCHAR(64),
    user_agent      VARCHAR(512),
    duration_ms     INTEGER DEFAULT 0,
    success         BOOLEAN DEFAULT TRUE,
    error_msg       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_operation_log IS '操作日志表';

CREATE INDEX IF NOT EXISTS idx_operation_log_player ON t_operation_log(player_id);
CREATE INDEX IF NOT EXISTS idx_operation_log_type ON t_operation_log(op_type);
CREATE INDEX IF NOT EXISTS idx_operation_log_created ON t_operation_log(created_at);

-- IP封禁表
CREATE TABLE IF NOT EXISTS t_ip_blacklist (
    id              BIGSERIAL PRIMARY KEY,
    ip              VARCHAR(64) NOT NULL UNIQUE,
    reason          VARCHAR(256),
    ban_type        VARCHAR(16) DEFAULT 'permanent',
    expire_at       TIMESTAMP,
    created_by      VARCHAR(64),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_ip_blacklist IS 'IP黑名单表';
COMMENT ON COLUMN t_ip_blacklist.ban_type IS 'permanent永久/temporary临时';

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON t_ip_blacklist(ip);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expire ON t_ip_blacklist(expire_at);

-- 数据统计表
CREATE TABLE IF NOT EXISTS t_daily_stats (
    id              BIGSERIAL PRIMARY KEY,
    stat_date       DATE NOT NULL UNIQUE,
    new_players     INTEGER DEFAULT 0,
    active_players  INTEGER DEFAULT 0,
    total_recharge  DECIMAL(12,2) DEFAULT 0,
    recharge_count  INTEGER DEFAULT 0,
    total_coins_earned BIGINT DEFAULT 0,
    total_coins_spent  BIGINT DEFAULT 0,
    total_kills     INTEGER DEFAULT 0,
    total_bullets   INTEGER DEFAULT 0,
    boss_kills      INTEGER DEFAULT 0,
    avg_online      INTEGER DEFAULT 0,
    peak_online     INTEGER DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_daily_stats IS '每日数据统计表';

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON t_daily_stats(stat_date);
