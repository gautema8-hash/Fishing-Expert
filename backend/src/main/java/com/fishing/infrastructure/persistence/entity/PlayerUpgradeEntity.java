package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 玩家炮台升级实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_upgrade")
public class PlayerUpgradeEntity extends BaseEntity {

    private String playerId;
    private Integer firepowerLevel;
    private Integer fireRateLevel;
    private Integer critLevel;
    private Integer coinBonusLevel;
}
