package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 操作日志实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_operation_log")
public class OperationLogEntity implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 玩家ID */
    private String playerId;

    /** 操作描述 */
    private String operation;

    /** 操作类型 */
    private String opType;

    /** 方法名 */
    private String method;

    /** 请求参数 */
    private String params;

    /** 返回结果 */
    private String result;

    /** IP地址 */
    private String ip;

    /** UserAgent */
    private String userAgent;

    /** 耗时(毫秒) */
    private Integer durationMs;

    /** 是否成功 */
    private Boolean success;

    /** 错误信息 */
    private String errorMsg;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
