package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.GameRecordEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * GameRecord Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface GameRecordMapper extends BaseMapper<GameRecordEntity> {
}
