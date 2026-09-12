package com.fishing.common.annotation;

import java.lang.annotation.*;

/**
 * 接口限流注解
 *
 * @author 后端架构组
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RateLimit {

    /**
     * 限流key前缀
     */
    String key() default "";

    /**
     * 时间窗口（秒）
     */
    int window() default 60;

    /**
     * 窗口内最大请求数
     */
    int limit() default 100;

    /**
     * 限流提示消息
     */
    String message() default "请求过于频繁，请稍后再试";
}
