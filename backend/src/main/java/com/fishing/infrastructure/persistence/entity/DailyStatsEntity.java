package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 每日数据统计实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_daily_stats")
public class DailyStatsEntity implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 统计日期 */
    private LocalDate statDate;

    /** 新增玩家数 */
    private Integer newPlayers;

    /** 活跃玩家数 */
    private Integer activePlayers;

    /** 总充值金额 */
    private BigDecimal totalRecharge;

    /** 充值次数 */
    private Integer rechargeCount;

    /** 总获得金币 */
    private Long totalCoinsEarned;

    /** 总消耗金币 */
    private Long totalCoinsSpent;

    /** 总击杀数 */
    private Integer totalKills;

    /** 总发射数 */
    private Integer totalBullets;

    /** BOSS击杀数 */
    private Integer bossKills;

    /** 平均在线人数 */
    private Integer avgOnline;

    /** 峰值在线人数 */
    private Integer peakOnline;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
