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
 * 系统配置管理服务
 * 游戏参数动态配置，基于Redis存储，支持热更新
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CONFIG_KEY = "fishing:system:config";

    /**
     * 默认配置
     */
    private final Map<String, Object> defaultConfig = new HashMap<>();

    @PostConstruct
    public void init() {
        // 初始化默认配置
        defaultConfig.put("initial_coins", 10000L);
        defaultConfig.put("initial_diamonds", 10);
        defaultConfig.put("max_bullets_per_second", 30);
        defaultConfig.put("max_coins_per_minute", 500000L);
        defaultConfig.put("crit_rate_base", 0.05);
        defaultConfig.put("vip_coin_bonus_per_level", 0.05);
        defaultConfig.put("vip_crit_bonus_per_level", 0.02);
        defaultConfig.put("newbie_protection_games", 3);
        defaultConfig.put("world_boss_duration", 300000L);
        defaultConfig.put("maintenance_mode", false);
        defaultConfig.put("register_enabled", true);
        defaultConfig.put("recharge_enabled", true);

        // 如果Redis中没有配置，则写入默认配置
        if (Boolean.FALSE.equals(redisTemplate.hasKey(CONFIG_KEY))) {
            redisTemplate.opsForHash().putAll(CONFIG_KEY, defaultConfig);
            redisTemplate.persist(CONFIG_KEY);
            log.info("系统默认配置已初始化");
        }
    }

    /**
     * 获取所有配置
     */
    public Map<String, Object> getAllConfig() {
        Map<Object, Object> config = redisTemplate.opsForHash().entries(CONFIG_KEY);
        Map<String, Object> result = new HashMap<>();
        config.forEach((k, v) -> result.put(k.toString(), v));
        return result;
    }

    /**
     * 获取单个配置
     */
    public Object getConfig(String key) {
        Object value = redisTemplate.opsForHash().get(CONFIG_KEY, key);
        if (value == null) {
            value = defaultConfig.get(key);
        }
        return value;
    }

    /**
     * 获取字符串配置
     */
    public String getConfigString(String key) {
        Object value = getConfig(key);
        return value != null ? value.toString() : null;
    }

    /**
     * 获取整数配置
     */
    public Integer getConfigInt(String key) {
        Object value = getConfig(key);
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).intValue();
        return Integer.parseInt(value.toString());
    }

    /**
     * 获取长整数配置
     */
    public Long getConfigLong(String key) {
        Object value = getConfig(key);
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).longValue();
        return Long.parseLong(value.toString());
    }

    /**
     * 获取布尔配置
     */
    public Boolean getConfigBoolean(String key) {
        Object value = getConfig(key);
        if (value == null) return null;
        if (value instanceof Boolean) return (Boolean) value;
        return Boolean.parseBoolean(value.toString());
    }

    /**
     * 获取双精度配置
     */
    public Double getConfigDouble(String key) {
        Object value = getConfig(key);
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).doubleValue();
        return Double.parseDouble(value.toString());
    }

    /**
     * 更新配置
     */
    public void updateConfig(String key, Object value) {
        redisTemplate.opsForHash().put(CONFIG_KEY, key, value);
        log.info("系统配置已更新: {}={}", key, value);
    }

    /**
     * 批量更新配置
     */
    public void updateConfigs(Map<String, Object> configs) {
        redisTemplate.opsForHash().putAll(CONFIG_KEY, configs);
        log.info("系统配置批量更新: {} 项", configs.size());
    }

    /**
     * 重置为默认配置
     */
    public void resetToDefault() {
        redisTemplate.delete(CONFIG_KEY);
        redisTemplate.opsForHash().putAll(CONFIG_KEY, defaultConfig);
        log.info("系统配置已重置为默认值");
    }

    /**
     * 检查是否维护模式
     */
    public boolean isMaintenanceMode() {
        return Boolean.TRUE.equals(getConfigBoolean("maintenance_mode"));
    }

    /**
     * 检查是否允许注册
     */
    public boolean isRegisterEnabled() {
        return !Boolean.FALSE.equals(getConfigBoolean("register_enabled"));
    }
}
