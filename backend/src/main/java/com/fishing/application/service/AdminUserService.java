package com.fishing.application.service;

import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.entity.AdminUserEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
import com.fishing.infrastructure.persistence.repository.AdminUserMapper;
import com.fishing.infrastructure.util.AdminJwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理员用户服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AdminUserMapper adminUserMapper;
    private final AdminOperationLogMapper adminOperationLogMapper;
    private final AdminJwtUtil adminJwtUtil;

    /**
     * 管理员登录
     *
     * @param username 用户名
     * @param password 明文密码
     * @param ip       登录IP
     * @return 登录结果(token + 管理员信息)
     */
    public Map<String, Object> login(String username, String password, String ip) {
        AdminUserEntity admin = adminUserMapper.selectOne(
                new LambdaQueryWrapper<AdminUserEntity>()
                        .eq(AdminUserEntity::getUsername, username));

        if (admin == null) {
            throw new BusinessException("用户名或密码错误");
        }
        if (admin.getStatus() != null && admin.getStatus() == 2) {
            throw new BusinessException("账号已被禁用");
        }
        if (!BCrypt.checkpw(password, admin.getPasswordHash())) {
            throw new BusinessException("用户名或密码错误");
        }

        // 更新登录时间与IP
        admin.setLastLoginTime(LocalDateTime.now());
        admin.setLastLoginIp(ip);
        adminUserMapper.updateById(admin);

        // 生成token
        String token = adminJwtUtil.generateToken(admin.getId(), admin.getUsername(), admin.getRole());

        // 记录登录操作日志
        recordLoginLog(admin, ip);

        Map<String, Object> adminInfo = new HashMap<>(8);
        adminInfo.put("id", admin.getId());
        adminInfo.put("username", admin.getUsername());
        adminInfo.put("realName", admin.getRealName());
        adminInfo.put("role", admin.getRole());

        Map<String, Object> result = new HashMap<>(4);
        result.put("token", token);
        result.put("adminInfo", adminInfo);
        return result;
    }

    /**
     * 获取管理员信息
     *
     * @param adminId 管理员ID
     * @return 管理员信息
     */
    public Map<String, Object> getAdminInfo(Long adminId) {
        AdminUserEntity admin = adminUserMapper.selectById(adminId);
        if (admin == null) {
            throw new BusinessException("管理员不存在");
        }
        Map<String, Object> adminInfo = new HashMap<>(8);
        adminInfo.put("id", admin.getId());
        adminInfo.put("username", admin.getUsername());
        adminInfo.put("realName", admin.getRealName());
        adminInfo.put("role", admin.getRole());
        adminInfo.put("lastLoginTime", admin.getLastLoginTime());
        return adminInfo;
    }

    /**
     * 记录管理员登录日志
     */
    private void recordLoginLog(AdminUserEntity admin, String ip) {
        try {
            AdminOperationLogEntity logEntity = new AdminOperationLogEntity();
            logEntity.setAdminId(admin.getId());
            logEntity.setAdminName(admin.getUsername());
            logEntity.setOperation("管理员登录");
            logEntity.setModule("auth");
            logEntity.setIpAddress(ip);
            logEntity.setResult("success");
            logEntity.setDurationMs(0);
            adminOperationLogMapper.insert(logEntity);
        } catch (Exception e) {
            log.error("记录管理员登录日志失败", e);
        }
    }
}
