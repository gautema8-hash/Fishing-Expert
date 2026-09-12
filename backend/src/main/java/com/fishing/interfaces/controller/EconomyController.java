package com.fishing.interfaces.controller;

import com.fishing.application.service.EconomyAppService;
import com.fishing.common.annotation.RateLimit;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 经济控制器
 *
 * @author 后端架构组
 */
@Api(tags = "经济管理")
@RestController
@RequestMapping("/economy")
@RequiredArgsConstructor
public class EconomyController {

    private final EconomyAppService economyAppService;

    /**
     * 获取经济信息
     */
    @ApiOperation("获取玩家经济信息")
    @GetMapping("/info")
    public Result<Map<String, Object>> getEconomyInfo() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> info = economyAppService.getEconomyInfo(playerId);
        return Result.success(info);
    }

    /**
     * 消耗金币（发射炮弹）
     */
    @ApiOperation("消耗金币")
    @RateLimit(key = "spend_coins", window = 1, limit = 20, message = "发射过于频繁，请稍后再试")
    @PostMapping("/coins/spend")
    public Result<Map<String, Object>> spendCoins(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        long amount = Long.parseLong(params.get("amount").toString());
        Map<String, Object> result = economyAppService.spendCoins(playerId, amount);
        return Result.success(result);
    }

    /**
     * 增加金币（击杀鱼类）
     */
    @ApiOperation("增加金币")
    @PostMapping("/coins/add")
    public Result<Map<String, Object>> addCoins(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        long amount = Long.parseLong(params.get("amount").toString());
        boolean isCrit = Boolean.parseBoolean(params.getOrDefault("isCrit", "false").toString());
        Map<String, Object> result = economyAppService.addCoins(playerId, amount, isCrit);
        return Result.success(result);
    }

    /**
     * 增加钻石
     */
    @ApiOperation("增加钻石")
    @PostMapping("/diamonds/add")
    public Result<Void> addDiamonds(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        int amount = Integer.parseInt(params.get("amount").toString());
        economyAppService.addDiamonds(playerId, amount);
        return Result.success();
    }
}
