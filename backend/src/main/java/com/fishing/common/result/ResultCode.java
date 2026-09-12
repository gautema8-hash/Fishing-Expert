package com.fishing.common.result;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 响应码枚举
 *
 * @author 后端架构组
 */
@Getter
@AllArgsConstructor
public enum ResultCode {

    /**
     * 成功
     */
    SUCCESS(200, "操作成功"),

    /**
     * 失败
     */
    FAIL(500, "操作失败"),

    /**
     * 参数错误
     */
    PARAM_ERROR(400, "参数错误"),

    /**
     * 未授权
     */
    UNAUTHORIZED(401, "未授权或登录已过期"),

    /**
     * 禁止访问
     */
    FORBIDDEN(403, "禁止访问"),

    /**
     * 资源不存在
     */
    NOT_FOUND(404, "资源不存在"),

    /**
     * 系统异常
     */
    SYSTEM_ERROR(500, "系统异常，请稍后重试"),

    // ===== 业务错误码 1000-1999 =====

    /**
     * 用户不存在
     */
    USER_NOT_FOUND(1001, "用户不存在"),

    /**
     * 密码错误
     */
    PASSWORD_ERROR(1002, "密码错误"),

    /**
     * 用户已存在
     */
    USER_EXISTS(1003, "用户已存在"),

    /**
     * 金币不足
     */
    COINS_INSUFFICIENT(1004, "金币不足"),

    /**
     * 钻石不足
     */
    DIAMONDS_INSUFFICIENT(1005, "钻石不足"),

    /**
     * 道具不足
     */
    ITEM_INSUFFICIENT(1006, "道具不足"),

    /**
     * 兑换码无效
     */
    REDEMPTION_INVALID(1007, "兑换码无效或已使用"),

    /**
     * 等级不足
     */
    LEVEL_INSUFFICIENT(1008, "等级不足"),

    /**
     * VIP等级不足
     */
    VIP_INSUFFICIENT(1009, "VIP等级不足"),

    /**
     * 能量不足
     */
    ENERGY_INSUFFICIENT(1010, "能量不足"),

    /**
     * 今日已领取
     */
    ALREADY_CLAIMED(1011, "今日已领取"),

    /**
     * 账号被封禁
     */
    ACCOUNT_BANNED(1012, "账号已被封禁"),

    /**
     * 订单不存在
     */
    ORDER_NOT_FOUND(1013, "订单不存在"),

    /**
     * 公会不存在
     */
    GUILD_NOT_FOUND(1014, "公会不存在"),

    /**
     * 已是公会成员
     */
    ALREADY_IN_GUILD(1015, "已是公会成员"),

    /**
     * 好友已存在
     */
    FRIEND_EXISTS(1016, "好友已存在");

    private final Integer code;
    private final String message;
}
