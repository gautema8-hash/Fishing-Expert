package com.fishing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fishing.application.service.PlayerAppService;
import com.fishing.common.result.Result;
import com.fishing.interfaces.controller.AuthController;
import com.fishing.interfaces.dto.LoginDTO;
import com.fishing.interfaces.dto.RegisterDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 认证控制器集成测试 - MockMvc
 *
 * @author 测试组
 */
@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private PlayerAppService playerAppService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    public void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    public void testRegisterSuccess() throws Exception {
        RegisterDTO dto = new RegisterDTO();
        dto.setPhone("13800138000");
        dto.setPassword("123456");
        dto.setNickname("测试玩家");

        Map<String, Object> result = new HashMap<>();
        result.put("token", "test-token-123");
        result.put("playerId", "player_001");

        lenient().when(playerAppService.register(any(), any(), any())).thenReturn(result);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").value("test-token-123"));
    }

    @Test
    public void testLoginSuccess() throws Exception {
        LoginDTO dto = new LoginDTO();
        dto.setPhone("13800138000");
        dto.setPassword("123456");

        Map<String, Object> result = new HashMap<>();
        result.put("token", "test-token-456");
        result.put("playerId", "player_001");

        lenient().when(playerAppService.login(any(), any())).thenReturn(result);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.playerId").value("player_001"));
    }

    @Test
    public void testGuestLogin() throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("token", "guest-token-789");
        result.put("playerId", "guest_001");
        result.put("isGuest", true);

        lenient().when(playerAppService.guestLogin()).thenReturn(result);

        mockMvc.perform(post("/auth/guest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.isGuest").value(true));
    }
}
