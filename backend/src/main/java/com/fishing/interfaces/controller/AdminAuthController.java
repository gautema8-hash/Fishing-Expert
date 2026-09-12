package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminUserService;
import com.fishing.common.context.AdminContext;
import com.fishing.common.result.Result;
import com.fishing.interfaces.dto.admin.AdminLoginRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.Map;

/**
 * 管理员认证控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理员认证")
@RestController
@RequestMapping("/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminUserService adminUserService;

    /**
     * 管理员登录
     */
    @ApiOperation("管理员登录")
    @PostMapping("/login")
    public Result<Map<String, Object>> login(@Valid @RequestBody AdminLoginRequest request,
                                             HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        Map<String, Object> result = adminUserService.login(request.getUsername(), request.getPassword(), ip);
        return Result.success("登录成功", result);
    }

    /**
     * 管理员登出（前端删除token即可，后端记录登出日志）
     */
    @ApiOperation("管理员登出")
    @PostMapping("/logout")
    public Result<String> logout() {
        AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
        if (admin != null) {
            // 后续模块可在此记录登出日志
        }
        return Result.success("登出成功", null);
    }

    /**
     * 获取当前登录管理员信息
     */
    @ApiOperation("获取当前管理员信息")
    @GetMapping("/info")
    public Result<Map<String, Object>> info() {
        AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
        if (admin == null) {
            return Result.fail(401, "未登录");
        }
        Map<String, Object> adminInfo = adminUserService.getAdminInfo(admin.getAdminId());
        return Result.success(adminInfo);
    }

    /**
     * 获取客户端真实IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
