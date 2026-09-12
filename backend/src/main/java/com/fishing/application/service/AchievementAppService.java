package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.PlayerAchievementEntity;
import com.fishing.infrastructure.persistence.repository.PlayerAchievementMapper;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 成就系统应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementAppService {

    private final PlayerAchievementMapper achievementMapper;
    private final PlayerCacheService playerCacheService;

    /**
     * 成就配置（10项成就）
     */
    private static final Map<String, Map<String, Object>> ACHIEVEMENT_CONFIG = new HashMap<>();

    static {
        addAchievement("first_kill", "初出茅庐", "首次击杀鱼类", 1, 1000);
        addAchievement("kill_100", "百鱼斩", "累计击杀100条鱼", 100, 5000);
        addAchievement("kill_1000", "千鱼斩", "累计击杀1000条鱼", 1000, 20000);
        addAchievement("boss_killer", "屠龙勇士", "首次击杀BOSS", 1, 10000);
        addAchievement("rich_player", "龙宫富豪", "累计获得100万金币", 1000000, 50000);
        addAchievement("critic_master", "暴击大师", "累计暴击100次", 100, 5000);
        addAchievement("level_10", "闯关达人", "通关第10关", 10, 10000);
        addAchievement("vip_5", "VIP5达人", "VIP等级达到5级", 5, 20000);
        addAchievement("pet_collector", "宠物收藏家", "收集3只宠物", 3, 15000);
        addAchievement("old_player", "龙宫元老", "连续签到30天", 30, 30000);
    }

    private static void addAchievement(String id, String name, String desc, int target, int reward) {
        Map<String, Object> config = new HashMap<>();
        config.put("id", id);
        config.put("name", name);
        config.put("description", desc);
        config.put("target", target);
        config.put("rewardCoins", reward);
        ACHIEVEMENT_CONFIG.put(id, config);
    }

    /**
     * 获取玩家成就列表
     */
    public List<Map<String, Object>> getAchievementList(String playerId) {
        List<PlayerAchievementEntity> playerAchievements = achievementMapper.selectList(
                new LambdaQueryWrapper<PlayerAchievementEntity>()
                        .eq(PlayerAchievementEntity::getPlayerId, playerId)
        );

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : ACHIEVEMENT_CONFIG.entrySet()) {
            Map<String, Object> achievement = new HashMap<>(entry.getValue());
            PlayerAchievementEntity playerAch = playerAchievements.stream()
                    .filter(a -> a.getAchievementId().equals(entry.getKey()))
                    .findFirst().orElse(null);

            if (playerAch != null) {
                achievement.put("progress", playerAch.getProgress());
                achievement.put("isUnlocked", playerAch.getIsUnlocked());
                achievement.put("isClaimed", playerAch.getIsClaimed());
            } else {
                achievement.put("progress", 0);
                achievement.put("isUnlocked", false);
                achievement.put("isClaimed", false);
            }
            result.add(achievement);
        }
        return result;
    }

    /**
     * 更新成就进度
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateProgress(String playerId, String achievementId, int increment) {
        PlayerAchievementEntity achievement = achievementMapper.selectOne(
                new LambdaQueryWrapper<PlayerAchievementEntity>()
                        .eq(PlayerAchievementEntity::getPlayerId, playerId)
                        .eq(PlayerAchievementEntity::getAchievementId, achievementId)
        );

        Map<String, Object> config = ACHIEVEMENT_CONFIG.get(achievementId);
        if (config == null) return;

        int target = (int) config.get("target");

        if (achievement == null) {
            achievement = new PlayerAchievementEntity();
            achievement.setPlayerId(playerId);
            achievement.setAchievementId(achievementId);
            achievement.setProgress(Math.min(increment, target));
            achievement.setIsUnlocked(increment >= target);
            achievement.setIsClaimed(false);
            if (increment >= target) {
                achievement.setUnlockedAt(LocalDateTime.now());
            }
            achievementMapper.insert(achievement);
        } else {
            int newProgress = Math.min(achievement.getProgress() + increment, target);
            achievement.setProgress(newProgress);
            if (!Boolean.TRUE.equals(achievement.getIsUnlocked()) && newProgress >= target) {
                achievement.setIsUnlocked(true);
                achievement.setUnlockedAt(LocalDateTime.now());
                log.info("成就解锁: playerId={}, achievementId={}", playerId, achievementId);
            }
            achievementMapper.updateById(achievement);
        }
    }

    /**
     * 领取成就奖励
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> claimReward(String playerId, String achievementId) {
        PlayerAchievementEntity achievement = achievementMapper.selectOne(
                new LambdaQueryWrapper<PlayerAchievementEntity>()
                        .eq(PlayerAchievementEntity::getPlayerId, playerId)
                        .eq(PlayerAchievementEntity::getAchievementId, achievementId)
        );

        if (achievement == null || !Boolean.TRUE.equals(achievement.getIsUnlocked())) {
            throw new BusinessException("成就未解锁");
        }
        if (Boolean.TRUE.equals(achievement.getIsClaimed())) {
            throw new BusinessException(ResultCode.ALREADY_CLAIMED);
        }

        Map<String, Object> config = ACHIEVEMENT_CONFIG.get(achievementId);
        int rewardCoins = (int) config.get("rewardCoins");

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));
        player.addCoins(rewardCoins);
        playerCacheService.updatePlayer(player);

        achievement.setIsClaimed(true);
        achievement.setClaimedAt(LocalDateTime.now());
        achievementMapper.updateById(achievement);

        Map<String, Object> result = new HashMap<>(4);
        result.put("rewardCoins", rewardCoins);
        result.put("coins", player.getCoins());
        return result;
    }

    /**
     * 获取成就统计
     */
    public Map<String, Object> getAchievementStats(String playerId) {
        List<PlayerAchievementEntity> achievements = achievementMapper.selectList(
                new LambdaQueryWrapper<PlayerAchievementEntity>()
                        .eq(PlayerAchievementEntity::getPlayerId, playerId)
        );

        long unlocked = achievements.stream().filter(a -> Boolean.TRUE.equals(a.getIsUnlocked())).count();
        long claimed = achievements.stream().filter(a -> Boolean.TRUE.equals(a.getIsClaimed())).count();

        Map<String, Object> stats = new HashMap<>(8);
        stats.put("total", ACHIEVEMENT_CONFIG.size());
        stats.put("unlocked", unlocked);
        stats.put("claimed", claimed);
        stats.put("completionRate", (unlocked * 100) / ACHIEVEMENT_CONFIG.size());
        return stats;
    }
}
