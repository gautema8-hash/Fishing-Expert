package com.fishing;

import com.fishing.application.service.EconomyAppService;
import com.fishing.application.service.AntiCheatService;
import com.fishing.common.exception.BusinessException;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.util.PlayerCacheService;
import com.fishing.infrastructure.util.RedisLockUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

/**
 * 经济应用服务单元测试
 *
 * @author 测试组
 */
@ExtendWith(MockitoExtension.class)
public class EconomyAppServiceTest {

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private PlayerCacheService playerCacheService;

    @Mock
    private RedisLockUtil redisLockUtil;

    @Mock
    private AntiCheatService antiCheatService;

    @InjectMocks
    private EconomyAppService economyAppService;

    private Player testPlayer;

    @BeforeEach
    public void setUp() {
        testPlayer = new Player();
        testPlayer.setPlayerId("test_player_001");
        testPlayer.setCoins(10000L);
        testPlayer.setDiamonds(10);
        testPlayer.setTotalKills(0L);
        testPlayer.setTotalBullets(0L);
        testPlayer.setTotalCrits(0L);
        testPlayer.setTotalCoinsEarned(0L);
        testPlayer.setIsNewPlayer(false);
        testPlayer.setNewbieProtectionLeft(0);

        // Mock反作弊服务默认放行
        Map<String, Object> allowedResult = new HashMap<>();
        allowedResult.put("allowed", true);
        lenient().when(antiCheatService.validateCoinSpend(anyString(), anyLong())).thenReturn(allowedResult);
        lenient().when(antiCheatService.validateCoinGain(anyString(), anyLong())).thenReturn(allowedResult);
    }

    @Test
    public void testSpendCoinsSuccess() {
        when(redisLockUtil.tryLockWithRetry(anyString(), anyLong(), anyInt(), anyLong()))
                .thenReturn("lock-request-id");
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));
        doReturn(true).when(redisLockUtil).unlock(anyString(), anyString());

        Map<String, Object> result = economyAppService.spendCoins("test_player_001", 5000);

        assertTrue((Boolean) result.get("success"));
        assertEquals(5000L, result.get("coins"));
        assertEquals(5000L, testPlayer.getCoins());
        assertEquals(1L, testPlayer.getTotalBullets());
    }

    @Test
    public void testSpendCoinsInsufficient() {
        when(redisLockUtil.tryLockWithRetry(anyString(), anyLong(), anyInt(), anyLong()))
                .thenReturn("lock-request-id");
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        doReturn(true).when(redisLockUtil).unlock(anyString(), anyString());

        assertThrows(BusinessException.class, () -> {
            economyAppService.spendCoins("test_player_001", 20000);
        });
    }

    @Test
    public void testAddCoinsNormal() {
        when(redisLockUtil.tryLockWithRetry(anyString(), anyLong(), anyInt(), anyLong()))
                .thenReturn("lock-request-id");
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));
        doReturn(true).when(redisLockUtil).unlock(anyString(), anyString());

        Map<String, Object> result = economyAppService.addCoins("test_player_001", 1000, false);

        assertEquals(11000L, result.get("coins"));
        assertEquals(1000L, result.get("earned"));
        assertFalse((Boolean) result.get("isCrit"));
        assertEquals(1L, testPlayer.getTotalKills());
    }

    @Test
    public void testAddCoinsCritDouble() {
        when(redisLockUtil.tryLockWithRetry(anyString(), anyLong(), anyInt(), anyLong()))
                .thenReturn("lock-request-id");
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));
        doReturn(true).when(redisLockUtil).unlock(anyString(), anyString());

        Map<String, Object> result = economyAppService.addCoins("test_player_001", 1000, true);

        assertEquals(12000L, result.get("coins"));
        assertEquals(2000L, result.get("earned"));
        assertTrue((Boolean) result.get("isCrit"));
        assertEquals(1L, testPlayer.getTotalCrits());
    }

    @Test
    public void testAddDiamonds() {
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));

        economyAppService.addDiamonds("test_player_001", 5);

        assertEquals(15, testPlayer.getDiamonds());
    }

    @Test
    public void testSpendDiamondsSuccess() {
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        doNothing().when(playerCacheService).updatePlayer(any(Player.class));

        economyAppService.spendDiamonds("test_player_001", 5);

        assertEquals(5, testPlayer.getDiamonds());
    }

    @Test
    public void testSpendDiamondsInsufficient() {
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));

        assertThrows(BusinessException.class, () -> {
            economyAppService.spendDiamonds("test_player_001", 20);
        });
    }

    @Test
    public void testGetEconomyInfo() {
        when(playerCacheService.getPlayer("test_player_001"))
                .thenReturn(Optional.of(testPlayer));
        testPlayer.setVipLevel(2);
        testPlayer.setLevel(5);
        testPlayer.setCannonLevel(3);
        testPlayer.setCannonSkin("glazed");

        Map<String, Object> info = economyAppService.getEconomyInfo("test_player_001");

        assertEquals(10000L, info.get("coins"));
        assertEquals(10, info.get("diamonds"));
        assertEquals(2, info.get("vipLevel"));
        assertEquals(5, info.get("level"));
        assertEquals(3, info.get("cannonLevel"));
        assertEquals("glazed", info.get("cannonSkin"));
    }
}
