package com.fishing.domain.repository;

import com.fishing.domain.model.Player;

import java.util.Optional;

/**
 * 玩家仓储接口 - 领域层
 *
 * @author 后端架构组
 */
public interface PlayerRepository {

    /**
     * 根据玩家ID查找
     *
     * @param playerId 玩家ID
     * @return 玩家
     */
    Optional<Player> findByPlayerId(String playerId);

    /**
     * 根据手机号查找
     *
     * @param phone 手机号
     * @return 玩家
     */
    Optional<Player> findByPhone(String phone);

    /**
     * 保存玩家
     *
     * @param player 玩家
     * @return 保存后的玩家
     */
    Player save(Player player);

    /**
     * 更新玩家
     *
     * @param player 玩家
     */
    void update(Player player);

    /**
     * 检查玩家是否存在
     *
     * @param playerId 玩家ID
     * @return 是否存在
     */
    boolean existsByPlayerId(String playerId);
}
