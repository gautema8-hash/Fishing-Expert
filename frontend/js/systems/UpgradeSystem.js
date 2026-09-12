/**
 * 炮台养成升级系统
 * 四维升级：火力、射速、暴击率、金币加成
 * 消耗金币升级，等级越高消耗越大，效果越强
 */
import { Events } from '../core/EventBus.js';

export const UpgradeType = {
    POWER: 'power',
    FIRE_RATE: 'fireRate',
    CRIT_RATE: 'critRate',
    COIN_BONUS: 'coinBonus'
};

export const UpgradeConfig = {
    power: {
        name: '火力强化',
        icon: '💥',
        description: '提升炮弹伤害',
        maxLevel: 20,
        baseCost: 500,
        costMultiplier: 1.5,
        effectPerLevel: 0.08, // 每级+8%伤害
        effectUnit: '%'
    },
    fireRate: {
        name: '射速提升',
        icon: '⚡',
        description: '提升发射频率',
        maxLevel: 15,
        baseCost: 800,
        costMultiplier: 1.6,
        effectPerLevel: 0.06, // 每级+6%射速
        effectUnit: '%'
    },
    critRate: {
        name: '暴击精通',
        icon: '🔥',
        description: '提升暴击概率',
        maxLevel: 10,
        baseCost: 1200,
        costMultiplier: 1.8,
        effectPerLevel: 0.015, // 每级+1.5%暴击率
        effectUnit: '%'
    },
    coinBonus: {
        name: '金币加成',
        icon: '🪙',
        description: '提升击杀金币奖励',
        maxLevel: 20,
        baseCost: 600,
        costMultiplier: 1.5,
        effectPerLevel: 0.05, // 每级+5%金币
        effectUnit: '%'
    }
};

export class UpgradeSystem {
    constructor(eventBus, saveData, economy) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;

        // 升级等级
        this.upgrades = saveData.upgrade || {
            power: 1,
            fireRate: 1,
            critRate: 1,
            coinBonus: 1
        };
        this.saveData.upgrade = this.upgrades;
    }

    /**
     * 获取升级消耗
     */
    getUpgradeCost(type) {
        const config = UpgradeConfig[type];
        if (!config) return Infinity;
        const level = this.upgrades[type];
        if (level >= config.maxLevel) return Infinity;
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level - 1));
    }

    /**
     * 获取当前效果值
     */
    getEffect(type) {
        const config = UpgradeConfig[type];
        if (!config) return 0;
        const level = this.upgrades[type];
        return (level - 1) * config.effectPerLevel;
    }

    /**
     * 获取效果显示文本
     */
    getEffectText(type) {
        const effect = this.getEffect(type);
        return `+${(effect * 100).toFixed(1)}%`;
    }

    /**
     * 执行升级
     */
    upgrade(type) {
        const config = UpgradeConfig[type];
        if (!config) return false;

        const level = this.upgrades[type];
        if (level >= config.maxLevel) {
            this.eventBus.emit(Events.SHOW_TOAST, '已达最高等级');
            return false;
        }

        const cost = this.getUpgradeCost(type);
        if (!this.economy.spendCoins(cost)) {
            this.eventBus.emit(Events.SHOW_TOAST, '金币不足');
            return false;
        }

        this.upgrades[type]++;
        this.saveData.upgrade = this.upgrades;

        this.eventBus.emit(Events.SHOW_TOAST, `${config.name} 升级到 Lv.${this.upgrades[type]}！`);
        this.eventBus.emit('upgrade:changed', type, this.upgrades[type]);
        return true;
    }

    /**
     * 获取火力加成倍率
     */
    get powerMultiplier() {
        return 1 + this.getEffect('power');
    }

    /**
     * 获取射速加成倍率
     */
    get fireRateMultiplier() {
        return 1 + this.getEffect('fireRate');
    }

    /**
     * 获取暴击率加成
     */
    get critRateBonus() {
        return this.getEffect('critRate');
    }

    /**
     * 获取金币加成倍率
     */
    get coinBonusMultiplier() {
        return 1 + this.getEffect('coinBonus');
    }

    /**
     * 获取总战力（用于显示）
     */
    getTotalPower() {
        let power = 0;
        for (const type in this.upgrades) {
            power += this.upgrades[type] * 10;
        }
        return power;
    }

    /**
     * 获取所有升级信息（用于UI渲染）
     */
    getAllUpgradeInfo() {
        const info = [];
        for (const type in UpgradeConfig) {
            const config = UpgradeConfig[type];
            const level = this.upgrades[type];
            const cost = this.getUpgradeCost(type);
            const isMax = level >= config.maxLevel;
            info.push({
                type,
                name: config.name,
                icon: config.icon,
                description: config.description,
                level,
                maxLevel: config.maxLevel,
                cost: isMax ? '已满级' : cost,
                effect: this.getEffectText(type),
                nextEffect: isMax ? '已满级' : `+${((level) * config.effectPerLevel * 100).toFixed(1)}%`,
                isMax
            });
        }
        return info;
    }
}
