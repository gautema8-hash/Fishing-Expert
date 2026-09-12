package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.DailyStatsEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 每日统计Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface DailyStatsMapper extends BaseMapper<DailyStatsEntity> {
}
