package com.fishing.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 功能开关系统
 * 支持灰度发布、特性开关、A/B测试
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String FLAG_KEY = "fishing:feature:flags";

    /**
     * 默认功能开关
     */
    private final Map<String, Boolean> defaultFlags = new HashMap<>();

    @PostConstruct
    public void init() {
        // 初始化默认开关
        defaultFlags.put("world_boss_enabled", true);
        defaultFlags.put("guild_enabled", true);
        defaultFlags.put("friend_enabled", true);
        defaultFlags.put("season_enabled", true);
        defaultFlags.put("pet_enabled", true);
        defaultFlags.put("equipment_enabled", true);
        defaultFlags.put("achievement_enabled", true);
        defaultFlags.put("vip_enabled", true);
        defaultFlags.put("task_enabled", true);
        defaultFlags.put("shop_enabled", true);
        defaultFlags.put("recharge_enabled", true);
        defaultFlags.put("leaderboard_enabled", true);
        defaultFlags.put("multiplayer_enabled", false); // 灰度中
        defaultFlags.put("newbie_protection", true);
        defaultFlags.put("anti_cheat_enabled", true);
        defaultFlags.put("ad_enabled", false); // 广告位预留
        defaultFlags.put("daily_sign_enabled", true);
        defaultFlags.put("offline_reward_enabled", true);
        defaultFlags.put("lucky_wheel_enabled", true);

        // 如果Redis中没有配置，则写入默认配置
        if (Boolean.FALSE.equals(redisTemplate.hasKey(FLAG_KEY))) {
            Map<String, Object> flags = new HashMap<>(defaultFlags);
            redisTemplate.opsForHash().putAll(FLAG_KEY, flags);
            redisTemplate.persist(FLAG_KEY);
            log.info("功能开关默认配置已初始化: {} 项", defaultFlags.size());
        }
    }

    /**
     * 检查功能是否启用
     */
    public boolean isEnabled(String featureName) {
        Object value = redisTemplate.opsForHash().get(FLAG_KEY, featureName);
        if (value == null) {
            // 未配置的功能默认关闭
            Boolean defaultValue = defaultFlags.get(featureName);
            return defaultValue != null && defaultValue;
        }
        return Boolean.TRUE.equals(value);
    }

    /**
     * 检查功能是否启用（带灰度比例）
     * @param featureName 功能名
     * @param playerId 玩家ID（用于灰度判断）
     * @param grayPercent 灰度比例 0-100
     */
    public boolean isEnabledWithGray(String featureName, String playerId, int grayPercent) {
        if (!isEnabled(featureName)) {
            return false;
        }
        // 基于玩家ID哈希判断是否在灰度范围内
        int hash = Math.abs(playerId.hashCode()) % 100;
        return hash < grayPercent;
    }

    /**
     * 获取所有功能开关
     */
    public Map<String, Object> getAllFlags() {
        Map<Object, Object> flags = redisTemplate.opsForHash().entries(FLAG_KEY);
        Map<String, Object> result = new HashMap<>();
        flags.forEach((k, v) -> result.put(k.toString(), v));
        return result;
    }

    /**
     * 启用功能
     */
    public void enableFeature(String featureName) {
        redisTemplate.opsForHash().put(FLAG_KEY, featureName, true);
        log.info("功能已启用: {}", featureName);
    }

    /**
     * 禁用功能
     */
    public void disableFeature(String featureName) {
        redisTemplate.opsForHash().put(FLAG_KEY, featureName, false);
        log.info("功能已禁用: {}", featureName);
    }

    /**
     * 切换功能状态
     */
    public boolean toggleFeature(String featureName) {
        boolean current = isEnabled(featureName);
        boolean newState = !current;
        redisTemplate.opsForHash().put(FLAG_KEY, featureName, newState);
        log.info("功能状态切换: {}: {} -> {}", featureName, current, newState);
        return newState;
    }

    /**
     * 批量更新功能开关
     */
    public void updateFlags(Map<String, Boolean> flags) {
        Map<String, Object> toUpdate = new HashMap<>(flags);
        redisTemplate.opsForHash().putAll(FLAG_KEY, toUpdate);
        log.info("功能开关批量更新: {} 项", flags.size());
    }

    /**
     * 重置为默认开关
     */
    public void resetToDefault() {
        redisTemplate.delete(FLAG_KEY);
        Map<String, Object> flags = new HashMap<>(defaultFlags);
        redisTemplate.opsForHash().putAll(FLAG_KEY, flags);
        log.info("功能开关已重置为默认值: {} 项", defaultFlags.size());
    }
}
