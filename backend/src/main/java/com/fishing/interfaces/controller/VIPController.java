package com.fishing.interfaces.controller;

import com.fishing.application.service.VIPAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * VIP控制器
 *
 * @author 后端架构组
 */
@Api(tags = "VIP管理")
@RestController
@RequestMapping("/vip")
@RequiredArgsConstructor
public class VIPController {

    private final VIPAppService vipAppService;

    @ApiOperation("获取VIP信息")
    @GetMapping("/info")
    public Result<Map<String, Object>> getVIPInfo() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> info = vipAppService.getVIPInfo(playerId);
        return Result.success(info);
    }

    @ApiOperation("领取每日VIP礼包")
    @PostMapping("/daily-gift")
    public Result<Map<String, Object>> claimDailyGift() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = vipAppService.claimDailyGift(playerId);
        return Result.success(result);
    }

    @ApiOperation("获取所有VIP特权")
    @GetMapping("/privileges")
    public Result<Map<Integer, Map<String, Object>>> getAllVIPPrivileges() {
        Map<Integer, Map<String, Object>> privileges = vipAppService.getAllVIPPrivileges();
        return Result.success(privileges);
    }
}
