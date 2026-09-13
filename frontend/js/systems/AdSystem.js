/**
 * 激励视频广告系统
 * 模拟观看广告获得奖励（金币/道具/钻石）
 * 可配置开关，不强制观看
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

export const AdRewardType = {
    COINS: 'coins',
    DIAMONDS: 'diamonds',
    ITEMS: 'items',
    DOUBLE_COINS: 'double_coins' // 双倍金币buff
};

export const AdConfig = {
    coins: {
        name: '金币奖励',
        icon: '🪙',
        amount: 2000,
        description: '观看视频获得2000金币'
    },
    diamonds: {
        name: '钻石奖励',
        icon: '💎',
        amount: 5,
        description: '观看视频获得5钻石'
    },
    items: {
        name: '道具奖励',
        icon: '🎁',
        items: { lock: 2, rage: 1 },
        description: '观看视频获得锁定×2+狂暴×1'
    },
    double_coins: {
        name: '双倍金币',
        icon: '✨',
        duration: 300, // 5分钟
        description: '观看视频获得5分钟双倍金币'
    }
};

export class AdSystem {
    constructor(eventBus, saveData, economy, itemSystem) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;
        this.itemSystem = itemSystem;

        // 广告配置
        this._enabled = true;
        this._dailyLimit = 10; // 每日最多观看10次
        this._adDuration = 5; // 模拟广告时长5秒（实际接入SDK后为15-30秒）

        // 双倍金币buff
        this._doubleCoinsActive = false;
        this._doubleCoinsTimer = 0;

        // 今日观看次数
        this._todayWatched = this._loadTodayWatched();
    }

    /**
     * 观看广告
     */
    watchAd(rewardType) {
        if (!this._enabled) {
            this.eventBus.emit(Events.SHOW_TOAST, '广告功能未开启');
            return false;
        }

        if (this._todayWatched >= this._dailyLimit) {
            this.eventBus.emit(Events.SHOW_TOAST, '今日广告次数已用完');
            return false;
        }

        const config = AdConfig[rewardType];
        if (!config) return false;

        // 模拟广告播放
        this.eventBus.emit('ad:start', { type: rewardType, duration: this._adDuration });
        this.eventBus.emit(Events.SHOW_TOAST, `正在播放广告...`);

        // 模拟5秒后广告结束
        setTimeout(() => {
            this._grantReward(rewardType);
            this._todayWatched++;
            this._saveTodayWatched();
            this.eventBus.emit('ad:complete', { type: rewardType });
        }, this._adDuration * 1000);

        return true;
    }

    /**
     * 发放奖励
     */
    _grantReward(rewardType) {
        const config = AdConfig[rewardType];
        switch (rewardType) {
            case AdRewardType.COINS:
                this.economy.addCoins(config.amount, 'ad');
                this.eventBus.emit(Events.SHOW_TOAST, `获得 ${Utils.formatCoin(config.amount)} 金币！`);
                break;
            case AdRewardType.DIAMONDS:
                this.economy.addDiamonds(config.amount);
                this.eventBus.emit(Events.SHOW_TOAST, `获得 ${config.amount} 钻石！`);
                break;
            case AdRewardType.ITEMS:
                for (const [item, count] of Object.entries(config.items)) {
                    this.itemSystem.addItem(item, count);
                }
                this.eventBus.emit(Events.SHOW_TOAST, '获得道具奖励！');
                break;
            case AdRewardType.DOUBLE_COINS:
                this._doubleCoinsActive = true;
                this._doubleCoinsTimer = config.duration;
                this.eventBus.emit(Events.SHOW_TOAST, `双倍金币已激活（${config.duration / 60}分钟）！`);
                this.eventBus.emit('ad:double_coins_start', config.duration);
                break;
        }
    }

    /**
     * 更新双倍金币buff
     */
    update(dt) {
        if (this._doubleCoinsActive) {
            this._doubleCoinsTimer -= dt;
            if (this._doubleCoinsTimer <= 0) {
                this._doubleCoinsActive = false;
                this.eventBus.emit('ad:double_coins_end');
            }
        }
    }

    /**
     * 获取双倍金币倍率
     */
    getCoinMultiplier() {
        return this._doubleCoinsActive ? 2 : 1;
    }

    /**
     * 获取今日剩余观看次数
     */
    getRemainingWatches() {
        return Math.max(0, this._dailyLimit - this._todayWatched);
    }

    /**
     * 获取双倍金币剩余时间
     */
    getDoubleCoinsRemaining() {
        return this._doubleCoinsActive ? Math.ceil(this._doubleCoinsTimer) : 0;
    }

    _loadTodayWatched() {
        const today = this._getDateString();
        const saved = this.saveData.adData || {};
        if (saved.date !== today) {
            return 0;
        }
        return saved.watched || 0;
    }

    _saveTodayWatched() {
        this.saveData.adData = {
            date: this._getDateString(),
            watched: this._todayWatched
        };
    }

    _getDateString() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
