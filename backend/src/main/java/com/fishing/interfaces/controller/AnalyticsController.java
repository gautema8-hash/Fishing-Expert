package com.fishing.interfaces.controller;

import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import com.fishing.infrastructure.persistence.entity.AnalyticsEventEntity;
import com.fishing.infrastructure.persistence.repository.AnalyticsEventMapper;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 埋点控制器
 *
 * @author 后端架构组
 */
@Api(tags = "数据埋点")
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsEventMapper analyticsEventMapper;

    @ApiOperation("上报埋点事件")
    @PostMapping("/event")
    public Result<Void> trackEvent(@RequestBody Map<String, Object> params, HttpServletRequest request) {
        String playerId = JwtInterceptor.getCurrentPlayerId();

        AnalyticsEventEntity event = new AnalyticsEventEntity();
        event.setPlayerId(playerId);
        event.setEventType((String) params.get("eventType"));
        event.setEventName((String) params.get("eventName"));
        event.setEventData(params.get("eventData") != null ? params.get("eventData").toString() : null);
        event.setDeviceInfo((String) params.get("deviceInfo"));
        event.setIpAddress(request.getRemoteAddr());
        event.setCreatedAt(LocalDateTime.now());
        analyticsEventMapper.insert(event);

        return Result.success();
    }
}
