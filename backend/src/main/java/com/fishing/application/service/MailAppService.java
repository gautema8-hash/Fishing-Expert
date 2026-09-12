package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.PlayerMailEntity;
import com.fishing.infrastructure.persistence.repository.PlayerMailMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 邮件应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailAppService {

    private final PlayerMailMapper playerMailMapper;
    private final PlayerRepository playerRepository;

    /**
     * 获取邮件列表
     */
    public List<PlayerMailEntity> getMailList(String playerId) {
        return playerMailMapper.selectList(
                new LambdaQueryWrapper<PlayerMailEntity>()
                        .eq(PlayerMailEntity::getPlayerId, playerId)
                        .orderByDesc(PlayerMailEntity::getCreatedAt)
        );
    }

    /**
     * 读取邮件
     */
    @Transactional(rollbackFor = Exception.class)
    public void readMail(String playerId, Long mailId) {
        PlayerMailEntity mail = playerMailMapper.selectById(mailId);
        if (mail == null || !mail.getPlayerId().equals(playerId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!mail.getIsRead()) {
            mail.setIsRead(true);
            mail.setReadAt(LocalDateTime.now());
            playerMailMapper.updateById(mail);
        }
    }

    /**
     * 领取邮件附件
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> claimMailAttachment(String playerId, Long mailId) {
        PlayerMailEntity mail = playerMailMapper.selectById(mailId);
        if (mail == null || !mail.getPlayerId().equals(playerId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (mail.getIsClaimed()) {
            throw new BusinessException(ResultCode.ALREADY_CLAIMED);
        }

        Player player = playerRepository.findByPlayerId(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 解析附件并发放奖励（简化处理）
        int rewardCoins = 1000;
        player.addCoins(rewardCoins);
        playerRepository.update(player);

        mail.setIsClaimed(true);
        mail.setClaimedAt(LocalDateTime.now());
        playerMailMapper.updateById(mail);

        Map<String, Object> result = new HashMap<>(4);
        result.put("coins", player.getCoins());
        result.put("rewardCoins", rewardCoins);
        return result;
    }

    /**
     * 获取未读邮件数量
     */
    public long getUnreadCount(String playerId) {
        return playerMailMapper.selectCount(
                new LambdaQueryWrapper<PlayerMailEntity>()
                        .eq(PlayerMailEntity::getPlayerId, playerId)
                        .eq(PlayerMailEntity::getIsRead, false)
        );
    }
}
