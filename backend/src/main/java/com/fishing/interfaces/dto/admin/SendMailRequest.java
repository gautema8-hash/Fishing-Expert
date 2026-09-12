package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;

/**
 * 发送系统邮件请求DTO
 *
 * @author 后端架构组
 */
@Data
public class SendMailRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 目标玩家ID，为空表示全服发送
     */
    private String playerId;

    /**
     * 邮件标题
     */
    @NotBlank(message = "邮件标题不能为空")
    private String title;

    /**
     * 邮件内容
     */
    @NotBlank(message = "邮件内容不能为空")
    private String content;

    /**
     * 附件(JSON字符串)
     */
    private String attachments;
}
