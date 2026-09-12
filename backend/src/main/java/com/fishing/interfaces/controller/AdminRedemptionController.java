package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminRedemptionService;
import com.fishing.common.annotation.AdminOperationLog;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.persistence.entity.RedemptionCodeEntity;
import com.fishing.interfaces.dto.admin.CreateRedemptionRequest;
import com.fishing.interfaces.dto.admin.PageResult;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * 管理端兑换码控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端兑换码管理")
@RestController
@RequestMapping("/admin/api/redemption-codes")
@RequiredArgsConstructor
public class AdminRedemptionController {

    private final AdminRedemptionService adminRedemptionService;

    @ApiOperation("分页查询兑换码列表")
    @RequiresPermission("redemption:manage")
    @GetMapping
    public Result<PageResult<RedemptionCodeEntity>> getCodeList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {
        return Result.success(adminRedemptionService.getCodeList(page, size, keyword));
    }

    @ApiOperation("批量生成兑换码")
    @RequiresPermission("redemption:manage")
    @AdminOperationLog(operation = "批量生成兑换码", module = "redemption")
    @PostMapping
    public Result<List<RedemptionCodeEntity>> generateCodes(@Valid @RequestBody CreateRedemptionRequest request) {
        return Result.success("生成成功", adminRedemptionService.generateCodes(request));
    }

    @ApiOperation("停用兑换码")
    @RequiresPermission("redemption:manage")
    @AdminOperationLog(operation = "停用兑换码", module = "redemption")
    @DeleteMapping("/{code}")
    public Result<String> deleteCode(@PathVariable String code) {
        adminRedemptionService.deleteCode(code);
        return Result.success("兑换码已停用");
    }

    @ApiOperation("分页查询兑换使用记录")
    @RequiresPermission("redemption:manage")
    @GetMapping("/records")
    public Result<PageResult<Map<String, Object>>> getRedeemRecords(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String playerId) {
        return Result.success(adminRedemptionService.getRedeemRecords(page, size, code, playerId));
    }
}
