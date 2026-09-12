package com.fishing.interfaces.controller;

import com.fishing.application.service.DashboardService;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 数据看板控制器（运营后台）
 *
 * @author 后端架构组
 */
@Api(tags = "数据看板")
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @ApiOperation("获取运营总览")
    @GetMapping("/overview")
    public Result<Map<String, Object>> getOverview() {
        Map<String, Object> overview = dashboardService.getOverview();
        return Result.success(overview);
    }

    @ApiOperation("获取注册趋势")
    @GetMapping("/registration-trend")
    public Result<Map<String, Object>> getRegistrationTrend() {
        Map<String, Object> trend = dashboardService.getRegistrationTrend();
        return Result.success(trend);
    }

    @ApiOperation("获取收入趋势")
    @GetMapping("/revenue-trend")
    public Result<Map<String, Object>> getRevenueTrend() {
        Map<String, Object> trend = dashboardService.getRevenueTrend();
        return Result.success(trend);
    }

    @ApiOperation("获取TOP玩家")
    @GetMapping("/top-players")
    public Result<Map<String, Object>> getTopPlayers() {
        Map<String, Object> top = dashboardService.getTopPlayers();
        return Result.success(top);
    }

    @ApiOperation("获取系统健康状态")
    @GetMapping("/health")
    public Result<Map<String, Object>> getSystemHealth() {
        Map<String, Object> health = dashboardService.getSystemHealth();
        return Result.success(health);
    }
}
