package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 玩家Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerMapper extends BaseMapper<PlayerEntity> {
}
