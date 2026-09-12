package com.fishing.interfaces.controller;

import com.fishing.application.service.IpBlacklistService;
import com.fishing.application.service.OperationLogService;
import com.fishing.application.service.StatsService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.persistence.entity.DailyStatsEntity;
import com.fishing.infrastructure.persistence.entity.IpBlacklistEntity;
import com.fishing.infrastructure.persistence.entity.OperationLogEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 运营管理控制器
 * 操作日志、IP封禁、数据统计
 *
 * @author 后端架构组
 */
@Api(tags = "运营管理")
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OperationLogService operationLogService;
    private final IpBlacklistService ipBlacklistService;
    private final StatsService statsService;

    // ==================== 操作日志 ====================

    @ApiOperation("查询玩家操作日志")
    @GetMapping("/logs/player/{playerId}")
    public Result<List<OperationLogEntity>> getPlayerLogs(
            @PathVariable String playerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<OperationLogEntity> logs = operationLogService.getPlayerLogs(playerId, page, size);
        return Result.success(logs);
    }

    @ApiOperation("按类型查询操作日志")
    @GetMapping("/logs/type/{opType}")
    public Result<List<OperationLogEntity>> getLogsByType(
            @PathVariable String opType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<OperationLogEntity> logs = operationLogService.getLogsByType(opType, page, size);
        return Result.success(logs);
    }

    @ApiOperation("查询失败操作日志")
    @GetMapping("/logs/failed")
    public Result<List<OperationLogEntity>> getFailedLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<OperationLogEntity> logs = operationLogService.getFailedLogs(page, size);
        return Result.success(logs);
    }

    @ApiOperation("清理过期操作日志")
    @PostMapping("/logs/clean")
    public Result<Integer> cleanOldLogs(@RequestParam(defaultValue = "30") int keepDays) {
        int cleaned = operationLogService.cleanOldLogs(keepDays);
        return Result.success("清理完成", cleaned);
    }

    // ==================== IP封禁 ====================

    @ApiOperation("检查IP是否被封禁")
    @GetMapping("/ip/check")
    public Result<Boolean> checkIp(@RequestParam String ip) {
        boolean banned = ipBlacklistService.isBanned(ip);
        return Result.success(banned);
    }

    @ApiOperation("永久封禁IP")
    @PostMapping("/ip/ban-permanent")
    public Result<String> banIpPermanent(@RequestBody Map<String, String> params) {
        String ip = params.get("ip");
        String reason = params.getOrDefault("reason", "违规操作");
        String operator = params.getOrDefault("operator", "admin");
        ipBlacklistService.banIpPermanent(ip, reason, operator);
        return Result.success("IP已永久封禁: " + ip);
    }

    @ApiOperation("临时封禁IP")
    @PostMapping("/ip/ban-temporary")
    public Result<String> banIpTemporary(@RequestBody Map<String, String> params) {
        String ip = params.get("ip");
        String reason = params.getOrDefault("reason", "违规操作");
        int hours = Integer.parseInt(params.getOrDefault("hours", "24"));
        String operator = params.getOrDefault("operator", "admin");
        ipBlacklistService.banIpTemporary(ip, reason, hours, operator);
        return Result.success("IP已临时封禁: " + ip + ", 时长: " + hours + "小时");
    }

    @ApiOperation("解封IP")
    @PostMapping("/ip/unban")
    public Result<String> unbanIp(@RequestParam String ip) {
        ipBlacklistService.unbanIp(ip);
        return Result.success("IP已解封: " + ip);
    }

    @ApiOperation("获取IP封禁列表")
    @GetMapping("/ip/list")
    public Result<List<IpBlacklistEntity>> getBanList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<IpBlacklistEntity> list = ipBlacklistService.getBanList(page, size);
        return Result.success(list);
    }

    // ==================== 数据统计 ====================

    @ApiOperation("获取运营概览")
    @GetMapping("/stats/overview")
    public Result<Map<String, Object>> getOverview() {
        Map<String, Object> overview = statsService.getOverview();
        return Result.success(overview);
    }

    @ApiOperation("获取每日统计")
    @GetMapping("/stats/daily")
    public Result<List<DailyStatsEntity>> getDailyStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<DailyStatsEntity> stats = statsService.getDailyStats(startDate, endDate);
        return Result.success(stats);
    }

    @ApiOperation("获取最近N天统计")
    @GetMapping("/stats/recent")
    public Result<List<DailyStatsEntity>> getRecentStats(@RequestParam(defaultValue = "7") int days) {
        List<DailyStatsEntity> stats = statsService.getRecentStats(days);
        return Result.success(stats);
    }

    @ApiOperation("手动触发每日统计")
    @PostMapping("/stats/aggregate")
    public Result<DailyStatsEntity> manualAggregate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailyStatsEntity stats = statsService.manualAggregate(date);
        return Result.success("统计完成", stats);
    }
}
