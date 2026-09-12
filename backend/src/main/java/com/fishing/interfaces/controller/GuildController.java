package com.fishing.interfaces.controller;

import com.fishing.application.service.GuildAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.GuildEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 公会控制器
 *
 * @author 后端架构组
 */
@Api(tags = "公会管理")
@RestController
@RequestMapping("/guild")
@RequiredArgsConstructor
public class GuildController {

    private final GuildAppService guildAppService;

    @ApiOperation("创建公会")
    @PostMapping("/create")
    public Result<Map<String, Object>> createGuild(@RequestBody Map<String, String> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = guildAppService.createGuild(playerId, params.get("guildName"), params.get("description"));
        return Result.success("创建成功", result);
    }

    @ApiOperation("加入公会")
    @PostMapping("/join")
    public Result<Void> joinGuild(@RequestBody Map<String, String> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        guildAppService.joinGuild(playerId, params.get("guildId"));
        return Result.success();
    }

    @ApiOperation("退出公会")
    @PostMapping("/leave")
    public Result<Void> leaveGuild() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        guildAppService.leaveGuild(playerId);
        return Result.success();
    }

    @ApiOperation("获取公会信息")
    @GetMapping("/info")
    public Result<Map<String, Object>> getGuildInfo() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = guildAppService.getGuildInfo(playerId);
        return Result.success(result);
    }

    @ApiOperation("搜索公会")
    @GetMapping("/search")
    public Result<List<GuildEntity>> searchGuild(@RequestParam(required = false) String keyword) {
        List<GuildEntity> list = guildAppService.searchGuild(keyword);
        return Result.success(list);
    }
}
