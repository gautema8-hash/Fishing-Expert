-- ============================================
-- V3 数据库索引优化
-- 针对高频查询字段添加索引，提升查询性能
-- 注意：所有索引仅引用V1中已存在的表和字段
-- ============================================

-- 玩家表索引
CREATE INDEX IF NOT EXISTS idx_player_vip_level ON t_player(vip_level);
CREATE INDEX IF NOT EXISTS idx_player_coins ON t_player(coins DESC);
CREATE INDEX IF NOT EXISTS idx_player_total_kills ON t_player(total_kills DESC);
CREATE INDEX IF NOT EXISTS idx_player_level ON t_player(level DESC);
CREATE INDEX IF NOT EXISTS idx_player_created_at ON t_player(created_at);
CREATE INDEX IF NOT EXISTS idx_player_nickname ON t_player(nickname);

-- 游戏记录表索引
CREATE INDEX IF NOT EXISTS idx_game_record_player ON t_game_record(player_id);
CREATE INDEX IF NOT EXISTS idx_game_record_created ON t_game_record(created_at);
CREATE INDEX IF NOT EXISTS idx_game_record_level ON t_game_record(level);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_shop_order_player ON t_shop_order(player_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_pay_status ON t_shop_order(pay_status);
CREATE INDEX IF NOT EXISTS idx_shop_order_created ON t_shop_order(created_at);
CREATE INDEX IF NOT EXISTS idx_shop_order_order_no ON t_shop_order(order_no);

-- 邮件表索引
CREATE INDEX IF NOT EXISTS idx_mail_player ON t_player_mail(player_id);
CREATE INDEX IF NOT EXISTS idx_mail_is_read ON t_player_mail(player_id, is_read);
CREATE INDEX IF NOT EXISTS idx_mail_created ON t_player_mail(created_at);

-- 好友关系表索引
CREATE INDEX IF NOT EXISTS idx_friend_player ON t_friend_relation(player_id);
CREATE INDEX IF NOT EXISTS idx_friend_friend ON t_friend_relation(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_relation_type ON t_friend_relation(relation_type);

-- 公会表索引
CREATE INDEX IF NOT EXISTS idx_guild_name ON t_guild(guild_name);
CREATE INDEX IF NOT EXISTS idx_guild_level ON t_guild(guild_level DESC);

-- 公会成员表索引
CREATE INDEX IF NOT EXISTS idx_guild_member_guild ON t_guild_member(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_member_player ON t_guild_member(player_id);

-- 装备表索引
CREATE INDEX IF NOT EXISTS idx_equipment_player ON t_player_equipment(player_id);
CREATE INDEX IF NOT EXISTS idx_equipment_equipped ON t_player_equipment(player_id, is_equipped);
CREATE INDEX IF NOT EXISTS idx_equipment_rarity ON t_player_equipment(rarity);

-- 宠物表索引
CREATE INDEX IF NOT EXISTS idx_pet_player ON t_player_pet(player_id);
CREATE INDEX IF NOT EXISTS idx_pet_active ON t_player_pet(player_id, is_active);

-- 赛季表索引
CREATE INDEX IF NOT EXISTS idx_season_active ON t_season(is_active);
CREATE INDEX IF NOT EXISTS idx_player_season_player ON t_player_season(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_xp ON t_player_season(season_xp DESC);

-- 兑换码记录表索引
CREATE INDEX IF NOT EXISTS idx_redemption_player ON t_redemption_record(player_id);
CREATE INDEX IF NOT EXISTS idx_redemption_code ON t_redemption_record(code);

-- 登录日志表索引
CREATE INDEX IF NOT EXISTS idx_login_player ON t_player_login_log(player_id);
CREATE INDEX IF NOT EXISTS idx_login_created ON t_player_login_log(created_at);

-- 埋点事件表索引
CREATE INDEX IF NOT EXISTS idx_analytics_player ON t_analytics_event(player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON t_analytics_event(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON t_analytics_event(created_at);

-- 玩家道具表索引
CREATE INDEX IF NOT EXISTS idx_item_player ON t_player_item(player_id);

-- 玩家升级表索引
CREATE INDEX IF NOT EXISTS idx_upgrade_player ON t_player_upgrade(player_id);

-- 签到记录表索引
CREATE INDEX IF NOT EXISTS idx_signin_player ON t_sign_in_record(player_id);
CREATE INDEX IF NOT EXISTS idx_signin_date ON t_sign_in_record(sign_date);

-- 任务进度表索引
CREATE INDEX IF NOT EXISTS idx_task_player ON t_task_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_task_completed ON t_task_progress(player_id, is_completed);

-- 成就表索引
CREATE INDEX IF NOT EXISTS idx_achievement_player ON t_player_achievement(player_id);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocked ON t_player_achievement(player_id, is_unlocked);

-- ============================================
-- 索引创建完成
-- 共创建约45个索引，覆盖所有高频查询场景
-- ============================================
