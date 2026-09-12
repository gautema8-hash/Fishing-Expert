package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminStatsService;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 管理端数据统计控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端数据统计")
@RestController
@RequestMapping("/admin/api/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final AdminStatsService adminStatsService;

    @ApiOperation("总览数据")
    @RequiresPermission("stats:view")
    @GetMapping("/overview")
    public Result<Map<String, Object>> getOverview() {
        return Result.success(adminStatsService.getOverview());
    }

    @ApiOperation("活跃趋势")
    @RequiresPermission("stats:view")
    @GetMapping("/active-trend")
    public Result<List<Map<String, Object>>> getActiveTrend(@RequestParam(defaultValue = "7") int days) {
        return Result.success(adminStatsService.getActiveTrend(days));
    }

    @ApiOperation("充值分布")
    @RequiresPermission("stats:view")
    @GetMapping("/recharge-distribution")
    public Result<List<Map<String, Object>>> getRechargeDistribution() {
        return Result.success(adminStatsService.getRechargeDistribution());
    }

    @ApiOperation("游戏核心数据")
    @RequiresPermission("stats:view")
    @GetMapping("/game-data")
    public Result<Map<String, Object>> getGameData() {
        return Result.success(adminStatsService.getGameData());
    }

    @ApiOperation("金币收支趋势")
    @RequiresPermission("stats:view")
    @GetMapping("/coin-flow")
    public Result<List<Map<String, Object>>> getCoinFlow(@RequestParam(defaultValue = "7") int days) {
        return Result.success(adminStatsService.getCoinFlow(days));
    }

    @ApiOperation("等级分布")
    @RequiresPermission("stats:view")
    @GetMapping("/level-distribution")
    public Result<List<Map<String, Object>>> getLevelDistribution() {
        return Result.success(adminStatsService.getLevelDistribution());
    }

    @ApiOperation("实时在线玩家")
    @RequiresPermission("stats:view")
    @GetMapping("/realtime-online")
    public Result<List<Map<String, Object>>> getRealtimeOnline() {
        return Result.success(adminStatsService.getRealtimeOnline());
    }

    @ApiOperation("系统状态")
    @RequiresPermission("stats:view")
    @GetMapping("/system-status")
    public Result<Map<String, Object>> getSystemStatus() {
        return Result.success(adminStatsService.getSystemStatus());
    }
}
