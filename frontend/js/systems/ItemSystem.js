/**
 * 道具系统
 * 锁定道具（锁定追踪）、狂暴道具（威力翻倍）
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

export class ItemSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.items = saveData.items || { lock: 3, rage: 2 };

        // 激活状态
        this._lockActive = false;
        this._lockTimer = 0;
        this._lockDuration = 10;
        this._lockedFish = null;

        this._rageActive = false;
        this._rageTimer = 0;
        this._rageDuration = 15;
    }

    /**
     * 使用道具
     */
    useItem(type, fishManager = null) {
        if (this.items[type] <= 0) {
            this.eventBus.emit(Events.SHOW_TOAST, '道具不足');
            return false;
        }

        switch (type) {
            case 'lock':
                return this._useLock(fishManager);
            case 'rage':
                return this._useRage();
            default:
                return false;
        }
    }

    _useLock(fishManager) {
        if (!fishManager) return false;
        const fishes = fishManager.getAllAliveFish();
        if (fishes.length === 0) {
            this.eventBus.emit(Events.SHOW_TOAST, '没有可锁定的目标');
            return false;
        }

        // 优先锁定高价值鱼
        fishes.sort((a, b) => b.score - a.score);
        this._lockedFish = fishes[0];
        this._lockActive = true;
        this._lockTimer = this._lockDuration;
        this.items.lock--;
        this.saveData.items.lock = this.items.lock;

        this.eventBus.emit(Events.ITEM_USE, 'lock', this._lockedFish);
        this.eventBus.emit(Events.LOCK_TARGET, this._lockedFish);
        return true;
    }

    _useRage() {
        this._rageActive = true;
        this._rageTimer = this._rageDuration;
        this.items.rage--;
        this.saveData.items.rage = this.items.rage;

        this.eventBus.emit(Events.ITEM_USE, 'rage');
        this.eventBus.emit(Events.RAGE_START, this._rageDuration);
        return true;
    }

    /**
     * 增加道具
     */
    addItem(type, count = 1) {
        this.items[type] = (this.items[type] || 0) + count;
        this.saveData.items[type] = this.items[type];
        this.eventBus.emit(Events.ITEM_CHANGE, type, this.items[type]);
    }

    /**
     * 获取道具数量
     */
    getItemCount(type) {
        return this.items[type] || 0;
    }

    update(dt) {
        // 锁定计时
        if (this._lockActive) {
            this._lockTimer -= dt;
            if (this._lockTimer <= 0 || !this._lockedFish || !this._lockedFish._active || !this._lockedFish.isAlive) {
                this._lockActive = false;
                this._lockedFish = null;
            }
        }

        // 狂暴计时
        if (this._rageActive) {
            this._rageTimer -= dt;
            if (this._rageTimer <= 0) {
                this._rageActive = false;
                this.eventBus.emit(Events.RAGE_END);
            }
        }
    }

    get lockedFish() {
        return this._lockActive ? this._lockedFish : null;
    }

    get isLockActive() {
        return this._lockActive;
    }

    get isRageActive() {
        return this._rageActive;
    }

    get lockRemaining() {
        return this._lockActive ? Math.ceil(this._lockTimer) : 0;
    }

    get rageRemaining() {
        return this._rageActive ? Math.ceil(this._rageTimer) : 0;
    }
}
