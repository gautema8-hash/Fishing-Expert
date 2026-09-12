package com.fishing.interfaces.controller;

import com.fishing.application.service.AntiCheatService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 反作弊控制器
 *
 * @author 后端架构组
 */
@Api(tags = "反作弊管理")
@RestController
@RequestMapping("/anti-cheat")
@RequiredArgsConstructor
public class AntiCheatController {

    private final AntiCheatService antiCheatService;

    /**
     * 获取玩家风控状态
     */
    @ApiOperation("获取玩家风控状态")
    @GetMapping("/stats")
    public Result<Map<String, Object>> getRiskStats() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> stats = antiCheatService.getRiskStats(playerId);
        return Result.success(stats);
    }

    /**
     * 管理员解封玩家
     */
    @ApiOperation("管理员解封玩家")
    @PostMapping("/unban/{playerId}")
    public Result<Void> unbanPlayer(@PathVariable String playerId) {
        antiCheatService.unbanPlayer(playerId);
        return Result.success();
    }
}
