package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.io.Serializable;

/**
 * 调整玩家金币请求DTO
 *
 * @author 后端架构组
 */
@Data
public class AdjustCoinRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 调整数量，正数增加，负数扣减
     */
    @NotNull(message = "调整数量不能为空")
    private Long amount;

    /**
     * 调整原因
     */
    @NotBlank(message = "调整原因不能为空")
    private String reason;
}
