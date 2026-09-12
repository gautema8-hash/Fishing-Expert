package com.fishing.infrastructure.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis配置 - 缓存管理器/序列化/TTL
 *
 * @author 后端架构组
 */
@Configuration
@EnableCaching
public class RedisConfig {

    /**
     * RedisTemplate配置
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // JSON序列化
        Jackson2JsonRedisSerializer<Object> jacksonSerializer = createJacksonSerializer();

        // String序列化
        StringRedisSerializer stringSerializer = new StringRedisSerializer();

        // key采用String序列化
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        // value采用JSON序列化
        template.setValueSerializer(jacksonSerializer);
        template.setHashValueSerializer(jacksonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    /**
     * 缓存管理器 - 支持不同缓存空间不同TTL
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        Jackson2JsonRedisSerializer<Object> jacksonSerializer = createJacksonSerializer();

        // 默认缓存配置：1小时过期
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jacksonSerializer))
                .disableCachingNullValues();

        // 各缓存空间专属TTL配置
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // 玩家缓存：30分钟
        cacheConfigurations.put("player", defaultConfig.entryTtl(Duration.ofMinutes(30)));
        // 排行榜：10分钟
        cacheConfigurations.put("leaderboard", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        // 商品列表：1小时
        cacheConfigurations.put("shop", defaultConfig.entryTtl(Duration.ofHours(1)));
        // 赛季信息：2小时
        cacheConfigurations.put("season", defaultConfig.entryTtl(Duration.ofHours(2)));
        // 公会信息：30分钟
        cacheConfigurations.put("guild", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware()
                .build();
    }

    /**
     * 创建Jackson序列化器
     */
    private Jackson2JsonRedisSerializer<Object> createJacksonSerializer() {
        Jackson2JsonRedisSerializer<Object> jacksonSerializer = new Jackson2JsonRedisSerializer<>(Object.class);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL);
        // 支持Java8时间类型
        objectMapper.registerModule(new JavaTimeModule());
        jacksonSerializer.setObjectMapper(objectMapper);
        return jacksonSerializer;
    }
}
