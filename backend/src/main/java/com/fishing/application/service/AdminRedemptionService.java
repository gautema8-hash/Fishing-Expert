package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.entity.RedemptionCodeEntity;
import com.fishing.infrastructure.persistence.entity.RedemptionRecordEntity;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import com.fishing.infrastructure.persistence.repository.RedemptionCodeMapper;
import com.fishing.infrastructure.persistence.repository.RedemptionRecordMapper;
import com.fishing.interfaces.dto.admin.CreateRedemptionRequest;
import com.fishing.interfaces.dto.admin.PageResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 管理端兑换码服务
 * 兑换码的生成、查询、停用，以及兑换使用记录查询
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRedemptionService {

    private final RedemptionCodeMapper redemptionCodeMapper;
    private final RedemptionRecordMapper redemptionRecordMapper;
    private final PlayerMapper playerMapper;
    private final AdminOperationLogService adminOperationLogService;

    private static final String DEFAULT_PREFIX = "SB";
    private static final int MAX_GENERATE_COUNT = 100;

    /**
     * 分页查询兑换码列表
     *
     * @param page    页码
     * @param size    每页大小
     * @param keyword 模糊匹配 code / codeName
     */
    public PageResult<RedemptionCodeEntity> getCodeList(int page, int size, String keyword) {
        Page<RedemptionCodeEntity> p = new Page<>(page, size);
        LambdaQueryWrapper<RedemptionCodeEntity> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim();
            wrapper.and(w -> w.like(RedemptionCodeEntity::getCode, kw)
                    .or().like(RedemptionCodeEntity::getCodeName, kw));
        }
        wrapper.orderByDesc(RedemptionCodeEntity::getCreatedAt);
        Page<RedemptionCodeEntity> result = redemptionCodeMapper.selectPage(p, wrapper);
        List<RedemptionCodeEntity> records = result.getRecords();
        if (records == null) {
            records = new ArrayList<>();
        }
        return new PageResult<>(records, result.getTotal(), page, size);
    }

    /**
     * 批量生成兑换码
     */
    @Transactional(rollbackFor = Exception.class)
    public List<RedemptionCodeEntity> generateCodes(CreateRedemptionRequest request) {
        String prefix = (request.getCodePrefix() == null || request.getCodePrefix().trim().isEmpty())
                ? DEFAULT_PREFIX : request.getCodePrefix().trim().toUpperCase();
        int count = request.getCount() == null ? 1 : request.getCount();
        if (count < 1) {
            throw new BusinessException("生成数量必须大于0");
        }
        if (count > MAX_GENERATE_COUNT) {
            throw new BusinessException("单次最多生成" + MAX_GENERATE_COUNT + "个兑换码");
        }
        if (request.getRewardJson() == null || request.getRewardJson().trim().isEmpty()) {
            throw new BusinessException("奖励内容不能为空");
        }
        int maxUses = request.getMaxUses() == null ? 1 : request.getMaxUses();

        List<RedemptionCodeEntity> generated = new ArrayList<>(count);
        Set<String> existingCodes = loadAllCodeSet();

        for (int i = 0; i < count; i++) {
            String code = generateUniqueCode(prefix, existingCodes);
            existingCodes.add(code);

            RedemptionCodeEntity entity = new RedemptionCodeEntity();
            entity.setCode(code);
            entity.setCodeName(prefix + "-" + code);
            entity.setRewardJson(request.getRewardJson());
            entity.setMaxUses(maxUses);
            entity.setUsedCount(0);
            entity.setExpiredAt(request.getExpiredAt());
            entity.setIsActive(true);
            redemptionCodeMapper.insert(entity);
            generated.add(entity);
        }

        log.info("批量生成兑换码完成: prefix={}, count={}", prefix, generated.size());
        adminOperationLogService.recordLog("批量生成兑换码", "redemption",
                null,
                "{\"prefix\":\"" + prefix + "\",\"count\":" + count + ",\"maxUses\":" + maxUses + "}",
                "success", null);
        return generated;
    }

    /**
     * 停用兑换码（设isActive=false）
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteCode(String code) {
        RedemptionCodeEntity entity = redemptionCodeMapper.selectOne(
                new LambdaQueryWrapper<RedemptionCodeEntity>()
                        .eq(RedemptionCodeEntity::getCode, code));
        if (entity == null) {
            throw new BusinessException("兑换码不存在: " + code);
        }
        entity.setIsActive(false);
        redemptionCodeMapper.updateById(entity);
        log.info("兑换码已停用: {}", code);

        adminOperationLogService.recordLog("停用兑换码", "redemption", code,
                null, "success", null);
    }

    /**
     * 分页查询兑换使用记录（关联玩家昵称）
     *
     * @param page     页码
     * @param size     每页大小
     * @param code     兑换码（可空）
     * @param playerId 玩家ID（可空）
     */
    public PageResult<Map<String, Object>> getRedeemRecords(int page, int size,
                                                            String code, String playerId) {
        Page<RedemptionRecordEntity> p = new Page<>(page, size);
        LambdaQueryWrapper<RedemptionRecordEntity> wrapper = new LambdaQueryWrapper<>();
        if (code != null && !code.trim().isEmpty()) {
            wrapper.eq(RedemptionRecordEntity::getCode, code.trim());
        }
        if (playerId != null && !playerId.trim().isEmpty()) {
            wrapper.eq(RedemptionRecordEntity::getPlayerId, playerId.trim());
        }
        wrapper.orderByDesc(RedemptionRecordEntity::getCreatedAt);
        Page<RedemptionRecordEntity> result = redemptionRecordMapper.selectPage(p, wrapper);
        List<RedemptionRecordEntity> records = result.getRecords();
        if (records == null) {
            records = new ArrayList<>();
        }

        // 批量查询玩家昵称
        Set<String> playerIds = records.stream()
                .map(RedemptionRecordEntity::getPlayerId)
                .filter(pid -> pid != null && !pid.isEmpty())
                .collect(Collectors.toSet());
        Map<String, String> nicknameMap = new HashMap<>();
        if (!playerIds.isEmpty()) {
            List<PlayerEntity> players = playerMapper.selectList(
                    new LambdaQueryWrapper<PlayerEntity>()
                            .in(PlayerEntity::getPlayerId, playerIds));
            for (PlayerEntity player : players) {
                nicknameMap.put(player.getPlayerId(), player.getNickname());
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>(records.size());
        for (RedemptionRecordEntity record : records) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", record.getId());
            row.put("playerId", record.getPlayerId());
            row.put("nickname", nicknameMap.get(record.getPlayerId()));
            row.put("code", record.getCode());
            row.put("rewardJson", record.getRewardJson());
            row.put("createdAt", record.getCreatedAt());
            rows.add(row);
        }
        return new PageResult<>(rows, result.getTotal(), page, size);
    }

    /**
     * 生成唯一兑换码
     */
    private String generateUniqueCode(String prefix, Set<String> existingCodes) {
        for (int attempt = 0; attempt < 10; attempt++) {
            String suffix = UUID.randomUUID().toString().replace("-", "").toUpperCase().substring(0, 8);
            String code = prefix + suffix;
            if (!existingCodes.contains(code)) {
                return code;
            }
        }
        // 极端兜底：追加随机数
        String code = prefix + UUID.randomUUID().toString().replace("-", "").toUpperCase().substring(0, 8)
                + System.currentTimeMillis() % 10;
        return code;
    }

    /**
     * 加载现有全部兑换码集合（用于去重，兑换码量级可控）
     */
    private Set<String> loadAllCodeSet() {
        List<RedemptionCodeEntity> all = redemptionCodeMapper.selectList(
                new LambdaQueryWrapper<RedemptionCodeEntity>()
                        .select(RedemptionCodeEntity::getCode));
        Set<String> set = new HashSet<>();
        for (RedemptionCodeEntity e : all) {
            if (e.getCode() != null) {
                set.add(e.getCode());
            }
        }
        return set;
    }
}
