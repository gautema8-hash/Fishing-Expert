package com.fishing;

import com.fishing.domain.model.Player;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 玩家领域模型单元测试
 *
 * @author 测试组
 */
public class PlayerTest {

    private Player player;

    @BeforeEach
    public void setUp() {
        player = new Player();
        player.setPlayerId("test_player_001");
        player.setNickname("测试玩家");
        player.setCoins(10000L);
        player.setDiamonds(10);
        player.setLevel(1);
        player.setExp(0L);
        player.setTotalKills(0L);
        player.setTotalBullets(0L);
        player.setTotalCrits(0L);
        player.setTotalCoinsEarned(0L);
        player.setIsNewPlayer(true);
        player.setNewbieProtectionLeft(3);
        player.setStatus(1);
    }

    @Test
    public void testAddCoins() {
        player.addCoins(5000);
        assertEquals(Long.valueOf(15000L), player.getCoins());
        assertEquals(Long.valueOf(5000L), player.getTotalCoinsEarned());
    }

    @Test
    public void testAddCoinsNegative() {
        try {
            player.addCoins(-100);
            fail("应该抛出异常");
        } catch (IllegalArgumentException e) {
            assertEquals("金币数量不能为负数", e.getMessage());
        }
    }

    @Test
    public void testSpendCoinsSuccess() {
        boolean result = player.spendCoins(5000);
        assertTrue(result);
        assertEquals(Long.valueOf(5000L), player.getCoins());
    }

    @Test
    public void testSpendCoinsInsufficient() {
        boolean result = player.spendCoins(20000);
        assertFalse(result);
        assertEquals(Long.valueOf(10000L), player.getCoins());
    }

    @Test
    public void testSpendCoinsNegative() {
        try {
            player.spendCoins(-100);
            fail("应该抛出异常");
        } catch (IllegalArgumentException e) {
            assertEquals("金币数量不能为负数", e.getMessage());
        }
    }

    @Test
    public void testAddDiamonds() {
        player.addDiamonds(5);
        assertEquals(Integer.valueOf(15), player.getDiamonds());
    }

    @Test
    public void testSpendDiamondsSuccess() {
        boolean result = player.spendDiamonds(5);
        assertTrue(result);
        assertEquals(Integer.valueOf(5), player.getDiamonds());
    }

    @Test
    public void testSpendDiamondsInsufficient() {
        boolean result = player.spendDiamonds(20);
        assertFalse(result);
        assertEquals(Integer.valueOf(10), player.getDiamonds());
    }

    @Test
    public void testAddExpLevelUp() {
        player.addExp(1000);
        assertEquals(Integer.valueOf(2), player.getLevel());
        assertEquals(Long.valueOf(0L), player.getExp());
    }

    @Test
    public void testAddExpNoLevelUp() {
        player.addExp(500);
        assertEquals(Integer.valueOf(1), player.getLevel());
        assertEquals(Long.valueOf(500L), player.getExp());
    }

    @Test
    public void testAddKill() {
        player.addKill(false);
        assertEquals(Long.valueOf(1L), player.getTotalKills());
        assertEquals(Long.valueOf(0L), player.getTotalCrits());

        player.addKill(true);
        assertEquals(Long.valueOf(2L), player.getTotalKills());
        assertEquals(Long.valueOf(1L), player.getTotalCrits());
    }

    @Test
    public void testAddBullet() {
        player.addBullet();
        assertEquals(Long.valueOf(1L), player.getTotalBullets());
    }

    @Test
    public void testIsBanned() {
        assertFalse(player.isBanned());
        player.setStatus(2);
        assertTrue(player.isBanned());
    }

    @Test
    public void testNewbieProtection() {
        assertTrue(player.hasNewbieProtection());
        player.consumeNewbieProtection();
        assertEquals(Integer.valueOf(2), player.getNewbieProtectionLeft());
        player.consumeNewbieProtection();
        player.consumeNewbieProtection();
        assertFalse(player.hasNewbieProtection());
        assertFalse(player.getIsNewPlayer());
    }
}
