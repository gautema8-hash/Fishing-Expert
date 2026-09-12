package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.RechargeOrderEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 充值订单Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface RechargeOrderMapper extends BaseMapper<RechargeOrderEntity> {
}
