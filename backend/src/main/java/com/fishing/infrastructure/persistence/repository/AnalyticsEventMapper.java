package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.AnalyticsEventEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * AnalyticsEvent Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface AnalyticsEventMapper extends BaseMapper<AnalyticsEventEntity> {
}
