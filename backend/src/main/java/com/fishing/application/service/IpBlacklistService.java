package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.infrastructure.persistence.entity.IpBlacklistEntity;
import com.fishing.infrastructure.persistence.repository.IpBlacklistMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * IP封禁服务
 * IP黑名单管理、临时封禁、自动解封
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IpBlacklistService {

    private final IpBlacklistMapper ipBlacklistMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY = "fishing:ip:blacklist";
    private static final String CACHE_LOCK = "fishing:ip:lock:";

    /**
     * 检查IP是否被封禁
     */
    public boolean isBanned(String ip) {
        if (ip == null || ip.isEmpty()) {
            return false;
        }

        // 先查Redis缓存
        Boolean cached = (Boolean) redisTemplate.opsForHash().get(CACHE_KEY, ip);
        if (cached != null) {
            return cached;
        }

        // 查数据库
        IpBlacklistEntity entity = ipBlacklistMapper.selectOne(
                new LambdaQueryWrapper<IpBlacklistEntity>()
                        .eq(IpBlacklistEntity::getIp, ip)
        );

        boolean banned = false;
        if (entity != null) {
            if ("permanent".equals(entity.getBanType())) {
                banned = true;
            } else if (entity.getExpireAt() != null && entity.getExpireAt().isAfter(LocalDateTime.now())) {
                banned = true;
            }
        }

        // 写入缓存（5分钟过期）
        redisTemplate.opsForHash().put(CACHE_KEY, ip, banned);
        redisTemplate.expire(CACHE_KEY, 5, TimeUnit.MINUTES);

        return banned;
    }

    /**
     * 永久封禁IP
     */
    public void banIpPermanent(String ip, String reason, String operator) {
        banIp(ip, reason, "permanent", null, operator);
    }

    /**
     * 临时封禁IP
     */
    public void banIpTemporary(String ip, String reason, int hours, String operator) {
        LocalDateTime expireAt = LocalDateTime.now().plusHours(hours);
        banIp(ip, reason, "temporary", expireAt, operator);
    }

    /**
     * 封禁IP
     */
    private void banIp(String ip, String reason, String banType, LocalDateTime expireAt, String operator) {
        // 检查是否已存在
        IpBlacklistEntity existing = ipBlacklistMapper.selectOne(
                new LambdaQueryWrapper<IpBlacklistEntity>()
                        .eq(IpBlacklistEntity::getIp, ip)
        );

        if (existing != null) {
            existing.setReason(reason);
            existing.setBanType(banType);
            existing.setExpireAt(expireAt);
            existing.setCreatedBy(operator);
            ipBlacklistMapper.updateById(existing);
        } else {
            IpBlacklistEntity entity = new IpBlacklistEntity();
            entity.setIp(ip);
            entity.setReason(reason);
            entity.setBanType(banType);
            entity.setExpireAt(expireAt);
            entity.setCreatedBy(operator);
            ipBlacklistMapper.insert(entity);
        }

        // 清除缓存
        redisTemplate.opsForHash().delete(CACHE_KEY, ip);

        log.info("IP已封禁: ip={}, type={}, reason={}, operator={}", ip, banType, reason, operator);
    }

    /**
     * 解封IP
     */
    public void unbanIp(String ip) {
        ipBlacklistMapper.delete(
                new LambdaQueryWrapper<IpBlacklistEntity>()
                        .eq(IpBlacklistEntity::getIp, ip)
        );
        redisTemplate.opsForHash().delete(CACHE_KEY, ip);
        log.info("IP已解封: {}", ip);
    }

    /**
     * 获取封禁列表
     */
    public List<IpBlacklistEntity> getBanList(int page, int size) {
        return ipBlacklistMapper.selectList(
                new LambdaQueryWrapper<IpBlacklistEntity>()
                        .orderByDesc(IpBlacklistEntity::getCreatedAt)
                        .last("LIMIT " + size + " OFFSET " + (page - 1) * size)
        );
    }

    /**
     * 自动清理过期封禁（每小时执行）
     */
    @Scheduled(fixedRate = 3600000)
    public void cleanExpiredBans() {
        List<IpBlacklistEntity> expired = ipBlacklistMapper.selectList(
                new LambdaQueryWrapper<IpBlacklistEntity>()
                        .eq(IpBlacklistEntity::getBanType, "temporary")
                        .lt(IpBlacklistEntity::getExpireAt, LocalDateTime.now())
        );

        for (IpBlacklistEntity entity : expired) {
            ipBlacklistMapper.deleteById(entity.getId());
            redisTemplate.opsForHash().delete(CACHE_KEY, entity.getIp());
        }

        if (!expired.isEmpty()) {
            log.info("自动清理过期IP封禁: {} 个", expired.size());
        }
    }

    /**
     * IP频率限制（简单实现）
     * @param ip IP地址
     * @param limit 限制次数
     * @param seconds 时间窗口（秒）
     * @return 是否超过限制
     */
    public boolean isRateLimited(String ip, int limit, int seconds) {
        String key = CACHE_LOCK + ip;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, seconds, TimeUnit.SECONDS);
        }
        return count != null && count > limit;
    }
}
