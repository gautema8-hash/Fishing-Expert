package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * IP黑名单实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_ip_blacklist")
public class IpBlacklistEntity implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** IP地址 */
    private String ip;

    /** 封禁原因 */
    private String reason;

    /** 封禁类型：permanent永久/temporary临时 */
    private String banType;

    /** 过期时间 */
    private LocalDateTime expireAt;

    /** 创建人 */
    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
