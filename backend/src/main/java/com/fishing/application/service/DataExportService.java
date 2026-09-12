package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.infrastructure.persistence.entity.DailyStatsEntity;
import com.fishing.infrastructure.persistence.entity.GameRecordEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.ShopOrderEntity;
import com.fishing.infrastructure.persistence.repository.DailyStatsMapper;
import com.fishing.infrastructure.persistence.repository.GameRecordMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import com.fishing.infrastructure.persistence.repository.ShopOrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 数据导出服务
 * 导出玩家数据、游戏记录等到Excel
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataExportService {

    private final PlayerMapper playerMapper;
    private final GameRecordMapper gameRecordMapper;
    private final ShopOrderMapper shopOrderMapper;
    private final DailyStatsMapper dailyStatsMapper;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * 导出玩家列表Excel
     */
    public byte[] exportPlayers() throws IOException {
        List<PlayerEntity> players = playerMapper.selectList(
                new LambdaQueryWrapper<PlayerEntity>()
                        .orderByDesc(PlayerEntity::getCreatedAt)
                        .last("LIMIT 10000")
        );

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("玩家列表");

            // 创建表头样式
            CellStyle headerStyle = createHeaderStyle(workbook);

            // 表头
            String[] headers = {"玩家ID", "昵称", "手机号", "金币", "钻石",
                    "等级", "VIP等级", "总击杀", "总发射", "总暴击", "状态", "注册时间"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // 数据行
            int rowNum = 1;
            for (PlayerEntity player : players) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(player.getPlayerId());
                row.createCell(1).setCellValue(nullToEmpty(player.getNickname()));
                row.createCell(2).setCellValue(nullToEmpty(player.getPhone()));
                row.createCell(3).setCellValue(player.getCoins() != null ? player.getCoins() : 0);
                row.createCell(4).setCellValue(player.getDiamonds() != null ? player.getDiamonds() : 0);
                row.createCell(5).setCellValue(player.getLevel() != null ? player.getLevel() : 0);
                row.createCell(6).setCellValue(player.getVipLevel() != null ? player.getVipLevel() : 0);
                row.createCell(7).setCellValue(player.getTotalKills() != null ? player.getTotalKills() : 0);
                row.createCell(8).setCellValue(player.getTotalBullets() != null ? player.getTotalBullets() : 0);
                row.createCell(9).setCellValue(player.getTotalCrits() != null ? player.getTotalCrits() : 0);
                row.createCell(10).setCellValue(getStatusText(player.getStatus()));
                row.createCell(11).setCellValue(player.getCreatedAt() != null ?
                        player.getCreatedAt().format(DATE_FORMATTER) : "");
            }

            // 自动列宽
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            log.info("玩家列表导出完成: {} 条记录", players.size());
            return out.toByteArray();
        }
    }

    /**
     * 导出游戏记录Excel
     */
    public byte[] exportGameRecords(String playerId) throws IOException {
        LambdaQueryWrapper<GameRecordEntity> wrapper = new LambdaQueryWrapper<>();
        if (playerId != null && !playerId.isEmpty()) {
            wrapper.eq(GameRecordEntity::getPlayerId, playerId);
        }
        wrapper.orderByDesc(GameRecordEntity::getCreatedAt).last("LIMIT 10000");

        List<GameRecordEntity> records = gameRecordMapper.selectList(wrapper);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("游戏记录");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = {"记录ID", "玩家ID", "关卡", "得分", "击杀数", "发射数",
                    "获得金币", "BOSS击杀", "时长(秒)", "游戏时间"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (GameRecordEntity record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId() != null ? record.getId() : 0);
                row.createCell(1).setCellValue(nullToEmpty(record.getPlayerId()));
                row.createCell(2).setCellValue(record.getLevel() != null ? record.getLevel() : 0);
                row.createCell(3).setCellValue(record.getScore() != null ? record.getScore() : 0);
                row.createCell(4).setCellValue(record.getKills() != null ? record.getKills() : 0);
                row.createCell(5).setCellValue(record.getBulletsFired() != null ? record.getBulletsFired() : 0);
                row.createCell(6).setCellValue(record.getCoinsEarned() != null ? record.getCoinsEarned() : 0);
                row.createCell(7).setCellValue(record.getBossKills() != null ? record.getBossKills() : 0);
                row.createCell(8).setCellValue(record.getDuration() != null ? record.getDuration() : 0);
                row.createCell(9).setCellValue(record.getCreatedAt() != null ?
                        record.getCreatedAt().format(DATE_FORMATTER) : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            log.info("游戏记录导出完成: {} 条记录", records.size());
            return out.toByteArray();
        }
    }

    /**
     * 导出商城订单Excel
     */
    public byte[] exportOrders() throws IOException {
        List<ShopOrderEntity> orders = shopOrderMapper.selectList(
                new LambdaQueryWrapper<ShopOrderEntity>()
                        .orderByDesc(ShopOrderEntity::getCreatedAt)
                        .last("LIMIT 50000")
        );

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("订单列表");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = {"订单号", "玩家ID", "商品ID", "商品名称", "金额",
                    "支付方式", "支付状态", "支付时间", "创建时间"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (ShopOrderEntity order : orders) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(nullToEmpty(order.getOrderNo()));
                row.createCell(1).setCellValue(nullToEmpty(order.getPlayerId()));
                row.createCell(2).setCellValue(nullToEmpty(order.getProductId()));
                row.createCell(3).setCellValue(nullToEmpty(order.getProductName()));
                row.createCell(4).setCellValue(order.getAmount() != null ? order.getAmount().doubleValue() : 0d);
                row.createCell(5).setCellValue(nullToEmpty(order.getPayType()));
                row.createCell(6).setCellValue(getPayStatusText(order.getPayStatus()));
                row.createCell(7).setCellValue(order.getPayTime() != null ?
                        order.getPayTime().format(DATE_FORMATTER) : "");
                row.createCell(8).setCellValue(order.getCreatedAt() != null ?
                        order.getCreatedAt().format(DATE_FORMATTER) : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            log.info("订单导出完成: {} 条记录", orders.size());
            return out.toByteArray();
        }
    }

    /**
     * 导出统计报表Excel（多sheet：玩家概览、每日统计、充值统计）
     */
    public byte[] exportStats() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            CellStyle headerStyle = createHeaderStyle(workbook);

            // Sheet1: 玩家概览
            Sheet overviewSheet = workbook.createSheet("玩家概览");
            long totalPlayers = playerMapper.selectCount(null);
            LocalDate today = LocalDate.now();
            LocalDateTime todayStart = today.atStartOfDay();
            Long todayNewPlayers = playerMapper.selectCount(
                    new LambdaQueryWrapper<PlayerEntity>().ge(PlayerEntity::getCreatedAt, todayStart));
            List<ShopOrderEntity> paidOrders = shopOrderMapper.selectList(
                    new LambdaQueryWrapper<ShopOrderEntity>()
                            .eq(ShopOrderEntity::getPayStatus, 2));
            BigDecimal totalRecharge = BigDecimal.ZERO;
            for (ShopOrderEntity o : paidOrders) {
                if (o.getAmount() != null) {
                    totalRecharge = totalRecharge.add(o.getAmount());
                }
            }

            Row overviewHeader = overviewSheet.createRow(0);
            Cell oh0 = overviewHeader.createCell(0);
            oh0.setCellValue("指标");
            oh0.setCellStyle(headerStyle);
            Cell oh1 = overviewHeader.createCell(1);
            oh1.setCellValue("数值");
            oh1.setCellStyle(headerStyle);

            Object[][] overviewRows = {
                    {"总玩家数", totalPlayers},
                    {"今日新增玩家", todayNewPlayers},
                    {"总充值金额", totalRecharge},
                    {"已支付订单数", (long) paidOrders.size()}
            };
            for (int i = 0; i < overviewRows.length; i++) {
                Row row = overviewSheet.createRow(i + 1);
                row.createCell(0).setCellValue((String) overviewRows[i][0]);
                Object val = overviewRows[i][1];
                if (val instanceof Number) {
                    row.createCell(1).setCellValue(((Number) val).doubleValue());
                } else {
                    row.createCell(1).setCellValue(String.valueOf(val));
                }
            }
            overviewSheet.autoSizeColumn(0);
            overviewSheet.autoSizeColumn(1);

            // Sheet2: 每日统计（最近30天）
            Sheet dailySheet = workbook.createSheet("每日统计");
            List<DailyStatsEntity> dailyStats = dailyStatsMapper.selectList(
                    new LambdaQueryWrapper<DailyStatsEntity>()
                            .ge(DailyStatsEntity::getStatDate, today.minusDays(30))
                            .orderByDesc(DailyStatsEntity::getStatDate)
            );
            String[] dailyHeaders = {"统计日期", "新增玩家", "活跃玩家", "充值金额", "充值次数",
                    "获得金币", "消耗金币", "总击杀", "总发射", "BOSS击杀", "平均在线", "峰值在线"};
            Row dailyHeaderRow = dailySheet.createRow(0);
            for (int i = 0; i < dailyHeaders.length; i++) {
                Cell cell = dailyHeaderRow.createCell(i);
                cell.setCellValue(dailyHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            int dailyRowNum = 1;
            for (DailyStatsEntity s : dailyStats) {
                Row row = dailySheet.createRow(dailyRowNum++);
                row.createCell(0).setCellValue(s.getStatDate() != null ? s.getStatDate().toString() : "");
                row.createCell(1).setCellValue(s.getNewPlayers() != null ? s.getNewPlayers() : 0);
                row.createCell(2).setCellValue(s.getActivePlayers() != null ? s.getActivePlayers() : 0);
                row.createCell(3).setCellValue(s.getTotalRecharge() != null ? s.getTotalRecharge().doubleValue() : 0d);
                row.createCell(4).setCellValue(s.getRechargeCount() != null ? s.getRechargeCount() : 0);
                row.createCell(5).setCellValue(s.getTotalCoinsEarned() != null ? s.getTotalCoinsEarned() : 0);
                row.createCell(6).setCellValue(s.getTotalCoinsSpent() != null ? s.getTotalCoinsSpent() : 0);
                row.createCell(7).setCellValue(s.getTotalKills() != null ? s.getTotalKills() : 0);
                row.createCell(8).setCellValue(s.getTotalBullets() != null ? s.getTotalBullets() : 0);
                row.createCell(9).setCellValue(s.getBossKills() != null ? s.getBossKills() : 0);
                row.createCell(10).setCellValue(s.getAvgOnline() != null ? s.getAvgOnline() : 0);
                row.createCell(11).setCellValue(s.getPeakOnline() != null ? s.getPeakOnline() : 0);
            }
            for (int i = 0; i < dailyHeaders.length; i++) {
                dailySheet.autoSizeColumn(i);
            }

            // Sheet3: 充值统计（按订单状态汇总）
            Sheet rechargeSheet = workbook.createSheet("充值统计");
            Row rechargeHeader = rechargeSheet.createRow(0);
            Cell rh0 = rechargeHeader.createCell(0);
            rh0.setCellValue("支付状态");
            rh0.setCellStyle(headerStyle);
            Cell rh1 = rechargeHeader.createCell(1);
            rh1.setCellValue("订单数");
            rh1.setCellStyle(headerStyle);
            Cell rh2 = rechargeHeader.createCell(2);
            rh2.setCellValue("金额");
            rh2.setCellStyle(headerStyle);

            long paySuccess = shopOrderMapper.selectCount(
                    new LambdaQueryWrapper<ShopOrderEntity>().eq(ShopOrderEntity::getPayStatus, 2));
            long payPending = shopOrderMapper.selectCount(
                    new LambdaQueryWrapper<ShopOrderEntity>().eq(ShopOrderEntity::getPayStatus, 0));
            long payFailed = shopOrderMapper.selectCount(
                    new LambdaQueryWrapper<ShopOrderEntity>().eq(ShopOrderEntity::getPayStatus, 3));

            Object[][] rechargeRows = {
                    {"已支付", paySuccess, totalRecharge},
                    {"待支付", payPending, BigDecimal.ZERO},
                    {"失败/退款", payFailed, BigDecimal.ZERO}
            };
            for (int i = 0; i < rechargeRows.length; i++) {
                Row row = rechargeSheet.createRow(i + 1);
                row.createCell(0).setCellValue((String) rechargeRows[i][0]);
                row.createCell(1).setCellValue(((Number) rechargeRows[i][1]).doubleValue());
                row.createCell(2).setCellValue(((BigDecimal) rechargeRows[i][2]).doubleValue());
            }
            rechargeSheet.autoSizeColumn(0);
            rechargeSheet.autoSizeColumn(1);
            rechargeSheet.autoSizeColumn(2);

            workbook.write(out);
            log.info("统计报表导出完成: 每日统计 {} 条", dailyStats.size());
            return out.toByteArray();
        }
    }

    /**
     * 创建表头样式
     */
    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private String nullToEmpty(String str) {
        return str != null ? str : "";
    }

    private String getStatusText(Integer status) {
        if (status == null) return "未知";
        switch (status) {
            case 1: return "正常";
            case 2: return "已封禁";
            case 3: return "已注销";
            default: return "未知";
        }
    }

    private String getPayStatusText(Integer payStatus) {
        if (payStatus == null) return "未知";
        switch (payStatus) {
            case 0: return "待支付";
            case 1: return "支付中";
            case 2: return "已支付";
            case 3: return "失败/退款";
            default: return "未知";
        }
    }
}
