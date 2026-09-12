package com.fishing.domain.model;

import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 玩家聚合根 - 领域模型
 *
 * @author 后端架构组
 */
@Data
public class Player implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 玩家唯一ID
     */
    private String playerId;

    /**
     * 昵称
     */
    private String nickname;

    /**
     * 头像
     */
    private String avatar;

    /**
     * 手机号
     */
    private String phone;

    /**
     * 密码哈希
     */
    private String passwordHash;

    /**
     * 邮箱
     */
    private String email;

    /**
     * VIP等级
     */
    private Integer vipLevel;

    /**
     * VIP经验
     */
    private Long vipExp;

    /**
     * 玩家等级
     */
    private Integer level;

    /**
     * 经验值
     */
    private Long exp;

    /**
     * 金币
     */
    private Long coins;

    /**
     * 钻石
     */
    private Integer diamonds;

    /**
     * 能量
     */
    private Integer energy;

    /**
     * 炮台等级
     */
    private Integer cannonLevel;

    /**
     * 炮台皮肤
     */
    private String cannonSkin;

    /**
     * 当前激活宠物
     */
    private String activePet;

    /**
     * 累计充值金额
     */
    private BigDecimal totalRecharge;

    /**
     * 总击杀数
     */
    private Long totalKills;

    /**
     * 总发射炮弹数
     */
    private Long totalBullets;

    /**
     * 总暴击数
     */
    private Long totalCrits;

    /**
     * 总获得金币
     */
    private Long totalCoinsEarned;

    /**
     * 最高关卡
     */
    private Integer highestLevel;

    /**
     * 游戏次数
     */
    private Integer playCount;

    /**
     * 连续签到天数
     */
    private Integer consecutiveDays;

    /**
     * 是否新玩家
     */
    private Boolean isNewPlayer;

    /**
     * 新手保护剩余次数
     */
    private Integer newbieProtectionLeft;

    /**
     * 状态 1正常 2封禁 3注销
     */
    private Integer status;

    /**
     * 是否已实名认证
     */
    private Boolean isRealNameVerified;

    /**
     * 真实姓名
     */
    private String realName;

    /**
     * 身份证号哈希
     */
    private String idCardHash;

    /**
     * 年龄
     */
    private Integer age;

    /**
     * 是否未成年人
     */
    private Boolean isMinor;

    /**
     * 最后登录时间
     */
    private LocalDateTime lastLoginTime;

    // ===== 领域方法 =====

    /**
     * 增加金币
     *
     * @param amount 数量
     */
    public void addCoins(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("金币数量不能为负数");
        }
        this.coins += amount;
        this.totalCoinsEarned += amount;
    }

    /**
     * 消耗金币
     *
     * @param amount 数量
     * @return 是否成功
     */
    public boolean spendCoins(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("金币数量不能为负数");
        }
        if (this.coins < amount) {
            return false;
        }
        this.coins -= amount;
        return true;
    }

    /**
     * 增加钻石
     */
    public void addDiamonds(int amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("钻石数量不能为负数");
        }
        this.diamonds += amount;
    }

    /**
     * 消耗钻石
     */
    public boolean spendDiamonds(int amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("钻石数量不能为负数");
        }
        if (this.diamonds < amount) {
            return false;
        }
        this.diamonds -= amount;
        return true;
    }

    /**
     * 增加经验
     */
    public void addExp(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("经验不能为负数");
        }
        this.exp += amount;
        // 简单升级逻辑：每1000经验升一级
        while (this.exp >= (long) this.level * 1000) {
            this.exp -= (long) this.level * 1000;
            this.level++;
        }
    }

    /**
     * 增加击杀统计
     */
    public void addKill(boolean isCrit) {
        this.totalKills++;
        if (isCrit) {
            this.totalCrits++;
        }
    }

    /**
     * 增加发射炮弹统计
     */
    public void addBullet() {
        this.totalBullets++;
    }

    /**
     * 是否封禁
     */
    public boolean isBanned() {
        return this.status != null && this.status == 2;
    }

    /**
     * 是否有新手保护
     */
    public boolean hasNewbieProtection() {
        return this.isNewPlayer != null && this.isNewPlayer
                && this.newbieProtectionLeft != null && this.newbieProtectionLeft > 0;
    }

    /**
     * 消耗新手保护次数
     */
    public void consumeNewbieProtection() {
        if (this.newbieProtectionLeft != null && this.newbieProtectionLeft > 0) {
            this.newbieProtectionLeft--;
            if (this.newbieProtectionLeft <= 0) {
                this.isNewPlayer = false;
            }
        }
    }
}
