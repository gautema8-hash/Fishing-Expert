package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fishing.common.context.AdminContext;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
import com.fishing.interfaces.dto.admin.PageResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 管理员操作日志服务
 * 提供操作日志的查询与手动记录能力
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminOperationLogService {

    private final AdminOperationLogMapper adminOperationLogMapper;

    /**
     * 分页查询操作日志
     *
     * @param page    页码（从1开始）
     * @param size    每页大小
     * @param adminId 管理员ID（可空）
     * @param module  模块名（可空）
     */
    public PageResult<AdminOperationLogEntity> getLogList(int page, int size, Long adminId, String module) {
        Page<AdminOperationLogEntity> p = new Page<>(page, size);
        LambdaQueryWrapper<AdminOperationLogEntity> wrapper = new LambdaQueryWrapper<>();
        if (adminId != null) {
            wrapper.eq(AdminOperationLogEntity::getAdminId, adminId);
        }
        if (module != null && !module.trim().isEmpty()) {
            wrapper.eq(AdminOperationLogEntity::getModule, module);
        }
        wrapper.orderByDesc(AdminOperationLogEntity::getCreatedAt);
        Page<AdminOperationLogEntity> result = adminOperationLogMapper.selectPage(p, wrapper);
        List<AdminOperationLogEntity> records = result.getRecords();
        if (records == null) {
            records = java.util.Collections.emptyList();
        }
        return new PageResult<>(records, result.getTotal(), page, size);
    }

    /**
     * 查询日志详情
     */
    public AdminOperationLogEntity getLogDetail(Long id) {
        return adminOperationLogMapper.selectById(id);
    }

    /**
     * 手动记录操作日志
     * 从AdminContext获取当前管理员信息，从当前请求获取IP与UserAgent
     * 供其他Service在写操作完成后调用，日志写入失败不影响主流程
     *
     * @param operation 操作描述
     * @param module    模块名
     * @param targetId  操作目标ID
     * @param paramsJson 请求参数JSON
     * @param result    结果 success/fail
     * @param errorMsg  错误信息
     */
    public void recordLog(String operation, String module, String targetId,
                          String paramsJson, String result, String errorMsg) {
        recordLog(operation, module, targetId, paramsJson, result, errorMsg, null);
    }

    /**
     * 手动记录操作日志（带耗时）
     */
    public void recordLog(String operation, String module, String targetId,
                          String paramsJson, String result, String errorMsg, Integer durationMs) {
        try {
            AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
            AdminOperationLogEntity entity = new AdminOperationLogEntity();
            if (admin != null) {
                entity.setAdminId(admin.getAdminId());
                entity.setAdminName(admin.getUsername());
            }
            entity.setOperation(operation);
            entity.setModule(module);
            entity.setTargetId(targetId);
            entity.setParamsJson(truncate(paramsJson, 2000));
            entity.setResult(result);
            entity.setErrorMsg(truncate(errorMsg, 1000));
            entity.setDurationMs(durationMs);
            entity.setCreatedAt(LocalDateTime.now());

            HttpServletRequest request = currentRequest();
            if (request != null) {
                entity.setIpAddress(getClientIp(request));
                entity.setUserAgent(truncate(request.getHeader("User-Agent"), 512));
            }

            adminOperationLogMapper.insert(entity);
        } catch (Exception e) {
            log.error("记录管理员操作日志失败: operation={}, module={}", operation, module, e);
        }
    }

    /**
     * 获取当前请求
     */
    private HttpServletRequest currentRequest() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getRequest() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 获取客户端真实IP（处理反向代理）
     */
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

    /**
     * 字符串截断
     */
    private String truncate(String str, int maxLength) {
        if (str == null) return null;
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "...";
    }
}
