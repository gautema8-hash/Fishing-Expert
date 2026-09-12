package com.fishing;

import com.fishing.infrastructure.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JWT工具类单元测试
 *
 * @author 测试组
 */
public class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    public void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "test-secret-key-for-unit-testing-only");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 3600000L);
    }

    @Test
    public void testGenerateToken() {
        String token = jwtUtil.generateToken("test_player_001");
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    public void testGetPlayerIdFromToken() {
        String playerId = "test_player_001";
        String token = jwtUtil.generateToken(playerId);
        String extractedId = jwtUtil.getPlayerIdFromToken(token);
        assertEquals(playerId, extractedId);
    }

    @Test
    public void testValidateToken() {
        String token = jwtUtil.generateToken("test_player_001");
        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    public void testValidateInvalidToken() {
        assertFalse(jwtUtil.validateToken("invalid.token.here"));
    }

    @Test
    public void testGetPlayerIdFromInvalidToken() {
        assertNull(jwtUtil.getPlayerIdFromToken("invalid.token"));
    }
}
