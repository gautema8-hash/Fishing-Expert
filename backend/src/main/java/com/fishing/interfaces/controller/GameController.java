package com.fishing.interfaces.controller;

import com.fishing.application.service.GameRecordAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.interfaces.dto.GameRecordDTO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 游戏控制器
 *
 * @author 后端架构组
 */
@Api(tags = "游戏管理")
@RestController
@RequestMapping("/game")
@RequiredArgsConstructor
public class GameController {

    private final GameRecordAppService gameRecordAppService;

    /**
     * 保存游戏记录
     */
    @ApiOperation("保存游戏记录")
    @PostMapping("/record")
    public Result<Void> saveGameRecord(@Validated @RequestBody GameRecordDTO dto) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        gameRecordAppService.saveGameRecord(
                playerId,
                dto.getGameType(),
                dto.getLevel(),
                dto.getKills(),
                dto.getBossKills(),
                dto.getBulletsFired(),
                dto.getCritCount(),
                dto.getCoinsEarned(),
                dto.getCoinsSpent(),
                dto.getDuration(),
                dto.getScore(),
                dto.getStars()
        );
        return Result.success();
    }
}
