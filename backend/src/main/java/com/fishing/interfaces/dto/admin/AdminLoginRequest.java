package com.fishing.interfaces.dto.admin;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;

/**
 * 管理员登录请求DTO
 *
 * @author 后端架构组
 */
@Data
public class AdminLoginRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 登录用户名
     */
    @NotBlank(message = "用户名不能为空")
    private String username;

    /**
     * 登录密码
     */
    @NotBlank(message = "密码不能为空")
    private String password;
}
