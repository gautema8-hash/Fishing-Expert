package com.fishing.interfaces.controller;

import com.fishing.application.service.WorldBossService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 世界BOSS控制器
 *
 * @author 后端架构组
 */
@Api(tags = "世界BOSS")
@RestController
@RequestMapping("/world-boss")
@RequiredArgsConstructor
public class WorldBossController {

    private final WorldBossService worldBossService;

    @ApiOperation("获取BOSS状态")
    @GetMapping("/status")
    public Result<Map<String, Object>> getBossStatus() {
        Map<String, Object> status = worldBossService.getBossStatus();
        return Result.success(status);
    }

    @ApiOperation("对BOSS造成伤害")
    @PostMapping("/damage")
    public Result<Map<String, Object>> dealDamage(@RequestBody Map<String, Object> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        String nickname = (String) params.getOrDefault("nickname", "玩家");
        long damage = Long.parseLong(params.getOrDefault("damage", 0).toString());
        Map<String, Object> result = worldBossService.dealDamage(playerId, nickname, damage);
        return Result.success(result);
    }

    @ApiOperation("获取伤害排名")
    @GetMapping("/ranking")
    public Result<List<Map<String, Object>>> getRanking(@RequestParam(defaultValue = "10") int top) {
        List<Map<String, Object>> ranking = worldBossService.getDamageRanking(top);
        return Result.success(ranking);
    }

    @ApiOperation("运营召唤BOSS")
    @PostMapping("/summon")
    public Result<Map<String, Object>> summonBoss(@RequestParam(defaultValue = "1") int bossLevel) {
        Map<String, Object> result = worldBossService.summonBoss(bossLevel);
        return Result.success("世界BOSS已召唤", result);
    }
}
