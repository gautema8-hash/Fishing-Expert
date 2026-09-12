package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 管理员操作日志实体
 * 不继承BaseEntity（无逻辑删除，仅记录创建时间）
 *
 * @author 后端架构组
 */
@Data
@TableName("t_admin_operation_log")
public class AdminOperationLogEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 管理员ID
     */
    private Long adminId;

    /**
     * 管理员用户名
     */
    private String adminName;

    /**
     * 操作描述
     */
    private String operation;

    /**
     * 所属模块
     */
    private String module;

    /**
     * 操作目标ID
     */
    private String targetId;

    /**
     * 请求参数JSON
     */
    private String paramsJson;

    /**
     * IP地址
     */
    private String ipAddress;

    /**
     * UserAgent
     */
    private String userAgent;

    /**
     * 结果 success/fail
     */
    private String result;

    /**
     * 错误信息
     */
    private String errorMsg;

    /**
     * 耗时(毫秒)
     */
    private Integer durationMs;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
