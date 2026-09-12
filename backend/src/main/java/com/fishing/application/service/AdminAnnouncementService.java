package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fishing.common.context.AdminContext;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.AdminOperationLogEntity;
import com.fishing.infrastructure.persistence.entity.GameAnnouncementEntity;
import com.fishing.infrastructure.persistence.repository.AdminOperationLogMapper;
import com.fishing.infrastructure.persistence.repository.GameAnnouncementMapper;
import com.fishing.interfaces.dto.admin.CreateAnnouncementRequest;
import com.fishing.interfaces.dto.admin.PageResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 管理端公告服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAnnouncementService {

    private final GameAnnouncementMapper gameAnnouncementMapper;
    private final AdminOperationLogMapper adminOperationLogMapper;

    /**
     * 分页查询公告列表（按优先级倒序 + 创建时间倒序）
     */
    public PageResult<GameAnnouncementEntity> getAnnouncementList(int page, int size) {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        Page<GameAnnouncementEntity> pageObj = new Page<>(page, size);
        LambdaQueryWrapper<GameAnnouncementEntity> wrapper = new LambdaQueryWrapper<GameAnnouncementEntity>()
                .orderByDesc(GameAnnouncementEntity::getPriority)
                .orderByDesc(GameAnnouncementEntity::getCreatedAt);
        Page<GameAnnouncementEntity> resultPage = gameAnnouncementMapper.selectPage(pageObj, wrapper);
        return new PageResult<>(resultPage.getRecords(), resultPage.getTotal(),
                resultPage.getCurrent(), resultPage.getSize());
    }

    /**
     * 创建公告
     */
    @Transactional(rollbackFor = Exception.class)
    public GameAnnouncementEntity createAnnouncement(CreateAnnouncementRequest request) {
        if (request == null || request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new BusinessException("公告标题不能为空");
        }
        GameAnnouncementEntity entity = new GameAnnouncementEntity();
        entity.setTitle(request.getTitle());
        entity.setContent(request.getContent());
        entity.setType(request.getType() != null ? request.getType() : "notice");
        entity.setPriority(request.getPriority() != null ? request.getPriority() : 0);
        entity.setStartTime(request.getStartTime());
        entity.setEndTime(request.getEndTime());
        entity.setIsActive(Boolean.TRUE);
        AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
        entity.setCreatedBy(admin != null ? admin.getUsername() : "system");
        gameAnnouncementMapper.insert(entity);

        recordOperationLog("创建公告", String.valueOf(entity.getId()),
                "title=" + request.getTitle());
        return entity;
    }

    /**
     * 更新公告
     */
    @Transactional(rollbackFor = Exception.class)
    public GameAnnouncementEntity updateAnnouncement(Long id, CreateAnnouncementRequest request) {
        GameAnnouncementEntity entity = gameAnnouncementMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("公告不存在或已删除");
        }
        if (request.getTitle() != null) {
            entity.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            entity.setContent(request.getContent());
        }
        if (request.getType() != null) {
            entity.setType(request.getType());
        }
        if (request.getPriority() != null) {
            entity.setPriority(request.getPriority());
        }
        if (request.getStartTime() != null) {
            entity.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            entity.setEndTime(request.getEndTime());
        }
        gameAnnouncementMapper.updateById(entity);

        recordOperationLog("更新公告", String.valueOf(id),
                "title=" + request.getTitle());
        return entity;
    }

    /**
     * 删除公告（逻辑删除）
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteAnnouncement(Long id) {
        GameAnnouncementEntity entity = gameAnnouncementMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("公告不存在或已删除");
        }
        gameAnnouncementMapper.deleteById(id);
        recordOperationLog("删除公告", String.valueOf(id),
                "title=" + entity.getTitle());
    }

    /**
     * 切换公告启用状态
     */
    @Transactional(rollbackFor = Exception.class)
    public void toggleAnnouncement(Long id) {
        GameAnnouncementEntity entity = gameAnnouncementMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("公告不存在或已删除");
        }
        boolean nowActive = !Boolean.TRUE.equals(entity.getIsActive());
        entity.setIsActive(nowActive);
        gameAnnouncementMapper.updateById(entity);

        recordOperationLog(nowActive ? "启用公告" : "停用公告", String.valueOf(id),
                "title=" + entity.getTitle());
    }

    private void recordOperationLog(String operation, String targetId, String params) {
        try {
            AdminOperationLogEntity logEntity = new AdminOperationLogEntity();
            AdminContext.AdminInfo admin = AdminContext.getCurrentAdmin();
            if (admin != null) {
                logEntity.setAdminId(admin.getAdminId());
                logEntity.setAdminName(admin.getUsername());
            }
            logEntity.setOperation(operation);
            logEntity.setModule("announcement");
            logEntity.setTargetId(targetId);
            logEntity.setParamsJson(params);
            logEntity.setResult("success");
            logEntity.setDurationMs(0);
            adminOperationLogMapper.insert(logEntity);
        } catch (Exception e) {
            log.error("记录公告操作日志失败", e);
        }
    }
}
