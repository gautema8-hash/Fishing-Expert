package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 玩家宠物实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_pet")
public class PlayerPetEntity extends BaseEntity {

    private String playerId;
    private String petType;
    private String petName;
    private Integer petLevel;
    private Integer petExp;
    private Integer starLevel;
    private Boolean isActive;
}
