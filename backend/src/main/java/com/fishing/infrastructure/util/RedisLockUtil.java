package com.fishing.infrastructure.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Redis分布式锁工具类
 *
 * @author 后端架构组
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisLockUtil {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String LOCK_PREFIX = "fishing:lock:";

    /**
     * 释放锁的Lua脚本（保证原子性）
     */
    private static final String UNLOCK_SCRIPT =
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                    "return redis.call('del', KEYS[1]) " +
                    "else return 0 end";

    /**
     * 尝试获取锁
     *
     * @param lockKey  锁key
     * @param timeout  锁超时时间（毫秒）
     * @return 锁标识（解锁时需要），获取失败返回null
     */
    public String tryLock(String lockKey, long timeout) {
        String requestId = UUID.randomUUID().toString();
        String key = LOCK_PREFIX + lockKey;
        try {
            Boolean success = redisTemplate.opsForValue()
                    .setIfAbsent(key, requestId, timeout, TimeUnit.MILLISECONDS);
            if (Boolean.TRUE.equals(success)) {
                log.debug("获取锁成功: key={}, requestId={}", key, requestId);
                return requestId;
            }
        } catch (Exception e) {
            log.error("获取锁异常: key={}", key, e);
        }
        return null;
    }

    /**
     * 尝试获取锁（带重试）
     *
     * @param lockKey     锁key
     * @param timeout     锁超时时间（毫秒）
     * @param retryTimes  重试次数
     * @param retryInterval 重试间隔（毫秒）
     * @return 锁标识，获取失败返回null
     */
    public String tryLockWithRetry(String lockKey, long timeout, int retryTimes, long retryInterval) {
        for (int i = 0; i < retryTimes; i++) {
            String requestId = tryLock(lockKey, timeout);
            if (requestId != null) {
                return requestId;
            }
            try {
                Thread.sleep(retryInterval);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
        log.warn("获取锁失败（已重试{}次）: key={}", retryTimes, lockKey);
        return null;
    }

    /**
     * 释放锁
     *
     * @param lockKey   锁key
     * @param requestId 锁标识
     * @return 是否释放成功
     */
    public boolean unlock(String lockKey, String requestId) {
        String key = LOCK_PREFIX + lockKey;
        try {
            DefaultRedisScript<Long> script = new DefaultRedisScript<>();
            script.setScriptText(UNLOCK_SCRIPT);
            script.setResultType(Long.class);
            Long result = redisTemplate.execute(script, Collections.singletonList(key), requestId);
            boolean success = result != null && result == 1;
            if (success) {
                log.debug("释放锁成功: key={}", key);
            }
            return success;
        } catch (Exception e) {
            log.error("释放锁异常: key={}", key, e);
            return false;
        }
    }
}
