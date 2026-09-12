package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.PlayerMailEntity;
import com.fishing.infrastructure.persistence.repository.PlayerMailMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 运营邮件服务 - 后台群发邮件/公告
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminMailService {

    private final PlayerMailMapper playerMailMapper;
    private final PlayerMapper playerMapper;

    /**
     * 向指定玩家发送邮件
     *
     * @param playerId    玩家ID
     * @param title       标题
     * @param content     内容
     * @param attachments 附件（JSON格式）
     * @param sender      发送者
     */
    @Transactional(rollbackFor = Exception.class)
    public void sendMailToPlayer(String playerId, String title, String content,
                                  String attachments, String sender) {
        PlayerMailEntity mail = new PlayerMailEntity();
        mail.setPlayerId(playerId);
        mail.setMailType("system");
        mail.setTitle(title);
        mail.setSender(sender != null ? sender : "系统");
        mail.setContent(content);
        mail.setAttachments(attachments);
        mail.setIsRead(false);
        mail.setIsClaimed(false);
        mail.setExpiredAt(LocalDateTime.now().plusDays(30));
        playerMailMapper.insert(mail);
        log.info("邮件发送成功: playerId={}, title={}", playerId, title);
    }

    /**
     * 全服群发邮件
     *
     * @param title       标题
     * @param content     内容
     * @param attachments 附件
     * @param sender      发送者
     * @return 发送结果
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> sendMailToAll(String title, String content,
                                               String attachments, String sender) {
        if (title == null || title.trim().isEmpty()) {
            throw new BusinessException("邮件标题不能为空");
        }

        // 查询所有正常状态的玩家
        List<PlayerEntity> players = playerMapper.selectList(
                new LambdaQueryWrapper<PlayerEntity>()
                        .eq(PlayerEntity::getStatus, 1)
                        .select(PlayerEntity::getPlayerId)
        );

        int successCount = 0;
        for (PlayerEntity player : players) {
            try {
                sendMailToPlayer(player.getPlayerId(), title, content, attachments, sender);
                successCount++;
            } catch (Exception e) {
                log.error("群发邮件失败: playerId={}", player.getPlayerId(), e);
            }
        }

        Map<String, Object> result = new HashMap<>(4);
        result.put("totalPlayers", players.size());
        result.put("successCount", successCount);
        result.put("title", title);
        log.info("全服邮件群发完成: 总数={}, 成功={}", players.size(), successCount);
        return result;
    }

    /**
     * 发送补偿邮件
     *
     * @param playerId 玩家ID
     * @param reason   补偿原因
     * @param coins    补偿金币
     * @param diamonds 补偿钻石
     */
    @Transactional(rollbackFor = Exception.class)
    public void sendCompensationMail(String playerId, String reason, long coins, int diamonds) {
        String attachments = String.format("{\"coins\":%d,\"diamonds\":%d}", coins, diamonds);
        String title = "补偿邮件";
        String content = String.format("亲爱的玩家，因%s给您带来不便，特发放补偿，请查收附件。", reason);
        sendMailToPlayer(playerId, title, content, attachments, "客服中心");
    }

    /**
     * 发送活动公告邮件
     *
     * @param title   标题
     * @param content 内容
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> sendAnnouncement(String title, String content) {
        return sendMailToAll(title, content, null, "龙宫公告");
    }

    /**
     * 获取邮件发送统计
     */
    public Map<String, Object> getMailStats() {
        long totalMails = playerMailMapper.selectCount(null);
        long unreadMails = playerMailMapper.selectCount(
                new LambdaQueryWrapper<PlayerMailEntity>().eq(PlayerMailEntity::getIsRead, false)
        );
        long systemMails = playerMailMapper.selectCount(
                new LambdaQueryWrapper<PlayerMailEntity>().eq(PlayerMailEntity::getMailType, "system")
        );

        Map<String, Object> stats = new HashMap<>(8);
        stats.put("totalMails", totalMails);
        stats.put("unreadMails", unreadMails);
        stats.put("systemMails", systemMails);
        return stats;
    }
}
