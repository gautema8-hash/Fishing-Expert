package com.fishing;

import com.fishing.application.service.AntiAddictionService;
import com.fishing.common.exception.BusinessException;
import com.fishing.domain.model.Player;
import com.fishing.infrastructure.util.PlayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * 防沉迷服务单元测试
 *
 * @author 测试组
 */
@ExtendWith(MockitoExtension.class)
public class AntiAddictionServiceTest {

    @Mock
    private PlayerCacheService playerCacheService;

    @InjectMocks
    private AntiAddictionService antiAddictionService;

    private Player adultPlayer;
    private Player minorPlayer;
    private Player unverifiedPlayer;

    @BeforeEach
    public void setUp() {
        adultPlayer = new Player();
        adultPlayer.setPlayerId("adult_001");
        adultPlayer.setIsRealNameVerified(true);
        adultPlayer.setAge(25);
        adultPlayer.setIsMinor(false);

        minorPlayer = new Player();
        minorPlayer.setPlayerId("minor_001");
        minorPlayer.setIsRealNameVerified(true);
        minorPlayer.setAge(15);
        minorPlayer.setIsMinor(true);

        unverifiedPlayer = new Player();
        unverifiedPlayer.setPlayerId("unverified_001");
        unverifiedPlayer.setIsRealNameVerified(false);
        unverifiedPlayer.setIsMinor(false);
    }

    @Test
    public void testVerifyRealNameAdult() {
        when(playerCacheService.getPlayer("adult_001")).thenReturn(Optional.of(adultPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));

        // 使用一个1990年出生的测试身份证号
        Map<String, Object> result = antiAddictionService.verifyRealName(
                "adult_001", "张三", "110101199001011234"
        );

        assertTrue((Boolean) result.get("verified"));
        assertFalse((Boolean) result.get("isMinor"));
    }

    @Test
    public void testVerifyRealNameMinor() {
        when(playerCacheService.getPlayer("minor_001")).thenReturn(Optional.of(minorPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));

        // 使用一个2010年出生的测试身份证号
        Map<String, Object> result = antiAddictionService.verifyRealName(
                "minor_001", "李四", "110101201001011234"
        );

        assertTrue((Boolean) result.get("verified"));
        assertTrue((Boolean) result.get("isMinor"));
    }

    @Test
    public void testVerifyRealNameInvalidIdCard() {
        assertThrows(BusinessException.class, () -> {
            antiAddictionService.verifyRealName("adult_001", "张三", "12345");
        });
    }

    @Test
    public void testVerifyRealNameEmptyName() {
        assertThrows(BusinessException.class, () -> {
            antiAddictionService.verifyRealName("adult_001", "", "110101199001011234");
        });
    }

    @Test
    public void testCheckPlayPermissionAdult() {
        when(playerCacheService.getPlayer("adult_001")).thenReturn(Optional.of(adultPlayer));

        Map<String, Object> result = antiAddictionService.checkPlayPermission("adult_001");

        assertTrue((Boolean) result.get("canPlay"));
        assertFalse((Boolean) result.get("isMinor"));
    }

    @Test
    public void testCheckPlayPermissionUnverified() {
        when(playerCacheService.getPlayer("unverified_001")).thenReturn(Optional.of(unverifiedPlayer));

        Map<String, Object> result = antiAddictionService.checkPlayPermission("unverified_001");

        assertFalse((Boolean) result.get("canPlay"));
        assertTrue((Boolean) result.get("needVerify"));
        assertEquals("请先完成实名认证", result.get("reason"));
    }

    @Test
    public void testGetConfig() {
        Map<String, Object> config = antiAddictionService.getConfig();

        assertEquals("20:00", config.get("minorStartTime"));
        assertEquals("21:00", config.get("minorEndTime"));
        assertEquals(60, config.get("minorDailyLimit"));
        assertNotNull(config.get("description"));
    }
}
