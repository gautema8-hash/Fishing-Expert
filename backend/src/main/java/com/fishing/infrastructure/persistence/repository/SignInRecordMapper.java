package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.SignInRecordEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * SignInRecord Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface SignInRecordMapper extends BaseMapper<SignInRecordEntity> {
}
