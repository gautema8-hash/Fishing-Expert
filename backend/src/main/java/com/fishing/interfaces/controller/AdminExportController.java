package com.fishing.interfaces.controller;

import com.fishing.application.service.DataExportService;
import com.fishing.common.annotation.RequiresPermission;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * 管理端数据导出控制器
 *
 * @author 后端架构组
 */
@Api(tags = "管理端数据导出")
@RestController
@RequestMapping("/admin/api/export")
@RequiredArgsConstructor
public class AdminExportController {

    private final DataExportService dataExportService;

    private static final String EXCEL_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @ApiOperation("导出玩家列表Excel")
    @RequiresPermission("export:data")
    @GetMapping("/players")
    public ResponseEntity<byte[]> exportPlayers() throws IOException {
        byte[] data = dataExportService.exportPlayers();
        return buildExcelResponse(data, "players.xlsx");
    }

    @ApiOperation("导出订单Excel")
    @RequiresPermission("export:data")
    @GetMapping("/orders")
    public ResponseEntity<byte[]> exportOrders() throws IOException {
        byte[] data = dataExportService.exportOrders();
        return buildExcelResponse(data, "orders.xlsx");
    }

    @ApiOperation("导出统计报表Excel")
    @RequiresPermission("export:data")
    @GetMapping("/stats")
    public ResponseEntity<byte[]> exportStats() throws IOException {
        byte[] data = dataExportService.exportStats();
        return buildExcelResponse(data, "stats.xlsx");
    }

    /**
     * 构造Excel文件下载响应
     */
    private ResponseEntity<byte[]> buildExcelResponse(byte[] data, String fileName) throws IOException {
        String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8.name());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + encoded)
                .contentType(MediaType.parseMediaType(EXCEL_CONTENT_TYPE))
                .body(data);
    }
}
