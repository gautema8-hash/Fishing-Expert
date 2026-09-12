package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fishing.common.context.AdminContext;
import com.fishing.infrastructure.persistence.entity.*;
import com.fishing.infrastructure.persistence.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 管理端数据统计服务
 * 所有统计数据均从数据库实时查询，不使用模拟数据
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final PlayerMapper playerMapper;
    private final ShopOrderMapper shopOrderMapper;
    private final GameRecordMapper gameRecordMapper;
    private final PlayerLoginLogMapper playerLoginLogMapper;
    private final DailyStatsMapper dailyStatsMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final DataSource dataSource;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 总览数据
     */
    public Map<String, Object> getOverview() {
        Map<String, Object> result = new HashMap<>(16);

        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();

        // 总玩家数
        long totalPlayers = playerMapper.selectCount(null);

        // 今日新增
        QueryWrapper<PlayerEntity> newPlayerQw = new QueryWrapper<>();
        newPlayerQw.select("COUNT(*) AS cnt").ge("created_at", todayStart);
        Map<String, Object> newPlayerMap = playerMapper.selectMaps(newPlayerQw).get(0);
        long todayNewPlayers = toLong(newPlayerMap.get("cnt"));

        // 在线玩家数
        long onlinePlayers = getOnlinePlayerCount();

        // 总充值金额（payStatus=2 已支付）
        BigDecimal totalRecharge = sumRecharge(null, null);
        long totalRechargeCount = countRecharge(null, null);

        // 今日充值
        BigDecimal todayRecharge = sumRecharge(todayStart, null);
        long todayRechargeCount = countRecharge(todayStart, null);

        // 今日游戏局数
        QueryWrapper<GameRecordEntity> gameQw = new QueryWrapper<>();
        gameQw.select("COUNT(*) AS cnt").ge("created_at", todayStart);
        long todayGames = toLong(gameRecordMapper.selectMaps(gameQw).get(0).get("cnt"));

        // 总击杀
        Map<String, Object> gameAgg = queryGameAgg();
        long totalKills = toLong(gameAgg.get("totalKills"));

        result.put("totalPlayers", totalPlayers);
        result.put("todayNewPlayers", todayNewPlayers);
        result.put("onlinePlayers", onlinePlayers);
        result.put("totalRecharge", totalRecharge);
        result.put("totalRechargeCount", totalRechargeCount);
        result.put("todayRecharge", todayRecharge);
        result.put("todayRechargeCount", todayRechargeCount);
        result.put("todayGames", todayGames);
        result.put("totalKills", totalKills);
        return result;
    }

    /**
     * 最近N天活跃趋势（DAU + 新增玩家）
     */
    public List<Map<String, Object>> getActiveTrend(int days) {
        if (days <= 0 || days > 365) {
            days = 7;
        }
        List<Map<String, Object>> list = new ArrayList<>(days);
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.plusDays(1).atStartOfDay();

            // DAU: 当天有登录记录的去重玩家数
            QueryWrapper<PlayerLoginLogEntity> dauQw = new QueryWrapper<>();
            dauQw.select("COUNT(DISTINCT player_id) AS cnt")
                    .ge("created_at", start).lt("created_at", end);
            long dau = toLong(playerLoginLogMapper.selectMaps(dauQw).get(0).get("cnt"));

            // 新增玩家
            QueryWrapper<PlayerEntity> newQw = new QueryWrapper<>();
            newQw.select("COUNT(*) AS cnt")
                    .ge("created_at", start).lt("created_at", end);
            long newPlayers = toLong(playerMapper.selectMaps(newQw).get(0).get("cnt"));

            Map<String, Object> item = new LinkedHashMap<>(4);
            item.put("date", date.format(DATE_FMT));
            item.put("dau", dau);
            item.put("newPlayers", newPlayers);
            list.add(item);
        }
        return list;
    }

    /**
     * 充值分布（按商品分组）
     */
    public List<Map<String, Object>> getRechargeDistribution() {
        QueryWrapper<ShopOrderEntity> qw = new QueryWrapper<>();
        qw.select("product_id AS productId, product_name AS productName, "
                + "COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount")
                .eq("pay_status", 2)
                .groupBy("product_id, product_name")
                .orderByDesc("amount");
        return shopOrderMapper.selectMaps(qw);
    }

    /**
     * 游戏核心数据
     */
    public Map<String, Object> getGameData() {
        Map<String, Object> agg = queryGameAgg();
        long totalKills = toLong(agg.get("totalKills"));
        long totalBullets = toLong(agg.get("totalBullets"));
        long totalCrits = toLong(agg.get("totalCrits"));

        Double hitRate = totalBullets > 0 ? (double) totalKills / (double) totalBullets : 0.0;
        Double critRate = totalBullets > 0 ? (double) totalCrits / (double) totalBullets : 0.0;

        Map<String, Object> result = new HashMap<>(8);
        result.put("totalKills", totalKills);
        result.put("totalBullets", totalBullets);
        result.put("totalCrits", totalCrits);
        result.put("hitRate", hitRate);
        result.put("critRate", critRate);
        return result;
    }

    /**
     * 最近N天金币收支趋势
     */
    public List<Map<String, Object>> getCoinFlow(int days) {
        if (days <= 0 || days > 365) {
            days = 7;
        }
        LocalDate startDate = LocalDate.now().minusDays(days - 1L);
        QueryWrapper<DailyStatsEntity> qw = new QueryWrapper<>();
        qw.select("stat_date AS statDate, total_coins_earned AS earned, total_coins_spent AS spent")
                .ge("stat_date", startDate)
                .orderByAsc("stat_date");
        List<Map<String, Object>> raw = dailyStatsMapper.selectMaps(qw);

        List<Map<String, Object>> list = new ArrayList<>(raw.size());
        for (Map<String, Object> row : raw) {
            Map<String, Object> item = new LinkedHashMap<>(4);
            Object d = row.get("statDate");
            item.put("date", d == null ? null : d.toString());
            item.put("earned", toLong(row.get("earned")));
            item.put("spent", toLong(row.get("spent")));
            list.add(item);
        }
        return list;
    }

    /**
     * 玩家等级分布
     */
    public List<Map<String, Object>> getLevelDistribution() {
        QueryWrapper<PlayerEntity> qw = new QueryWrapper<>();
        qw.select("level");
        List<Map<String, Object>> rows = playerMapper.selectMaps(qw);

        long r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0;
        for (Map<String, Object> row : rows) {
            Object lv = row.get("level");
            if (lv == null) continue;
            int level = ((Number) lv).intValue();
            if (level <= 10) r1++;
            else if (level <= 20) r2++;
            else if (level <= 30) r3++;
            else if (level <= 50) r4++;
            else r5++;
        }

        List<Map<String, Object>> list = new ArrayList<>(5);
        list.add(buildLevelItem("1-10", r1));
        list.add(buildLevelItem("11-20", r2));
        list.add(buildLevelItem("21-30", r3));
        list.add(buildLevelItem("31-50", r4));
        list.add(buildLevelItem("50+", r5));
        return list;
    }

    /**
     * 实时在线玩家列表（最多50条）
     */
    public List<Map<String, Object>> getRealtimeOnline() {
        Set<String> keys;
        try {
            keys = redisTemplate.keys("fishing:player:cache:*");
        } catch (Exception e) {
            log.warn("查询在线玩家Redis keys失败: {}", e.getMessage());
            return new ArrayList<>();
        }
        if (keys == null || keys.isEmpty()) {
            return new ArrayList<>();
        }

        // 从key中解析playerId: fishing:player:cache:{playerId}
        Set<String> playerIds = new HashSet<>();
        for (String key : keys) {
            int idx = key.lastIndexOf(':');
            if (idx >= 0 && idx < key.length() - 1) {
                playerIds.add(key.substring(idx + 1));
            }
        }

        List<Map<String, Object>> result = new ArrayList<>(playerIds.size());
        if (playerIds.isEmpty()) {
            return result;
        }

        int limit = 0;
        for (String pid : playerIds) {
            if (limit >= 50) break;
            PlayerEntity player = playerMapper.selectOne(
                    new QueryWrapper<PlayerEntity>().eq("player_id", pid)
            );
            if (player == null) continue;
            Map<String, Object> item = new LinkedHashMap<>(6);
            item.put("playerId", player.getPlayerId());
            item.put("nickname", player.getNickname());
            item.put("level", player.getLevel());
            item.put("coins", player.getCoins());
            item.put("lastLoginTime", player.getLastLoginTime());
            result.add(item);
            limit++;
        }
        return result;
    }

    /**
     * 系统状态
     */
    public Map<String, Object> getSystemStatus() {
        Map<String, Object> result = new HashMap<>(8);

        // PostgreSQL
        String pgStatus = "healthy";
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("select 1")) {
            if (!rs.next()) {
                pgStatus = "unhealthy";
            }
        } catch (Exception e) {
            log.warn("PostgreSQL健康检查失败: {}", e.getMessage());
            pgStatus = "unhealthy";
        }
        result.put("postgreSQL", pgStatus);

        // Redis
        String redisStatus = "healthy";
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
        } catch (Exception e) {
            log.warn("Redis健康检查失败: {}", e.getMessage());
            redisStatus = "unhealthy";
        }
        result.put("redis", redisStatus);

        // JVM
        Runtime rt = Runtime.getRuntime();
        long max = rt.maxMemory();
        long total = rt.totalMemory();
        long free = rt.freeMemory();
        long used = total - free;
        Map<String, Object> jvm = new LinkedHashMap<>(8);
        jvm.put("max", max);
        jvm.put("total", total);
        jvm.put("free", free);
        jvm.put("used", used);
        result.put("jvm", jvm);

        result.put("serverTime", System.currentTimeMillis());
        result.put("serverTimeStr", LocalDateTime.now().toString());
        return result;
    }

    // ---------------- 私有辅助方法 ----------------

    private long getOnlinePlayerCount() {
        try {
            Set<String> keys = redisTemplate.keys("fishing:player:cache:*");
            return keys != null ? keys.size() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * 汇总玩家表中的游戏聚合数据
     */
    private Map<String, Object> queryGameAgg() {
        QueryWrapper<PlayerEntity> qw = new QueryWrapper<>();
        qw.select("COALESCE(SUM(total_kills),0) AS totalKills, "
                + "COALESCE(SUM(total_bullets),0) AS totalBullets, "
                + "COALESCE(SUM(total_crits),0) AS totalCrits");
        List<Map<String, Object>> list = playerMapper.selectMaps(qw);
        if (list == null || list.isEmpty()) {
            Map<String, Object> empty = new HashMap<>(4);
            empty.put("totalKills", 0L);
            empty.put("totalBullets", 0L);
            empty.put("totalCrits", 0L);
            return empty;
        }
        return list.get(0);
    }

    /**
     * 统计充值金额总和
     */
    private BigDecimal sumRecharge(LocalDateTime startTime, LocalDateTime endTime) {
        QueryWrapper<ShopOrderEntity> qw = new QueryWrapper<>();
        qw.select("COALESCE(SUM(amount),0) AS amount").eq("pay_status", 2);
        if (startTime != null) {
            qw.ge("pay_time", startTime);
        }
        if (endTime != null) {
            qw.lt("pay_time", endTime);
        }
        List<Map<String, Object>> list = shopOrderMapper.selectMaps(qw);
        if (list == null || list.isEmpty()) {
            return BigDecimal.ZERO;
        }
        Object amount = list.get(0).get("amount");
        if (amount == null) {
            return BigDecimal.ZERO;
        }
        if (amount instanceof BigDecimal) {
            return (BigDecimal) amount;
        }
        return new BigDecimal(amount.toString());
    }

    /**
     * 统计充值订单数
     */
    private long countRecharge(LocalDateTime startTime, LocalDateTime endTime) {
        QueryWrapper<ShopOrderEntity> qw = new QueryWrapper<>();
        qw.select("COUNT(*) AS cnt").eq("pay_status", 2);
        if (startTime != null) {
            qw.ge("pay_time", startTime);
        }
        if (endTime != null) {
            qw.lt("pay_time", endTime);
        }
        List<Map<String, Object>> list = shopOrderMapper.selectMaps(qw);
        if (list == null || list.isEmpty()) {
            return 0L;
        }
        return toLong(list.get(0).get("cnt"));
    }

    private Map<String, Object> buildLevelItem(String range, long count) {
        Map<String, Object> item = new LinkedHashMap<>(2);
        item.put("range", range);
        item.put("count", count);
        return item;
    }

    private long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Number) {
            return ((Number) o).longValue();
        }
        try {
            return Long.parseLong(o.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
