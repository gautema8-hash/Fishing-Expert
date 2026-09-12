package com.fishing.interfaces.controller;

import com.fishing.application.service.FriendAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 好友控制器
 *
 * @author 后端架构组
 */
@Api(tags = "好友管理")
@RestController
@RequestMapping("/friend")
@RequiredArgsConstructor
public class FriendController {

    private final FriendAppService friendAppService;

    @ApiOperation("添加好友")
    @PostMapping("/add")
    public Result<Void> addFriend(@RequestBody Map<String, String> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        friendAppService.addFriend(playerId, params.get("friendId"));
        return Result.success();
    }

    @ApiOperation("删除好友")
    @DeleteMapping("/{friendId}")
    public Result<Void> deleteFriend(@PathVariable String friendId) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        friendAppService.deleteFriend(playerId, friendId);
        return Result.success();
    }

    @ApiOperation("获取好友列表")
    @GetMapping("/list")
    public Result<List<Map<String, Object>>> getFriendList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<Map<String, Object>> list = friendAppService.getFriendList(playerId);
        return Result.success(list);
    }

    @ApiOperation("搜索玩家")
    @GetMapping("/search")
    public Result<List<Map<String, Object>>> searchPlayers(@RequestParam(required = false) String keyword) {
        List<Map<String, Object>> list = friendAppService.searchPlayers(keyword);
        return Result.success(list);
    }
}
