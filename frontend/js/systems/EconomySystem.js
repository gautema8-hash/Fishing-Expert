/**
 * 经济系统
 * 金币/钻石管理、动态计数动画、消耗奖励、存档
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';
import { Events } from '../core/EventBus.js';

export class EconomySystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;

        this.coins = saveData.player.coins;
        this.diamonds = saveData.player.diamonds;

        // 显示用数值（动画过渡中）
        this.displayCoins = this.coins;
        this.displayDiamonds = this.diamonds;

        // VIP 金币加成
        this._vipCoinBonus = 0;
    }

    /**
     * 设置 VIP 金币加成
     */
    setVIPCoinBonus(bonus) {
        this._vipCoinBonus = bonus;
    }

    /**
     * 增加金币
     */
    addCoins(amount, source = 'unknown') {
        if (amount <= 0) return;
        // VIP 加成
        const bonus = Math.floor(amount * this._vipCoinBonus / 100);
        const total = amount + bonus;
        this.coins += total;
        this.saveData.player.coins = this.coins;
        this.eventBus.emit(Events.COIN_CHANGE, this.coins, total, source);
        return total;
    }

    /**
     * 消耗金币
     * @returns {boolean} 是否成功
     */
    spendCoins(amount) {
        if (amount <= 0) return true;
        if (this.coins < amount) {
            this.eventBus.emit(Events.COIN_INSUFFICIENT, amount);
            return false;
        }
        this.coins -= amount;
        this.saveData.player.coins = this.coins;
        this.eventBus.emit(Events.COIN_CHANGE, this.coins, -amount, 'spend');
        return true;
    }

    /**
     * 检查是否足够
     */
    canAfford(amount) {
        return this.coins >= amount;
    }

    /**
     * 增加钻石
     */
    addDiamonds(amount) {
        if (amount <= 0) return;
        this.diamonds += amount;
        this.saveData.player.diamonds = this.diamonds;
        this.eventBus.emit(Events.DIAMOND_CHANGE, this.diamonds, amount);
    }

    /**
     * 消耗钻石
     */
    spendDiamonds(amount) {
        if (amount <= 0) return true;
        if (this.diamonds < amount) return false;
        this.diamonds -= amount;
        this.saveData.player.diamonds = this.diamonds;
        this.eventBus.emit(Events.DIAMOND_CHANGE, this.diamonds, -amount);
        return true;
    }

    /**
     * 更新计数动画
     */
    update(dt) {
        // 金币滚动计数动画
        const diff = this.coins - this.displayCoins;
        if (Math.abs(diff) > 0.5) {
            this.displayCoins += diff * Math.min(1, dt * 8);
        } else {
            this.displayCoins = this.coins;
        }

        // 钻石计数动画
        const diamondDiff = this.diamonds - this.displayDiamonds;
        if (Math.abs(diamondDiff) > 0.5) {
            this.displayDiamonds += diamondDiff * Math.min(1, dt * 8);
        } else {
            this.displayDiamonds = this.diamonds;
        }
    }

    /**
     * 获取显示金币数（大单位格式化：万/亿/万亿）
     */
    getDisplayCoins() {
        return Utils.formatCoin(Math.floor(this.displayCoins));
    }

    getDisplayDiamonds() {
        return Utils.formatNumber(Math.floor(this.displayDiamonds));
    }

    /**
     * 计算离线收益
     */
    calculateOfflineReward(lastPlayDate) {
        const now = new Date();
        const last = new Date(lastPlayDate);
        const minutes = Math.floor((now - last) / (1000 * 60));
        const maxMinutes = GameConfig.economy.offlineRewardMaxHours * 60;
        const effectiveMinutes = Math.min(minutes, maxMinutes);
        const reward = effectiveMinutes * GameConfig.economy.offlineRewardPerMinute;
        return { minutes: effectiveMinutes, coins: reward };
    }
}
