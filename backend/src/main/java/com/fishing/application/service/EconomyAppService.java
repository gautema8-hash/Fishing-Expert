package com.fishing.application.service;

import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.util.PlayerCacheService;
import com.fishing.infrastructure.util.RedisLockUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * 经济应用服务 - 金币/钻石/道具操作
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EconomyAppService {

    private final PlayerRepository playerRepository;
    private final PlayerCacheService playerCacheService;
    private final RedisLockUtil redisLockUtil;
    private final AntiCheatService antiCheatService;

    private static final long LOCK_TIMEOUT = 5000;
    private static final int LOCK_RETRY = 3;
    private static final long LOCK_RETRY_INTERVAL = 100;

    /**
     * 消耗金币（发射炮弹）
     *
     * @param playerId 玩家ID
     * @param amount   数量
     * @return 操作结果
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> spendCoins(String playerId, long amount) {
        // 反作弊校验
        Map<String, Object> cheatCheck = antiCheatService.validateCoinSpend(playerId, amount);
        if (!Boolean.TRUE.equals(cheatCheck.get("allowed"))) {
            throw new BusinessException("操作异常: " + cheatCheck.get("reason"));
        }

        String lockKey = "economy:" + playerId;
        String requestId = redisLockUtil.tryLockWithRetry(lockKey, LOCK_TIMEOUT, LOCK_RETRY, LOCK_RETRY_INTERVAL);
        if (requestId == null) {
            throw new BusinessException("系统繁忙，请稍后再试");
        }
        try {
            Player player = playerCacheService.getPlayer(playerId)
                    .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

            if (!player.spendCoins(amount)) {
                throw new BusinessException(ResultCode.COINS_INSUFFICIENT);
            }

            player.addBullet();
            playerCacheService.updatePlayer(player);

            Map<String, Object> result = new HashMap<>(4);
            result.put("coins", player.getCoins());
            result.put("success", true);
            return result;
        } finally {
            redisLockUtil.unlock(lockKey, requestId);
        }
    }

    /**
     * 增加金币（击杀鱼类）
     *
     * @param playerId 玩家ID
     * @param amount   数量
     * @param isCrit   是否暴击
     * @return 操作结果
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> addCoins(String playerId, long amount, boolean isCrit) {
        // 反作弊校验
        Map<String, Object> cheatCheck = antiCheatService.validateCoinGain(playerId, amount);
        if (!Boolean.TRUE.equals(cheatCheck.get("allowed"))) {
            throw new BusinessException("操作异常: " + cheatCheck.get("reason"));
        }

        String lockKey = "economy:" + playerId;
        String requestId = redisLockUtil.tryLockWithRetry(lockKey, LOCK_TIMEOUT, LOCK_RETRY, LOCK_RETRY_INTERVAL);
        if (requestId == null) {
            throw new BusinessException("系统繁忙，请稍后再试");
        }
        try {
            Player player = playerCacheService.getPlayer(playerId)
                    .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

            // 暴击双倍
            long finalAmount = isCrit ? amount * 2 : amount;
            player.addCoins(finalAmount);
            player.addKill(isCrit);

            // 新手保护
            if (player.hasNewbieProtection()) {
                player.consumeNewbieProtection();
            }

            playerCacheService.updatePlayer(player);

            Map<String, Object> result = new HashMap<>(4);
            result.put("coins", player.getCoins());
            result.put("earned", finalAmount);
            result.put("isCrit", isCrit);
            return result;
        } finally {
            redisLockUtil.unlock(lockKey, requestId);
        }
    }

    /**
     * 增加钻石
     *
     * @param playerId 玩家ID
     * @param amount   数量
     */
    @Transactional(rollbackFor = Exception.class)
    public void addDiamonds(String playerId, int amount) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        player.addDiamonds(amount);
        playerCacheService.updatePlayer(player);
    }

    /**
     * 消耗钻石
     *
     * @param playerId 玩家ID
     * @param amount   数量
     */
    @Transactional(rollbackFor = Exception.class)
    public void spendDiamonds(String playerId, int amount) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        if (!player.spendDiamonds(amount)) {
            throw new BusinessException(ResultCode.DIAMONDS_INSUFFICIENT);
        }
        playerCacheService.updatePlayer(player);
    }

    /**
     * 获取玩家经济信息
     *
     * @param playerId 玩家ID
     * @return 经济信息
     */
    public Map<String, Object> getEconomyInfo(String playerId) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        Map<String, Object> result = new HashMap<>(8);
        result.put("coins", player.getCoins());
        result.put("diamonds", player.getDiamonds());
        result.put("energy", player.getEnergy());
        result.put("vipLevel", player.getVipLevel());
        result.put("level", player.getLevel());
        result.put("cannonLevel", player.getCannonLevel());
        result.put("cannonSkin", player.getCannonSkin());
        return result;
    }
}
