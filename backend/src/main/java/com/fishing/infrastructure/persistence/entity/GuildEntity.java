package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 公会实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_guild")
public class GuildEntity extends BaseEntity {

    private String guildId;
    private String guildName;
    private String leaderId;
    private Integer guildLevel;
    private Long guildExp;
    private Integer memberCount;
    private Integer memberMax;
    private String description;
}
