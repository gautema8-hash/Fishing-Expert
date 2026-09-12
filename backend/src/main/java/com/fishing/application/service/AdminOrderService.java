package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fishing.common.context.AdminContext;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.ShopOrderEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
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
 * 管理端-订单管理服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final ShopOrderMapper shopOrderMapper;
    private final PlayerMapper playerMapper;
    private final AdminOperationLogMapper adminOperationLogMapper;

    /**
     * 分页查询订单列表
     *
     * @param page     页码（从1开始）
     * @param size     每页大小
     * @param status   支付状态筛选（0待支付 1已支付 2已发货 3已取消 4已退款），null不筛选
     * @param playerId 玩家ID筛选，null不筛选
     * @return 分页结果
     */
    public PageResult<Map<String, Object>> getOrderList(int page, int size, Integer status, String playerId) {
        Page<ShopOrderEntity> pageObj = new Page<>(page, size);
        LambdaQueryWrapper<ShopOrderEntity> wrapper = new LambdaQueryWrapper<ShopOrderEntity>()
                .orderByDesc(ShopOrderEntity::getCreatedAt);

        if (status != null) {
            wrapper.eq(ShopOrderEntity::getPayStatus, status);
        }
        if (StringUtils.hasText(playerId)) {
            wrapper.eq(ShopOrderEntity::getPlayerId, playerId.trim());
        }

        Page<ShopOrderEntity> resultPage = shopOrderMapper.selectPage(pageObj, wrapper);
        List<Map<String, Object>> list = resultPage.getRecords().stream()
                .map(this::toOrderMap)
                .collect(Collectors.toList());

        return new PageResult<>(list, resultPage.getTotal(), resultPage.getCurrent(), resultPage.getSize());
    }

    /**
     * 获取订单详情（含关联玩家昵称）
     *
     * @param orderId 订单主键ID
     * @return 订单详情Map
     */
    public Map<String, Object> getOrderDetail(Long orderId) {
        ShopOrderEntity order = requireOrder(orderId);
        Map<String, Object> detail = toOrderMap(order);

        // 关联玩家昵称
        PlayerEntity player = playerMapper.selectOne(
                new LambdaQueryWrapper<PlayerEntity>()
                        .eq(PlayerEntity::getPlayerId, order.getPlayerId()));
        detail.put("playerNickname", player != null ? player.getNickname() : null);

        return detail;
    }

    /**
     * 订单退款（仅变更订单状态为已退款，不发起实际退款流程）
     *
     * @param orderId 订单主键ID
     * @param reason  退款原因
     */
    @Transactional(rollbackFor = Exception.class)
    public void refundOrder(Long orderId, String reason) {
        try {
            ShopOrderEntity order = requireOrder(orderId);
            Integer payStatus = order.getPayStatus();
            if (payStatus == null || (payStatus != 1 && payStatus != 2)) {
                throw new BusinessException("仅已支付或已发货的订单可退款，当前状态=" + payStatus);
            }

            order.setPayStatus(4);
            shopOrderMapper.updateById(order);

            String paramsJson = "{\"orderNo\":\"" + escapeJson(order.getOrderNo())
                    + "\",\"reason\":\"" + escapeJson(reason) + "\"}";
            recordLog("订单退款", "order", String.valueOf(orderId), paramsJson, "success", null, null);
            log.info("订单已退款: orderId={}, orderNo={}", orderId, order.getOrderNo());
        } catch (Exception e) {
            String paramsJson = "{\"reason\":\"" + escapeJson(reason) + "\"}";
            recordLog("订单退款", "order", String.valueOf(orderId), paramsJson, "fail", e.getMessage(), null);
            throw e;
        }
    }

    // ==================== 内部方法 ====================

    /**
     * 查询订单，不存在则抛出业务异常
     */
    private ShopOrderEntity requireOrder(Long orderId) {
        if (orderId == null) {
            throw new BusinessException("订单ID不能为空");
        }
        ShopOrderEntity order = shopOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在: " + orderId);
        }
        return order;
    }

    /**
     * 将订单实体转换为对外Map
     */
    private Map<String, Object> toOrderMap(ShopOrderEntity o) {
        Map<String, Object> map = new HashMap<>(16);
        map.put("id", o.getId());
        map.put("orderNo", o.getOrderNo());
        map.put("playerId", o.getPlayerId());
        map.put("productId", o.getProductId());
        map.put("productName", o.getProductName());
        map.put("amount", o.getAmount());
        map.put("payType", o.getPayType());
        map.put("payStatus", o.getPayStatus());
        map.put("payTime", o.getPayTime());
        map.put("transactionId", o.getTransactionId());
        map.put("rewardJson", o.getRewardJson());
        map.put("createdAt", o.getCreatedAt());
        map.put("updatedAt", o.getUpdatedAt());
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
