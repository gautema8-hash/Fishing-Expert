package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.PlayerSeasonEntity;
import com.fishing.infrastructure.persistence.entity.SeasonEntity;
import com.fishing.infrastructure.persistence.repository.PlayerSeasonMapper;
import com.fishing.infrastructure.persistence.repository.SeasonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * 赛季应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeasonAppService {

    private final SeasonMapper seasonMapper;
    private final PlayerSeasonMapper playerSeasonMapper;
    private final PlayerRepository playerRepository;

    /**
     * 获取当前赛季信息
     */
    public Map<String, Object> getCurrentSeason(String playerId) {
        SeasonEntity season = seasonMapper.selectOne(
                new LambdaQueryWrapper<SeasonEntity>().eq(SeasonEntity::getIsActive, true)
        );
        if (season == null) {
            throw new BusinessException("当前没有活跃赛季");
        }

        PlayerSeasonEntity playerSeason = playerSeasonMapper.selectOne(
                new LambdaQueryWrapper<PlayerSeasonEntity>()
                        .eq(PlayerSeasonEntity::getPlayerId, playerId)
                        .eq(PlayerSeasonEntity::getSeasonId, season.getSeasonId())
        );

        Map<String, Object> result = new HashMap<>(8);
        result.put("seasonId", season.getSeasonId());
        result.put("seasonName", season.getSeasonName());
        result.put("maxLevel", season.getMaxLevel());
        result.put("startDate", season.getStartDate());
        result.put("endDate", season.getEndDate());

        if (playerSeason != null) {
            result.put("level", playerSeason.getSeasonLevel());
            result.put("xp", playerSeason.getSeasonXp());
            result.put("totalXp", playerSeason.getTotalXp());
            result.put("isPremium", playerSeason.getIsPremium());
            result.put("dailyXp", playerSeason.getDailyXp());
        } else {
            result.put("level", 1);
            result.put("xp", 0);
            result.put("totalXp", 0);
            result.put("isPremium", false);
            result.put("dailyXp", 0);
        }
        return result;
    }

    /**
     * 增加赛季经验
     */
    @Transactional(rollbackFor = Exception.class)
    public void addSeasonXp(String playerId, int xp) {
        SeasonEntity season = seasonMapper.selectOne(
                new LambdaQueryWrapper<SeasonEntity>().eq(SeasonEntity::getIsActive, true)
        );
        if (season == null) {
            return;
        }

        PlayerSeasonEntity playerSeason = playerSeasonMapper.selectOne(
                new LambdaQueryWrapper<PlayerSeasonEntity>()
                        .eq(PlayerSeasonEntity::getPlayerId, playerId)
                        .eq(PlayerSeasonEntity::getSeasonId, season.getSeasonId())
        );

        if (playerSeason == null) {
            playerSeason = new PlayerSeasonEntity();
            playerSeason.setPlayerId(playerId);
            playerSeason.setSeasonId(season.getSeasonId());
            playerSeason.setSeasonLevel(1);
            playerSeason.setSeasonXp(0);
            playerSeason.setTotalXp(0L);
            playerSeason.setIsPremium(false);
            playerSeason.setDailyXp(0);
            playerSeason.setLastDailyReset(LocalDate.now());
            playerSeasonMapper.insert(playerSeason);
        }

        // 每日经验上限500
        int dailyLimit = 500;
        int actualXp = Math.min(xp, dailyLimit - playerSeason.getDailyXp());
        if (actualXp <= 0) {
            return;
        }

        playerSeason.setSeasonXp(playerSeason.getSeasonXp() + actualXp);
        playerSeason.setTotalXp(playerSeason.getTotalXp() + actualXp);
        playerSeason.setDailyXp(playerSeason.getDailyXp() + actualXp);

        // 升级逻辑：每100经验升一级
        int xpPerLevel = 100;
        while (playerSeason.getSeasonXp() >= xpPerLevel && playerSeason.getSeasonLevel() < season.getMaxLevel()) {
            playerSeason.setSeasonXp(playerSeason.getSeasonXp() - xpPerLevel);
            playerSeason.setSeasonLevel(playerSeason.getSeasonLevel() + 1);
        }

        playerSeasonMapper.updateById(playerSeason);
    }

    /**
     * 购买高级通行证
     */
    @Transactional(rollbackFor = Exception.class)
    public void buyPremium(String playerId) {
        SeasonEntity season = seasonMapper.selectOne(
                new LambdaQueryWrapper<SeasonEntity>().eq(SeasonEntity::getIsActive, true)
        );
        if (season == null) {
            throw new BusinessException("当前没有活跃赛季");
        }

        Player player = playerRepository.findByPlayerId(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        if (!player.spendDiamonds(680)) {
            throw new BusinessException(ResultCode.DIAMONDS_INSUFFICIENT);
        }
        playerRepository.update(player);

        PlayerSeasonEntity playerSeason = playerSeasonMapper.selectOne(
                new LambdaQueryWrapper<PlayerSeasonEntity>()
                        .eq(PlayerSeasonEntity::getPlayerId, playerId)
                        .eq(PlayerSeasonEntity::getSeasonId, season.getSeasonId())
        );
        if (playerSeason == null) {
            playerSeason = new PlayerSeasonEntity();
            playerSeason.setPlayerId(playerId);
            playerSeason.setSeasonId(season.getSeasonId());
            playerSeason.setSeasonLevel(1);
            playerSeason.setSeasonXp(0);
            playerSeason.setTotalXp(0L);
            playerSeason.setDailyXp(0);
            playerSeason.setLastDailyReset(LocalDate.now());
            playerSeasonMapper.insert(playerSeason);
        }
        playerSeason.setIsPremium(true);
        playerSeasonMapper.updateById(playerSeason);
    }
}
