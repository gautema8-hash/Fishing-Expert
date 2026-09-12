package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 玩家登录日志实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_player_login_log")
public class PlayerLoginLogEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String playerId;
    private String loginType;
    private String loginIp;
    private String deviceInfo;
    private Integer loginResult;
    private String failReason;
    private LocalDateTime createdAt;
}
