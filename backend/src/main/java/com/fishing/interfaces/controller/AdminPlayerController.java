package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminPlayerService;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import com.fishing.interfaces.dto.admin.AdjustCoinRequest;
import com.fishing.interfaces.dto.admin.BanPlayerRequest;
import com.fishing.interfaces.dto.admin.PageResult;
import com.fishing.interfaces.dto.admin.SendMailRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.Map;

/**
 * 管理端-玩家管理控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端-玩家管理")
@RestController
@RequestMapping("/admin/api/players")
@RequiredArgsConstructor
public class AdminPlayerController {

    private final AdminPlayerService adminPlayerService;

    /**
     * 分页查询玩家列表
     */
    @ApiOperation("分页查询玩家列表")
    @RequiresPermission("player:view")
    @GetMapping
    public Result<PageResult<Map<String, Object>>> getPlayerList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(adminPlayerService.getPlayerList(page, size, keyword, status));
    }

    /**
     * 获取玩家详情
     */
    @ApiOperation("获取玩家详情")
    @RequiresPermission("player:view")
    @GetMapping("/{playerId}")
    public Result<Map<String, Object>> getPlayerDetail(@PathVariable String playerId) {
        return Result.success(adminPlayerService.getPlayerDetail(playerId));
    }

    /**
     * 封禁玩家
     */
    @ApiOperation("封禁玩家")
    @RequiresPermission("player:ban")
    @PostMapping("/{playerId}/ban")
    public Result<String> banPlayer(@PathVariable String playerId,
                                    @Valid @RequestBody BanPlayerRequest request) {
        adminPlayerService.banPlayer(playerId, request.getReason(), request.getDurationHours());
        return Result.success("封禁成功");
    }

    /**
     * 解封玩家
     */
    @ApiOperation("解封玩家")
    @RequiresPermission("player:ban")
    @PostMapping("/{playerId}/unban")
    public Result<String> unbanPlayer(@PathVariable String playerId) {
        adminPlayerService.unbanPlayer(playerId);
        return Result.success("解封成功");
    }

    /**
     * 调整玩家金币
     */
    @ApiOperation("调整玩家金币")
    @RequiresPermission("player:adjust")
    @PostMapping("/{playerId}/adjust-coins")
    public Result<String> adjustCoins(@PathVariable String playerId,
                                      @Valid @RequestBody AdjustCoinRequest request) {
        adminPlayerService.adjustCoins(playerId, request.getAmount(), request.getReason());
        return Result.success("调整成功");
    }

    /**
     * 调整玩家钻石
     */
    @ApiOperation("调整玩家钻石")
    @RequiresPermission("player:adjust")
    @PostMapping("/{playerId}/adjust-diamonds")
    public Result<String> adjustDiamonds(@PathVariable String playerId,
                                         @Valid @RequestBody AdjustCoinRequest request) {
        adminPlayerService.adjustDiamonds(playerId, request.getAmount().intValue(), request.getReason());
        return Result.success("调整成功");
    }

    /**
     * 向玩家发送邮件
     */
    @ApiOperation("向玩家发送邮件")
    @RequiresPermission("player:mail")
    @PostMapping("/{playerId}/send-mail")
    public Result<String> sendMail(@PathVariable String playerId,
                                   @Valid @RequestBody SendMailRequest request) {
        adminPlayerService.sendMailToPlayer(playerId, request.getTitle(), request.getContent(), request.getAttachments());
        return Result.success("邮件发送成功");
    }
}
