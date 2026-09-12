package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 创建游戏公告请求DTO
 *
 * @author 后端架构组
 */
@Data
public class CreateAnnouncementRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 公告标题
     */
    @NotBlank(message = "公告标题不能为空")
    private String title;

    /**
     * 公告内容
     */
    private String content;

    /**
     * 类型 notice/activity/maintenance
     */
    private String type;

    /**
     * 优先级
     */
    private Integer priority;

    /**
     * 生效开始时间
     */
    private LocalDateTime startTime;

    /**
     * 生效结束时间
     */
    private LocalDateTime endTime;
}
