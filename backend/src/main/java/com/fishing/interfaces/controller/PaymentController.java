package com.fishing.interfaces.controller;

import com.fishing.application.service.PaymentService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.RechargeOrderEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 支付控制器
 *
 * @author 后端架构组
 */
@Api(tags = "支付充值")
@RestController
@RequestMapping("/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @ApiOperation("获取商品列表")
    @GetMapping("/products")
    public Result<List<Map<String, Object>>> getProducts() {
        List<Map<String, Object>> products = paymentService.getProductList();
        return Result.success(products);
    }

    @ApiOperation("创建充值订单")
    @PostMapping("/create-order")
    public Result<Map<String, Object>> createOrder(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        String productId = (String) params.get("productId");
        String payMethod = (String) params.getOrDefault("payMethod", "wechat");
        Map<String, Object> result = paymentService.createOrder(playerId, productId, payMethod);
        return Result.success("订单创建成功", result);
    }

    @ApiOperation("支付回调（模拟）")
    @PostMapping("/callback")
    public Result<Map<String, Object>> payCallback(@RequestBody Map<String, Object> params) {
        String orderNo = (String) params.get("orderNo");
        String transactionId = (String) params.getOrDefault("transactionId", "MOCK_" + System.currentTimeMillis());
        Map<String, Object> result = paymentService.payCallback(orderNo, transactionId);
        return Result.success("支付成功", result);
    }

    @ApiOperation("查询我的订单")
    @GetMapping("/my-orders")
    public Result<List<RechargeOrderEntity>> getMyOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<RechargeOrderEntity> orders = paymentService.getPlayerOrders(playerId, page, size);
        return Result.success(orders);
    }
}
