package com.fishing.infrastructure.util;

import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * 玩家缓存服务 - Redis缓存层
 *
 * @author 后端架构组
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlayerCacheService {

    private static final String PLAYER_CACHE_PREFIX = "fishing:player:";
    private static final long CACHE_EXPIRE_HOURS = 2;

    private final RedisTemplate<String, Object> redisTemplate;
    private final PlayerRepository playerRepository;

    /**
     * 获取玩家信息（优先缓存）
     *
     * @param playerId 玩家ID
     * @return 玩家信息
     */
    public Optional<Player> getPlayer(String playerId) {
        String cacheKey = PLAYER_CACHE_PREFIX + playerId;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof Player) {
                log.debug("缓存命中: playerId={}", playerId);
                return Optional.of((Player) cached);
            }
        } catch (Exception e) {
            log.warn("Redis缓存读取失败，降级到数据库: {}", e.getMessage());
        }

        // 缓存未命中，查询数据库
        Optional<Player> player = playerRepository.findByPlayerId(playerId);
        player.ifPresent(p -> {
            try {
                redisTemplate.opsForValue().set(cacheKey, p, CACHE_EXPIRE_HOURS, TimeUnit.HOURS);
                log.debug("缓存写入: playerId={}", playerId);
            } catch (Exception e) {
                log.warn("Redis缓存写入失败: {}", e.getMessage());
            }
        });
        return player;
    }

    /**
     * 更新玩家信息并刷新缓存
     *
     * @param player 玩家信息
     */
    public void updatePlayer(Player player) {
        playerRepository.update(player);
        evictCache(player.getPlayerId());
    }

    /**
     * 保存玩家并写入缓存
     *
     * @param player 玩家信息
     * @return 保存后的玩家
     */
    public Player savePlayer(Player player) {
        Player saved = playerRepository.save(player);
        String cacheKey = PLAYER_CACHE_PREFIX + saved.getPlayerId();
        try {
            redisTemplate.opsForValue().set(cacheKey, saved, CACHE_EXPIRE_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("Redis缓存写入失败: {}", e.getMessage());
        }
        return saved;
    }

    /**
     * 清除玩家缓存
     *
     * @param playerId 玩家ID
     */
    public void evictCache(String playerId) {
        String cacheKey = PLAYER_CACHE_PREFIX + playerId;
        try {
            redisTemplate.delete(cacheKey);
            log.debug("缓存清除: playerId={}", playerId);
        } catch (Exception e) {
            log.warn("Redis缓存清除失败: {}", e.getMessage());
        }
    }

    /**
     * 检查玩家是否存在（优先缓存）
     */
    public boolean exists(String playerId) {
        return getPlayer(playerId).isPresent();
    }
}
