package com.fishing.interfaces.controller;

import com.fishing.application.service.TaskAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 任务控制器
 *
 * @author 后端架构组
 */
@Api(tags = "任务管理")
@RestController
@RequestMapping("/task")
@RequiredArgsConstructor
public class TaskController {

    private final TaskAppService taskAppService;

    @ApiOperation("获取任务列表")
    @GetMapping("/list")
    public Result<List<Map<String, Object>>> getTaskList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<Map<String, Object>> list = taskAppService.getTaskList(playerId);
        return Result.success(list);
    }

    @ApiOperation("领取任务奖励")
    @PostMapping("/{taskId}/claim")
    public Result<Map<String, Object>> claimTaskReward(@PathVariable String taskId) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = taskAppService.claimTaskReward(playerId, taskId);
        return Result.success(result);
    }
}
