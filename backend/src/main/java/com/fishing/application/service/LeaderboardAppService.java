package com.fishing.application.service;

import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 排行榜应用服务 - 基于Redis ZSet
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardAppService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final PlayerCacheService playerCacheService;

    private static final String RANK_PREFIX = "fishing:rank:";
    private static final long RANK_EXPIRE_HOURS = 24;

    /**
     * 排行榜类型
     */
    public enum RankType {
        COINS("coins", "金币榜"),
        KILLS("kills", "击杀榜"),
        LEVEL("level", "关卡榜"),
        WEEKLY_COINS("weekly_coins", "周金币榜");

        private final String code;
        private final String name;

        RankType(String code, String name) {
            this.code = code;
            this.name = name;
        }

        public String getCode() { return code; }
        public String getName() { return name; }
    }

    /**
     * 更新玩家分数
     *
     * @param playerId 玩家ID
     * @param type     排行榜类型
     * @param score    分数
     */
    public void updateScore(String playerId, RankType type, double score) {
        String key = RANK_PREFIX + type.getCode();
        try {
            redisTemplate.opsForZSet().add(key, playerId, score);
            redisTemplate.expire(key, RANK_EXPIRE_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("排行榜更新失败: type={}, playerId={}", type, playerId, e);
        }
    }

    /**
     * 增加玩家分数
     */
    public void incrementScore(String playerId, RankType type, double delta) {
        String key = RANK_PREFIX + type.getCode();
        try {
            redisTemplate.opsForZSet().incrementScore(key, playerId, delta);
            redisTemplate.expire(key, RANK_EXPIRE_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("排行榜分数增加失败: type={}, playerId={}", type, playerId, e);
        }
    }

    /**
     * 获取排行榜（前N名）
     *
     * @param type  排行榜类型
     * @param limit 数量
     * @return 排行榜列表
     */
    public List<Map<String, Object>> getLeaderboard(RankType type, int limit) {
        String key = RANK_PREFIX + type.getCode();
        List<Map<String, Object>> result = new ArrayList<>();

        try {
            Set<ZSetOperations.TypedTuple<Object>> tuples = redisTemplate.opsForZSet()
                    .reverseRangeWithScores(key, 0, Math.min(limit, 100) - 1);

            if (tuples != null) {
                int rank = 1;
                for (ZSetOperations.TypedTuple<Object> tuple : tuples) {
                    String playerId = (String) tuple.getValue();
                    Double score = tuple.getScore();

                    Map<String, Object> item = new HashMap<>(8);
                    item.put("rank", rank);
                    item.put("playerId", playerId);
                    item.put("score", score != null ? score.longValue() : 0);

                    // 获取玩家昵称（带缓存）
                    try {
                        Optional<Player> player = playerCacheService.getPlayer(playerId);
                        player.ifPresent(p -> {
                            item.put("nickname", p.getNickname());
                            item.put("avatar", p.getAvatar());
                            item.put("level", p.getLevel());
                            item.put("vipLevel", p.getVipLevel());
                        });
                    } catch (Exception e) {
                        item.put("nickname", "神秘玩家");
                    }

                    result.add(item);
                    rank++;
                }
            }
        } catch (Exception e) {
            log.error("获取排行榜失败: type={}", type, e);
        }

        return result;
    }

    /**
     * 获取玩家排名
     *
     * @param playerId 玩家ID
     * @param type     排行榜类型
     * @return 排名信息
     */
    public Map<String, Object> getPlayerRank(String playerId, RankType type) {
        String key = RANK_PREFIX + type.getCode();
        Map<String, Object> result = new HashMap<>(8);

        try {
            Long rank = redisTemplate.opsForZSet().reverseRank(key, playerId);
            Double score = redisTemplate.opsForZSet().score(key, playerId);

            result.put("playerId", playerId);
            result.put("rank", rank != null ? rank + 1 : -1);
            result.put("score", score != null ? score.longValue() : 0);
            result.put("type", type.getCode());
            result.put("typeName", type.getName());
        } catch (Exception e) {
            log.error("获取玩家排名失败: playerId={}, type={}", playerId, type, e);
            result.put("rank", -1);
            result.put("score", 0);
        }

        return result;
    }

    /**
     * 同步玩家数据到排行榜
     */
    public void syncPlayerToLeaderboard(String playerId) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        updateScore(playerId, RankType.COINS, player.getCoins());
        updateScore(playerId, RankType.KILLS, player.getTotalKills());
        updateScore(playerId, RankType.LEVEL, player.getHighestLevel());
    }

    /**
     * 清除排行榜
     */
    public void clearLeaderboard(RankType type) {
        String key = RANK_PREFIX + type.getCode();
        try {
            redisTemplate.delete(key);
            log.info("排行榜已清除: type={}", type);
        } catch (Exception e) {
            log.error("清除排行榜失败: type={}", type, e);
        }
    }
}
