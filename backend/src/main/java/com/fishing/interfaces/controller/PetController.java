package com.fishing.interfaces.controller;

import com.fishing.application.service.PetAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.PlayerPetEntity;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 宠物控制器
 *
 * @author 后端架构组
 */
@Api(tags = "宠物管理")
@RestController
@RequestMapping("/pet")
@RequiredArgsConstructor
public class PetController {

    private final PetAppService petAppService;

    @ApiOperation("获取宠物列表")
    @GetMapping("/list")
    public Result<List<PlayerPetEntity>> getPetList() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        List<PlayerPetEntity> list = petAppService.getPetList(playerId);
        return Result.success(list);
    }

    @ApiOperation("获取当前激活宠物")
    @GetMapping("/active")
    public Result<PlayerPetEntity> getActivePet() {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        PlayerPetEntity pet = petAppService.getActivePet(playerId);
        return Result.success(pet);
    }

    @ApiOperation("激活宠物")
    @PostMapping("/{petType}/activate")
    public Result<Void> activatePet(@PathVariable String petType) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        petAppService.activatePet(playerId, petType);
        return Result.success();
    }

    @ApiOperation("宠物升级")
    @PostMapping("/{petType}/upgrade")
    public Result<Map<String, Object>> upgradePet(@PathVariable String petType) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = petAppService.upgradePet(playerId, petType);
        return Result.success(result);
    }

    @ApiOperation("宠物升星")
    @PostMapping("/{petType}/star-up")
    public Result<Map<String, Object>> starUpPet(@PathVariable String petType) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        Map<String, Object> result = petAppService.starUpPet(playerId, petType);
        return Result.success(result);
    }
}
