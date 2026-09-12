package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerSeasonEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * PlayerSeason Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerSeasonMapper extends BaseMapper<PlayerSeasonEntity> {
}
