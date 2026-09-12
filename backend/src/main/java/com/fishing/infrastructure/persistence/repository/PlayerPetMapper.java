package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerPetEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * PlayerPet Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerPetMapper extends BaseMapper<PlayerPetEntity> {
}
