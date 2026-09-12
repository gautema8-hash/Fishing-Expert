package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.PlayerMailEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * PlayerMail Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface PlayerMailMapper extends BaseMapper<PlayerMailEntity> {
}
