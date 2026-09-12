package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminOperationLogService;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.interfaces.dto.admin.PageResult;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理端操作日志控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端操作日志")
@RestController
@RequestMapping("/admin/api/operation-logs")
@RequiredArgsConstructor
public class AdminOperationLogController {

    private final AdminOperationLogService adminOperationLogService;

    @ApiOperation("分页查询操作日志")
    @RequiresPermission("log:view")
    @GetMapping
    public Result<PageResult<AdminOperationLogEntity>> getLogList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long adminId,
            @RequestParam(required = false) String module) {
        return Result.success(adminOperationLogService.getLogList(page, size, adminId, module));
    }

    @ApiOperation("查询操作日志详情")
    @RequiresPermission("log:view")
    @GetMapping("/{id}")
    public Result<AdminOperationLogEntity> getLogDetail(@PathVariable Long id) {
        return Result.success(adminOperationLogService.getLogDetail(id));
    }
}
