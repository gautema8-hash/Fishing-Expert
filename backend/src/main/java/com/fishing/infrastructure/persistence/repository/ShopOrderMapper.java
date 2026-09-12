package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fishing.infrastructure.persistence.entity.ShopOrderEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * ShopOrder Mapper
 *
 * @author 后端架构组
 */
@Mapper
public interface ShopOrderMapper extends BaseMapper<ShopOrderEntity> {
}
