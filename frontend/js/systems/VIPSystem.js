/**
 * VIP 系统
 * 累计充值解锁 VIP 等级、特权管理
 */
import { VIPConfig } from '../config/vipConfig.js';
import { Events } from '../core/EventBus.js';

export class VIPSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.vipLevel = saveData.player.vipLevel || 0;
        this.totalRecharge = saveData.player.totalRecharge || 0;
    }

    /**
     * 增加累计充值
     */
    addRecharge(amount) {
        this.totalRecharge += amount;
        this.saveData.player.totalRecharge = this.totalRecharge;
        const newLevel = VIPConfig.getLevelByRecharge(this.totalRecharge);
        if (newLevel > this.vipLevel) {
            this.vipLevel = newLevel;
            this.saveData.player.vipLevel = this.vipLevel;
            this.eventBus.emit(Events.VIP_CHANGE, this.vipLevel);
        }
    }

    /**
     * 获取特权值
     */
    getPrivilege(name) {
        return VIPConfig.getPrivilege(this.vipLevel, name) || 0;
    }

    /**
     * 获取金币加成百分比
     */
    get coinBonus() {
        return this.getPrivilege('coinBonus') || 0;
    }

    /**
     * 获取暴击率加成
     */
    get critBonus() {
        return this.getPrivilege('critBonus') || 0;
    }

    /**
     * 获取射速加成
     */
    get fireRateBonus() {
        return this.getPrivilege('fireRateBonus') || 0;
    }

    /**
     * 检查皮肤是否解锁
     */
    isSkinUnlocked(skin) {
        const skins = this.getPrivilege('unlockedSkins') || ['dragon'];
        return skins.includes(skin);
    }

    /**
     * 获取 VIP 信息
     */
    getInfo() {
        return VIPConfig.getVIPInfo(this.vipLevel);
    }

    /**
     * 获取下一级需要的充值
     */
    getNextLevelRecharge() {
        return VIPConfig.getNextLevelRecharge(this.vipLevel);
    }

    /**
     * 检查是否可领取每日礼包
     */
    canClaimDailyGift() {
        const gift = this.getPrivilege('dailyGift');
        if (!gift) return false;
        const today = new Date().toDateString();
        return this.saveData.player.lastDailyGiftDate !== today;
    }

    /**
     * 领取每日礼包
     */
    claimDailyGift() {
        if (!this.canClaimDailyGift()) return null;
        const gift = this.getPrivilege('dailyGift');
        this.saveData.player.lastDailyGiftDate = new Date().toDateString();
        return gift;
    }
}

/**
 * 签到系统
 * 每日签到、连续签到奖励递增
 */
export class SignInSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.daily = saveData.daily;
    }

    // 7 天签到奖励
    static REWARDS = [
        { coins: 100000000, diamonds: 0, items: {} },
        { coins: 200000000, diamonds: 0, items: {} },
        { coins: 300000000, diamonds: 1, items: {} },
        { coins: 400000000, diamonds: 0, items: {} },
        { coins: 500000000, diamonds: 2, items: {} },
        { coins: 600000000, diamonds: 0, items: {} },
        { coins: 1000000000, diamonds: 5, items: { lock: 1 } }
    ];

    /**
     * 检查今日是否可签到
     */
    canSignIn() {
        const today = new Date().toDateString();
        return this.daily.lastSignInDate !== today;
    }

    /**
     * 签到
     */
    signIn() {
        if (!this.canSignIn()) return null;

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        // 连续签到判断
        if (this.daily.lastSignInDate === yesterday) {
            this.daily.signInDays = (this.daily.signInDays % 7) + 1;
        } else {
            this.daily.signInDays = 1;
        }

        this.daily.lastSignInDate = today;
        const reward = SignInSystem.REWARDS[this.daily.signInDays - 1];

        this.eventBus.emit(Events.SIGN_IN, this.daily.signInDays, reward);
        return { day: this.daily.signInDays, reward };
    }

    /**
     * 获取已签到天数
     */
    getSignInDays() {
        return this.daily.signInDays;
    }

    /**
     * 获取指定天奖励
     */
    getReward(day) {
        return SignInSystem.REWARDS[day - 1] || null;
    }
}
