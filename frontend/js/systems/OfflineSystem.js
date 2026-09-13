/**
 * 离线收益与留存系统
 * 离线金币收益、首充双倍、回归礼包、每日免费转盘
 */
import { Events } from '../core/EventBus.js';
import { Utils } from '../core/Utils.js';

export class OfflineSystem {
    constructor(eventBus, saveData, economy) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;

        // 离线收益配置
        this.maxOfflineHours = 8; // 最大离线收益时长
        this.offlineCoinsPerMinute = 50; // 基础每分钟离线收益
        this.offlineLevelMultiplier = 0.1; // 每关增加10%收益

        // 回归礼包配置
        this.returningThresholdDays = 3; // 3天未登录触发回归
        this.returningGift = {
            coins: 5000000000,
            diamonds: 20,
            items: { lock: 5, rage: 3 },
            highDropRate: true // 回归后首局高爆率
        };
    }

    /**
     * 游戏启动时检查离线状态
     * 返回离线收益信息（如果有）
     */
    checkOfflineStatus() {
        const now = Date.now();
        const lastLogin = this.saveData.analytics.lastLoginTimestamp || now;
        const offlineMs = now - lastLogin;
        const offlineMinutes = Math.floor(offlineMs / 60000);
        const offlineHours = offlineMinutes / 60;

        // 更新最后登录时间
        this.saveData.analytics.lastLoginTimestamp = now;
        this.saveData.analytics.lastPlayDate = this._getTodayString();
        this.saveData.analytics.playCount++;

        // 检查是否回归玩家（3天以上未登录）
        const daysAway = Math.floor(offlineMs / (1000 * 60 * 60 * 24));
        const isReturning = daysAway >= this.returningThresholdDays;

        // 计算离线收益（超过1分钟才显示），收益固定为1亿
        let offlineEarnings = 0;
        if (offlineMinutes >= 1) {
            offlineEarnings = 100000000; // 固定1亿金币
        }

        return {
            offlineMinutes,
            offlineHours,
            daysAway,
            isReturning,
            offlineEarnings,
            capped: offlineHours > this.maxOfflineHours
        };
    }

    /**
     * 领取离线收益
     */
    claimOfflineEarnings(amount) {
        if (amount > 0) {
            this.economy.addCoins(amount, 'offline');
            this.eventBus.emit(Events.SHOW_TOAST, `离线收益 +${Utils.formatCoin(amount)} 金币`);
        }
    }

    /**
     * 领取回归礼包
     */
    claimReturningGift() {
        const gift = this.returningGift;
        this.economy.addCoins(gift.coins, 'returning');
        this.economy.addDiamonds(gift.diamonds);
        for (const [item, count] of Object.entries(gift.items)) {
            this.eventBus.emit('item:add', item, count);
        }
        this.saveData.analytics.returningBonusClaimed = true;
        this.eventBus.emit(Events.SHOW_TOAST, '🎁 回归礼包已领取！');
        return gift;
    }

    /**
     * 检查首充双倍
     */
    isFirstCharge() {
        return !this.saveData.player.firstChargeDone;
    }

    /**
     * 处理首充（返回是否双倍）
     */
    processFirstCharge(baseCoins) {
        if (this.isFirstCharge()) {
            this.saveData.player.firstChargeDone = true;
            const doubled = baseCoins * 2;
            this.eventBus.emit(Events.SHOW_TOAST, '🎉 首充双倍！额外赠送金币！');
            return doubled;
        }
        return baseCoins;
    }

    /**
     * 检查每日免费转盘
     */
    getDailyWheelFreeCount() {
        const today = this._getTodayString();
        const lastWheelDate = this.saveData.daily.lastWheelDate;
        if (lastWheelDate !== today) {
            this.saveData.daily.lastWheelDate = today;
            this.saveData.daily.wheelFreeCount = 1;
        }
        return this.saveData.daily.wheelFreeCount || 0;
    }

    /**
     * 使用免费转盘次数
     */
    useWheelFreeCount() {
        if (this.saveData.daily.wheelFreeCount > 0) {
            this.saveData.daily.wheelFreeCount--;
            return true;
        }
        return false;
    }

    /**
     * 检查是否新用户（前3局保护期）
     */
    isNewPlayerProtection() {
        const gamesPlayed = this.saveData.analytics.gamesPlayed || 0;
        return gamesPlayed < 3;
    }

    /**
     * 获取新用户保护捕获率加成
     */
    getNewPlayerCatchBonus() {
        if (this.isNewPlayerProtection()) {
            return 0.3; // 新用户前3局捕获率+30%
        }
        return 0;
    }

    /**
     * 格式化离线时长显示
     */
    formatOfflineDuration(minutes) {
        if (minutes < 60) return `${minutes}分钟`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours < 24) return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
        const days = Math.floor(hours / 24);
        return `${days}天${hours % 24}小时`;
    }

    _getTodayString() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
