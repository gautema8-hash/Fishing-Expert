package com.fishing.interfaces.controller;

import com.fishing.application.service.AdminAnnouncementService;
import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.persistence.entity.GameAnnouncementEntity;
import com.fishing.interfaces.dto.admin.CreateAnnouncementRequest;
import com.fishing.interfaces.dto.admin.PageResult;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

/**
 * 管理端公告控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端公告管理")
@RestController
@RequestMapping("/admin/api/announcements")
@RequiredArgsConstructor
public class AdminAnnouncementController {

    private final AdminAnnouncementService adminAnnouncementService;

    @ApiOperation("公告列表")
    @RequiresPermission("announcement:manage")
    @GetMapping
    public Result<PageResult<GameAnnouncementEntity>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(adminAnnouncementService.getAnnouncementList(page, size));
    }

    @ApiOperation("创建公告")
    @RequiresPermission("announcement:manage")
    @PostMapping
    public Result<GameAnnouncementEntity> create(@Valid @RequestBody CreateAnnouncementRequest request) {
        return Result.success("创建成功", adminAnnouncementService.createAnnouncement(request));
    }

    @ApiOperation("更新公告")
    @RequiresPermission("announcement:manage")
    @PutMapping("/{id}")
    public Result<GameAnnouncementEntity> update(@PathVariable("id") Long id,
                                                  @Valid @RequestBody CreateAnnouncementRequest request) {
        return Result.success("更新成功", adminAnnouncementService.updateAnnouncement(id, request));
    }

    @ApiOperation("删除公告")
    @RequiresPermission("announcement:manage")
    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable("id") Long id) {
        adminAnnouncementService.deleteAnnouncement(id);
        return Result.success("删除成功", "ok");
    }

    @ApiOperation("切换公告启用状态")
    @RequiresPermission("announcement:manage")
    @PostMapping("/{id}/toggle")
    public Result<String> toggle(@PathVariable("id") Long id) {
        adminAnnouncementService.toggleAnnouncement(id);
        return Result.success("操作成功", "ok");
    }
}
