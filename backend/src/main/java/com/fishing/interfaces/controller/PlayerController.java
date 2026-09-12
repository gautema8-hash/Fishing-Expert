package com.fishing.interfaces.controller;

import com.fishing.application.service.PlayerAppService;
import com.fishing.common.result.Result;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 玩家控制器
 *
 * @author 后端架构组
 */
@Api(tags = "玩家管理")
@RestController
@RequestMapping("/player")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerAppService playerAppService;

    /**
     * 获取玩家信息
     */
    @ApiOperation("获取玩家信息")
    @GetMapping("/info")
    public Result<Player> getPlayerInfo() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Player player = playerAppService.getPlayerInfo(playerId);
        // 清除敏感信息
        player.setPasswordHash(null);
        return Result.success(player);
    }

    /**
     * 更新玩家信息
     */
    @ApiOperation("更新玩家信息")
    @PutMapping("/profile")
    public Result<Void> updateProfile(@RequestBody Map<String, String> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        playerAppService.updateProfile(playerId, params.get("nickname"), params.get("avatar"));
        return Result.success();
    }
}
