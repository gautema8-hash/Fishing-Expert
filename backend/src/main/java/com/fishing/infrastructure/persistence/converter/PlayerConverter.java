package com.fishing.infrastructure.persistence.converter;

import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import org.springframework.beans.BeanUtils;

/**
 * 玩家转换器 - 领域模型与实体互转
 *
 * @author 后端架构组
 */
public class PlayerConverter {

    private PlayerConverter() {
    }

    /**
     * 实体转领域模型
     */
    public static Player toDomain(PlayerEntity entity) {
        if (entity == null) {
            return null;
        }
        Player player = new Player();
        BeanUtils.copyProperties(entity, player);
        return player;
    }

    /**
     * 领域模型转实体
     */
    public static PlayerEntity toEntity(Player player) {
        if (player == null) {
            return null;
        }
        PlayerEntity entity = new PlayerEntity();
        BeanUtils.copyProperties(player, entity);
        return entity;
    }
}
