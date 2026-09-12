package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminMailService;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import com.fishing.interfaces.dto.admin.PageResult;
import com.fishing.interfaces.dto.admin.SendMailRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.Map;

/**
 * 管理端邮件API控制器
 * 注意：与现有 /admin/mail 路径分离，不影响旧控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端邮件API")
@RestController
@RequestMapping("/admin/api/mail")
@RequiredArgsConstructor
public class AdminMailApiController {

    private final AdminMailService adminMailService;

    @ApiOperation("发送邮件（单发或全服群发）")
    @RequiresPermission("mail:send")
    @PostMapping("/send")
    public Result<Map<String, Object>> sendMail(@Valid @RequestBody SendMailRequest request) {
        return Result.success("发送成功", adminMailService.sendMail(request));
    }

    @ApiOperation("邮件列表")
    @RequiresPermission("mail:view")
    @GetMapping("/list")
    public Result<PageResult<Map<String, Object>>> getMailList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(adminMailService.getMailList(page, size));
    }

    @ApiOperation("邮件详情")
    @RequiresPermission("mail:view")
    @GetMapping("/{mailId}")
    public Result<Map<String, Object>> getMailDetail(@PathVariable("mailId") Long mailId) {
        return Result.success(adminMailService.getMailDetail(mailId));
    }
}
