package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.RedemptionRecordEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * RedemptionRecord Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface RedemptionRecordMapper extends BaseMapper<RedemptionRecordEntity> {
}
