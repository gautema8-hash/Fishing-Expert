package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 游戏记录实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_game_record")
public class GameRecordEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String playerId;
    private String gameType;
    private Integer level;
    private Integer kills;
    private Integer bossKills;
    private Integer bulletsFired;
    private Integer critCount;
    private Long coinsEarned;
    private Long coinsSpent;
    private Integer duration;
    private Long score;
    private Integer stars;
    private LocalDateTime createdAt;
}
