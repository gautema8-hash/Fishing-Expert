package com.fishing.interfaces.controller;

import com.fishing.application.service.SignInAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 签到控制器
 *
 * @author 后端架构组
 */
@Api(tags = "签到管理")
@RestController
@RequestMapping("/signin")
@RequiredArgsConstructor
public class SignInController {

    private final SignInAppService signInAppService;

    @ApiOperation("每日签到")
    @PostMapping
    public Result<Map<String, Object>> signIn() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = signInAppService.signIn(playerId);
        return Result.success("签到成功", result);
    }

    @ApiOperation("获取签到状态")
    @GetMapping("/status")
    public Result<Map<String, Object>> getSignInStatus() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = signInAppService.getSignInStatus(playerId);
        return Result.success(result);
    }
}
