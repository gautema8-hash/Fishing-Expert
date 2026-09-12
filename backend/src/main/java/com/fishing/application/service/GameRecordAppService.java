package com.fishing.application.service;

import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.GameRecordEntity;
import com.fishing.infrastructure.persistence.repository.GameRecordMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 游戏记录应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GameRecordAppService {

    private final GameRecordMapper gameRecordMapper;
    private final PlayerRepository playerRepository;

    /**
     * 保存游戏记录
     *
     * @param playerId    玩家ID
     * @param gameType    游戏类型
     * @param level       关卡
     * @param kills       击杀数
     * @param bossKills   BOSS击杀数
     * @param bulletsFired 发射炮弹数
     * @param critCount   暴击数
     * @param coinsEarned 获得金币
     * @param coinsSpent  消耗金币
     * @param duration    时长（秒）
     * @param score       得分
     * @param stars       星级
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveGameRecord(String playerId, String gameType, Integer level,
                               Integer kills, Integer bossKills, Integer bulletsFired,
                               Integer critCount, Long coinsEarned, Long coinsSpent,
                               Integer duration, Long score, Integer stars) {
        Player player = playerRepository.findByPlayerId(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 保存游戏记录
        GameRecordEntity record = new GameRecordEntity();
        record.setPlayerId(playerId);
        record.setGameType(gameType != null ? gameType : "normal");
        record.setLevel(level);
        record.setKills(kills);
        record.setBossKills(bossKills);
        record.setBulletsFired(bulletsFired);
        record.setCritCount(critCount);
        record.setCoinsEarned(coinsEarned);
        record.setCoinsSpent(coinsSpent);
        record.setDuration(duration);
        record.setScore(score);
        record.setStars(stars);
        record.setCreatedAt(LocalDateTime.now());
        gameRecordMapper.insert(record);

        // 更新玩家统计
        player.setPlayCount(player.getPlayCount() + 1);
        if (level > player.getHighestLevel()) {
            player.setHighestLevel(level);
        }
        playerRepository.update(player);

        log.info("游戏记录保存成功: playerId={}, level={}, score={}", playerId, level, score);
    }
}
