package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.RedemptionCodeEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * RedemptionCode Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface RedemptionCodeMapper extends BaseMapper<RedemptionCodeEntity> {
}
