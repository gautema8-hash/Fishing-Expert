package com.fishing.application.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.util.JwtUtil;
import com.fishing.infrastructure.util.PlayerCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 玩家应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlayerAppService {

    private final PlayerRepository playerRepository;
    private final PlayerCacheService playerCacheService;
    private final JwtUtil jwtUtil;

    @Value("${game.init.coins:10000}")
    private Long initCoins;

    @Value("${game.init.diamonds:10}")
    private Integer initDiamonds;

    @Value("${game.init.lock-items:3}")
    private Integer initLockItems;

    @Value("${game.init.rage-items:2}")
    private Integer initRageItems;

    /**
     * 玩家注册
     *
     * @param phone    手机号
     * @param password 密码
     * @param nickname 昵称
     * @return 登录信息
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> register(String phone, String password, String nickname) {
        // 检查手机号是否已注册
        if (playerRepository.findByPhone(phone).isPresent()) {
            throw new BusinessException(ResultCode.USER_EXISTS);
        }

        // 创建玩家
        Player player = new Player();
        player.setPlayerId(IdUtil.fastSimpleUUID());
        player.setNickname(nickname != null ? nickname : "龙宫新手" + IdUtil.fastSimpleUUID().substring(0, 6));
        player.setPhone(phone);
        player.setPasswordHash(BCrypt.hashpw(password));
        player.setCoins(initCoins);
        player.setDiamonds(initDiamonds);
        player.setEnergy(30);
        player.setCannonLevel(1);
        player.setCannonSkin("dragon");
        player.setVipLevel(0);
        player.setLevel(1);
        player.setStatus(1);
        player.setIsNewPlayer(true);
        player.setNewbieProtectionLeft(3);
        player.setTotalKills(0L);
        player.setTotalBullets(0L);
        player.setTotalCrits(0L);
        player.setTotalCoinsEarned(0L);
        player.setPlayCount(0);
        player.setConsecutiveDays(1);

        playerCacheService.savePlayer(player);
        log.info("玩家注册成功: playerId={}, phone={}", player.getPlayerId(), phone);

        // 生成Token
        String token = jwtUtil.generateToken(player.getPlayerId());

        Map<String, Object> result = new HashMap<>(4);
        result.put("token", token);
        result.put("playerId", player.getPlayerId());
        result.put("nickname", player.getNickname());
        return result;
    }

    /**
     * 玩家登录
     *
     * @param phone    手机号
     * @param password 密码
     * @return 登录信息
     */
    public Map<String, Object> login(String phone, String password) {
        Player player = playerRepository.findByPhone(phone)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        // 检查密码
        if (!BCrypt.checkpw(password, player.getPasswordHash())) {
            throw new BusinessException(ResultCode.PASSWORD_ERROR);
        }

        // 检查账号状态
        if (player.isBanned()) {
            throw new BusinessException(ResultCode.ACCOUNT_BANNED);
        }

        // 更新登录信息
        player.setLastLoginTime(LocalDateTime.now());
        playerCacheService.updatePlayer(player);

        // 生成Token
        String token = jwtUtil.generateToken(player.getPlayerId());

        Map<String, Object> result = new HashMap<>(4);
        result.put("token", token);
        result.put("playerId", player.getPlayerId());
        result.put("nickname", player.getNickname());
        return result;
    }

    /**
     * 游客登录
     *
     * @return 登录信息
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> guestLogin() {
        Player player = new Player();
        player.setPlayerId("guest_" + IdUtil.fastSimpleUUID());
        player.setNickname("游客" + IdUtil.fastSimpleUUID().substring(0, 6));
        player.setCoins(initCoins);
        player.setDiamonds(initDiamonds);
        player.setEnergy(30);
        player.setCannonLevel(1);
        player.setCannonSkin("dragon");
        player.setStatus(1);
        player.setIsNewPlayer(true);
        player.setNewbieProtectionLeft(3);
        player.setTotalKills(0L);
        player.setTotalBullets(0L);
        player.setTotalCrits(0L);
        player.setTotalCoinsEarned(0L);
        player.setPlayCount(0);
        player.setConsecutiveDays(1);

        playerCacheService.savePlayer(player);
        log.info("游客登录成功: playerId={}", player.getPlayerId());

        String token = jwtUtil.generateToken(player.getPlayerId());

        Map<String, Object> result = new HashMap<>(4);
        result.put("token", token);
        result.put("playerId", player.getPlayerId());
        result.put("nickname", player.getNickname());
        return result;
    }

    /**
     * 获取玩家信息
     *
     * @param playerId 玩家ID
     * @return 玩家信息
     */
    public Player getPlayerInfo(String playerId) {
        return playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));
    }

    /**
     * 更新玩家信息
     *
     * @param playerId 玩家ID
     * @param nickname 昵称
     * @param avatar   头像
     */
    @Transactional(rollbackFor = Exception.class)
    public void updateProfile(String playerId, String nickname, String avatar) {
        Player player = playerCacheService.getPlayer(playerId)
                .orElseThrow(() -> new BusinessException(ResultCode.USER_NOT_FOUND));

        if (nickname != null && !nickname.isEmpty()) {
            player.setNickname(nickname);
        }
        if (avatar != null && !avatar.isEmpty()) {
            player.setAvatar(avatar);
        }

        playerCacheService.updatePlayer(player);
    }
}
