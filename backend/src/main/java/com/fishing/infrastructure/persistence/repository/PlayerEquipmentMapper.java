package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerEquipmentEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 玩家装备Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerEquipmentMapper extends BaseMapper<PlayerEquipmentEntity> {
}
