package com.fishing.interfaces.controller;

import com.fishing.application.service.ShopAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.ShopOrderEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 商城控制器
 *
 * @author 后端架构组
 */
@Api(tags = "商城管理")
@RestController
@RequestMapping("/shop")
@RequiredArgsConstructor
public class ShopController {

    private final ShopAppService shopAppService;

    @ApiOperation("创建订单")
    @PostMapping("/order/create")
    public Result<Map<String, Object>> createOrder(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        String productId = (String) params.get("productId");
        String productName = (String) params.get("productName");
        BigDecimal amount = new BigDecimal(params.get("amount").toString());
        Map<String, Object> result = shopAppService.createOrder(playerId, productId, productName, amount);
        return Result.success(result);
    }

    @ApiOperation("支付回调（模拟）")
    @PostMapping("/order/pay")
    public Result<Void> payCallback(@RequestBody Map<String, String> params) {
        shopAppService.payCallback(params.get("orderNo"), params.get("payType"), params.get("transactionId"));
        return Result.success();
    }

    @ApiOperation("获取订单列表")
    @GetMapping("/orders")
    public Result<List<ShopOrderEntity>> getOrderList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<ShopOrderEntity> list = shopAppService.getOrderList(playerId);
        return Result.success(list);
    }
}
