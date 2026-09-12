package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminOperationLogService;
import com.fishing.application.service.FeatureFlagService;
import com.fishing.application.service.SystemConfigService;
import com.fishing.common.annotation.AdminOperationLog;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 管理端系统配置控制器
 * 游戏参数配置与功能开关管理
 *
 * @author 后端架构组
 */
@Api(tags = "管理端系统配置")
@RestController
@RequestMapping("/admin/api/config")
@RequiredArgsConstructor
public class AdminConfigController {

    private final SystemConfigService systemConfigService;
    private final FeatureFlagService featureFlagService;
    private final AdminOperationLogService adminOperationLogService;

    @ApiOperation("获取游戏配置")
    @RequiresPermission("config:view")
    @GetMapping("/game")
    public Result<Map<String, Object>> getGameConfig() {
        return Result.success(systemConfigService.getAllConfig());
    }

    @ApiOperation("批量更新游戏配置")
    @RequiresPermission("config:edit")
    @AdminOperationLog(operation = "更新游戏配置", module = "config")
    @PutMapping("/game")
    public Result<String> updateGameConfig(@RequestBody Map<String, Object> configs) {
        systemConfigService.updateConfigs(configs);
        adminOperationLogService.recordLog("批量更新游戏配置", "config", null,
                String.valueOf(configs), "success", null);
        return Result.success("配置更新成功");
    }

    @ApiOperation("获取功能开关列表")
    @RequiresPermission("config:view")
    @GetMapping("/features")
    public Result<Map<String, Object>> getFeatures() {
        return Result.success(featureFlagService.getAllFlags());
    }

    @ApiOperation("更新功能开关")
    @RequiresPermission("config:edit")
    @AdminOperationLog(operation = "更新功能开关", module = "config")
    @PutMapping("/features/{key}")
    public Result<String> updateFeature(@PathVariable String key,
                                        @RequestBody Map<String, Object> body) {
        Object enabledObj = body.get("enabled");
        boolean enabled = Boolean.TRUE.equals(enabledObj);
        if (enabled) {
            featureFlagService.enableFeature(key);
        } else {
            featureFlagService.disableFeature(key);
        }
        adminOperationLogService.recordLog("更新功能开关", "config", key,
                "{\"enabled\":" + enabled + "}", "success", null);
        return Result.success("功能开关已更新: " + key + "=" + enabled);
    }
}
