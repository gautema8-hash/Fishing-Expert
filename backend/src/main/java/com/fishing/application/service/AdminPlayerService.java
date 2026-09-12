package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fishing.common.context.AdminContext;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.PlayerLoginLogEntity;
import com.fishing.infrastructure.persistence.entity.ShopOrderEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
import com.fishing.infrastructure.persistence.repository.PlayerLoginLogMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import com.fishing.infrastructure.persistence.repository.ShopOrderMapper;
import com.fishing.interfaces.dto.admin.PageResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理端-玩家管理服务
 *
 * <p>注意：游戏内金币为纯游戏虚拟道具，不可兑换现金。</p>
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPlayerService {

    private final PlayerMapper playerMapper;
    private final ShopOrderMapper shopOrderMapper;
    private final PlayerLoginLogMapper playerLoginLogMapper;
    private final AdminOperationLogMapper adminOperationLogMapper;
    private final AdminMailService adminMailService;

    /**
     * 分页查询玩家列表
     *
     * @param page    页码（从1开始）
     * @param size    每页大小
     * @param keyword 模糊匹配 playerId / nickname / phone
     * @param status  状态筛选（1正常 2封禁 3注销），为null则不筛选
     * @return 分页结果
     */
    public PageResult<Map<String, Object>> getPlayerList(int page, int size, String keyword, Integer status) {
        Page<PlayerEntity> pageObj = new Page<>(page, size);
        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<PlayerEntity>()
                .orderByDesc(PlayerEntity::getCreatedAt);

        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            wrapper.and(w -> w.like(PlayerEntity::getPlayerId, kw)
                    .or().like(PlayerEntity::getNickname, kw)
                    .or().like(PlayerEntity::getPhone, kw));
        }
        if (status != null) {
            wrapper.eq(PlayerEntity::getStatus, status);
        }

        Page<PlayerEntity> resultPage = playerMapper.selectPage(pageObj, wrapper);
        List<Map<String, Object>> list = resultPage.getRecords().stream()
                .map(this::toPlayerMap)
                .collect(Collectors.toList());

        return new PageResult<>(list, resultPage.getTotal(), resultPage.getCurrent(), resultPage.getSize());
    }

    /**
     * 获取玩家详情（基本信息 + 游戏统计 + 最近充值 + 最近登录）
     *
     * @param playerId 玩家ID
     * @return 玩家详情Map
     */
    public Map<String, Object> getPlayerDetail(String playerId) {
        PlayerEntity player = requirePlayer(playerId);

        Map<String, Object> detail = toPlayerMap(player);

        // 游戏数据统计
        Map<String, Object> gameStats = new HashMap<>(8);
        gameStats.put("totalKills", player.getTotalKills());
        gameStats.put("totalBullets", player.getTotalBullets());
        gameStats.put("totalCrits", player.getTotalCrits());
        gameStats.put("totalCoinsEarned", player.getTotalCoinsEarned());
        gameStats.put("playCount", player.getPlayCount());
        detail.put("gameStats", gameStats);

        // 最近10条充值记录（商城订单中已发货的订单）
        List<ShopOrderEntity> recentRecharges = shopOrderMapper.selectList(
                new LambdaQueryWrapper<ShopOrderEntity>()
                        .eq(ShopOrderEntity::getPlayerId, playerId)
                        .eq(ShopOrderEntity::getPayStatus, 2)
                        .orderByDesc(ShopOrderEntity::getCreatedAt)
                        .last("LIMIT 10"));
        detail.put("recentRecharges", recentRecharges);

        // 最近5条登录记录
        List<PlayerLoginLogEntity> recentLogins = playerLoginLogMapper.selectList(
                new LambdaQueryWrapper<PlayerLoginLogEntity>()
                        .eq(PlayerLoginLogEntity::getPlayerId, playerId)
                        .orderByDesc(PlayerLoginLogEntity::getCreatedAt)
                        .last("LIMIT 5"));
        detail.put("recentLogins", recentLogins);

        return detail;
    }

    /**
     * 封禁玩家
     *
     * @param playerId      玩家ID
     * @param reason        封禁原因
     * @param durationHours 封禁时长（小时），null表示永久封禁
     */
    @Transactional(rollbackFor = Exception.class)
    public void banPlayer(String playerId, String reason, Integer durationHours) {
        try {
            PlayerEntity player = requirePlayer(playerId);
            player.setStatus(2);
            playerMapper.updateById(player);

            // durationHours 简化处理：直接置为封禁状态，时长记录到操作日志
            String paramsJson = "{\"reason\":\"" + escapeJson(reason) + "\",\"durationHours\":"
                    + (durationHours == null ? "null" : durationHours) + "}";
            recordLog("封禁玩家", "player", playerId, paramsJson, "success", null, null);
            log.info("玩家已封禁: playerId={}, reason={}, durationHours={}", playerId, reason, durationHours);
        } catch (Exception e) {
            recordLog("封禁玩家", "player", playerId, "{\"reason\":\"" + escapeJson(reason) + "\"}", "fail", e.getMessage(), null);
            throw e;
        }
    }

    /**
     * 解封玩家
     *
     * @param playerId 玩家ID
     */
    @Transactional(rollbackFor = Exception.class)
    public void unbanPlayer(String playerId) {
        try {
            PlayerEntity player = requirePlayer(playerId);
            player.setStatus(1);
            playerMapper.updateById(player);

            recordLog("解封玩家", "player", playerId, null, "success", null, null);
            log.info("玩家已解封: playerId={}", playerId);
        } catch (Exception e) {
            recordLog("解封玩家", "player", playerId, null, "fail", e.getMessage(), null);
            throw e;
        }
    }

    /**
     * 调整玩家金币（正数增加，负数扣除）
     *
     * <p>注意：游戏内金币为纯游戏虚拟道具，不可兑换现金。</p>
     *
     * @param playerId 玩家ID
     * @param amount   调整数量
     * @param reason   调整原因
     */
    @Transactional(rollbackFor = Exception.class)
    public void adjustCoins(String playerId, long amount, String reason) {
        try {
            PlayerEntity player = requirePlayer(playerId);
            long current = player.getCoins() == null ? 0L : player.getCoins();
            long after = current + amount;
            if (after < 0) {
                throw new BusinessException("玩家金币不足，当前金币=" + current);
            }
            player.setCoins(after);
            playerMapper.updateById(player);

            String paramsJson = "{\"amount\":" + amount + ",\"reason\":\"" + escapeJson(reason) + "\"}";
            recordLog("调整玩家金币", "player", playerId, paramsJson, "success", null, null);
            log.info("玩家金币已调整: playerId={}, amount={}, after={}", playerId, amount, after);
        } catch (Exception e) {
            String paramsJson = "{\"amount\":" + amount + ",\"reason\":\"" + escapeJson(reason) + "\"}";
            recordLog("调整玩家金币", "player", playerId, paramsJson, "fail", e.getMessage(), null);
            throw e;
        }
    }

    /**
     * 调整玩家钻石（正数增加，负数扣除）
     *
     * @param playerId 玩家ID
     * @param amount   调整数量
     * @param reason   调整原因
     */
    @Transactional(rollbackFor = Exception.class)
    public void adjustDiamonds(String playerId, int amount, String reason) {
        try {
            PlayerEntity player = requirePlayer(playerId);
            int current = player.getDiamonds() == null ? 0 : player.getDiamonds();
            int after = current + amount;
            if (after < 0) {
                throw new BusinessException("玩家钻石不足，当前钻石=" + current);
            }
            player.setDiamonds(after);
            playerMapper.updateById(player);

            String paramsJson = "{\"amount\":" + amount + ",\"reason\":\"" + escapeJson(reason) + "\"}";
            recordLog("调整玩家钻石", "player", playerId, paramsJson, "success", null, null);
            log.info("玩家钻石已调整: playerId={}, amount={}, after={}", playerId, amount, after);
        } catch (Exception e) {
            String paramsJson = "{\"amount\":" + amount + ",\"reason\":\"" + escapeJson(reason) + "\"}";
            recordLog("调整玩家钻石", "player", playerId, paramsJson, "fail", e.getMessage(), null);
            throw e;
        }
    }

    /**
     * 向指定玩家发送邮件
     *
     * @param playerId    玩家ID
     * @param title       标题
     * @param content     内容
     * @param attachments 附件（JSON字符串）
     */
    @Transactional(rollbackFor = Exception.class)
    public void sendMailToPlayer(String playerId, String title, String content, String attachments) {
        try {
            requirePlayer(playerId);
            AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
            String sender = (admin != null && admin.getUsername() != null) ? admin.getUsername() : "管理员";

            adminMailService.sendMailToPlayer(playerId, title, content, attachments, sender);

            String paramsJson = "{\"title\":\"" + escapeJson(title) + "\"}";
            recordLog("发送玩家邮件", "player", playerId, paramsJson, "success", null, null);
            log.info("玩家邮件已发送: playerId={}, title={}", playerId, title);
        } catch (Exception e) {
            String paramsJson = "{\"title\":\"" + escapeJson(title) + "\"}";
            recordLog("发送玩家邮件", "player", playerId, paramsJson, "fail", e.getMessage(), null);
            throw e;
        }
    }

    // ==================== 内部方法 ====================

    /**
     * 查询玩家，不存在则抛出业务异常
     */
    private PlayerEntity requirePlayer(String playerId) {
        if (!StringUtils.hasText(playerId)) {
            throw new BusinessException("玩家ID不能为空");
        }
        PlayerEntity player = playerMapper.selectOne(
                new LambdaQueryWrapper<PlayerEntity>()
                        .eq(PlayerEntity::getPlayerId, playerId));
        if (player == null) {
            throw new BusinessException("玩家不存在: " + playerId);
        }
        return player;
    }

    /**
     * 将玩家实体转换为对外Map（绝对不返回passwordHash/idCardHash）
     */
    private Map<String, Object> toPlayerMap(PlayerEntity p) {
        Map<String, Object> map = new HashMap<>(32);
        map.put("id", p.getId());
        map.put("playerId", p.getPlayerId());
        map.put("nickname", p.getNickname());
        map.put("avatar", p.getAvatar());
        map.put("phone", p.getPhone());
        map.put("email", p.getEmail());
        map.put("vipLevel", p.getVipLevel());
        map.put("vipExp", p.getVipExp());
        map.put("level", p.getLevel());
        map.put("exp", p.getExp());
        map.put("coins", p.getCoins());
        map.put("diamonds", p.getDiamonds());
        map.put("energy", p.getEnergy());
        map.put("cannonLevel", p.getCannonLevel());
        map.put("cannonSkin", p.getCannonSkin());
        map.put("activePet", p.getActivePet());
        map.put("totalRecharge", p.getTotalRecharge());
        map.put("totalKills", p.getTotalKills());
        map.put("totalBullets", p.getTotalBullets());
        map.put("totalCrits", p.getTotalCrits());
        map.put("totalCoinsEarned", p.getTotalCoinsEarned());
        map.put("highestLevel", p.getHighestLevel());
        map.put("playCount", p.getPlayCount());
        map.put("consecutiveDays", p.getConsecutiveDays());
        map.put("isNewPlayer", p.getIsNewPlayer());
        map.put("newbieProtectionLeft", p.getNewbieProtectionLeft());
        map.put("status", p.getStatus());
        map.put("isRealNameVerified", p.getIsRealNameVerified());
        map.put("realName", p.getRealName());
        map.put("age", p.getAge());
        map.put("isMinor", p.getIsMinor());
        map.put("lastLoginTime", p.getLastLoginTime());
        map.put("lastLoginIp", p.getLastLoginIp());
        map.put("createdAt", p.getCreatedAt());
        map.put("updatedAt", p.getUpdatedAt());
        return map;
    }

    /**
     * 记录管理员操作日志
     */
    private void recordLog(String operation, String module, String targetId,
                           String paramsJson, String result, String errorMsg, Integer durationMs) {
        try {
            AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
            AdminOperationLogEntity logEntity = new AdminOperationLogEntity();
            if (admin != null) {
                logEntity.setAdminId(admin.getAdminId());
                logEntity.setAdminName(admin.getUsername());
            }
            logEntity.setOperation(operation);
            logEntity.setModule(module);
            logEntity.setTargetId(targetId);
            logEntity.setParamsJson(paramsJson);
            logEntity.setResult(result);
            logEntity.setErrorMsg(errorMsg);
            logEntity.setDurationMs(durationMs);
            adminOperationLogMapper.insert(logEntity);
        } catch (Exception e) {
            log.error("记录管理员操作日志失败: operation={}, targetId={}", operation, targetId, e);
        }
    }

    /**
     * 简单转义JSON字符串中的引号与反斜杠
     */
    private String escapeJson(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
