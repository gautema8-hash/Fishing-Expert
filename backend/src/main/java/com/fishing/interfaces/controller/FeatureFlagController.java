package com.fishing.interfaces.controller;

import com.fishing.application.service.FeatureFlagService;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 功能开关控制器
 *
 * @author 后端架构组
 */
@Api(tags = "功能开关")
@RestController
@RequestMapping("/feature-flags")
@RequiredArgsConstructor
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;

    @ApiOperation("获取所有功能开关")
    @GetMapping("/all")
    public Result<Map<String, Object>> getAllFlags() {
        Map<String, Object> flags = featureFlagService.getAllFlags();
        return Result.success(flags);
    }

    @ApiOperation("检查功能是否启用")
    @GetMapping("/{featureName}")
    public Result<Boolean> isEnabled(@PathVariable String featureName) {
        boolean enabled = featureFlagService.isEnabled(featureName);
        return Result.success(enabled);
    }

    @ApiOperation("启用功能")
    @PostMapping("/{featureName}/enable")
    public Result<String> enableFeature(@PathVariable String featureName) {
        featureFlagService.enableFeature(featureName);
        return Result.success("功能已启用: " + featureName);
    }

    @ApiOperation("禁用功能")
    @PostMapping("/{featureName}/disable")
    public Result<String> disableFeature(@PathVariable String featureName) {
        featureFlagService.disableFeature(featureName);
        return Result.success("功能已禁用: " + featureName);
    }

    @ApiOperation("切换功能状态")
    @PostMapping("/{featureName}/toggle")
    public Result<Boolean> toggleFeature(@PathVariable String featureName) {
        boolean newState = featureFlagService.toggleFeature(featureName);
        return Result.success(newState);
    }

    @ApiOperation("批量更新功能开关")
    @PostMapping("/batch-update")
    public Result<String> batchUpdate(@RequestBody Map<String, Boolean> flags) {
        featureFlagService.updateFlags(flags);
        return Result.success("批量更新成功: " + flags.size() + " 项");
    }

    @ApiOperation("重置为默认开关")
    @PostMapping("/reset")
    public Result<String> resetToDefault() {
        featureFlagService.resetToDefault();
        return Result.success("已重置为默认开关");
    }
}
