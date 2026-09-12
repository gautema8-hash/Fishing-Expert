package com.fishing.interfaces.controller;

import com.fishing.application.service.SystemConfigService;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 系统配置控制器
 *
 * @author 后端架构组
 */
@Api(tags = "系统配置")
@RestController
@RequestMapping("/system-config")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService systemConfigService;

    @ApiOperation("获取所有配置")
    @GetMapping("/all")
    public Result<Map<String, Object>> getAllConfig() {
        Map<String, Object> config = systemConfigService.getAllConfig();
        return Result.success(config);
    }

    @ApiOperation("获取单个配置")
    @GetMapping("/{key}")
    public Result<Object> getConfig(@PathVariable String key) {
        Object value = systemConfigService.getConfig(key);
        return Result.success(value);
    }

    @ApiOperation("更新配置")
    @PostMapping("/update")
    public Result<String> updateConfig(@RequestBody Map<String, Object> params) {
        String key = (String) params.get("key");
        Object value = params.get("value");
        systemConfigService.updateConfig(key, value);
        return Result.success("配置更新成功");
    }

    @ApiOperation("批量更新配置")
    @PostMapping("/batch-update")
    public Result<String> batchUpdateConfig(@RequestBody Map<String, Object> configs) {
        systemConfigService.updateConfigs(configs);
        return Result.success("批量更新成功");
    }

    @ApiOperation("重置为默认配置")
    @PostMapping("/reset")
    public Result<String> resetToDefault() {
        systemConfigService.resetToDefault();
        return Result.success("已重置为默认配置");
    }
}
