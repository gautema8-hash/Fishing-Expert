package com.fishing.application.service;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.PlayerEquipmentEntity;
import com.fishing.infrastructure.persistence.repository.PlayerEquipmentMapper;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 装备系统应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EquipmentAppService {

    private final PlayerEquipmentMapper equipmentMapper;
    private final PlayerCacheService playerCacheService;

    /**
     * 获取玩家装备列表
     */
    public List<PlayerEquipmentEntity> getEquipmentList(String playerId) {
        return equipmentMapper.selectList(
                new LambdaQueryWrapper<PlayerEquipmentEntity>()
                        .eq(PlayerEquipmentEntity::getPlayerId, playerId)
                        .orderByDesc(PlayerEquipmentEntity::getIsEquipped)
                        .orderByDesc(PlayerEquipmentEntity::getEnhanceLevel)
        );
    }

    /**
     * 获取已装备的装备
     */
    public List<PlayerEquipmentEntity> getEquippedList(String playerId) {
        return equipmentMapper.selectList(
                new LambdaQueryWrapper<PlayerEquipmentEntity>()
                        .eq(PlayerEquipmentEntity::getPlayerId, playerId)
                        .eq(PlayerEquipmentEntity::getIsEquipped, true)
        );
    }

    /**
     * 穿戴装备
     */
    @Transactional(rollbackFor = Exception.class)
    public void equipItem(String playerId, Long equipId) {
        PlayerEquipmentEntity equipment = equipmentMapper.selectById(equipId);
        if (equipment == null || !equipment.getPlayerId().equals(playerId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        // 卸下同部位已装备的
        equipmentMapper.selectList(
                new LambdaQueryWrapper<PlayerEquipmentEntity>()
                        .eq(PlayerEquipmentEntity::getPlayerId, playerId)
                        .eq(PlayerEquipmentEntity::getSlotType, equipment.getSlotType())
                        .eq(PlayerEquipmentEntity::getIsEquipped, true)
        ).forEach(e -> {
            e.setIsEquipped(false);
            equipmentMapper.updateById(e);
        });

        // 穿戴新装备
        equipment.setIsEquipped(true);
        equipmentMapper.updateById(equipment);
        log.info("装备穿戴成功: playerId={}, equipId={}", playerId, equipId);
    }

    /**
     * 卸下装备
     */
    @Transactional(rollbackFor = Exception.class)
    public void unequipItem(String playerId, Long equipId) {
        PlayerEquipmentEntity equipment = equipmentMapper.selectById(equipId);
        if (equipment == null || !equipment.getPlayerId().equals(playerId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        equipment.setIsEquipped(false);
        equipmentMapper.updateById(equipment);
    }

    /**
     * 强化装备
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> enhanceEquipment(String playerId, Long equipId) {
        PlayerEquipmentEntity equipment = equipmentMapper.selectById(equipId);
        if (equipment == null || !equipment.getPlayerId().equals(playerId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 强化消耗：等级*1000金币
        int cost = (equipment.getEnhanceLevel() + 1) * 1000;
        if (!player.spendCoins(cost)) {
            throw new BusinessException(ResultCode.COINS_INSUFFICIENT);
        }
        playerCacheService.updatePlayer(player);

        // 强化成功率：基础80%，每级递减5%
        double successRate = Math.max(0.3, 0.8 - equipment.getEnhanceLevel() * 0.05);
        boolean success = Math.random() < successRate;

        if (success) {
            equipment.setEnhanceLevel(equipment.getEnhanceLevel() + 1);
            equipmentMapper.updateById(equipment);
        }

        Map<String, Object> result = new HashMap<>(4);
        result.put("success", success);
        result.put("enhanceLevel", equipment.getEnhanceLevel());
        result.put("cost", cost);
        return result;
    }

    /**
     * 分解装备
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> decomposeEquipment(String playerId, Long equipId) {
        PlayerEquipmentEntity equipment = equipmentMapper.selectById(equipId);
        if (equipment == null || !equipment.getPlayerId().equals(playerId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (Boolean.TRUE.equals(equipment.getIsEquipped())) {
            throw new BusinessException("已装备的物品不能分解，请先卸下");
        }

        // 分解返还金币：品质*强化等级*500
        int rarityMultiplier;
        switch (equipment.getRarity()) {
            case "legendary":
                rarityMultiplier = 10;
                break;
            case "epic":
                rarityMultiplier = 5;
                break;
            case "rare":
                rarityMultiplier = 3;
                break;
            default:
                rarityMultiplier = 1;
        }
        long refundCoins = (long) rarityMultiplier * (equipment.getEnhanceLevel() + 1) * 500;

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));
        player.addCoins(refundCoins);
        playerCacheService.updatePlayer(player);

        equipmentMapper.deleteById(equipId);

        Map<String, Object> result = new HashMap<>(4);
        result.put("refundCoins", refundCoins);
        result.put("coins", player.getCoins());
        return result;
    }

    /**
     * 发放装备（运营/抽卡）
     */
    @Transactional(rollbackFor = Exception.class)
    public PlayerEquipmentEntity grantEquipment(String playerId, String equipId, String equipName,
                                                 String slotType, String rarity, String statsJson) {
        PlayerEquipmentEntity equipment = new PlayerEquipmentEntity();
        equipment.setPlayerId(playerId);
        equipment.setEquipUid(IdUtil.fastSimpleUUID());
        equipment.setEquipId(equipId);
        equipment.setEquipName(equipName);
        equipment.setSlotType(slotType);
        equipment.setRarity(rarity);
        equipment.setEnhanceLevel(0);
        equipment.setIsEquipped(false);
        equipment.setStatsJson(statsJson);
        equipmentMapper.insert(equipment);
        log.info("装备发放成功: playerId={}, equipId={}, rarity={}", playerId, equipId, rarity);
        return equipment;
    }
}
