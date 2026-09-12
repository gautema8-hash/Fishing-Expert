package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 创建兑换码请求DTO
 *
 * @author 后端架构组
 */
@Data
public class CreateRedemptionRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 兑换码前缀
     */
    @NotBlank(message = "兑换码前缀不能为空")
    private String codePrefix;

    /**
     * 生成数量
     */
    @NotNull(message = "生成数量不能为空")
    private Integer count;

    /**
     * 奖励内容(JSON字符串)
     */
    @NotBlank(message = "奖励内容不能为空")
    private String rewardJson;

    /**
     * 过期时间
     */
    private LocalDateTime expiredAt;

    /**
     * 最大使用次数
     */
    private Integer maxUses;
}
