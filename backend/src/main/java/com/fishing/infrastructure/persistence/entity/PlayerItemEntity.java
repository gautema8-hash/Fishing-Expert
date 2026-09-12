package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 玩家道具实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_item")
public class PlayerItemEntity extends BaseEntity {

    private String playerId;
    private String itemType;
    private Integer itemCount;
}
