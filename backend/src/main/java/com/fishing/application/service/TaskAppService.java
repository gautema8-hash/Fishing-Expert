package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.persistence.entity.TaskProgressEntity;
import com.fishing.infrastructure.persistence.repository.TaskProgressMapper;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 任务系统应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskAppService {

    private final TaskProgressMapper taskMapper;
    private final PlayerCacheService playerCacheService;

    /**
     * 每日任务配置
     */
    private static final List<Map<String, Object>> DAILY_TASKS = Arrays.asList(
            createTask("daily_login", "每日登录", "登录游戏", 1, 500, "daily"),
            createTask("daily_kill_50", "捕鱼达人", "今日击杀50条鱼", 50, 1000, "daily"),
            createTask("daily_kill_boss", "屠龙者", "今日击杀1只BOSS", 1, 2000, "daily"),
            createTask("daily_bullets_200", "炮手", "今日发射200发炮弹", 200, 800, "daily"),
            createTask("daily_coin_10000", "小富翁", "今日获得10000金币", 10000, 1500, "daily")
    );

    private static Map<String, Object> createTask(String id, String name, String desc, int target, int reward, String type) {
        Map<String, Object> task = new HashMap<>();
        task.put("taskId", id);
        task.put("name", name);
        task.put("description", desc);
        task.put("target", target);
        task.put("rewardCoins", reward);
        task.put("taskType", type);
        return task;
    }

    /**
     * 获取任务列表
     */
    public List<Map<String, Object>> getTaskList(String playerId) {
        LocalDate today = LocalDate.now();
        List<TaskProgressEntity> progressList = taskMapper.selectList(
                new LambdaQueryWrapper<TaskProgressEntity>()
                        .eq(TaskProgressEntity::getPlayerId, playerId)
                        .eq(TaskProgressEntity::getResetDate, today)
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> taskConfig : DAILY_TASKS) {
            Map<String, Object> task = new HashMap<>(taskConfig);
            TaskProgressEntity progress = progressList.stream()
                    .filter(p -> p.getTaskId().equals(taskConfig.get("taskId")))
                    .findFirst().orElse(null);

            if (progress != null) {
                task.put("progress", progress.getProgress());
                task.put("isCompleted", progress.getIsCompleted());
                task.put("isClaimed", progress.getIsClaimed());
            } else {
                task.put("progress", 0);
                task.put("isCompleted", false);
                task.put("isClaimed", false);
            }
            result.add(task);
        }
        return result;
    }

    /**
     * 更新任务进度
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateTaskProgress(String playerId, String taskId, int increment) {
        LocalDate today = LocalDate.now();
        TaskProgressEntity progress = taskMapper.selectOne(
                new LambdaQueryWrapper<TaskProgressEntity>()
                        .eq(TaskProgressEntity::getPlayerId, playerId)
                        .eq(TaskProgressEntity::getTaskId, taskId)
                        .eq(TaskProgressEntity::getResetDate, today)
        );

        Map<String, Object> taskConfig = DAILY_TASKS.stream()
                .filter(t -> t.get("taskId").equals(taskId))
                .findFirst().orElse(null);
        if (taskConfig == null) return;

        int target = (int) taskConfig.get("target");

        if (progress == null) {
            progress = new TaskProgressEntity();
            progress.setPlayerId(playerId);
            progress.setTaskId(taskId);
            progress.setTaskType("daily");
            progress.setProgress(Math.min(increment, target));
            progress.setIsCompleted(increment >= target);
            progress.setIsClaimed(false);
            progress.setResetDate(today);
            if (increment >= target) {
                progress.setCompletedAt(LocalDateTime.now());
            }
            taskMapper.insert(progress);
        } else {
            int newProgress = Math.min(progress.getProgress() + increment, target);
            progress.setProgress(newProgress);
            if (!Boolean.TRUE.equals(progress.getIsCompleted()) && newProgress >= target) {
                progress.setIsCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
            }
            taskMapper.updateById(progress);
        }
    }

    /**
     * 领取任务奖励
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> claimTaskReward(String playerId, String taskId) {
        LocalDate today = LocalDate.now();
        TaskProgressEntity progress = taskMapper.selectOne(
                new LambdaQueryWrapper<TaskProgressEntity>()
                        .eq(TaskProgressEntity::getPlayerId, playerId)
                        .eq(TaskProgressEntity::getTaskId, taskId)
                        .eq(TaskProgressEntity::getResetDate, today)
        );

        if (progress == null || !Boolean.TRUE.equals(progress.getIsCompleted())) {
            throw new BusinessException("任务未完成");
        }
        if (Boolean.TRUE.equals(progress.getIsClaimed())) {
            throw new BusinessException(ResultCode.ALREADY_CLAIMED);
        }

        Map<String, Object> taskConfig = DAILY_TASKS.stream()
                .filter(t -> t.get("taskId").equals(taskId))
                .findFirst().orElseThrow(() -> new BusinessException("任务不存在"));
        int rewardCoins = (int) taskConfig.get("rewardCoins");

        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));
        player.addCoins(rewardCoins);
        playerCacheService.updatePlayer(player);

        progress.setIsClaimed(true);
        progress.setClaimedAt(LocalDateTime.now());
        taskMapper.updateById(progress);

        Map<String, Object> result = new HashMap<>(4);
        result.put("rewardCoins", rewardCoins);
        result.put("coins", player.getCoins());
        return result;
    }
}
