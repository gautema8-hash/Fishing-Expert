package com.fishing.infrastructure.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fishing.common.annotation.AuditLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 操作审计日志AOP切面
 * 记录管理操作的详细日志
 *
 * @author 后端架构组
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditLogAspect {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Around("@annotation(com.fishing.common.annotation.AuditLog)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        AuditLog auditLog = method.getAnnotation(AuditLog.class);

        long startTime = System.currentTimeMillis();
        LocalDateTime operationTime = LocalDateTime.now();
        String methodName = signature.getDeclaringTypeName() + "." + signature.getName();

        // 构建审计日志
        Map<String, Object> auditInfo = new HashMap<>();
        auditInfo.put("operation", auditLog.value());
        auditInfo.put("type", auditLog.type());
        auditInfo.put("method", methodName);
        auditInfo.put("time", operationTime.toString());

        // 记录请求参数
        if (auditLog.recordParams()) {
            try {
                Object[] args = joinPoint.getArgs();
                String[] paramNames = signature.getParameterNames();
                Map<String, Object> params = new HashMap<>();
                for (int i = 0; i < args.length && paramNames != null && i < paramNames.length; i++) {
                    if (args[i] != null && !isSensitiveParam(paramNames[i])) {
                        params.put(paramNames[i], args[i]);
                    }
                }
                auditInfo.put("params", objectMapper.writeValueAsString(params));
            } catch (Exception e) {
                auditInfo.put("params", "参数记录失败");
            }
        }

        Object result = null;
        boolean success = true;
        String errorMessage = null;

        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable e) {
            success = false;
            errorMessage = e.getMessage();
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            auditInfo.put("duration", duration + "ms");
            auditInfo.put("success", success);

            if (!success) {
                auditInfo.put("error", errorMessage);
            }

            // 记录返回结果
            if (auditLog.recordResult() && result != null) {
                try {
                    String resultStr = objectMapper.writeValueAsString(result);
                    if (resultStr.length() > 2000) {
                        resultStr = resultStr.substring(0, 2000) + "...";
                    }
                    auditInfo.put("result", resultStr);
                } catch (Exception e) {
                    auditInfo.put("result", "结果记录失败");
                }
            }

            // 输出审计日志
            if (success) {
                log.info("【审计日志】{}", auditInfo);
            } else {
                log.error("【审计日志-失败】{}", auditInfo);
            }
        }
    }

    /**
     * 判断是否为敏感参数（不记录）
     */
    private boolean isSensitiveParam(String paramName) {
        String lower = paramName.toLowerCase();
        return lower.contains("password") ||
               lower.contains("token") ||
               lower.contains("secret") ||
               lower.contains("idcard") ||
               lower.contains("phone");
    }
}
