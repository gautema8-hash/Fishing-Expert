package com.fishing.application.service;

import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * VIP系统应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VIPAppService {

    private final PlayerCacheService playerCacheService;

    /**
     * VIP等级配置（累计充值金额，单位：元）
     */
    private static final int[] VIP_THRESHOLDS = {0, 6, 30, 98, 198, 488, 988, 1988, 4888, 9888, 19888};

    /**
     * VIP特权配置
     */
    private static final Map<Integer, Map<String, Object>> VIP_PRIVILEGES = new HashMap<>();

    static {
        for (int i = 0; i <= 10; i++) {
            Map<String, Object> privilege = new HashMap<>();
            privilege.put("vipLevel", i);
            privilege.put("coinBonus", 1.0 + i * 0.05);          // 金币加成
            privilege.put("critBonus", i * 0.02);                // 暴击率加成
            privilege.put("dailyGift", i * 1000);                // 每日礼包金币
            privilege.put("exclusiveSkin", i >= 3);              // 专属炮台皮肤
            privilege.put("autoAim", i >= 5);                    // 自动瞄准
            privilege.put("customerService", i >= 8);            // 专属客服
            VIP_PRIVILEGES.put(i, privilege);
        }
    }

    /**
     * 获取玩家VIP信息
     */
    public Map<String, Object> getVIPInfo(String playerId) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        int vipLevel = player.getVipLevel();
        int totalRecharge = player.getTotalRecharge() != null ? player.getTotalRecharge().intValue() : 0;
        int nextThreshold = vipLevel < 10 ? VIP_THRESHOLDS[vipLevel + 1] : VIP_THRESHOLDS[10];
        int progress = vipLevel < 10 ? totalRecharge - VIP_THRESHOLDS[vipLevel] : 0;
        int needed = vipLevel < 10 ? nextThreshold - VIP_THRESHOLDS[vipLevel] : 0;

        Map<String, Object> result = new HashMap<>(16);
        result.put("vipLevel", vipLevel);
        result.put("totalRecharge", totalRecharge);
        result.put("nextLevel", vipLevel + 1);
        result.put("nextThreshold", nextThreshold);
        result.put("progress", progress);
        result.put("needed", needed);
        result.put("privileges", VIP_PRIVILEGES.get(vipLevel));
        result.put("allPrivileges", VIP_PRIVILEGES);
        return result;
    }

    /**
     * 充值后更新VIP等级
     */
    @Transactional(rollbackFor = Exception.class)
    public int updateVIPLevel(String playerId, int rechargeAmount) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        int currentTotal = player.getTotalRecharge() != null ? player.getTotalRecharge().intValue() : 0;
        int newTotal = currentTotal + rechargeAmount;
        player.setTotalRecharge(java.math.BigDecimal.valueOf(newTotal));

        // 计算新的VIP等级
        int newLevel = 0;
        for (int i = 10; i >= 0; i--) {
            if (newTotal >= VIP_THRESHOLDS[i]) {
                newLevel = i;
                break;
            }
        }

        if (newLevel > player.getVipLevel()) {
            player.setVipLevel(newLevel);
            log.info("VIP升级: playerId={}, oldLevel={}, newLevel={}", playerId, player.getVipLevel(), newLevel);
        }

        playerCacheService.updatePlayer(player);
        return newLevel;
    }

    /**
     * 领取每日VIP礼包
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> claimDailyGift(String playerId) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 检查是否已领取（简单实现，实际应记录日期）
        int giftCoins = player.getVipLevel() * 1000;
        if (giftCoins <= 0) {
            throw new BusinessException("VIP等级不足，无法领取");
        }

        player.addCoins(giftCoins);
        playerCacheService.updatePlayer(player);

        Map<String, Object> result = new HashMap<>(4);
        result.put("giftCoins", giftCoins);
        result.put("coins", player.getCoins());
        result.put("vipLevel", player.getVipLevel());
        return result;
    }

    /**
     * 获取VIP特权列表
     */
    public Map<Integer, Map<String, Object>> getAllVIPPrivileges() {
        return VIP_PRIVILEGES;
    }
}
