package com.fishing.application.service;

import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.SignInRecordEntity;
import com.fishing.infrastructure.persistence.repository.SignInRecordMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * 签到应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SignInAppService {

    private final SignInRecordMapper signInRecordMapper;
    private final PlayerRepository playerRepository;

    /**
     * 每日签到
     *
     * @param playerId 玩家ID
     * @return 签到结果
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> signIn(String playerId) {
        Player player = playerRepository.findByPlayerId(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        LocalDate today = LocalDate.now();

        // 检查今日是否已签到
        SignInRecordEntity existing = signInRecordMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SignInRecordEntity>()
                        .eq(SignInRecordEntity::getPlayerId, playerId)
                        .eq(SignInRecordEntity::getSignDate, today)
        );
        if (existing != null) {
            throw new BusinessException(ResultCode.ALREADY_CLAIMED);
        }

        // 计算连续签到天数
        int consecutiveDays = 1;
        SignInRecordEntity yesterday = signInRecordMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SignInRecordEntity>()
                        .eq(SignInRecordEntity::getPlayerId, playerId)
                        .eq(SignInRecordEntity::getSignDate, today.minusDays(1))
        );
        if (yesterday != null) {
            consecutiveDays = yesterday.getConsecutiveDays() + 1;
        }

        // 签到奖励（连续天数递增）
        int rewardCoins = 1000 * Math.min(consecutiveDays, 7);

        // 保存签到记录
        SignInRecordEntity record = new SignInRecordEntity();
        record.setPlayerId(playerId);
        record.setSignDate(today);
        record.setConsecutiveDays(consecutiveDays);
        record.setRewardJson("{\"coins\":" + rewardCoins + "}");
        record.setCreatedAt(java.time.LocalDateTime.now());
        signInRecordMapper.insert(record);

        // 增加金币
        player.addCoins(rewardCoins);
        player.setConsecutiveDays(consecutiveDays);
        playerRepository.update(player);

        Map<String, Object> result = new HashMap<>(4);
        result.put("consecutiveDays", consecutiveDays);
        result.put("rewardCoins", rewardCoins);
        result.put("coins", player.getCoins());
        return result;
    }

    /**
     * 获取签到状态
     */
    public Map<String, Object> getSignInStatus(String playerId) {
        LocalDate today = LocalDate.now();
        SignInRecordEntity todayRecord = signInRecordMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<SignInRecordEntity>()
                        .eq(SignInRecordEntity::getPlayerId, playerId)
                        .eq(SignInRecordEntity::getSignDate, today)
        );

        Map<String, Object> result = new HashMap<>(4);
        result.put("signedToday", todayRecord != null);
        result.put("consecutiveDays", todayRecord != null ? todayRecord.getConsecutiveDays() : 0);
        return result;
    }
}
