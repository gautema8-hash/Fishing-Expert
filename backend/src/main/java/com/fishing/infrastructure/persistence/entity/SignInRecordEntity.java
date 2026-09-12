package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 签到记录实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_sign_in_record")
public class SignInRecordEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String playerId;
    private LocalDate signDate;
    private Integer consecutiveDays;
    private String rewardJson;
    private LocalDateTime createdAt;
}
