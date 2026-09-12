package com.fishing.infrastructure.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fishing.infrastructure.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 游戏WebSocket处理器 - 多人联机
 *
 * @author 后端架构组
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GameWebSocketHandler extends TextWebSocketHandler {

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 房间映射：roomId -> GameRoom
     */
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    /**
     * 玩家房间映射：playerId -> roomId
     */
    private final Map<String, String> playerRoomMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // 从URL参数获取roomId和token
        Map<String, String> params = getQueryParams(session);
        String roomId = params.get("roomId");
        String token = params.get("token");

        if (roomId == null || token == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        // 验证Token
        String playerId = jwtUtil.getPlayerIdFromToken(token);
        if (playerId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        // 获取或创建房间
        GameRoom room = rooms.computeIfAbsent(roomId,
                id -> new GameRoom(id, "房间-" + id, playerId));

        if (room.isFull()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                    WebSocketMessage.system(roomId, "房间已满"))));
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        // 添加玩家到房间
        GameRoom.PlayerInfo playerInfo = new GameRoom.PlayerInfo();
        playerInfo.setPlayerId(playerId);
        playerInfo.setNickname("玩家" + playerId.substring(0, 4));
        playerInfo.setJoinTime(System.currentTimeMillis());

        room.addPlayer(playerId, session, playerInfo);
        playerRoomMap.put(playerId, roomId);

        log.info("玩家加入房间: playerId={}, roomId={}, 当前人数={}",
                playerId, roomId, room.getPlayerCount());

        // 广播玩家加入消息
        broadcastToRoom(room, WebSocketMessage.playerJoin(roomId, playerId, playerInfo.getNickname()));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            WebSocketMessage msg = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);

            String playerId = msg.getPlayerId();
            String roomId = playerRoomMap.get(playerId);

            if (roomId == null) {
                return;
            }

            GameRoom room = rooms.get(roomId);
            if (room == null) {
                return;
            }

            // 根据消息类型处理
            switch (msg.getType()) {
                case "fire":
                case "hit":
                case "kill":
                case "chat":
                case "sync":
                    // 广播给房间内其他玩家
                    broadcastToRoom(room, msg);
                    break;
                case "system":
                    // 系统消息不转发
                    break;
                default:
                    log.warn("未知消息类型: {}", msg.getType());
            }
        } catch (Exception e) {
            log.error("处理WebSocket消息失败: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // 查找玩家并从房间移除
        String playerId = findPlayerIdBySession(session);
        if (playerId != null) {
            String roomId = playerRoomMap.remove(playerId);
            if (roomId != null) {
                GameRoom room = rooms.get(roomId);
                if (room != null) {
                    GameRoom.PlayerInfo info = room.getPlayerInfos().get(playerId);
                    String nickname = info != null ? info.getNickname() : playerId;
                    room.removePlayer(playerId);

                    log.info("玩家离开房间: playerId={}, roomId={}, 剩余人数={}",
                            playerId, roomId, room.getPlayerCount());

                    // 广播玩家离开消息
                    broadcastToRoom(room, WebSocketMessage.playerLeave(roomId, playerId, nickname));

                    // 房间为空则删除
                    if (room.isEmpty()) {
                        rooms.remove(roomId);
                        log.info("房间已清空并删除: roomId={}", roomId);
                    }
                }
            }
        }
    }

    /**
     * 广播消息给房间内所有玩家
     */
    private void broadcastToRoom(GameRoom room, WebSocketMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            TextMessage textMessage = new TextMessage(json);

            for (WebSocketSession session : room.getPlayers().values()) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(textMessage);
                    } catch (IOException e) {
                        log.error("发送消息失败: {}", e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("广播消息失败: {}", e.getMessage());
        }
    }

    /**
     * 通过Session查找玩家ID
     */
    private String findPlayerIdBySession(WebSocketSession session) {
        for (Map.Entry<String, String> entry : playerRoomMap.entrySet()) {
            GameRoom room = rooms.get(entry.getValue());
            if (room != null && room.getPlayers().containsValue(session)) {
                return entry.getKey();
            }
        }
        return null;
    }

    /**
     * 解析URL查询参数
     */
    private Map<String, String> getQueryParams(WebSocketSession session) {
        Map<String, String> params = new java.util.HashMap<>();
        String query = session.getUri().getQuery();
        if (query != null) {
            for (String pair : query.split("&")) {
                String[] kv = pair.split("=", 2);
                if (kv.length == 2) {
                    params.put(kv[0], kv[1]);
                }
            }
        }
        return params;
    }

    /**
     * 获取房间列表（供Controller调用）
     */
    public Map<String, GameRoom> getRooms() {
        return rooms;
    }
}
