package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.infrastructure.persistence.entity.PlayerMailEntity;
import com.fishing.infrastructure.persistence.repository.PlayerMailMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 通知推送服务
 * 系统公告、活动推送、滚动消息
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final PlayerMailMapper playerMailMapper;

    private static final String ANNOUNCEMENT_KEY = "fishing:notification:announcement";
    private static final String SCROLL_MSG_KEY = "fishing:notification:scroll";
    private static final String ACTIVITY_KEY = "fishing:notification:activity";

    /**
     * 获取当前系统公告
     */
    public Map<String, Object> getCurrentAnnouncement() {
        Map<String, Object> announcement = (Map<String, Object>) redisTemplate.opsForValue().get(ANNOUNCEMENT_KEY);
        if (announcement == null) {
            // 默认公告
            announcement = new HashMap<>();
            announcement.put("title", "欢迎来到捕鱼达人·东海龙宫");
            announcement.put("content", "游戏内金币为纯游戏虚拟道具，不可兑换现金，仅游戏内部消耗使用。");
            announcement.put("type", "system");
            announcement.put("priority", 1);
        }
        return announcement;
    }

    /**
     * 发布系统公告
     */
    public Map<String, Object> publishAnnouncement(String title, String content, String type, int priority, int durationMinutes) {
        Map<String, Object> announcement = new HashMap<>();
        announcement.put("title", title);
        announcement.put("content", content);
        announcement.put("type", type); // system/activity/maintenance/update
        announcement.put("priority", priority);
        announcement.put("publishTime", LocalDateTime.now().toString());
        announcement.put("expireTime", LocalDateTime.now().plusMinutes(durationMinutes).toString());

        redisTemplate.opsForValue().set(ANNOUNCEMENT_KEY, announcement, durationMinutes, TimeUnit.MINUTES);

        log.info("系统公告已发布: title={}, type={}, priority={}, duration={}min",
                title, type, priority, durationMinutes);

        return announcement;
    }

    /**
     * 获取滚动消息列表
     */
    public List<Map<String, Object>> getScrollMessages() {
        List<Object> messages = redisTemplate.opsForList().range(SCROLL_MSG_KEY, 0, -1);
        List<Map<String, Object>> result = new ArrayList<>();
        if (messages != null) {
            for (Object msg : messages) {
                if (msg instanceof Map) {
                    result.add((Map<String, Object>) msg);
                }
            }
        }
        return result;
    }

    /**
     * 添加滚动消息
     */
    public void addScrollMessage(String content, String type, int durationMinutes) {
        Map<String, Object> message = new HashMap<>();
        message.put("content", content);
        message.put("type", type); // system/player_kill/boss/activity
        message.put("time", LocalDateTime.now().toString());

        redisTemplate.opsForList().rightPush(SCROLL_MSG_KEY, message);
        // 最多保留50条
        redisTemplate.opsForList().trim(SCROLL_MSG_KEY, -50, -1);
        // 设置过期时间
        redisTemplate.expire(SCROLL_MSG_KEY, durationMinutes, TimeUnit.MINUTES);

        log.info("滚动消息已添加: content={}, type={}", content, type);
    }

    /**
     * 清空滚动消息
     */
    public void clearScrollMessages() {
        redisTemplate.delete(SCROLL_MSG_KEY);
        log.info("滚动消息已清空");
    }

    /**
     * 获取活动列表
     */
    public List<Map<String, Object>> getActivities() {
        Map<Object, Object> activities = redisTemplate.opsForHash().entries(ACTIVITY_KEY);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object value : activities.values()) {
            if (value instanceof Map) {
                result.add((Map<String, Object>) value);
            }
        }
        // 按开始时间排序
        result.sort((a, b) -> {
            String timeA = (String) a.get("startTime");
            String timeB = (String) b.get("startTime");
            return timeB != null ? timeB.compareTo(timeA) : 0;
        });
        return result;
    }

    /**
     * 发布活动
     */
    public Map<String, Object> publishActivity(String activityId, String name, String description,
                                                 LocalDateTime startTime, LocalDateTime endTime,
                                                 Map<String, Object> rewards) {
        Map<String, Object> activity = new HashMap<>();
        activity.put("id", activityId);
        activity.put("name", name);
        activity.put("description", description);
        activity.put("startTime", startTime.toString());
        activity.put("endTime", endTime.toString());
        activity.put("rewards", rewards);
        activity.put("status", "active");
        activity.put("publishTime", LocalDateTime.now().toString());

        redisTemplate.opsForHash().put(ACTIVITY_KEY, activityId, activity);

        log.info("活动已发布: id={}, name={}, startTime={}, endTime={}",
                activityId, name, startTime, endTime);

        return activity;
    }

    /**
     * 结束活动
     */
    public void endActivity(String activityId) {
        Map<String, Object> activity = (Map<String, Object>) redisTemplate.opsForHash().get(ACTIVITY_KEY, activityId);
        if (activity != null) {
            activity.put("status", "ended");
            activity.put("endTime", LocalDateTime.now().toString());
            redisTemplate.opsForHash().put(ACTIVITY_KEY, activityId, activity);
            log.info("活动已结束: id={}", activityId);
        }
    }

    /**
     * 定时清理过期活动（每小时检查一次）
     */
    @Scheduled(fixedRate = 3600000)
    public void cleanExpiredActivities() {
        Map<Object, Object> activities = redisTemplate.opsForHash().entries(ACTIVITY_KEY);
        String now = LocalDateTime.now().toString();
        int cleaned = 0;

        for (Map.Entry<Object, Object> entry : activities.entrySet()) {
            if (entry.getValue() instanceof Map) {
                Map<String, Object> activity = (Map<String, Object>) entry.getValue();
                String endTime = (String) activity.get("endTime");
                if (endTime != null && endTime.compareTo(now) < 0) {
                    redisTemplate.opsForHash().delete(ACTIVITY_KEY, entry.getKey());
                    cleaned++;
                }
            }
        }

        if (cleaned > 0) {
            log.info("过期活动清理完成: {} 个", cleaned);
        }
    }

    /**
     * 全服邮件推送（系统邮件）
     */
    public void sendGlobalMail(String title, String content, Long coins, Integer diamonds, int expireDays) {
        // 简化实现：创建一封系统邮件，所有玩家可见
        PlayerMailEntity mail = new PlayerMailEntity();
        mail.setPlayerId("ALL"); // 标记为全服邮件
        mail.setMailType("system"); // 系统邮件
        mail.setTitle(title);
        mail.setSender("系统");
        mail.setContent(content);
        // 奖励以JSON格式存储在attachments字段
        String attachments = "{\"coins\":" + coins + ",\"diamonds\":" + diamonds + "}";
        mail.setAttachments(attachments);
        mail.setIsRead(false);
        mail.setIsClaimed(false);
        mail.setExpiredAt(LocalDateTime.now().plusDays(expireDays));
        playerMailMapper.insert(mail);

        log.info("全服邮件已发送: title={}, coins={}, diamonds={}, expireDays={}",
                title, coins, diamonds, expireDays);
    }
}
