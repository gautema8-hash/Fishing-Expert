package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.GameAnnouncementEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 游戏公告Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface GameAnnouncementMapper extends BaseMapper<GameAnnouncementEntity> {
}
