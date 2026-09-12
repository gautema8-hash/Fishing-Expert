package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 玩家装备实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_equipment")
public class PlayerEquipmentEntity extends BaseEntity {

    private String playerId;
    private String equipUid;
    private String equipId;
    private String equipName;
    private String slotType;
    private String rarity;
    private Integer enhanceLevel;
    private Boolean isEquipped;
    private String statsJson;
}
