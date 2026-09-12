package com.fishing.infrastructure.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 玩家实体
 *
 * @author 后端架构组
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_player")
public class PlayerEntity extends BaseEntity {

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
     * 密码哈希
     */
    private String passwordHash;

    /**
     * 手机号
     */
    private String phone;

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

    /**
     * 最后登录IP
     */
    private String lastLoginIp;
}
