/**
 * 事件总线
 * 发布订阅模式，模块间解耦通信
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
        this._onceListeners = new Map();
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅函数
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * 订阅一次事件
     */
    once(event, callback) {
        if (!this._onceListeners.has(event)) {
            this._onceListeners.set(event, new Set());
        }
        this._onceListeners.get(event).add(callback);
        return () => this.off(event, callback, true);
    }

    /**
     * 取消订阅
     */
    off(event, callback, once = false) {
        const map = once ? this._onceListeners : this._listeners;
        if (map.has(event)) {
            map.get(event).delete(callback);
        }
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {...*} args - 传递给回调的参数
     */
    emit(event, ...args) {
        // 普通监听器
        if (this._listeners.has(event)) {
            for (const callback of this._listeners.get(event)) {
                try {
                    callback(...args);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for "${event}":`, e);
                }
            }
        }
        // 一次性监听器
        if (this._onceListeners.has(event)) {
            const callbacks = this._onceListeners.get(event);
            for (const callback of callbacks) {
                try {
                    callback(...args);
                } catch (e) {
                    console.error(`[EventBus] Error in once listener for "${event}":`, e);
                }
            }
            this._onceListeners.delete(event);
        }
    }

    /**
     * 清除指定事件的所有监听器
     */
    clear(event) {
        this._listeners.delete(event);
        this._onceListeners.delete(event);
    }

    /**
     * 清除所有监听器
     */
    clearAll() {
        this._listeners.clear();
        this._onceListeners.clear();
    }

    /**
     * 获取事件监听器数量
     */
    listenerCount(event) {
        let count = 0;
        if (this._listeners.has(event)) count += this._listeners.get(event).size;
        if (this._onceListeners.has(event)) count += this._onceListeners.get(event).size;
        return count;
    }
}

// 全局事件常量
export const Events = {
    // 经济
    COIN_CHANGE: 'coin:change',
    COIN_INSUFFICIENT: 'coin:insufficient',
    DIAMOND_CHANGE: 'diamond:change',

    // 炮台
    CANNON_FIRE: 'cannon:fire',
    CANNON_UPGRADE: 'cannon:upgrade',
    CANNON_SKIN_CHANGE: 'cannon:skin_change',
    AUTO_FIRE_TOGGLE: 'cannon:auto_fire',

    // 炮弹
    BULLET_HIT: 'bullet:hit',
    BULLET_CRIT: 'bullet:crit',

    // 鱼类
    FISH_SPAWN: 'fish:spawn',
    FISH_KILL: 'fish:kill',
    FISH_HIT: 'fish:hit',
    BOSS_APPEAR: 'boss:appear',
    BOSS_KILL: 'boss:kill',
    BOSS_WARNING: 'boss:warning',

    // 关卡
    LEVEL_UP: 'level:up',
    LEVEL_COMPLETE: 'level:complete',
    LEVEL_START: 'level:start',

    // 道具
    ITEM_USE: 'item:use',
    ITEM_CHANGE: 'item:change',
    LOCK_TARGET: 'item:lock_target',
    RAGE_START: 'item:rage_start',
    RAGE_END: 'item:rage_end',

    // 技能
    SKILL_USE: 'skill:use',
    ENERGY_CHANGE: 'skill:energy_change',

    // 游戏状态
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_START: 'game:start',
    GAME_OVER: 'game:over',

    // UI
    POPUP_OPEN: 'popup:open',
    POPUP_CLOSE: 'popup:close',
    SHOW_TOAST: 'ui:toast',
    SHOW_FLYING_COIN: 'ui:flying_coin',

    // 音频
    AUDIO_TOGGLE: 'audio:toggle',
    BGM_TOGGLE: 'audio:bgm_toggle',
    SFX_TOGGLE: 'audio:sfx_toggle',

    // 特效
    SCREEN_SHAKE: 'fx:screen_shake',
    EXPLOSION: 'fx:explosion',
    WATER_RIPPLE: 'fx:water_ripple',

    // 系统
    SETTINGS_CHANGE: 'settings:change',
    QUALITY_CHANGE: 'settings:quality',
    ANALYTICS_EVENT: 'analytics:event',
    VIP_CHANGE: 'vip:change',
    SIGN_IN: 'signin:sign',
    TASK_COMPLETE: 'task:complete',
    TASK_PROGRESS: 'task:progress'
};
