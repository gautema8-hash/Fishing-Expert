package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.RechargeOrderEntity;
import com.fishing.infrastructure.persistence.repository.RechargeOrderMapper;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 支付服务
 * 处理充值订单创建、支付回调、发货
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final RechargeOrderMapper rechargeOrderMapper;
    private final PlayerCacheService playerCacheService;
    private final EconomyAppService economyAppService;

    /**
     * 商品配置（实际应从数据库或配置中心读取）
     */
    private static final Map<String, Map<String, Object>> PRODUCTS = new HashMap<>();

    static {
        addProduct("p_6", "6元礼包", new BigDecimal("6.00"), 60000L, 6);
        addProduct("p_30", "30元礼包", new BigDecimal("30.00"), 300000L, 30);
        addProduct("p_68", "68元礼包", new BigDecimal("68.00"), 680000L, 68);
        addProduct("p_128", "128元礼包", new BigDecimal("128.00"), 1280000L, 128);
        addProduct("p_328", "328元礼包", new BigDecimal("328.00"), 3280000L, 328);
        addProduct("p_648", "648元礼包", new BigDecimal("648.00"), 6480000L, 648);
    }

    private static void addProduct(String id, String name, BigDecimal amount, Long coins, Integer diamonds) {
        Map<String, Object> product = new HashMap<>();
        product.put("name", name);
        product.put("amount", amount);
        product.put("coins", coins);
        product.put("diamonds", diamonds);
        PRODUCTS.put(id, product);
    }

    /**
     * 创建充值订单
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createOrder(String playerId, String productId, String payMethod) {
        // 校验商品
        Map<String, Object> product = PRODUCTS.get(productId);
        if (product == null) {
            throw new BusinessException("无效的商品ID");
        }

        // 校验支付方式
        if (!"wechat".equals(payMethod) && !"alipay".equals(payMethod) && !"apple".equals(payMethod)) {
            throw new BusinessException("不支持的支付方式");
        }

        // 生成订单号
        String orderNo = generateOrderNo();

        // 创建订单
        RechargeOrderEntity order = new RechargeOrderEntity();
        order.setOrderNo(orderNo);
        order.setPlayerId(playerId);
        order.setProductId(productId);
        order.setProductName((String) product.get("name"));
        order.setAmount((BigDecimal) product.get("amount"));
        order.setCoins((Long) product.get("coins"));
        order.setDiamonds((Integer) product.get("diamonds"));
        order.setPayMethod(payMethod);
        order.setStatus(0); // 待支付
        rechargeOrderMapper.insert(order);

        log.info("充值订单创建: orderNo={}, playerId={}, product={}, amount={}",
                orderNo, playerId, product.get("name"), product.get("amount"));

        // 返回订单信息（模拟支付参数）
        Map<String, Object> result = new HashMap<>();
        result.put("orderNo", orderNo);
        result.put("productName", product.get("name"));
        result.put("amount", product.get("amount"));
        result.put("coins", product.get("coins"));
        result.put("diamonds", product.get("diamonds"));
        result.put("payMethod", payMethod);
        // 模拟支付参数（实际应调用微信/支付宝统一下单接口）
        result.put("payParams", generateMockPayParams(orderNo, payMethod));

        return result;
    }

    /**
     * 支付回调（模拟）
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> payCallback(String orderNo, String transactionId) {
        // 查询订单
        RechargeOrderEntity order = rechargeOrderMapper.selectOne(
                new LambdaQueryWrapper<RechargeOrderEntity>()
                        .eq(RechargeOrderEntity::getOrderNo, orderNo)
        );

        if (order == null) {
            throw new BusinessException("订单不存在");
        }

        if (order.getStatus() != 0) {
            throw new BusinessException("订单状态异常，当前状态: " + order.getStatus());
        }

        // 更新订单为已支付
        order.setStatus(1);
        order.setTransactionId(transactionId);
        order.setPaidAt(LocalDateTime.now());
        rechargeOrderMapper.updateById(order);

        log.info("支付成功: orderNo={}, transactionId={}, amount={}",
                orderNo, transactionId, order.getAmount());

        // 发货
        deliverOrder(order);

        Map<String, Object> result = new HashMap<>();
        result.put("orderNo", orderNo);
        result.put("status", "success");
        result.put("coins", order.getCoins());
        result.put("diamonds", order.getDiamonds());
        return result;
    }

    /**
     * 发货（发放金币和钻石）
     */
    private void deliverOrder(RechargeOrderEntity order) {
        try {
            // 发放金币
            economyAppService.addCoins(order.getPlayerId(), order.getCoins(), false);

            // 发放钻石
            Player player = playerCacheService.getPlayer(order.getPlayerId()).orElse(null);
            if (player != null) {
                player.addDiamonds(order.getDiamonds());
                playerCacheService.updatePlayer(player);
            }

            // 更新订单为已发货
            order.setStatus(2);
            order.setDeliveredAt(LocalDateTime.now());
            rechargeOrderMapper.updateById(order);

            log.info("充值发货完成: orderNo={}, playerId={}, coins={}, diamonds={}",
                    order.getOrderNo(), order.getPlayerId(), order.getCoins(), order.getDiamonds());
        } catch (Exception e) {
            log.error("充值发货失败: orderNo={}", order.getOrderNo(), e);
            // 发货失败，订单保持已支付状态，需要人工处理
        }
    }

    /**
     * 查询玩家订单列表
     */
    public List<RechargeOrderEntity> getPlayerOrders(String playerId, int page, int size) {
        return rechargeOrderMapper.selectList(
                new LambdaQueryWrapper<RechargeOrderEntity>()
                        .eq(RechargeOrderEntity::getPlayerId, playerId)
                        .orderByDesc(RechargeOrderEntity::getCreatedAt)
                        .last("LIMIT " + size + " OFFSET " + (page - 1) * size)
        );
    }

    /**
     * 获取商品列表
     */
    public List<Map<String, Object>> getProductList() {
        List<Map<String, Object>> list = new java.util.ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : PRODUCTS.entrySet()) {
            Map<String, Object> product = new HashMap<>(entry.getValue());
            product.put("id", entry.getKey());
            list.add(product);
        }
        return list;
    }

    /**
     * 生成订单号
     */
    private String generateOrderNo() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "RC" + timestamp + uuid;
    }

    /**
     * 生成模拟支付参数
     */
    private Map<String, Object> generateMockPayParams(String orderNo, String payMethod) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("payMethod", payMethod);
        params.put("mock", true);
        params.put("note", "当前为模拟支付，实际接入微信/支付宝后返回真实支付参数");
        return params;
    }
}
