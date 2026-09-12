package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.PlayerPetEntity;
import com.fishing.infrastructure.persistence.repository.PlayerPetMapper;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 宠物系统应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PetAppService {

    private final PlayerPetMapper petMapper;
    private final PlayerCacheService playerCacheService;

    /**
     * 获取玩家宠物列表
     */
    public List<PlayerPetEntity> getPetList(String playerId) {
        return petMapper.selectList(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .orderByDesc(PlayerPetEntity::getIsActive)
                        .orderByDesc(PlayerPetEntity::getStarLevel)
        );
    }

    /**
     * 获取当前激活宠物
     */
    public PlayerPetEntity getActivePet(String playerId) {
        return petMapper.selectOne(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .eq(PlayerPetEntity::getIsActive, true)
        );
    }

    /**
     * 激活宠物
     */
    @Transactional(rollbackFor = Exception.class)
    public void activatePet(String playerId, String petType) {
        PlayerPetEntity pet = petMapper.selectOne(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .eq(PlayerPetEntity::getPetType, petType)
        );
        if (pet == null) {
            throw new BusinessException("未拥有该宠物");
        }

        // 取消其他宠物激活
        petMapper.selectList(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .eq(PlayerPetEntity::getIsActive, true)
        ).forEach(p -> {
            p.setIsActive(false);
            petMapper.updateById(p);
        });

        // 激活新宠物
        pet.setIsActive(true);
        petMapper.updateById(pet);

        // 更新玩家当前宠物
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));
        player.setActivePet(petType);
        playerCacheService.updatePlayer(player);

        log.info("宠物激活成功: playerId={}, petType={}", playerId, petType);
    }

    /**
     * 宠物升级
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> upgradePet(String playerId, String petType) {
        PlayerPetEntity pet = petMapper.selectOne(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .eq(PlayerPetEntity::getPetType, petType)
        );
        if (pet == null) {
            throw new BusinessException("未拥有该宠物");
        }

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 升级消耗：等级*2000金币
        int cost = pet.getPetLevel() * 2000;
        if (!player.spendCoins(cost)) {
            throw new BusinessException(ResultCode.COINS_INSUFFICIENT);
        }
        playerCacheService.updatePlayer(player);

        pet.setPetLevel(pet.getPetLevel() + 1);
        pet.setPetExp(0);
        petMapper.updateById(pet);

        Map<String, Object> result = new HashMap<>(4);
        result.put("petLevel", pet.getPetLevel());
        result.put("cost", cost);
        return result;
    }

    /**
     * 宠物升星
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> starUpPet(String playerId, String petType) {
        PlayerPetEntity pet = petMapper.selectOne(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .eq(PlayerPetEntity::getPetType, petType)
        );
        if (pet == null) {
            throw new BusinessException("未拥有该宠物");
        }
        if (pet.getStarLevel() >= 5) {
            throw new BusinessException("宠物已达最高星");
        }

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 升星消耗钻石
        int cost = pet.getStarLevel() * 10;
        if (!player.spendDiamonds(cost)) {
            throw new BusinessException(ResultCode.DIAMONDS_INSUFFICIENT);
        }
        playerCacheService.updatePlayer(player);

        pet.setStarLevel(pet.getStarLevel() + 1);
        petMapper.updateById(pet);

        Map<String, Object> result = new HashMap<>(4);
        result.put("starLevel", pet.getStarLevel());
        result.put("cost", cost);
        return result;
    }

    /**
     * 发放宠物
     */
    @Transactional(rollbackFor = Exception.class)
    public PlayerPetEntity grantPet(String playerId, String petType, String petName) {
        PlayerPetEntity existing = petMapper.selectOne(
                new LambdaQueryWrapper<PlayerPetEntity>()
                        .eq(PlayerPetEntity::getPlayerId, playerId)
                        .eq(PlayerPetEntity::getPetType, petType)
        );
        if (existing != null) {
            throw new BusinessException("已拥有该宠物");
        }

        PlayerPetEntity pet = new PlayerPetEntity();
        pet.setPlayerId(playerId);
        pet.setPetType(petType);
        pet.setPetName(petName);
        pet.setPetLevel(1);
        pet.setPetExp(0);
        pet.setStarLevel(1);
        pet.setIsActive(false);
        petMapper.insert(pet);
        log.info("宠物发放成功: playerId={}, petType={}", playerId, petType);
        return pet;
    }
}
