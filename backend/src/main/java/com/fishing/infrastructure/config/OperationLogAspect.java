package com.fishing.infrastructure.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fishing.common.annotation.AdminOperationLog;
import com.fishing.common.context.AdminContext;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理员操作日志AOP切面
 * 拦截标注了@AdminOperationLog的方法，自动记录参数、结果、耗时、异常到t_admin_operation_log
 *
 * @author 后端架构组
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OperationLogAspect {

    private final AdminOperationLogMapper adminOperationLogMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Around("@annotation(adminOperationLog)")
    public Object around(ProceedingJoinPoint joinPoint, AdminOperationLog adminOperationLog) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = null;
        boolean success = true;
        String errorMsg = null;

        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable e) {
            success = false;
            errorMsg = e.getMessage();
            throw e;
        } finally {
            try {
                saveLog(joinPoint, adminOperationLog, result, success, errorMsg,
                        (int) (System.currentTimeMillis() - start));
            } catch (Exception ex) {
                log.error("操作日志切面写入失败", ex);
            }
        }
    }

    /**
     * 组装并写入日志
     */
    private void saveLog(ProceedingJoinPoint joinPoint, AdminOperationLog annotation,
                         Object result, boolean success, String errorMsg, int durationMs) {
        AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();

        AdminOperationLogEntity entity = new AdminOperationLogEntity();
        if (admin != null) {
            entity.setAdminId(admin.getAdminId());
            entity.setAdminName(admin.getUsername());
        }
        entity.setOperation(annotation.operation());
        entity.setModule(annotation.module());
        entity.setTargetId(extractTargetId(joinPoint));
        entity.setParamsJson(buildParamsJson(joinPoint));
        entity.setResult(success ? "success" : "fail");
        entity.setErrorMsg(truncate(errorMsg, 1000));
        entity.setDurationMs(durationMs);
        entity.setCreatedAt(LocalDateTime.now());

        HttpServletRequest request = currentRequest();
        if (request != null) {
            entity.setIpAddress(getClientIp(request));
            entity.setUserAgent(truncate(request.getHeader("User-Agent"), 512));
        }

        adminOperationLogMapper.insert(entity);
    }

    /**
     * 尝试从方法参数中提取目标ID（路径变量或第一个非基本类型参数的id）
     */
    private String extractTargetId(ProceedingJoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] names = signature.getParameterNames();
        if (names != null) {
            for (int i = 0; i < names.length; i++) {
                if (args[i] != null && ("id".equalsIgnoreCase(names[i]) || "code".equalsIgnoreCase(names[i]))) {
                    return args[i].toString();
                }
            }
        }
        if (args != null && args.length > 0 && args[0] != null) {
            return args[0].toString();
        }
        return null;
    }

    /**
     * 序列化方法参数为JSON
     */
    private String buildParamsJson(ProceedingJoinPoint joinPoint) {
        try {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            String[] names = signature.getParameterNames();
            Object[] args = joinPoint.getArgs();
            Map<String, Object> params = new HashMap<>();
            for (int i = 0; i < args.length && names != null && i < names.length; i++) {
                if (args[i] != null && !isSensitive(names[i])) {
                    params.put(names[i], args[i]);
                }
            }
            String json = objectMapper.writeValueAsString(params);
            return truncate(json, 2000);
        } catch (Exception e) {
            return "参数序列化失败";
        }
    }

    private boolean isSensitive(String name) {
        String lower = name.toLowerCase();
        return lower.contains("password") || lower.contains("token") || lower.contains("secret");
    }

    private HttpServletRequest currentRequest() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getRequest() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private String truncate(String str, int maxLength) {
        if (str == null) return null;
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...";
    }
}
