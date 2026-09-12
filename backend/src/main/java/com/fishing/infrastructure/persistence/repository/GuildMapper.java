package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.GuildEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * Guild Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface GuildMapper extends BaseMapper<GuildEntity> {
}
