package com.fishing.interfaces.controller;

import com.fishing.application.service.AchievementAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 成就控制器
 *
 * @author 后端架构组
 */
@Api(tags = "成就管理")
@RestController
@RequestMapping("/achievement")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementAppService achievementAppService;

    @ApiOperation("获取成就列表")
    @GetMapping("/list")
    public Result<List<Map<String, Object>>> getAchievementList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<Map<String, Object>> list = achievementAppService.getAchievementList(playerId);
        return Result.success(list);
    }

    @ApiOperation("领取成就奖励")
    @PostMapping("/{achievementId}/claim")
    public Result<Map<String, Object>> claimReward(@PathVariable String achievementId) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = achievementAppService.claimReward(playerId, achievementId);
        return Result.success(result);
    }

    @ApiOperation("获取成就统计")
    @GetMapping("/stats")
    public Result<Map<String, Object>> getAchievementStats() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> stats = achievementAppService.getAchievementStats(playerId);
        return Result.success(stats);
    }
}
