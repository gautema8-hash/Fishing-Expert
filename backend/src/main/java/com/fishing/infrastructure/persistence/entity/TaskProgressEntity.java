package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 任务进度实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_task_progress")
public class TaskProgressEntity extends BaseEntity {

    private String playerId;
    private String taskId;
    private String taskType;
    private Integer progress;
    private Boolean isCompleted;
    private Boolean isClaimed;
    private LocalDateTime completedAt;
    private LocalDateTime claimedAt;
    private LocalDate resetDate;
}
