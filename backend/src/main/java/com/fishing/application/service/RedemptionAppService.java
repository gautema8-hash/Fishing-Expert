package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.RedemptionCodeEntity;
import com.fishing.infrastructure.persistence.entity.RedemptionRecordEntity;
import com.fishing.infrastructure.persistence.repository.RedemptionCodeMapper;
import com.fishing.infrastructure.persistence.repository.RedemptionRecordMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 兑换码应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedemptionAppService {

    private final RedemptionCodeMapper redemptionCodeMapper;
    private final RedemptionRecordMapper redemptionRecordMapper;
    private final PlayerRepository playerRepository;

    /**
     * 使用兑换码
     *
     * @param playerId 玩家ID
     * @param code     兑换码
     * @return 兑换结果
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> redeemCode(String playerId, String code) {
        // 检查兑换码
        RedemptionCodeEntity redemptionCode = redemptionCodeMapper.selectOne(
                new LambdaQueryWrapper<RedemptionCodeEntity>()
                        .eq(RedemptionCodeEntity::getCode, code)
                        .eq(RedemptionCodeEntity::getIsActive, true)
        );
        if (redemptionCode == null) {
            throw new BusinessException(ResultCode.REDEMPTION_INVALID);
        }

        // 检查是否过期
        if (redemptionCode.getExpiredAt() != null && redemptionCode.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.REDEMPTION_INVALID, "兑换码已过期");
        }

        // 检查是否已使用
        RedemptionRecordEntity existingRecord = redemptionRecordMapper.selectOne(
                new LambdaQueryWrapper<RedemptionRecordEntity>()
                        .eq(RedemptionRecordEntity::getPlayerId, playerId)
                        .eq(RedemptionRecordEntity::getCode, code)
        );
        if (existingRecord != null) {
            throw new BusinessException(ResultCode.REDEMPTION_INVALID, "该兑换码已使用");
        }

        // 检查使用次数
        if (redemptionCode.getUsedCount() >= redemptionCode.getMaxUses()) {
            throw new BusinessException(ResultCode.REDEMPTION_INVALID, "兑换码已达使用上限");
        }

        // 发放奖励
        Player player = playerRepository.findByPlayerId(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 简化奖励发放
        int rewardCoins = 10000;
        player.addCoins(rewardCoins);
        playerRepository.update(player);

        // 记录使用
        RedemptionRecordEntity record = new RedemptionRecordEntity();
        record.setPlayerId(playerId);
        record.setCode(code);
        record.setRewardJson(redemptionCode.getRewardJson());
        record.setCreatedAt(LocalDateTime.now());
        redemptionRecordMapper.insert(record);

        // 更新使用次数
        redemptionCode.setUsedCount(redemptionCode.getUsedCount() + 1);
        redemptionCodeMapper.updateById(redemptionCode);

        Map<String, Object> result = new HashMap<>(4);
        result.put("rewardCoins", rewardCoins);
        result.put("coins", player.getCoins());
        result.put("codeName", redemptionCode.getCodeName());
        return result;
    }
}
