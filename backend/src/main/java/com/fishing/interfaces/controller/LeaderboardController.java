package com.fishing.interfaces.controller;

import com.fishing.application.service.LeaderboardAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 排行榜控制器
 *
 * @author 后端架构组
 */
@Api(tags = "排行榜管理")
@RestController
@RequestMapping("/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardAppService leaderboardAppService;

    /**
     * 获取排行榜
     */
    @ApiOperation("获取排行榜")
    @GetMapping("/{type}")
    public Result<List<Map<String, Object>>> getLeaderboard(
            @ApiParam("排行榜类型: coins/kills/level/weekly_coins") @PathVariable String type,
            @ApiParam("数量，默认20") @RequestParam(defaultValue = "20") int limit) {
        LeaderboardAppService.RankType rankType = parseRankType(type);
        List<Map<String, Object>> list = leaderboardAppService.getLeaderboard(rankType, limit);
        return Result.success(list);
    }

    /**
     * 获取玩家排名
     */
    @ApiOperation("获取玩家排名")
    @GetMapping("/{type}/my-rank")
    public Result<Map<String, Object>> getMyRank(
            @ApiParam("排行榜类型") @PathVariable String type) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        LeaderboardAppService.RankType rankType = parseRankType(type);
        Map<String, Object> result = leaderboardAppService.getPlayerRank(playerId, rankType);
        return Result.success(result);
    }

    /**
     * 获取全部排行榜摘要
     */
    @ApiOperation("获取全部排行榜摘要（前3名）")
    @GetMapping("/summary")
    public Result<Map<String, Object>> getSummary() {
        Map<String, Object> result = new HashMap<>();
        for (LeaderboardAppService.RankType type : LeaderboardAppService.RankType.values()) {
            List<Map<String, Object>> top3 = leaderboardAppService.getLeaderboard(type, 3);
            result.put(type.getCode(), top3);
        }
        return Result.success(result);
    }

    /**
     * 同步玩家数据到排行榜
     */
    @ApiOperation("同步玩家数据到排行榜")
    @PostMapping("/sync")
    public Result<Void> syncPlayerData() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        leaderboardAppService.syncPlayerToLeaderboard(playerId);
        return Result.success();
    }

    /**
     * 解析排行榜类型
     */
    private LeaderboardAppService.RankType parseRankType(String type) {
        try {
            return LeaderboardAppService.RankType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return LeaderboardAppService.RankType.COINS;
        }
    }
}
