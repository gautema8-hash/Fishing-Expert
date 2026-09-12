-- ============================================================
-- V2: 防沉迷系统 - 实名认证字段
-- ============================================================

ALTER TABLE t_player ADD COLUMN IF NOT EXISTS is_real_name_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS real_name VARCHAR(64);
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS id_card_hash VARCHAR(128);
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE t_player ADD COLUMN IF NOT EXISTS is_minor BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN t_player.is_real_name_verified IS '是否已实名认证';
COMMENT ON COLUMN t_player.real_name IS '真实姓名';
COMMENT ON COLUMN t_player.id_card_hash IS '身份证号SHA256哈希';
COMMENT ON COLUMN t_player.age IS '年龄';
COMMENT ON COLUMN t_player.is_minor IS '是否未成年人';
