package com.fishing.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.infrastructure.persistence.entity.FriendRelationEntity;
import com.fishing.infrastructure.persistence.entity.PlayerEntity;
import com.fishing.infrastructure.persistence.repository.FriendRelationMapper;
import com.fishing.infrastructure.persistence.repository.PlayerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 好友应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FriendAppService {

    private final FriendRelationMapper friendRelationMapper;
    private final PlayerMapper playerMapper;

    /**
     * 添加好友
     */
    @Transactional(rollbackFor = Exception.class)
    public void addFriend(String playerId, String friendId) {
        if (playerId.equals(friendId)) {
            throw new BusinessException("不能添加自己为好友");
        }

        // 检查好友是否存在
        PlayerEntity friend = playerMapper.selectOne(
                new LambdaQueryWrapper<PlayerEntity>().eq(PlayerEntity::getPlayerId, friendId)
        );
        if (friend == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }

        // 检查是否已是好友
        FriendRelationEntity existing = friendRelationMapper.selectOne(
                new LambdaQueryWrapper<FriendRelationEntity>()
                        .eq(FriendRelationEntity::getPlayerId, playerId)
                        .eq(FriendRelationEntity::getFriendId, friendId)
        );
        if (existing != null) {
            throw new BusinessException(ResultCode.FRIEND_EXISTS);
        }

        // 双向添加
        FriendRelationEntity relation1 = new FriendRelationEntity();
        relation1.setPlayerId(playerId);
        relation1.setFriendId(friendId);
        relation1.setRelationType(1);
        friendRelationMapper.insert(relation1);

        FriendRelationEntity relation2 = new FriendRelationEntity();
        relation2.setPlayerId(friendId);
        relation2.setFriendId(playerId);
        relation2.setRelationType(1);
        friendRelationMapper.insert(relation2);
    }

    /**
     * 删除好友
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteFriend(String playerId, String friendId) {
        friendRelationMapper.delete(
                new LambdaQueryWrapper<FriendRelationEntity>()
                        .eq(FriendRelationEntity::getPlayerId, playerId)
                        .eq(FriendRelationEntity::getFriendId, friendId)
        );
        friendRelationMapper.delete(
                new LambdaQueryWrapper<FriendRelationEntity>()
                        .eq(FriendRelationEntity::getPlayerId, friendId)
                        .eq(FriendRelationEntity::getFriendId, playerId)
        );
    }

    /**
     * 获取好友列表
     */
    public List<Map<String, Object>> getFriendList(String playerId) {
        List<FriendRelationEntity> relations = friendRelationMapper.selectList(
                new LambdaQueryWrapper<FriendRelationEntity>()
                        .eq(FriendRelationEntity::getPlayerId, playerId)
                        .eq(FriendRelationEntity::getRelationType, 1)
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (FriendRelationEntity relation : relations) {
            PlayerEntity friend = playerMapper.selectOne(
                    new LambdaQueryWrapper<PlayerEntity>().eq(PlayerEntity::getPlayerId, relation.getFriendId())
            );
            if (friend != null) {
                Map<String, Object> friendInfo = new HashMap<>(8);
                friendInfo.put("playerId", friend.getPlayerId());
                friendInfo.put("nickname", friend.getNickname());
                friendInfo.put("avatar", friend.getAvatar());
                friendInfo.put("level", friend.getLevel());
                friendInfo.put("vipLevel", friend.getVipLevel());
                friendInfo.put("coins", friend.getCoins());
                result.add(friendInfo);
            }
        }
        return result;
    }

    /**
     * 搜索玩家
     */
    public List<Map<String, Object>> searchPlayers(String keyword) {
        LambdaQueryWrapper<PlayerEntity> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like(PlayerEntity::getNickname, keyword)
                    .or().like(PlayerEntity::getPlayerId, keyword);
        }
        wrapper.last("LIMIT 20");
        List<PlayerEntity> players = playerMapper.selectList(wrapper);

        List<Map<String, Object>> result = new ArrayList<>();
        for (PlayerEntity player : players) {
            Map<String, Object> playerInfo = new HashMap<>(6);
            playerInfo.put("playerId", player.getPlayerId());
            playerInfo.put("nickname", player.getNickname());
            playerInfo.put("avatar", player.getAvatar());
            playerInfo.put("level", player.getLevel());
            result.add(playerInfo);
        }
        return result;
    }
}
