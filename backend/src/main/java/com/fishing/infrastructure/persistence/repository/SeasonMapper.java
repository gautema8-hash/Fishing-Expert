package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.SeasonEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Season Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface SeasonMapper extends BaseMapper<SeasonEntity> {
}
