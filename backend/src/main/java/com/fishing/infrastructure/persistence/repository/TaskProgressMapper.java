package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.TaskProgressEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * TaskProgress Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface TaskProgressMapper extends BaseMapper<TaskProgressEntity> {
}
