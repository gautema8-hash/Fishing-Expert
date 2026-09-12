/**
 * 数据埋点系统
 * 记录玩家行为数据，用于运营分析
 * 本地存储 + 可扩展上报接口
 */
import { Utils } from '../core/Utils.js';

export const AnalyticsEvents = {
    // 注册与留存
    REGISTER: 'register',
    LOGIN: 'login',
    DAY_RETAIN: 'day_retain',

    // 游戏行为
    GAME_START: 'game_start',
    GAME_END: 'game_end',
    FISH_KILL: 'fish_kill',
    BOSS_KILL: 'boss_kill',
    CRIT_TRIGGER: 'crit_trigger',
    BULLET_FIRE: 'bullet_fire',
    CANNON_CHANGE: 'cannon_change',
    LEVEL_UP: 'level_up',

    // 付费
    PURCHASE: 'purchase',
    FIRST_CHARGE: 'first_charge',
    VIP_UPGRADE: 'vip_upgrade',

    // 功能使用
    ITEM_USE: 'item_use',
    SKILL_USE: 'skill_use',
    PET_UNLOCK: 'pet_unlock',
    PET_UPGRADE: 'pet_upgrade',
    UPGRADE_CANNON: 'upgrade_cannon',
    SKIN_CHANGE: 'skin_change',

    // 活动
    SIGN_IN: 'sign_in',
    WHEEL_SPIN: 'wheel_spin',
    TASK_COMPLETE: 'task_complete',
    AD_WATCH: 'ad_watch',

    // 流失
    COIN_INSUFFICIENT: 'coin_insufficient',
    POPUP_OPEN: 'popup_open'
};

export class AnalyticsSystem {
    constructor(saveData) {
        this.saveData = saveData;
        this.events = saveData.analyticsEvents || [];
        this._maxEvents = 500; // 最多保留500条
        this._sessionStart = Date.now();
        this._sessionEvents = 0;
    }

    /**
     * 记录事件
     */
    track(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: Date.now(),
            date: this._getDateString(),
            data: { ...data },
            sessionId: this._sessionId
        };

        this.events.push(event);
        this._sessionEvents++;

        // 限制存储量
        if (this.events.length > this._maxEvents) {
            this.events = this.events.slice(-this._maxEvents);
        }

        this.saveData.analyticsEvents = this.events;

        // 实时统计
        this._updateStats(eventName, data);
    }

    /**
     * 更新统计数据
     */
    _updateStats(eventName, data) {
        const stats = this.saveData.analytics || {};

        switch (eventName) {
            case AnalyticsEvents.BULLET_FIRE:
                stats.totalBullets = (stats.totalBullets || 0) + 1;
                break;
            case AnalyticsEvents.FISH_KILL:
                stats.totalKills = (stats.totalKills || 0) + 1;
                stats.totalCoinsEarned = (stats.totalCoinsEarned || 0) + (data.coins || 0);
                break;
            case AnalyticsEvents.BOSS_KILL:
                stats.totalBossKills = (stats.totalBossKills || 0) + 1;
                break;
            case AnalyticsEvents.CRIT_TRIGGER:
                stats.totalCrits = (stats.totalCrits || 0) + 1;
                break;
            case AnalyticsEvents.PURCHASE:
                stats.totalPurchases = (stats.totalPurchases || 0) + 1;
                stats.totalRecharge = (stats.totalRecharge || 0) + (data.amount || 0);
                break;
            case AnalyticsEvents.LEVEL_UP:
                stats.highestLevel = Math.max(stats.highestLevel || 1, data.level || 1);
                break;
        }

        this.saveData.analytics = stats;
    }

    /**
     * 获取统计摘要
     */
    getSummary() {
        const stats = this.saveData.analytics || {};
        const playCount = this.saveData.analytics?.playCount || 1;
        const totalKills = stats.totalKills || 0;
        const totalBullets = stats.totalBullets || 1;
        const totalCrits = stats.totalCrits || 0;

        return {
            playCount,
            totalKills,
            totalBossKills: stats.totalBossKills || 0,
            totalBullets,
            totalCrits,
            totalCoinsEarned: stats.totalCoinsEarned || 0,
            totalPurchases: stats.totalPurchases || 0,
            totalRecharge: stats.totalRecharge || 0,
            highestLevel: stats.highestLevel || 1,
            // 衍生指标
            hitRate: totalBullets > 0 ? (totalKills / totalBullets * 100).toFixed(1) + '%' : '0%',
            critRate: totalBullets > 0 ? (totalCrits / totalBullets * 100).toFixed(1) + '%' : '0%',
            avgCoinsPerKill: totalKills > 0 ? Math.floor((stats.totalCoinsEarned || 0) / totalKills) : 0,
            sessionDuration: Math.floor((Date.now() - this._sessionStart) / 1000)
        };
    }

    /**
     * 获取今日事件统计
     */
    getTodayEvents() {
        const today = this._getDateString();
        return this.events.filter(e => e.date === today);
    }

    /**
     * 导出数据（用于上报）
     */
    exportData() {
        return {
            playerId: this.saveData.player?.id,
            summary: this.getSummary(),
            recentEvents: this.events.slice(-50)
        };
    }

    /**
     * 清空数据
     */
    clear() {
        this.events = [];
        this.saveData.analyticsEvents = [];
    }

    _getDateString() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    get _sessionId() {
        if (!this.__sessionId) {
            this.__sessionId = Utils.generateId();
        }
        return this.__sessionId;
    }
}
