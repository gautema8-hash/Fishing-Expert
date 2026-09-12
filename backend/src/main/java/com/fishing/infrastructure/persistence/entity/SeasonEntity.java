package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 赛季实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_season")
public class SeasonEntity extends BaseEntity {

    private String seasonId;
    private String seasonName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer maxLevel;
    private Boolean isActive;
}
