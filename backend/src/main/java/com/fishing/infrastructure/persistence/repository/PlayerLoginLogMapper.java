package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerLoginLogEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * PlayerLoginLog Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerLoginLogMapper extends BaseMapper<PlayerLoginLogEntity> {
}
