package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.infrastructure.persistence.entity.GameRecordEntity;
import com.fishing.infrastructure.persistence.repository.GameRecordMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据归档服务
 * 定期归档历史游戏记录，清理过期数据，优化数据库性能
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataArchiveService {

    private final GameRecordMapper gameRecordMapper;

    /**
     * 归档保留天数（默认90天）
     */
    private static final int ARCHIVE_KEEP_DAYS = 90;

    /**
     * 每次归档最大记录数
     */
    private static final int BATCH_SIZE = 1000;

    /**
     * 每天凌晨3点执行归档
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void scheduledArchive() {
        log.info("开始执行定时数据归档任务");
        Map<String, Object> result = archiveOldRecords(ARCHIVE_KEEP_DAYS);
        log.info("定时数据归档完成: {}", result);
    }

    /**
     * 归档过期游戏记录
     * @param keepDays 保留天数
     * @return 归档统计
     */
    public Map<String, Object> archiveOldRecords(int keepDays) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(keepDays);
        Map<String, Object> result = new HashMap<>();
        result.put("cutoffDate", cutoffDate.toString());
        result.put("keepDays", keepDays);

        int totalArchived = 0;
        int totalDeleted = 0;

        while (true) {
            // 查询需要归档的记录
            List<GameRecordEntity> recordsToArchive = gameRecordMapper.selectList(
                    new LambdaQueryWrapper<GameRecordEntity>()
                            .lt(GameRecordEntity::getCreatedAt, cutoffDate)
                            .orderByAsc(GameRecordEntity::getCreatedAt)
                            .last("LIMIT " + BATCH_SIZE)
            );

            if (recordsToArchive.isEmpty()) {
                break;
            }

            // 统计归档数据
            for (GameRecordEntity record : recordsToArchive) {
                totalArchived++;
            }

            // 逻辑删除归档记录（实际生产中应写入归档表或导出到文件）
            for (GameRecordEntity record : recordsToArchive) {
                gameRecordMapper.deleteById(record.getId());
                totalDeleted++;
            }

            log.info("数据归档批次完成: 归档={}, 累计={}", recordsToArchive.size(), totalArchived);

            // 防止单次归档过多影响性能
            if (totalArchived >= 10000) {
                log.warn("单次归档达到上限10000条，剩余记录下次归档");
                break;
            }
        }

        result.put("archivedCount", totalArchived);
        result.put("deletedCount", totalDeleted);
        result.put("status", "success");

        log.info("数据归档完成: 归档={}条, 删除={}条", totalArchived, totalDeleted);
        return result;
    }

    /**
     * 统计需要归档的记录数
     */
    public long countRecordsToArchive(int keepDays) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(keepDays);
        return gameRecordMapper.selectCount(
                new LambdaQueryWrapper<GameRecordEntity>()
                        .lt(GameRecordEntity::getCreatedAt, cutoffDate)
        );
    }

    /**
     * 手动触发归档
     */
    public Map<String, Object> manualArchive(int keepDays) {
        log.info("手动触发数据归档: keepDays={}", keepDays);
        return archiveOldRecords(keepDays);
    }

    /**
     * 获取归档统计信息
     */
    public Map<String, Object> getArchiveStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("keepDays", ARCHIVE_KEEP_DAYS);
        stats.put("recordsToArchive", countRecordsToArchive(ARCHIVE_KEEP_DAYS));
        stats.put("batchSize", BATCH_SIZE);
        stats.put("maxPerRun", 10000);
        stats.put("schedule", "每天凌晨3点自动执行");
        return stats;
    }
}
