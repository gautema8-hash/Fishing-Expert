package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 兑换码实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_redemption_code")
public class RedemptionCodeEntity extends BaseEntity {

    private String code;
    private String codeName;
    private String rewardJson;
    private Integer maxUses;
    private Integer usedCount;
    private LocalDateTime expiredAt;
    private Boolean isActive;
}
