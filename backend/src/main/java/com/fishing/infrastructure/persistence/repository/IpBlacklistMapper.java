package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.IpBlacklistEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * IP黑名单Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface IpBlacklistMapper extends BaseMapper<IpBlacklistEntity> {
}
