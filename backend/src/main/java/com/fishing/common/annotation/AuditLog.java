package com.fishing.common.annotation;

import java.lang.annotation.*;

/**
 * 操作审计日志注解
 * 标记需要记录审计日志的方法
 *
 * @author 后端架构组
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AuditLog {

    /**
     * 操作描述
     */
    String value();

    /**
     * 操作类型
     */
    String type() default "OTHER";

    /**
     * 是否记录请求参数
     */
    boolean recordParams() default true;

    /**
     * 是否记录返回结果
     */
    boolean recordResult() default false;
}
