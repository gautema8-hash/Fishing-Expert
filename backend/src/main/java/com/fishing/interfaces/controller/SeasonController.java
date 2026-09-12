package com.fishing.interfaces.controller;

import com.fishing.application.service.SeasonAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 赛季控制器
 *
 * @author 后端架构组
 */
@Api(tags = "赛季管理")
@RestController
@RequestMapping("/season")
@RequiredArgsConstructor
public class SeasonController {

    private final SeasonAppService seasonAppService;

    @ApiOperation("获取当前赛季信息")
    @GetMapping("/current")
    public Result<Map<String, Object>> getCurrentSeason() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = seasonAppService.getCurrentSeason(playerId);
        return Result.success(result);
    }

    @ApiOperation("增加赛季经验")
    @PostMapping("/xp/add")
    public Result<Void> addSeasonXp(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        int xp = Integer.parseInt(params.get("xp").toString());
        seasonAppService.addSeasonXp(playerId, xp);
        return Result.success();
    }

    @ApiOperation("购买高级通行证")
    @PostMapping("/premium/buy")
    public Result<Void> buyPremium() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        seasonAppService.buyPremium(playerId);
        return Result.success();
    }
}
