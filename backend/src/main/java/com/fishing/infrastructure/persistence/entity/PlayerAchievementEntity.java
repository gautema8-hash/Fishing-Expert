package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 玩家成就实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_achievement")
public class PlayerAchievementEntity extends BaseEntity {

    private String playerId;
    private String achievementId;
    private Integer progress;
    private Boolean isUnlocked;
    private Boolean isClaimed;
    private LocalDateTime unlockedAt;
    private LocalDateTime claimedAt;
}
