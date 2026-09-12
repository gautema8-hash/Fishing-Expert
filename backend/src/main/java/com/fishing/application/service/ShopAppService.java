package com.fishing.application.service;

import cn.hutool.core.util.IdUtil;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.ShopOrderEntity;
import com.fishing.infrastructure.persistence.repository.ShopOrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 商城应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShopAppService {

    private final ShopOrderMapper shopOrderMapper;
    private final PlayerRepository playerRepository;

    /**
     * 创建订单
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createOrder(String playerId, String productId, String productName, BigDecimal amount) {
        Player player = playerRepository.findByPlayerId(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        String orderNo = "ORD" + System.currentTimeMillis() + IdUtil.fastSimpleUUID().substring(0, 6);

        ShopOrderEntity order = new ShopOrderEntity();
        order.setOrderNo(orderNo);
        order.setPlayerId(playerId);
        order.setProductId(productId);
        order.setProductName(productName);
        order.setAmount(amount);
        order.setPayStatus(0);
        shopOrderMapper.insert(order);

        Map<String, Object> result = new HashMap<>(4);
        result.put("orderNo", orderNo);
        result.put("amount", amount);
        result.put("productName", productName);
        return result;
    }

    /**
     * 模拟支付回调（实际项目中由支付平台回调）
     */
    @Transactional(rollbackFor = Exception.class)
    public void payCallback(String orderNo, String payType, String transactionId) {
        ShopOrderEntity order = shopOrderMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ShopOrderEntity>()
                        .eq(ShopOrderEntity::getOrderNo, orderNo)
        );
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        if (order.getPayStatus() != 0) {
            throw new BusinessException("订单已处理");
        }

        order.setPayStatus(1);
        order.setPayType(payType);
        order.setTransactionId(transactionId);
        order.setPayTime(LocalDateTime.now());
        shopOrderMapper.updateById(order);

        // 发放奖励（根据商品ID）
        Player player = playerRepository.findByPlayerId(order.getPlayerId())
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 简化：根据金额发放金币
        long rewardCoins = order.getAmount().longValue() * 1000;
        player.addCoins(rewardCoins);
        player.setTotalRecharge(player.getTotalRecharge().add(order.getAmount()));
        playerRepository.update(player);

        log.info("支付成功: orderNo={}, playerId={}, amount={}", orderNo, order.getPlayerId(), order.getAmount());
    }

    /**
     * 获取订单列表
     */
    public java.util.List<ShopOrderEntity> getOrderList(String playerId) {
        return shopOrderMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ShopOrderEntity>()
                        .eq(ShopOrderEntity::getPlayerId, playerId)
                        .orderByDesc(ShopOrderEntity::getCreatedAt)
        );
    }
}
