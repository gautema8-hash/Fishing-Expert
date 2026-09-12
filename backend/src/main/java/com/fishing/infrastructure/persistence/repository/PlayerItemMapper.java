package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerItemEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 玩家道具Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerItemMapper extends BaseMapper<PlayerItemEntity> {
}
