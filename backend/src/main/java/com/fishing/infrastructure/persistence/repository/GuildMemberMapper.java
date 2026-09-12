package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.GuildMemberEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * GuildMember Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface GuildMemberMapper extends BaseMapper<GuildMemberEntity> {
}
