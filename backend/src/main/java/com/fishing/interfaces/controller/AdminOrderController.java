package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminOrderService;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import com.fishing.interfaces.dto.admin.PageResult;
import com.fishing.interfaces.dto.admin.RefundRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.Map;

/**
 * 管理端-订单管理控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端-订单管理")
@RestController
@RequestMapping("/admin/api/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    /**
     * 分页查询订单列表
     */
    @ApiOperation("分页查询订单列表")
    @RequiresPermission("order:view")
    @GetMapping
    public Result<PageResult<Map<String, Object>>> getOrderList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String playerId) {
        return Result.success(adminOrderService.getOrderList(page, size, status, playerId));
    }

    /**
     * 获取订单详情
     */
    @ApiOperation("获取订单详情")
    @RequiresPermission("order:view")
    @GetMapping("/{orderId}")
    public Result<Map<String, Object>> getOrderDetail(@PathVariable Long orderId) {
        return Result.success(adminOrderService.getOrderDetail(orderId));
    }

    /**
     * 订单退款
     */
    @ApiOperation("订单退款")
    @RequiresPermission("order:refund")
    @PostMapping("/{orderId}/refund")
    public Result<String> refundOrder(@PathVariable Long orderId,
                                      @Valid @RequestBody RefundRequest request) {
        adminOrderService.refundOrder(orderId, request.getReason());
        return Result.success("退款成功");
    }
}
