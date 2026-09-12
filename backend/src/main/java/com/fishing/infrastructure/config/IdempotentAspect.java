package com.fishing.infrastructure.config;

import com.fishing.common.annotation.Idempotent;
import com.fishing.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

/**
 * 幂等性AOP切面
 * 基于Redis实现接口幂等性控制
 *
 * @author 后端架构组
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class IdempotentAspect {

    private final RedisTemplate<String, Object> redisTemplate;

    @Around("@annotation(com.fishing.common.annotation.Idempotent)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Idempotent idempotent = method.getAnnotation(Idempotent.class);

        // 生成幂等Key：方法名 + 参数哈希
        String key = generateKey(joinPoint, idempotent);

        // 尝试设置Key（SETNX），成功则执行，失败则说明重复请求
        Boolean success = redisTemplate.opsForValue().setIfAbsent(
                key, "1", idempotent.duration(), idempotent.unit());

        if (Boolean.FALSE.equals(success)) {
            log.warn("重复请求拦截: key={}, method={}", key, method.getName());
            throw new BusinessException(idempotent.message());
        }

        try {
            return joinPoint.proceed();
        } catch (Throwable e) {
            // 执行失败时删除Key，允许重试
            redisTemplate.delete(key);
            throw e;
        }
    }

    /**
     * 生成幂等Key
     */
    private String generateKey(ProceedingJoinPoint joinPoint, Idempotent idempotent) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String methodName = signature.getDeclaringTypeName() + "." + signature.getName();

        // 简单的参数哈希
        StringBuilder sb = new StringBuilder();
        Object[] args = joinPoint.getArgs();
        for (Object arg : args) {
            if (arg != null) {
                sb.append(arg.hashCode());
            }
        }

        return idempotent.prefix() + methodName + ":" + sb.toString().hashCode();
    }
}
