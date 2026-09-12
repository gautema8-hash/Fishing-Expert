package com.fishing.interfaces.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.result.Result;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import com.fishing.infrastructure.util.PlayerCacheService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 批量操作控制器（管理员）
 *
 * @author 后端架构组
 */
@Slf4j
@Api(tags = "批量操作")
@RestController
@RequestMapping("/admin/batch")
@RequiredArgsConstructor
public class BatchOperationController {

    private final PlayerMapper playerMapper;
    private final PlayerCacheService playerCacheService;

    @ApiOperation("批量发放金币")
    @PostMapping("/grant-coins")
    public Result<Map<String, Object>> batchGrantCoins(@RequestBody Map<String, Object> params) {
        List<String> playerIds = (List<String>) params.get("playerIds");
        long amount = Long.parseLong(params.get("amount").toString());
        String reason = (String) params.getOrDefault("reason", "批量发放");

        int success = 0;
        int failed = 0;

        for (String playerId : playerIds) {
            try {
                Player player = playerCacheService.getPlayer(playerId).orElse(null);
                if (player != null) {
                    player.addCoins(amount);
                    playerCacheService.updatePlayer(player);
                    success++;
                } else {
                    failed++;
                }
            } catch (Exception e) {
                failed++;
                log.error("批量发放金币失败: playerId={}", playerId, e);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", playerIds.size());
        result.put("success", success);
        result.put("failed", failed);
        result.put("amount", amount);

        log.info("批量发放金币完成: 总数={}, 成功={}, 失败={}, 金额={}",
                playerIds.size(), success, failed, amount);

        return Result.success("批量发放完成", result);
    }

    @ApiOperation("批量封禁玩家")
    @PostMapping("/ban")
    public Result<Map<String, Object>> batchBan(@RequestBody Map<String, Object> params) {
        List<String> playerIds = (List<String>) params.get("playerIds");
        String reason = (String) params.getOrDefault("reason", "违规操作");

        int success = 0;
        int failed = 0;

        for (String playerId : playerIds) {
            try {
                Player player = playerCacheService.getPlayer(playerId).orElse(null);
                if (player != null) {
                    player.setStatus(2);
                    playerCacheService.updatePlayer(player);
                    success++;
                } else {
                    failed++;
                }
            } catch (Exception e) {
                failed++;
                log.error("批量封禁失败: playerId={}", playerId, e);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", playerIds.size());
        result.put("success", success);
        result.put("failed", failed);

        log.info("批量封禁完成: 总数={}, 成功={}, 失败={}, 原因={}",
                playerIds.size(), success, failed, reason);

        return Result.success("批量封禁完成", result);
    }

    @ApiOperation("批量解封玩家")
    @PostMapping("/unban")
    public Result<Map<String, Object>> batchUnban(@RequestBody Map<String, Object> params) {
        List<String> playerIds = (List<String>) params.get("playerIds");

        int success = 0;
        int failed = 0;

        for (String playerId : playerIds) {
            try {
                Player player = playerCacheService.getPlayer(playerId).orElse(null);
                if (player != null) {
                    player.setStatus(1);
                    playerCacheService.updatePlayer(player);
                    success++;
                } else {
                    failed++;
                }
            } catch (Exception e) {
                failed++;
                log.error("批量解封失败: playerId={}", playerId, e);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", playerIds.size());
        result.put("success", success);
        result.put("failed", failed);

        return Result.success("批量解封完成", result);
    }

    @ApiOperation("按条件批量查询玩家")
    @GetMapping("/query")
    public Result<List<PlayerEntity>> batchQuery(
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) Integer minVipLevel,
            @RequestParam(required = false) Long minCoins,
            @RequestParam(defaultValue = "100") int limit) {

        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(PlayerEntity::getStatus, status);
        }
        if (minVipLevel != null) {
            wrapper.ge(PlayerEntity::getVipLevel, minVipLevel);
        }
        if (minCoins != null) {
            wrapper.ge(PlayerEntity::getCoins, minCoins);
        }
        wrapper.orderByDesc(PlayerEntity::getCoins).last("LIMIT " + limit);

        List<PlayerEntity> players = playerMapper.selectList(wrapper);
        return Result.success(players);
    }
}
