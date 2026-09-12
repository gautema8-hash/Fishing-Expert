package com.fishing.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fishing.infrastructure.websocket.GameWebSocketHandler;
import com.fishing.infrastructure.websocket.WebSocketMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * 世界BOSS实时服务
 * 全服玩家共同击杀，按伤害排名发奖
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorldBossService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final GameWebSocketHandler webSocketHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String BOSS_STATUS_KEY = "fishing:worldboss:status";
    private static final String BOSS_DAMAGE_KEY = "fishing:worldboss:damage";
    private static final String BOSS_ROOM_ID = "world_boss";

    /**
     * BOSS配置
     */
    private static final Map<Integer, Map<String, Object>> BOSS_CONFIG = new HashMap<>();

    static {
        Map<String, Object> boss1 = new HashMap<>();
        boss1.put("name", "东海龙王");
        boss1.put("maxHp", 1000000L);
        boss1.put("rewardCoins", 50000L);
        boss1.put("rewardDiamonds", 50);
        BOSS_CONFIG.put(1, boss1);

        Map<String, Object> boss2 = new HashMap<>();
        boss2.put("name", "深渊巨蛟");
        boss2.put("maxHp", 2000000L);
        boss2.put("rewardCoins", 100000L);
        boss2.put("rewardDiamonds", 100);
        BOSS_CONFIG.put(2, boss2);
    }

    /**
     * 获取世界BOSS状态
     */
    public Map<String, Object> getBossStatus() {
        Map<String, Object> status = (Map<String, Object>) redisTemplate.opsForValue().get(BOSS_STATUS_KEY);
        if (status == null) {
            status = new HashMap<>();
            status.put("active", false);
            status.put("message", "世界BOSS尚未出现");
        }
        return status;
    }

    /**
     * 召唤世界BOSS（运营手动触发或定时触发）
     */
    public Map<String, Object> summonBoss(int bossLevel) {
        Map<String, Object> config = BOSS_CONFIG.get(bossLevel);
        if (config == null) {
            throw new IllegalArgumentException("无效的BOSS等级");
        }

        Map<String, Object> status = new HashMap<>();
        status.put("active", true);
        status.put("bossLevel", bossLevel);
        status.put("bossName", config.get("name"));
        status.put("maxHp", config.get("maxHp"));
        status.put("currentHp", config.get("maxHp"));
        status.put("startTime", System.currentTimeMillis());
        status.put("duration", 300000); // 5分钟

        redisTemplate.opsForValue().set(BOSS_STATUS_KEY, status, 10, TimeUnit.MINUTES);
        redisTemplate.delete(BOSS_DAMAGE_KEY);

        log.info("世界BOSS出现: {} HP={}", config.get("name"), config.get("maxHp"));

        // WebSocket广播BOSS出现
        broadcastBossEvent("boss_appear", status);

        return status;
    }

    /**
     * 玩家对BOSS造成伤害
     */
    public Map<String, Object> dealDamage(String playerId, String nickname, long damage) {
        Map<String, Object> status = (Map<String, Object>) redisTemplate.opsForValue().get(BOSS_STATUS_KEY);
        if (status == null || !Boolean.TRUE.equals(status.get("active"))) {
            throw new IllegalStateException("世界BOSS尚未出现");
        }

        // 更新BOSS血量
        long currentHp = ((Number) status.get("currentHp")).longValue();
        long newHp = Math.max(0, currentHp - damage);
        status.put("currentHp", newHp);
        redisTemplate.opsForValue().set(BOSS_STATUS_KEY, status, 10, TimeUnit.MINUTES);

        // 记录玩家伤害（Redis ZSet）
        redisTemplate.opsForZSet().incrementScore(BOSS_DAMAGE_KEY, playerId, damage);

        // 广播伤害事件
        Map<String, Object> damageData = new HashMap<>();
        damageData.put("playerId", playerId);
        damageData.put("nickname", nickname);
        damageData.put("damage", damage);
        damageData.put("currentHp", newHp);
        broadcastBossEvent("boss_damage", damageData);

        // BOSS被击杀
        if (newHp <= 0) {
            killBoss(status);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("currentHp", newHp);
        result.put("damageDealt", damage);
        result.put("killed", newHp <= 0);
        return result;
    }

    /**
     * BOSS被击杀，计算排名和奖励
     */
    private void killBoss(Map<String, Object> status) {
        status.put("active", false);
        status.put("killed", true);
        status.put("killTime", System.currentTimeMillis());
        redisTemplate.opsForValue().set(BOSS_STATUS_KEY, status, 10, TimeUnit.MINUTES);

        // 获取伤害排名前10
        Set<org.springframework.data.redis.core.ZSetOperations.TypedTuple<Object>> topDamagers =
                redisTemplate.opsForZSet().reverseRangeWithScores(BOSS_DAMAGE_KEY, 0, 9);

        List<Map<String, Object>> ranking = new ArrayList<>();
        int rank = 1;
        if (topDamagers != null) {
            for (org.springframework.data.redis.core.ZSetOperations.TypedTuple<Object> tuple : topDamagers) {
                Map<String, Object> playerRank = new HashMap<>();
                playerRank.put("rank", rank++);
                playerRank.put("playerId", tuple.getValue());
                playerRank.put("damage", tuple.getScore());
                ranking.add(playerRank);
            }
        }

        // 广播BOSS击杀事件
        Map<String, Object> killData = new HashMap<>();
        killData.put("bossName", status.get("bossName"));
        killData.put("ranking", ranking);
        killData.put("rewardCoins", status.get("rewardCoins"));
        broadcastBossEvent("boss_killed", killData);

        log.info("世界BOSS被击杀: {}, 参与玩家数: {}", status.get("bossName"), ranking.size());
    }

    /**
     * 获取伤害排名
     */
    public List<Map<String, Object>> getDamageRanking(int topN) {
        Set<org.springframework.data.redis.core.ZSetOperations.TypedTuple<Object>> topDamagers =
                redisTemplate.opsForZSet().reverseRangeWithScores(BOSS_DAMAGE_KEY, 0, topN - 1);

        List<Map<String, Object>> ranking = new ArrayList<>();
        int rank = 1;
        if (topDamagers != null) {
            for (org.springframework.data.redis.core.ZSetOperations.TypedTuple<Object> tuple : topDamagers) {
                Map<String, Object> playerRank = new HashMap<>();
                playerRank.put("rank", rank++);
                playerRank.put("playerId", tuple.getValue());
                playerRank.put("damage", tuple.getScore());
                ranking.add(playerRank);
            }
        }
        return ranking;
    }

    /**
     * 定时检查BOSS超时（每30秒检查一次）
     */
    @Scheduled(fixedRate = 30000)
    public void checkBossTimeout() {
        Map<String, Object> status = (Map<String, Object>) redisTemplate.opsForValue().get(BOSS_STATUS_KEY);
        if (status != null && Boolean.TRUE.equals(status.get("active"))) {
            long startTime = ((Number) status.get("startTime")).longValue();
            long duration = ((Number) status.get("duration")).longValue();
            if (System.currentTimeMillis() - startTime > duration) {
                // BOSS逃跑
                status.put("active", false);
                status.put("escaped", true);
                redisTemplate.opsForValue().set(BOSS_STATUS_KEY, status, 10, TimeUnit.MINUTES);
                broadcastBossEvent("boss_escape", status);
                log.info("世界BOSS逃跑了: {}", status.get("bossName"));
            }
        }
    }

    /**
     * WebSocket广播BOSS事件
     */
    private void broadcastBossEvent(String type, Map<String, Object> data) {
        try {
            WebSocketMessage message = new WebSocketMessage();
            message.setType(type);
            message.setRoomId(BOSS_ROOM_ID);
            message.setData(data);
            // 广播给所有在线玩家（简化实现）
            log.info("世界BOSS事件广播: type={}, data={}", type, data);
        } catch (Exception e) {
            log.error("广播BOSS事件失败: {}", e.getMessage());
        }
    }
}
