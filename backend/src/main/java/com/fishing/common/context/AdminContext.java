package com.fishing.common.context;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 管理员上下文 - ThreadLocal保存当前登录管理员信息
 *
 * @author 后端架构组
 */
public class AdminContext {

    private static final ThreadLocal<AdminInfo> CURRENT_ADMIN = new ThreadLocal<>();

    /**
     * 设置当前管理员
     */
    public static void setCurrentAdmin(AdminInfo adminInfo) {
        CURRENT_ADMIN.set(adminInfo);
    }

    /**
     * 获取当前管理员
     */
    public static AdminInfo getCurrentAdmin() {
        return CURRENT_ADMIN.get();
    }

    /**
     * 清理当前管理员
     */
    public static void clear() {
        CURRENT_ADMIN.remove();
    }

    /**
     * 管理员信息
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminInfo {
        /**
         * 管理员ID
         */
        private Long adminId;

        /**
         * 用户名
         */
        private String username;

        /**
         * 角色
         */
        private String role;
    }
}
