package com.fishing.interfaces.controller;

import com.fishing.application.service.EquipmentAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.PlayerEquipmentEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 装备控制器
 *
 * @author 后端架构组
 */
@Api(tags = "装备管理")
@RestController
@RequestMapping("/equipment")
@RequiredArgsConstructor
public class EquipmentController {

    private final EquipmentAppService equipmentAppService;

    @ApiOperation("获取装备列表")
    @GetMapping("/list")
    public Result<List<PlayerEquipmentEntity>> getEquipmentList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<PlayerEquipmentEntity> list = equipmentAppService.getEquipmentList(playerId);
        return Result.success(list);
    }

    @ApiOperation("获取已装备列表")
    @GetMapping("/equipped")
    public Result<List<PlayerEquipmentEntity>> getEquippedList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<PlayerEquipmentEntity> list = equipmentAppService.getEquippedList(playerId);
        return Result.success(list);
    }

    @ApiOperation("穿戴装备")
    @PostMapping("/{id}/equip")
    public Result<Void> equipItem(@PathVariable Long id) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        equipmentAppService.equipItem(playerId, id);
        return Result.success();
    }

    @ApiOperation("卸下装备")
    @PostMapping("/{id}/unequip")
    public Result<Void> unequipItem(@PathVariable Long id) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        equipmentAppService.unequipItem(playerId, id);
        return Result.success();
    }

    @ApiOperation("强化装备")
    @PostMapping("/{id}/enhance")
    public Result<Map<String, Object>> enhanceEquipment(@PathVariable Long id) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = equipmentAppService.enhanceEquipment(playerId, id);
        return Result.success(result);
    }

    @ApiOperation("分解装备")
    @PostMapping("/{id}/decompose")
    public Result<Map<String, Object>> decomposeEquipment(@PathVariable Long id) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = equipmentAppService.decomposeEquipment(playerId, id);
        return Result.success(result);
    }
}
