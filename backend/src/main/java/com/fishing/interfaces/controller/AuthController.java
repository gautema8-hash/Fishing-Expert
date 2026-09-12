package com.fishing.interfaces.controller;

import com.fishing.application.service.PlayerAppService;
import com.fishing.common.annotation.RateLimit;
import com.fishing.common.result.Result;
import com.fishing.interfaces.dto.LoginDTO;
import com.fishing.interfaces.dto.RegisterDTO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 *
 * @author 后端架构组
 */
@Api(tags = "认证管理")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final PlayerAppService playerAppService;

    /**
     * 玩家注册
     */
    @ApiOperation("玩家注册")
    @RateLimit(key = "register", window = 60, limit = 10, message = "注册过于频繁，请稍后再试")
    @PostMapping("/register")
    public Result<Map<String, Object>> register(@Validated @RequestBody RegisterDTO dto) {
        Map<String, Object> result = playerAppService.register(dto.getPhone(), dto.getPassword(), dto.getNickname());
        return Result.success("注册成功", result);
    }

    /**
     * 玩家登录
     */
    @ApiOperation("玩家登录")
    @RateLimit(key = "login", window = 60, limit = 20, message = "登录过于频繁，请稍后再试")
    @PostMapping("/login")
    public Result<Map<String, Object>> login(@Validated @RequestBody LoginDTO dto) {
        Map<String, Object> result = playerAppService.login(dto.getPhone(), dto.getPassword());
        return Result.success("登录成功", result);
    }

    /**
     * 游客登录
     */
    @ApiOperation("游客登录")
    @PostMapping("/guest")
    public Result<Map<String, Object>> guestLogin() {
        Map<String, Object> result = playerAppService.guestLogin();
        return Result.success("游客登录成功", result);
    }
}
