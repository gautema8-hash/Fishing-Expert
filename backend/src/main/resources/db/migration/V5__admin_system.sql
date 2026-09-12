-- V5: 管理系统 - 管理员表 + 管理员操作日志表 + 游戏公告表
-- 作者: 后端架构组

-- 管理员表
CREATE TABLE IF NOT EXISTS t_admin_user (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(64) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    real_name       VARCHAR(64),
    role            VARCHAR(32) NOT NULL DEFAULT 'operator',
    status          SMALLINT NOT NULL DEFAULT 1,
    last_login_time TIMESTAMP,
    last_login_ip   VARCHAR(64),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE t_admin_user IS '管理员表';
COMMENT ON COLUMN t_admin_user.role IS 'super_admin/operator/customer_service/finance';
COMMENT ON COLUMN t_admin_user.status IS '1正常 2禁用';

-- 初始管理员: username=admin  password=admin123 (BCrypt hash, 已校验)
INSERT INTO t_admin_user (username, password_hash, real_name, role, status)
SELECT 'admin', '$2a$10$dmtNboY/36t.SMy6K8/QnOxWRpP2CWh0Y9Z0TZC0fACmQN4ou5Z/2', '超级管理员', 'super_admin', 1
WHERE NOT EXISTS (SELECT 1 FROM t_admin_user WHERE username = 'admin');

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS t_admin_operation_log (
    id            BIGSERIAL PRIMARY KEY,
    admin_id      BIGINT,
    admin_name    VARCHAR(64),
    operation     VARCHAR(128) NOT NULL,
    module        VARCHAR(32),
    target_id     VARCHAR(64),
    params_json   TEXT,
    ip_address    VARCHAR(64),
    user_agent    VARCHAR(512),
    result        VARCHAR(16) DEFAULT 'success',
    error_msg     TEXT,
    duration_ms   INTEGER DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_admin_operation_log IS '管理员操作日志表';

CREATE INDEX IF NOT EXISTS idx_admin_op_log_admin ON t_admin_operation_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_op_log_module ON t_admin_operation_log(module);
CREATE INDEX IF NOT EXISTS idx_admin_op_log_created ON t_admin_operation_log(created_at);

-- 游戏公告表
CREATE TABLE IF NOT EXISTS t_game_announcement (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(256) NOT NULL,
    content     TEXT,
    type        VARCHAR(32) DEFAULT 'notice',
    priority    INTEGER DEFAULT 0,
    start_time  TIMESTAMP,
    end_time    TIMESTAMP,
    is_active   BOOLEAN DEFAULT TRUE,
    created_by  VARCHAR(64),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted     SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE t_game_announcement IS '游戏公告表';

CREATE INDEX IF NOT EXISTS idx_announcement_active ON t_game_announcement(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_start ON t_game_announcement(start_time);
CREATE INDEX IF NOT EXISTS idx_announcement_created ON t_game_announcement(created_at);
