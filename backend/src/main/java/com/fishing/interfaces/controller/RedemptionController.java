package com.fishing.interfaces.controller;

import com.fishing.application.service.RedemptionAppService;
import com.fishing.common.result.Result;
import com.fishing.infrastructure.config.JwtInterceptor;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 兑换码控制器
 *
 * @author 后端架构组
 */
@Api(tags = "兑换码管理")
@RestController
@RequestMapping("/redemption")
@RequiredArgsConstructor
public class RedemptionController {

    private final RedemptionAppService redemptionAppService;

    @ApiOperation("使用兑换码")
    @PostMapping("/redeem")
    public Result<Map<String, Object>> redeemCode(@RequestBody Map<String, String> params) {
        String playerId = JwtInterceptor.getCurrentPlayerId();
        String code = params.get("code");
        Map<String, Object> result = redemptionAppService.redeemCode(playerId, code);
        return Result.success("兑换成功", result);
    }
}
