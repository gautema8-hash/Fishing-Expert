package com.fishing.interfaces.controller;

import com.fishing.application.service.MailAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.PlayerMailEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 邮件控制器
 *
 * @author 后端架构组
 */
@Api(tags = "邮件管理")
@RestController
@RequestMapping("/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailAppService mailAppService;

    @ApiOperation("获取邮件列表")
    @GetMapping("/list")
    public Result<List<PlayerMailEntity>> getMailList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<PlayerMailEntity> list = mailAppService.getMailList(playerId);
        return Result.success(list);
    }

    @ApiOperation("读取邮件")
    @PutMapping("/{id}/read")
    public Result<Void> readMail(@PathVariable Long id) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        mailAppService.readMail(playerId, id);
        return Result.success();
    }

    @ApiOperation("领取邮件附件")
    @PostMapping("/{id}/claim")
    public Result<Map<String, Object>> claimMailAttachment(@PathVariable Long id) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = mailAppService.claimMailAttachment(playerId, id);
        return Result.success(result);
    }

    @ApiOperation("获取未读邮件数量")
    @GetMapping("/unread-count")
    public Result<Long> getUnreadCount() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        long count = mailAppService.getUnreadCount(playerId);
        return Result.success(count);
    }
}
