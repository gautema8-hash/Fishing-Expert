package com.fishing.infrastructure.websocket;

import lombok.Data;

import java.util.Map;

/**
 * WebSocket消息封装
 *
 * @author 后端架构组
 */
@Data
public class WebSocketMessage {

    /**
     * 消息类型
     * join: 加入房间
     * leave: 离开房间
     * fire: 发射炮弹
     * hit: 命中鱼
     * kill: 击杀鱼
     * chat: 聊天
     * sync: 状态同步
     * system: 系统消息
     */
    private String type;

    /**
     * 发送者玩家ID
     */
    private String playerId;

    /**
     * 发送者昵称
     */
    private String nickname;

    /**
     * 房间ID
     */
    private String roomId;

    /**
     * 消息内容
     */
    private String content;

    /**
     * 消息数据（炮弹位置/鱼ID/伤害等）
     */
    private Map<String, Object> data;

    /**
     * 时间戳
     */
    private long timestamp;

    public WebSocketMessage() {
        this.timestamp = System.currentTimeMillis();
    }

    /**
     * 创建系统消息
     */
    public static WebSocketMessage system(String roomId, String content) {
        WebSocketMessage msg = new WebSocketMessage();
        msg.setType("system");
        msg.setRoomId(roomId);
        msg.setContent(content);
        return msg;
    }

    /**
     * 创建玩家加入消息
     */
    public static WebSocketMessage playerJoin(String roomId, String playerId, String nickname) {
        WebSocketMessage msg = new WebSocketMessage();
        msg.setType("join");
        msg.setRoomId(roomId);
        msg.setPlayerId(playerId);
        msg.setNickname(nickname);
        msg.setContent(nickname + " 加入了房间");
        return msg;
    }

    /**
     * 创建玩家离开消息
     */
    public static WebSocketMessage playerLeave(String roomId, String playerId, String nickname) {
        WebSocketMessage msg = new WebSocketMessage();
        msg.setType("leave");
        msg.setRoomId(roomId);
        msg.setPlayerId(playerId);
        msg.setNickname(nickname);
        msg.setContent(nickname + " 离开了房间");
        return msg;
    }
}
