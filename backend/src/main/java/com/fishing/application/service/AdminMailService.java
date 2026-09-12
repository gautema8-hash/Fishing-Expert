package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fishing.common.context.AdminContext;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.PlayerMailEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMailMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import com.fishing.interfaces.dto.admin.PageResult;
import com.fishing.interfaces.dto.admin.SendMailRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final AdminOperationLogMapper adminOperationLogMapper;

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

    // ==================== 管理端邮件管理方法 ====================

    /**
     * 分页查询邮件列表
     */
    public PageResult<Map<String, Object>> getMailList(int page, int size) {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        Page<PlayerMailEntity> pageObj = new Page<>(page, size);
        LambdaQueryWrapper<PlayerMailEntity> wrapper = new LambdaQueryWrapper<PlayerMailEntity>()
                .orderByDesc(PlayerMailEntity::getCreatedAt);
        Page<PlayerMailEntity> resultPage = playerMailMapper.selectPage(pageObj, wrapper);
        List<Map<String, Object>> list = resultPage.getRecords().stream()
                .map(this::convertMailToMap)
                .collect(Collectors.toList());
        return new PageResult<>(list, resultPage.getTotal(), resultPage.getCurrent(), resultPage.getSize());
    }

    /**
     * 邮件详情
     */
    public Map<String, Object> getMailDetail(Long mailId) {
        PlayerMailEntity mail = playerMailMapper.selectById(mailId);
        if (mail == null) {
            throw new BusinessException("邮件不存在或已删除");
        }
        return convertMailToMap(mail);
    }

    /**
     * 管理端发送邮件（单发或群发）
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> sendMail(SendMailRequest request) {
        if (request == null) {
            throw new BusinessException("请求参数不能为空");
        }
        String title = request.getTitle();
        String content = request.getContent();
        if (title == null || title.trim().isEmpty()) {
            throw new BusinessException("邮件标题不能为空");
        }
        if (content == null || content.trim().isEmpty()) {
            throw new BusinessException("邮件内容不能为空");
        }

        String sender = "系统";
        AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
        if (admin != null && admin.getUsername() != null) {
            sender = admin.getUsername();
        }

        Map<String, Object> result;
        boolean broadcast = request.getPlayerId() == null || request.getPlayerId().trim().isEmpty();
        if (broadcast) {
            result = sendMailToAll(title, content, request.getAttachments(), sender);
        } else {
            sendMailToPlayer(request.getPlayerId(), title, content, request.getAttachments(), sender);
            result = new HashMap<>(4);
            result.put("playerId", request.getPlayerId());
            result.put("title", title);
            result.put("broadcast", false);
        }

        recordOperationLog(broadcast ? "全服群发邮件" : "发送单玩家邮件",
                broadcast ? null : request.getPlayerId(),
                request);
        return result;
    }

    private Map<String, Object> convertMailToMap(PlayerMailEntity mail) {
        Map<String, Object> map = new HashMap<>(16);
        map.put("id", mail.getId());
        map.put("playerId", mail.getPlayerId());
        map.put("mailType", mail.getMailType());
        map.put("title", mail.getTitle());
        map.put("sender", mail.getSender());
        map.put("content", mail.getContent());
        map.put("attachments", mail.getAttachments());
        map.put("isRead", mail.getIsRead());
        map.put("isClaimed", mail.getIsClaimed());
        map.put("readAt", mail.getReadAt());
        map.put("claimedAt", mail.getClaimedAt());
        map.put("expiredAt", mail.getExpiredAt());
        map.put("createdAt", mail.getCreatedAt());
        return map;
    }

    private void recordOperationLog(String operation, String targetId, SendMailRequest request) {
        try {
            AdminOperationLogEntity logEntity = new AdminOperationLogEntity();
            AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
            if (admin != null) {
                logEntity.setAdminId(admin.getAdminId());
                logEntity.setAdminName(admin.getUsername());
            }
            logEntity.setOperation(operation);
            logEntity.setModule("mail");
            logEntity.setTargetId(targetId);
            logEntity.setParamsJson(String.format(
                    "{\"playerId\":%s,\"title\":%s,\"hasAttachments\":%s}",
                    request.getPlayerId() == null ? "null" : "\"" + request.getPlayerId() + "\"",
                    request.getTitle() == null ? "null" : "\"" + request.getTitle() + "\"",
                    request.getAttachments() != null ? "true" : "false"));
            logEntity.setResult("success");
            logEntity.setDurationMs(0);
            adminOperationLogMapper.insert(logEntity);
        } catch (Exception e) {
            log.error("记录邮件操作日志失败", e);
        }
    }
}
