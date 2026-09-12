package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 玩家邮件实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player_mail")
public class PlayerMailEntity extends BaseEntity {

    private String playerId;
    private String mailType;
    private String title;
    private String sender;
    private String content;
    private String attachments;
    private Boolean isRead;
    private Boolean isClaimed;
    private LocalDateTime readAt;
    private LocalDateTime claimedAt;
    private LocalDateTime expiredAt;
}
