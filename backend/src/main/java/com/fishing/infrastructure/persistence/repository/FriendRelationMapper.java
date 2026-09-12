package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.FriendRelationEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * FriendRelation Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface FriendRelationMapper extends BaseMapper<FriendRelationEntity> {
}
