package com.fishing.common.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 管理员操作日志注解
 * 标记需要记录操作日志的管理端方法，由OperationLogAspect切面自动落库
 *
 * @author 后端架构组
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AdminOperationLog {

    /**
     * 操作描述，如"生成兑换码"
     */
    String operation();

    /**
     * 所属模块，如 redemption / config / player
     */
    String module();
}
