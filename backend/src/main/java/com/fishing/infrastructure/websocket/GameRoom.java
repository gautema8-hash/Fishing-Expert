package com.fishing.infrastructure.websocket;

import lombok.Data;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 游戏房间 - 多人联机房间
 *
 * @author 后端架构组
 */
@Data
public class GameRoom {

    /**
     * 房间ID
     */
    private String roomId;

    /**
     * 房间名称
     */
    private String roomName;

    /**
     * 房间最大人数
     */
    private int maxPlayers = 4;

    /**
     * 房间创建者
     */
    private String creatorId;

    /**
     * 房间创建时间
     */
    private long createdAt;

    /**
     * 玩家会话映射：playerId -> WebSocketSession
     */
    private Map<String, WebSocketSession> players = new ConcurrentHashMap<>();

    /**
     * 玩家信息映射：playerId -> PlayerInfo
     */
    private Map<String, PlayerInfo> playerInfos = new ConcurrentHashMap<>();

    /**
     * 玩家信息
     */
    @Data
    public static class PlayerInfo {
        private String playerId;
        private String nickname;
        private String avatar;
        private int level;
        private long coins;
        private int cannonLevel;
        private boolean isReady;
        private long joinTime;
    }

    public GameRoom(String roomId, String roomName, String creatorId) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.creatorId = creatorId;
        this.createdAt = System.currentTimeMillis();
    }

    /**
     * 添加玩家
     */
    public boolean addPlayer(String playerId, WebSocketSession session, PlayerInfo info) {
        if (players.size() >= maxPlayers) {
            return false;
        }
        players.put(playerId, session);
        playerInfos.put(playerId, info);
        return true;
    }

    /**
     * 移除玩家
     */
    public void removePlayer(String playerId) {
        players.remove(playerId);
        playerInfos.remove(playerId);
    }

    /**
     * 获取当前玩家数
     */
    public int getPlayerCount() {
        return players.size();
    }

    /**
     * 房间是否为空
     */
    public boolean isEmpty() {
        return players.isEmpty();
    }

    /**
     * 房间是否已满
     */
    public boolean isFull() {
        return players.size() >= maxPlayers;
    }
}
