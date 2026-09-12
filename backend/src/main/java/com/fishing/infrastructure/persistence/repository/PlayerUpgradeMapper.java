package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerUpgradeEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * PlayerUpgrade Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerUpgradeMapper extends BaseMapper<PlayerUpgradeEntity> {
}
