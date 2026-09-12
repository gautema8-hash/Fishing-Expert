package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 好友关系实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_friend_relation")
public class FriendRelationEntity extends BaseEntity {

    private String playerId;
    private String friendId;
    private Integer relationType;
}
