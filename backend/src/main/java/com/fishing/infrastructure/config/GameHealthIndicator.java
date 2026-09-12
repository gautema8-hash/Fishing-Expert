package com.fishing.infrastructure.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

/**
 * 自定义健康检查指示器
 * 检查数据库、Redis、游戏服务状态
 *
 * @author 后端架构组
 */
@Component("gameHealth")
@RequiredArgsConstructor
public class GameHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public Health health() {
        Map<String, Object> details = new HashMap<>();

        // 数据库检查
        boolean dbHealthy = checkDatabase();
        details.put("database", dbHealthy ? "UP" : "DOWN");

        // Redis检查
        boolean redisHealthy = checkRedis();
        details.put("redis", redisHealthy ? "UP" : "DOWN");

        // 综合状态
        if (dbHealthy && redisHealthy) {
            return Health.up().withDetails(details).build();
        } else {
            return Health.down().withDetails(details).build();
        }
    }

    /**
     * 检查数据库连接
     */
    private boolean checkDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(3);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 检查Redis连接
     */
    private boolean checkRedis() {
        try {
            String ping = redisTemplate.getConnectionFactory().getConnection().ping();
            return "PONG".equalsIgnoreCase(ping);
        } catch (Exception e) {
            return false;
        }
    }
}
