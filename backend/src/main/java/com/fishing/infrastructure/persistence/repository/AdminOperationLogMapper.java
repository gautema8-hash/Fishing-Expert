package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 管理员操作日志Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface AdminOperationLogMapper extends BaseMapper<AdminOperationLogEntity> {
}
