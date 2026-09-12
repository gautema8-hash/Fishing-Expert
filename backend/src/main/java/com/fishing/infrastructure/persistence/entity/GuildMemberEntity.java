package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 公会成员实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_guild_member")
public class GuildMemberEntity extends BaseEntity {

    private String guildId;
    private String playerId;
    private String role;
    private Long contribution;
    private LocalDateTime joinedAt;
}
