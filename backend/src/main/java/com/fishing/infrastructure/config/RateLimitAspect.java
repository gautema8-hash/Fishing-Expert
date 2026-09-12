package com.fishing.infrastructure.config;

import com.fishing.common.annotation.RateLimit;
import com.fishing.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.util.concurrent.TimeUnit;

/**
 * 接口限流AOP切面
 *
 * @author 后端架构组
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String RATE_LIMIT_PREFIX = "fishing:ratelimit:";

    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request = getRequest();
        if (request == null) {
            return joinPoint.proceed();
        }

        // 构建限流key: 前缀 + 方法名 + IP
        String methodName = joinPoint.getSignature().getName();
        String ip = getClientIp(request);
        String cacheKey = RATE_LIMIT_PREFIX + rateLimit.key() + ":" + methodName + ":" + ip;

        try {
            // 使用Redis INCR实现滑动窗口限流
            Long count = redisTemplate.opsForValue().increment(cacheKey);
            if (count != null && count == 1) {
                redisTemplate.expire(cacheKey, rateLimit.window(), TimeUnit.SECONDS);
            }

            if (count != null && count > rateLimit.limit()) {
                log.warn("接口限流触发: method={}, ip={}, count={}", methodName, ip, count);
                throw new BusinessException(429, rateLimit.message());
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            // Redis异常时降级放行，不影响业务
            log.warn("限流检查异常，降级放行: {}", e.getMessage());
        }

        return joinPoint.proceed();
    }

    /**
     * 获取当前请求
     */
    private HttpServletRequest getRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    /**
     * 获取客户端IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多级代理时取第一个IP
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "unknown";
    }
}
