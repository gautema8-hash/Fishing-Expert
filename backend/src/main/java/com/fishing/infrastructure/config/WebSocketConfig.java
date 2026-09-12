package com.fishing.infrastructure.config;

import com.fishing.infrastructure.websocket.GameWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket配置 - 多人联机
 *
 * @author 后端架构组
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameWebSocketHandler gameWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 游戏WebSocket端点：/ws/game?roomId=xxx&token=xxx
        registry.addHandler(gameWebSocketHandler, "/ws/game")
                .setAllowedOrigins("*");
    }
}
