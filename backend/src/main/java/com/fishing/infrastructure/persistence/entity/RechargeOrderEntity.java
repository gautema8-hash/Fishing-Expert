package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值订单实体
 *
 * @author 后端架构组
 */
@Data
@TableName("t_recharge_order")
public class RechargeOrderEntity implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 订单号 */
    private String orderNo;

    /** 玩家ID */
    private String playerId;

    /** 商品ID */
    private String productId;

    /** 商品名称 */
    private String productName;

    /** 支付金额（元） */
    private BigDecimal amount;

    /** 获得金币 */
    private Long coins;

    /** 获得钻石 */
    private Integer diamonds;

    /** 支付方式：wechat/alipay/apple */
    private String payMethod;

    /** 订单状态：0待支付 1已支付 2已发货 3已取消 4已退款 */
    private Integer status;

    /** 第三方支付流水号 */
    private String transactionId;

    /** 支付时间 */
    private LocalDateTime paidAt;

    /** 发货时间 */
    private LocalDateTime deliveredAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
