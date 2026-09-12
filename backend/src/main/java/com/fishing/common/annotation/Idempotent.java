package com.fishing.common.annotation;

import java.lang.annotation.*;
import java.util.concurrent.TimeUnit;

/**
 * 接口幂等性注解
 * 标记需要保证幂等性的接口，防止重复提交
 *
 * @author 后端架构组
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Idempotent {

    /**
     * 幂等Key的前缀
     */
    String prefix() default "idempotent:";

    /**
     * 幂等有效期，默认5秒
     */
    long duration() default 5;

    /**
     * 时间单位
     */
    TimeUnit unit() default TimeUnit.SECONDS;

    /**
     * 提示信息
     */
    String message() default "请勿重复提交";
}
