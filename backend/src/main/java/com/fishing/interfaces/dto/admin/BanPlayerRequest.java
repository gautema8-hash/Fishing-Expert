package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;

/**
 * 封禁玩家请求DTO
 *
 * @author 后端架构组
 */
@Data
public class BanPlayerRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 封禁原因
     */
    @NotBlank(message = "封禁原因不能为空")
    private String reason;

    /**
     * 封禁时长(小时)，null或不填表示永久封禁
     */
    private Integer durationHours;
}
