package com.fishing.infrastructure.persistence.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.converter.PlayerConverter;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 玩家仓储实现 - 基础设施层
 *
 * @author 后端架构组
 */
@Repository
@RequiredArgsConstructor
public class PlayerRepositoryImpl implements PlayerRepository {

    private final PlayerMapper playerMapper;

    @Override
    public Optional<Player> findByPlayerId(String playerId) {
        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlayerEntity::getPlayerId, playerId);
        PlayerEntity entity = playerMapper.selectOne(wrapper);
        return Optional.ofNullable(PlayerConverter.toDomain(entity));
    }

    @Override
    public Optional<Player> findByPhone(String phone) {
        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlayerEntity::getPhone, phone);
        PlayerEntity entity = playerMapper.selectOne(wrapper);
        return Optional.ofNullable(PlayerConverter.toDomain(entity));
    }

    @Override
    public Player save(Player player) {
        PlayerEntity entity = PlayerConverter.toEntity(player);
        playerMapper.insert(entity);
        return PlayerConverter.toDomain(entity);
    }

    @Override
    public void update(Player player) {
        PlayerEntity entity = PlayerConverter.toEntity(player);
        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlayerEntity::getPlayerId, player.getPlayerId());
        playerMapper.update(entity, wrapper);
    }

    @Override
    public boolean existsByPlayerId(String playerId) {
        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PlayerEntity::getPlayerId, playerId);
        return playerMapper.selectCount(wrapper) > 0;
    }
}
