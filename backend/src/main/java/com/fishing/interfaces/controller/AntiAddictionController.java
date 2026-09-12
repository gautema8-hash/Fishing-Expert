package com.fishing.interfaces.controller;

import com.fishing.application.service.AntiAddictionService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 防沉迷控制器
 *
 * @author 后端架构组
 */
@Api(tags = "防沉迷管理")
@RestController
@RequestMapping("/anti-addiction")
@RequiredArgsConstructor
public class AntiAddictionController {

    private final AntiAddictionService antiAddictionService;

    /**
     * 实名认证
     */
    @ApiOperation("实名认证")
    @PostMapping("/verify")
    public Result<Map<String, Object>> verifyRealName(@RequestBody Map<String, String> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = antiAddictionService.verifyRealName(
                playerId,
                params.get("realName"),
                params.get("idCard")
        );
        return Result.success("实名认证成功", result);
    }

    /**
     * 检查游戏权限
     */
    @ApiOperation("检查游戏权限")
    @GetMapping("/check")
    public Result<Map<String, Object>> checkPlayPermission() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = antiAddictionService.checkPlayPermission(playerId);
        return Result.success(result);
    }

    /**
     * 获取防沉迷配置
     */
    @ApiOperation("获取防沉迷配置")
    @GetMapping("/config")
    public Result<Map<String, Object>> getConfig() {
        Map<String, Object> result = antiAddictionService.getConfig();
        return Result.success(result);
    }
}
