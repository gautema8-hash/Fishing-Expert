package com.fishing.common.annotation;

import java.lang.annotation.*;

/**
 * API版本注解
 * 用于标记Controller的API版本
 * 使用方式：@ApiVersion(1) 表示 /api/v1/xxx
 *
 * @author 后端架构组
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApiVersion {

    /**
     * 版本号，从1开始
     */
    int value() default 1;
}
