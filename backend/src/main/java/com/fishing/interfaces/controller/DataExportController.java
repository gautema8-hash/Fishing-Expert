package com.fishing.interfaces.controller;

import com.fishing.application.service.DataExportService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * 数据导出控制器
 *
 * @author 后端架构组
 */
@Api(tags = "数据导出")
@RestController
@RequestMapping("/export")
@RequiredArgsConstructor
public class DataExportController {

    private final DataExportService dataExportService;

    @ApiOperation("导出玩家列表Excel")
    @GetMapping("/players")
    public ResponseEntity<byte[]> exportPlayers() throws IOException {
        byte[] data = dataExportService.exportPlayers();
        String fileName = URLEncoder.encode("玩家列表.xlsx", StandardCharsets.UTF_8.name());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @ApiOperation("导出游戏记录Excel")
    @GetMapping("/game-records")
    public ResponseEntity<byte[]> exportGameRecords(
            @RequestParam(required = false) String playerId) throws IOException {
        byte[] data = dataExportService.exportGameRecords(playerId);
        String fileName = URLEncoder.encode("游戏记录.xlsx", StandardCharsets.UTF_8.name());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
