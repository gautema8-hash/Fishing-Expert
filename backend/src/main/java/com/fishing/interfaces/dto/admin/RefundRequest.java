package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;

/**
 * 退款请求DTO
 *
 * @author 后端架构组
 */
@Data
public class RefundRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 退款原因
     */
    @NotBlank(message = "退款原因不能为空")
    private String reason;
}
