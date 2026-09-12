package com.fishing.infrastructure.config;

import com.fishing.common.annotation.RequiresPermission;
import com.fishing.common.context.AdminContext;
import com.fishing.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * 权限校验AOP切面
 * 根据当前管理员角色校验所需权限
 *
 * @author 后端架构组
 */
@Slf4j
@Aspect
@Component
public class PermissionAspect {

    /**
     * 超级管理员角色
     */
    private static final String ROLE_SUPER_ADMIN = "super_admin";

    /**
     * 角色-权限矩阵
     */
    private static final Map<String, Set<String>> PERMISSION_MATRIX = new HashMap<>(8);

    static {
        // 运营：玩家查看、邮件发送、公告管理、兑换码管理、数据查看
        Set<String> operatorPerms = new HashSet<>(Arrays.asList(
                "player:view", "mail:send", "announcement:manage", "redemption:manage", "stats:view"));
        PERMISSION_MATRIX.put("operator", operatorPerms);

        // 客服：玩家查看、玩家邮件、订单查看
        Set<String> customerServicePerms = new HashSet<>(Arrays.asList(
                "player:view", "player:mail", "order:view"));
        PERMISSION_MATRIX.put("customer_service", customerServicePerms);

        // 财务：订单查看、订单退款、数据导出、数据查看
        Set<String> financePerms = new HashSet<>(Arrays.asList(
                "order:view", "order:refund", "export:data", "stats:view"));
        PERMISSION_MATRIX.put("finance", financePerms);
    }

    /**
     * 环绕校验权限
     */
    @Around("@annotation(com.fishing.common.annotation.RequiresPermission)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequiresPermission requiresPermission = method.getAnnotation(RequiresPermission.class);
        String requiredPermission = requiresPermission.value();

        AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
        if (admin == null) {
            throw new BusinessException("未登录或登录已过期");
        }

        String role = admin.getRole();
        // 超级管理员直接放行
        if (ROLE_SUPER_ADMIN.equals(role)) {
            return joinPoint.proceed();
        }

        Set<String> granted = PERMISSION_MATRIX.getOrDefault(role, Collections.<String>emptySet());
        if (!granted.contains(requiredPermission)) {
            log.warn("管理员[{}]角色[{}]无权限[{}]", admin.getUsername(), role, requiredPermission);
            throw new BusinessException("无权限执行此操作");
        }

        return joinPoint.proceed();
    }
}
