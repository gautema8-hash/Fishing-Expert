package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商城订单实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_shop_order")
public class ShopOrderEntity extends BaseEntity {

    private String orderNo;
    private String playerId;
    private String productId;
    private String productName;
    private BigDecimal amount;
    private String payType;
    private Integer payStatus;
    private LocalDateTime payTime;
    private String transactionId;
    private String rewardJson;
}
