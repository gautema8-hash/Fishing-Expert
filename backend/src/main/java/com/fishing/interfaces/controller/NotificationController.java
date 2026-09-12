package com.fishing.interfaces.controller;

import com.fishing.application.service.NotificationService;
import com.fishing.common.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 通知推送控制器
 *
 * @author 后端架构组
 */
@Api(tags = "通知推送")
@RestController
@RequestMapping("/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @ApiOperation("获取当前系统公告")
    @GetMapping("/announcement")
    public Result<Map<String, Object>> getAnnouncement() {
        Map<String, Object> announcement = notificationService.getCurrentAnnouncement();
        return Result.success(announcement);
    }

    @ApiOperation("发布系统公告")
    @PostMapping("/announcement/publish")
    public Result<Map<String, Object>> publishAnnouncement(@RequestBody Map<String, Object> params) {
        String title = (String) params.get("title");
        String content = (String) params.get("content");
        String type = (String) params.getOrDefault("type", "system");
        int priority = Integer.parseInt(params.getOrDefault("priority", 1).toString());
        int duration = Integer.parseInt(params.getOrDefault("durationMinutes", 1440).toString());
        Map<String, Object> result = notificationService.publishAnnouncement(title, content, type, priority, duration);
        return Result.success("公告已发布", result);
    }

    @ApiOperation("获取滚动消息")
    @GetMapping("/scroll")
    public Result<List<Map<String, Object>>> getScrollMessages() {
        List<Map<String, Object>> messages = notificationService.getScrollMessages();
        return Result.success(messages);
    }

    @ApiOperation("添加滚动消息")
    @PostMapping("/scroll/add")
    public Result<String> addScrollMessage(@RequestBody Map<String, Object> params) {
        String content = (String) params.get("content");
        String type = (String) params.getOrDefault("type", "system");
        int duration = Integer.parseInt(params.getOrDefault("durationMinutes", 60).toString());
        notificationService.addScrollMessage(content, type, duration);
        return Result.success("滚动消息已添加");
    }

    @ApiOperation("清空滚动消息")
    @PostMapping("/scroll/clear")
    public Result<String> clearScrollMessages() {
        notificationService.clearScrollMessages();
        return Result.success("滚动消息已清空");
    }

    @ApiOperation("获取活动列表")
    @GetMapping("/activities")
    public Result<List<Map<String, Object>>> getActivities() {
        List<Map<String, Object>> activities = notificationService.getActivities();
        return Result.success(activities);
    }

    @ApiOperation("发布活动")
    @PostMapping("/activity/publish")
    public Result<Map<String, Object>> publishActivity(@RequestBody Map<String, Object> params) {
        String activityId = (String) params.get("id");
        String name = (String) params.get("name");
        String description = (String) params.getOrDefault("description", "");
        LocalDateTime startTime = LocalDateTime.parse((String) params.get("startTime"));
        LocalDateTime endTime = LocalDateTime.parse((String) params.get("endTime"));
        Map<String, Object> rewards = (Map<String, Object>) params.getOrDefault("rewards", new java.util.HashMap<>());
        Map<String, Object> result = notificationService.publishActivity(activityId, name, description, startTime, endTime, rewards);
        return Result.success("活动已发布", result);
    }

    @ApiOperation("发送全服邮件")
    @PostMapping("/global-mail")
    public Result<String> sendGlobalMail(@RequestBody Map<String, Object> params) {
        String title = (String) params.get("title");
        String content = (String) params.get("content");
        Long coins = Long.parseLong(params.getOrDefault("coins", 0).toString());
        Integer diamonds = Integer.parseInt(params.getOrDefault("diamonds", 0).toString());
        int expireDays = Integer.parseInt(params.getOrDefault("expireDays", 7).toString());
        notificationService.sendGlobalMail(title, content, coins, diamonds, expireDays);
        return Result.success("全服邮件已发送");
    }
}
