package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminMailService;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 运营邮件控制器（后台管理）
 *
 * @author 后端架构组
 */
@Api(tags = "运营邮件管理")
@RestController
@RequestMapping("/admin/mail")
@RequiredArgsConstructor
public class AdminMailController {

    private final AdminMailService adminMailService;

    /**
     * 全服群发邮件
     */
    @ApiOperation("全服群发邮件")
    @PostMapping("/send-all")
    public Result<Map<String, Object>> sendMailToAll(@RequestBody Map<String, String> params) {
        Map<String, Object> result = adminMailService.sendMailToAll(
                params.get("title"),
                params.get("content"),
                params.get("attachments"),
                params.get("sender")
        );
        return Result.success("群发成功", result);
    }

    /**
     * 向指定玩家发送邮件
     */
    @ApiOperation("向指定玩家发送邮件")
    @PostMapping("/send-to-player")
    public Result<Void> sendMailToPlayer(@RequestBody Map<String, String> params) {
        adminMailService.sendMailToPlayer(
                params.get("playerId"),
                params.get("title"),
                params.get("content"),
                params.get("attachments"),
                params.get("sender")
        );
        return Result.success();
    }

    /**
     * 发送补偿邮件
     */
    @ApiOperation("发送补偿邮件")
    @PostMapping("/compensation")
    public Result<Void> sendCompensationMail(@RequestBody Map<String, Object> params) {
        adminMailService.sendCompensationMail(
                (String) params.get("playerId"),
                (String) params.get("reason"),
                Long.parseLong(params.get("coins").toString()),
                Integer.parseInt(params.get("diamonds").toString())
        );
        return Result.success();
    }

    /**
     * 发送活动公告
     */
    @ApiOperation("发送活动公告")
    @PostMapping("/announcement")
    public Result<Map<String, Object>> sendAnnouncement(@RequestBody Map<String, String> params) {
        Map<String, Object> result = adminMailService.sendAnnouncement(
                params.get("title"),
                params.get("content")
        );
        return Result.success(result);
    }

    /**
     * 获取邮件统计
     */
    @ApiOperation("获取邮件统计")
    @GetMapping("/stats")
    public Result<Map<String, Object>> getMailStats() {
        Map<String, Object> stats = adminMailService.getMailStats();
        return Result.success(stats);
    }
}
