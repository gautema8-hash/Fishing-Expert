package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.infrastructure.persistence.entity.GameRecordEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.repository.GameRecordMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
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
}
