package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 玩家赛季进度实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_season")
public class PlayerSeasonEntity extends BaseEntity {

    private String playerId;
    private String seasonId;
    private Integer seasonLevel;
    private Integer seasonXp;
    private Long totalXp;
    private Boolean isPremium;
    private Integer dailyXp;
    private LocalDate lastDailyReset;
    private String claimedFree;
    private String claimedPremium;
}
