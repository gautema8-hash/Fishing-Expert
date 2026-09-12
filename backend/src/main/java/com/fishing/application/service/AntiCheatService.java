package com.fishing.application.service;

import com.fishing.common.exception.BusinessException;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 反作弊风控服务
 * 负责异常行为检测、服务端数值校验、自动封号
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AntiCheatService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final PlayerCacheService playerCacheService;

    private static final String RISK_PREFIX = "fishing:risk:";
    private static final String CHEAT_DETECT_PREFIX = "fishing:cheat:";

    /**
     * 风控阈值配置
     */
    private static final long MAX_COINS_PER_MINUTE = 500000;      // 每分钟最大获得金币
    private static final long MAX_SPEND_PER_SECOND = 100000;      // 每秒最大消耗金币
    private static final int MAX_BULLETS_PER_SECOND = 30;         // 每秒最大发射炮弹数
    private static final int MAX_KILLS_PER_MINUTE = 200;          // 每分钟最大击杀数
    private static final int RISK_THRESHOLD = 80;                 // 风险分阈值（超过则封号）

    /**
     * 校验金币获得操作
     *
     * @param playerId 玩家ID
     * @param amount   获得金币数量
     * @return 校验结果
     */
    public Map<String, Object> validateCoinGain(String playerId, long amount) {
        Map<String, Object> result = new HashMap<>(8);
        result.put("allowed", true);
        result.put("riskScore", 0);

        // 1. 检查单次获得金币是否异常
        if (amount > MAX_COINS_PER_MINUTE) {
            result.put("allowed", false);
            result.put("reason", "单次获得金币异常");
            result.put("riskScore", 100);
            log.warn("反作弊: 单次金币异常 playerId={}, amount={}", playerId, amount);
            incrementRiskScore(playerId, 30);
            return result;
        }

        // 2. 检查频率（每分钟获得金币总量）
        String minuteKey = CHEAT_DETECT_PREFIX + "coin_gain:" + playerId + ":" + getMinuteKey();
        try {
            Long total = redisTemplate.opsForValue().increment(minuteKey, amount);
            redisTemplate.expire(minuteKey, 2, TimeUnit.MINUTES);
            if (total != null && total > MAX_COINS_PER_MINUTE) {
                result.put("allowed", false);
                result.put("reason", "短时间内获得金币过多");
                result.put("riskScore", 60);
                log.warn("反作弊: 分钟金币超限 playerId={}, total={}", playerId, total);
                incrementRiskScore(playerId, 20);
            }
        } catch (Exception e) {
            log.warn("反作弊Redis检查异常: {}", e.getMessage());
        }

        // 3. 检查击杀频率
        String killKey = CHEAT_DETECT_PREFIX + "kills:" + playerId + ":" + getMinuteKey();
        try {
            Long kills = redisTemplate.opsForValue().increment(killKey);
            redisTemplate.expire(killKey, 2, TimeUnit.MINUTES);
            if (kills != null && kills > MAX_KILLS_PER_MINUTE) {
                result.put("allowed", false);
                result.put("reason", "击杀频率异常");
                result.put("riskScore", 50);
                log.warn("反作弊: 击杀频率异常 playerId={}, kills={}", playerId, kills);
                incrementRiskScore(playerId, 15);
            }
        } catch (Exception e) {
            log.warn("反作弊击杀检查异常: {}", e.getMessage());
        }

        return result;
    }

    /**
     * 校验金币消耗操作（发射炮弹）
     */
    public Map<String, Object> validateCoinSpend(String playerId, long amount) {
        Map<String, Object> result = new HashMap<>(8);
        result.put("allowed", true);

        // 检查每秒发射频率
        String secondKey = CHEAT_DETECT_PREFIX + "bullets:" + playerId + ":" + getSecondKey();
        try {
            Long bullets = redisTemplate.opsForValue().increment(secondKey);
            redisTemplate.expire(secondKey, 2, TimeUnit.SECONDS);
            if (bullets != null && bullets > MAX_BULLETS_PER_SECOND) {
                result.put("allowed", false);
                result.put("reason", "发射频率异常");
                log.warn("反作弊: 发射频率异常 playerId={}, bullets={}", playerId, bullets);
                incrementRiskScore(playerId, 10);
            }
        } catch (Exception e) {
            log.warn("反作弊发射检查异常: {}", e.getMessage());
        }

        return result;
    }

    /**
     * 增加玩家风险分
     */
    public void incrementRiskScore(String playerId, int score) {
        String key = RISK_PREFIX + "score:" + playerId;
        try {
            Long total = redisTemplate.opsForValue().increment(key, score);
            redisTemplate.expire(key, 24, TimeUnit.HOURS);

            if (total != null && total >= RISK_THRESHOLD) {
                log.warn("反作弊: 风险分达标，自动封号 playerId={}, score={}", playerId, total);
                autoBanPlayer(playerId, "系统检测到异常行为");
            }
        } catch (Exception e) {
            log.error("风险分更新失败: {}", e.getMessage());
        }
    }

    /**
     * 获取玩家风险分
     */
    public int getRiskScore(String playerId) {
        String key = RISK_PREFIX + "score:" + playerId;
        try {
            Object score = redisTemplate.opsForValue().get(key);
            return score != null ? Integer.parseInt(score.toString()) : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * 自动封号
     */
    @Transactional(rollbackFor = Exception.class)
    public void autoBanPlayer(String playerId, String reason) {
        Player player = playerCacheService.getPlayer(playerId).orElse(null);
        if (player == null) {
            return;
        }
        player.setStatus(2); // 封禁
        playerCacheService.updatePlayer(player);
        log.error("玩家被自动封号: playerId={}, reason={}", playerId, reason);

        // 记录封号日志
        String banKey = RISK_PREFIX + "ban:" + playerId;
        Map<String, Object> banInfo = new HashMap<>();
        banInfo.put("playerId", playerId);
        banInfo.put("reason", reason);
        banInfo.put("time", LocalDateTime.now().toString());
        banInfo.put("riskScore", getRiskScore(playerId));
        try {
            redisTemplate.opsForValue().set(banKey, banInfo, 7, TimeUnit.DAYS);
        } catch (Exception e) {
            log.error("封号记录失败: {}", e.getMessage());
        }
    }

    /**
     * 手动解封
     */
    @Transactional(rollbackFor = Exception.class)
    public void unbanPlayer(String playerId) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException("玩家不存在"));
        player.setStatus(1);
        playerCacheService.updatePlayer(player);

        // 清除风险分
        String key = RISK_PREFIX + "score:" + playerId;
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.error("清除风险分失败: {}", e.getMessage());
        }
        log.info("玩家解封: playerId={}", playerId);
    }

    /**
     * 获取风控统计
     */
    public Map<String, Object> getRiskStats(String playerId) {
        Map<String, Object> stats = new HashMap<>(8);
        stats.put("playerId", playerId);
        stats.put("riskScore", getRiskScore(playerId));
        stats.put("riskLevel", calculateRiskLevel(getRiskScore(playerId)));
        stats.put("threshold", RISK_THRESHOLD);

        Player player = playerCacheService.getPlayer(playerId).orElse(null);
        if (player != null) {
            stats.put("status", player.getStatus());
            stats.put("statusName", player.getStatus() == 1 ? "正常" : player.getStatus() == 2 ? "已封禁" : "已注销");
        }
        return stats;
    }

    /**
     * 计算风险等级
     */
    private String calculateRiskLevel(int score) {
        if (score < 30) return "低风险";
        if (score < 60) return "中风险";
        if (score < 80) return "高风险";
        return "极高风险";
    }

    /**
     * 获取分钟级key
     */
    private String getMinuteKey() {
        return LocalDateTime.now().withSecond(0).withNano(0).toString();
    }

    /**
     * 获取秒级key
     */
    private String getSecondKey() {
        return LocalDateTime.now().withNano(0).toString();
    }
}
