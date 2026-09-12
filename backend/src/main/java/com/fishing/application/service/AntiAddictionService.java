package com.fishing.application.service;

import cn.hutool.crypto.digest.DigestUtil;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 防沉迷应用服务
 * 符合《关于进一步严格管理 切实防止未成年人沉迷网络游戏的通知》
 * 未成年人仅可在周五、周六、周日和法定节假日20:00-21:00游戏
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AntiAddictionService {

    private final PlayerCacheService playerCacheService;

    /**
     * 未成年人可游戏时段：20:00-21:00
     */
    private static final LocalTime MINOR_START_TIME = LocalTime.of(20, 0);
    private static final LocalTime MINOR_END_TIME = LocalTime.of(21, 0);

    /**
     * 未成年人每日游戏时长上限（分钟）
     */
    private static final int MINOR_DAILY_LIMIT_MINUTES = 60;

    /**
     * 实名认证
     *
     * @param playerId 玩家ID
     * @param realName 真实姓名
     * @param idCard   身份证号
     * @return 认证结果
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> verifyRealName(String playerId, String realName, String idCard) {
        if (realName == null || realName.trim().isEmpty()) {
            throw new BusinessException("真实姓名不能为空");
        }
        if (idCard == null || idCard.trim().isEmpty()) {
            throw new BusinessException("身份证号不能为空");
        }
        if (!isValidIdCard(idCard)) {
            throw new BusinessException("身份证号格式不正确");
        }

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 计算年龄
        int age = calculateAgeFromIdCard(idCard);
        boolean isMinor = age < 18;

        // 存储身份证哈希（不存明文）
        String idCardHash = DigestUtil.sha256Hex(idCard);

        player.setRealName(realName);
        player.setIdCardHash(idCardHash);
        player.setAge(age);
        player.setIsMinor(isMinor);
        player.setIsRealNameVerified(true);

        playerCacheService.updatePlayer(player);
        log.info("实名认证成功: playerId={}, age={}, isMinor={}", playerId, age, isMinor);

        Map<String, Object> result = new HashMap<>(4);
        result.put("verified", true);
        result.put("age", age);
        result.put("isMinor", isMinor);
        return result;
    }

    /**
     * 检查是否可以游戏
     *
     * @param playerId 玩家ID
     * @return 检查结果
     */
    public Map<String, Object> checkPlayPermission(String playerId) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        Map<String, Object> result = new HashMap<>(8);
        result.put("canPlay", true);
        result.put("isMinor", Boolean.TRUE.equals(player.getIsMinor()));
        result.put("isVerified", Boolean.TRUE.equals(player.getIsRealNameVerified()));

        // 未实名认证用户按未成年人处理
        if (!Boolean.TRUE.equals(player.getIsRealNameVerified())) {
            result.put("canPlay", false);
            result.put("reason", "请先完成实名认证");
            result.put("needVerify", true);
            return result;
        }

        // 未成年人时段限制
        if (Boolean.TRUE.equals(player.getIsMinor())) {
            LocalDateTime now = LocalDateTime.now();
            boolean isAllowedTime = isMinorAllowedTime(now);

            if (!isAllowedTime) {
                result.put("canPlay", false);
                result.put("reason", "未成年人仅可在周五、周六、周日及法定节假日20:00-21:00游戏");
                result.put("needVerify", false);
                return result;
            }

            // 计算剩余可游戏时间
            int remainingMinutes = calculateRemainingTime(now);
            result.put("remainingMinutes", remainingMinutes);
        }

        return result;
    }

    /**
     * 判断未成年人是否在可游戏时段
     * 规则：周五、周六、周日及法定节假日 20:00-21:00
     */
    private boolean isMinorAllowedTime(LocalDateTime now) {
        DayOfWeek dayOfWeek = now.getDayOfWeek();
        LocalTime time = now.toLocalTime();

        // 检查是否为周五、周六、周日
        boolean isWeekendOrFriday = dayOfWeek == DayOfWeek.FRIDAY
                || dayOfWeek == DayOfWeek.SATURDAY
                || dayOfWeek == DayOfWeek.SUNDAY;

        // 检查是否在20:00-21:00
        boolean isInTimeRange = !time.isBefore(MINOR_START_TIME) && !time.isAfter(MINOR_END_TIME);

        // TODO: 法定节假日判断需接入节假日API
        return isWeekendOrFriday && isInTimeRange;
    }

    /**
     * 计算剩余可游戏时间（分钟）
     */
    private int calculateRemainingTime(LocalDateTime now) {
        LocalTime endTime = MINOR_END_TIME;
        LocalTime currentTime = now.toLocalTime();
        if (currentTime.isAfter(endTime)) {
            return 0;
        }
        long minutes = java.time.Duration.between(currentTime, endTime).toMinutes();
        return (int) Math.min(minutes, MINOR_DAILY_LIMIT_MINUTES);
    }

    /**
     * 校验身份证号格式（18位）
     */
    private boolean isValidIdCard(String idCard) {
        if (idCard == null || idCard.length() != 18) {
            return false;
        }
        // 简单格式校验：前17位数字，最后一位数字或X
        String regex = "^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$";
        return idCard.matches(regex);
    }

    /**
     * 从身份证号计算年龄
     */
    private int calculateAgeFromIdCard(String idCard) {
        String birthYearStr = idCard.substring(6, 10);
        int birthYear = Integer.parseInt(birthYearStr);
        int currentYear = LocalDate.now().getYear();
        return currentYear - birthYear;
    }

    /**
     * 获取防沉迷配置
     */
    public Map<String, Object> getConfig() {
        Map<String, Object> config = new HashMap<>(8);
        config.put("minorStartTime", MINOR_START_TIME.toString());
        config.put("minorEndTime", MINOR_END_TIME.toString());
        config.put("minorDailyLimit", MINOR_DAILY_LIMIT_MINUTES);
        config.put("allowedDays", "周五、周六、周日及法定节假日");
        config.put("description", "未成年人仅可在周五、周六、周日和法定节假日20:00-21:00游戏，每日不超过1小时");
        return config;
    }
}
