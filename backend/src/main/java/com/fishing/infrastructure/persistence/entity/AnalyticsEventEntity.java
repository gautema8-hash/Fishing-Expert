package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 埋点事件实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_analytics_event")
public class AnalyticsEventEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String playerId;
    private String eventType;
    private String eventName;
    private String eventData;
    private String deviceInfo;
    private String ipAddress;
    private LocalDateTime createdAt;
}
