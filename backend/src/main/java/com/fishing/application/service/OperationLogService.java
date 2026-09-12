package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.infrastructure.persistence.entity.OperationLogEntity;
import com.fishing.infrastructure.persistence.repository.OperationLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 操作日志服务
 * 异步记录操作日志到数据库
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OperationLogService {

    private final OperationLogMapper operationLogMapper;

    /**
     * 异步记录操作日志
     */
    @Async("logExecutor")
    public void recordLog(String playerId, String operation, String opType,
                          String method, String params, String result,
                          String ip, String userAgent, int durationMs,
                          boolean success, String errorMsg) {
        try {
            OperationLogEntity logEntity = new OperationLogEntity();
            logEntity.setPlayerId(playerId);
            logEntity.setOperation(operation);
            logEntity.setOpType(opType);
            logEntity.setMethod(method);
            logEntity.setParams(truncate(params, 2000));
            logEntity.setResult(truncate(result, 2000));
            logEntity.setIp(ip);
            logEntity.setUserAgent(truncate(userAgent, 512));
            logEntity.setDurationMs(durationMs);
            logEntity.setSuccess(success);
            logEntity.setErrorMsg(truncate(errorMsg, 1000));
            operationLogMapper.insert(logEntity);
        } catch (Exception e) {
            log.error("记录操作日志失败: {}", e.getMessage());
        }
    }

    /**
     * 查询玩家操作日志
     */
    public List<OperationLogEntity> getPlayerLogs(String playerId, int page, int size) {
        return operationLogMapper.selectList(
                new LambdaQueryWrapper<OperationLogEntity>()
                        .eq(OperationLogEntity::getPlayerId, playerId)
                        .orderByDesc(OperationLogEntity::getCreatedAt)
                        .last("LIMIT " + size + " OFFSET " + (page - 1) * size)
        );
    }

    /**
     * 按类型查询操作日志
     */
    public List<OperationLogEntity> getLogsByType(String opType, int page, int size) {
        return operationLogMapper.selectList(
                new LambdaQueryWrapper<OperationLogEntity>()
                        .eq(OperationLogEntity::getOpType, opType)
                        .orderByDesc(OperationLogEntity::getCreatedAt)
                        .last("LIMIT " + size + " OFFSET " + (page - 1) * size)
        );
    }

    /**
     * 查询失败的操作日志
     */
    public List<OperationLogEntity> getFailedLogs(int page, int size) {
        return operationLogMapper.selectList(
                new LambdaQueryWrapper<OperationLogEntity>()
                        .eq(OperationLogEntity::getSuccess, false)
                        .orderByDesc(OperationLogEntity::getCreatedAt)
                        .last("LIMIT " + size + " OFFSET " + (page - 1) * size)
        );
    }

    /**
     * 清理过期日志（保留30天）
     */
    public int cleanOldLogs(int keepDays) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(keepDays);
        return operationLogMapper.delete(
                new LambdaQueryWrapper<OperationLogEntity>()
                        .lt(OperationLogEntity::getCreatedAt, cutoff)
        );
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
