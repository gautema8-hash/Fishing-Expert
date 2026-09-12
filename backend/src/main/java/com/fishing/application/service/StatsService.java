package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.infrastructure.persistence.entity.DailyStatsEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.RechargeOrderEntity;
import com.fishing.infrastructure.persistence.repository.DailyStatsMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import com.fishing.infrastructure.persistence.repository.RechargeOrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据统计服务
 * 每日数据聚合、统计报表、运营分析
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StatsService {

    private final DailyStatsMapper dailyStatsMapper;
    private final PlayerMapper playerMapper;
    private final RechargeOrderMapper rechargeOrderMapper;

    /**
     * 每天凌晨1点统计前一天数据
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void scheduledDailyStats() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("开始统计每日数据: {}", yesterday);
        DailyStatsEntity stats = aggregateDailyStats(yesterday);
        log.info("每日数据统计完成: {}", yesterday);
    }

    /**
     * 聚合每日统计数据
     */
    public DailyStatsEntity aggregateDailyStats(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        DailyStatsEntity stats = new DailyStatsEntity();
        stats.setStatDate(date);

        // 新增玩家数
        Long newPlayers = playerMapper.selectCount(
                new LambdaQueryWrapper<PlayerEntity>()
                        .ge(PlayerEntity::getCreatedAt, startOfDay)
                        .lt(PlayerEntity::getCreatedAt, endOfDay)
        );
        stats.setNewPlayers(newPlayers != null ? newPlayers.intValue() : 0);

        // 充值统计
        List<RechargeOrderEntity> orders = rechargeOrderMapper.selectList(
                new LambdaQueryWrapper<RechargeOrderEntity>()
                        .ge(RechargeOrderEntity::getPaidAt, startOfDay)
                        .lt(RechargeOrderEntity::getPaidAt, endOfDay)
                        .eq(RechargeOrderEntity::getStatus, 2) // 已发货
        );

        BigDecimal totalRecharge = BigDecimal.ZERO;
        long totalCoinsEarned = 0;
        for (RechargeOrderEntity order : orders) {
            if (order.getAmount() != null) {
                totalRecharge = totalRecharge.add(order.getAmount());
            }
            if (order.getCoins() != null) {
                totalCoinsEarned += order.getCoins();
            }
        }
        stats.setTotalRecharge(totalRecharge);
        stats.setRechargeCount(orders.size());
        stats.setTotalCoinsEarned(totalCoinsEarned);

        // 其他字段暂时设为0（实际应从游戏记录统计表获取）
        stats.setActivePlayers(0);
        stats.setTotalCoinsSpent(0L);
        stats.setTotalKills(0);
        stats.setTotalBullets(0);
        stats.setBossKills(0);
        stats.setAvgOnline(0);
        stats.setPeakOnline(0);

        // 检查是否已存在
        DailyStatsEntity existing = dailyStatsMapper.selectOne(
                new LambdaQueryWrapper<DailyStatsEntity>()
                        .eq(DailyStatsEntity::getStatDate, date)
        );

        if (existing != null) {
            stats.setId(existing.getId());
            dailyStatsMapper.updateById(stats);
        } else {
            dailyStatsMapper.insert(stats);
        }

        return stats;
    }

    /**
     * 获取每日统计列表
     */
    public List<DailyStatsEntity> getDailyStats(LocalDate startDate, LocalDate endDate) {
        return dailyStatsMapper.selectList(
                new LambdaQueryWrapper<DailyStatsEntity>()
                        .ge(DailyStatsEntity::getStatDate, startDate)
                        .le(DailyStatsEntity::getStatDate, endDate)
                        .orderByAsc(DailyStatsEntity::getStatDate)
        );
    }

    /**
     * 获取最近N天统计
     */
    public List<DailyStatsEntity> getRecentStats(int days) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days);
        return getDailyStats(startDate, endDate);
    }

    /**
     * 获取运营概览数据
     */
    public Map<String, Object> getOverview() {
        Map<String, Object> overview = new HashMap<>();

        // 总玩家数
        Long totalPlayers = playerMapper.selectCount(null);
        overview.put("totalPlayers", totalPlayers != null ? totalPlayers : 0);

        // 今日新增
        LocalDate today = LocalDate.now();
        Long todayNew = playerMapper.selectCount(
                new LambdaQueryWrapper<PlayerEntity>()
                        .ge(PlayerEntity::getCreatedAt, today.atStartOfDay())
        );
        overview.put("todayNewPlayers", todayNew != null ? todayNew : 0);

        // 总充值金额
        List<RechargeOrderEntity> allOrders = rechargeOrderMapper.selectList(
                new LambdaQueryWrapper<RechargeOrderEntity>()
                        .eq(RechargeOrderEntity::getStatus, 2)
        );
        BigDecimal totalRecharge = BigDecimal.ZERO;
        for (RechargeOrderEntity order : allOrders) {
            if (order.getAmount() != null) {
                totalRecharge = totalRecharge.add(order.getAmount());
            }
        }
        overview.put("totalRecharge", totalRecharge);
        overview.put("totalRechargeCount", allOrders.size());

        // 最近7天统计
        List<DailyStatsEntity> recent7Days = getRecentStats(7);
        overview.put("recent7Days", recent7Days);

        // 付费率
        if (totalPlayers != null && totalPlayers > 0) {
            long paidPlayers = allOrders.stream()
                    .map(RechargeOrderEntity::getPlayerId)
                    .distinct()
                    .count();
            overview.put("paidPlayers", paidPlayers);
            overview.put("payRate", String.format("%.2f%%", (paidPlayers * 100.0 / totalPlayers)));
        }

        return overview;
    }

    /**
     * 手动触发统计
     */
    public DailyStatsEntity manualAggregate(LocalDate date) {
        log.info("手动触发每日统计: {}", date);
        return aggregateDailyStats(date);
    }
}
