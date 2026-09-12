/**
 * 技能系统
 * 主动技能：全屏冰冻、闪电链、金币雨
 * 能量条：随时间恢复，击杀鱼类获得额外能量
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

export const SkillType = {
    FREEZE: 'freeze',
    LIGHTNING: 'lightning',
    COIN_RAIN: 'coin_rain'
};

export const SkillConfig = {
    freeze: {
        name: '全屏冰冻',
        icon: '❄️',
        cost: 50,
        duration: 5,
        cooldown: 0,
        description: '冻结全场鱼类5秒'
    },
    lightning: {
        name: '闪电链',
        icon: '⚡',
        cost: 40,
        duration: 0,
        cooldown: 0,
        chainCount: 8,
        damage: 50,
        description: '闪电链攻击最多8条鱼'
    },
    coin_rain: {
        name: '金币雨',
        icon: '💰',
        cost: 60,
        duration: 0,
        cooldown: 0,
        coinCount: 30,
        coinValue: 50,
        description: '天降金币雨，收集获得金币'
    }
};

export class SkillSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;

        // 能量
        this.maxEnergy = 100;
        this.energy = saveData.energy || 30;
        this.energyRegenRate = 2; // 每秒恢复2点
        this.killEnergyBonus = 3; // 击杀每条鱼获得3点能量

        // 技能状态
        this._freezeActive = false;
        this._freezeTimer = 0;

        // 技能冷却
        this._cooldowns = {
            freeze: 0,
            lightning: 0,
            coin_rain: 0
        };
    }

    /**
     * 使用技能
     */
    useSkill(type, context = {}) {
        const config = SkillConfig[type];
        if (!config) return false;

        // 检查能量
        if (this.energy < config.cost) {
            this.eventBus.emit(Events.SHOW_TOAST, '能量不足');
            return false;
        }

        // 检查冷却
        if (this._cooldowns[type] > 0) {
            this.eventBus.emit(Events.SHOW_TOAST, '技能冷却中');
            return false;
        }

        // 扣除能量
        this.energy -= config.cost;
        this.eventBus.emit(Events.ENERGY_CHANGE, this.energy, this.maxEnergy);

        switch (type) {
            case SkillType.FREEZE:
                return this._useFreeze(context);
            case SkillType.LIGHTNING:
                return this._useLightning(context);
            case SkillType.COIN_RAIN:
                return this._useCoinRain(context);
            default:
                return false;
        }
    }

    _useFreeze(context) {
        this._freezeActive = true;
        this._freezeTimer = SkillConfig.freeze.duration;
        this.eventBus.emit(Events.SKILL_USE, 'freeze', SkillConfig.freeze.duration);
        this.eventBus.emit('skill:freeze_start', SkillConfig.freeze.duration);
        return true;
    }

    _useLightning(context) {
        const { fishManager, particleSystem, camera, audio } = context;
        if (!fishManager) return false;

        const fishes = fishManager.getAllAliveFish();
        if (fishes.length === 0) {
            this.eventBus.emit(Events.SHOW_TOAST, '没有目标');
            this.energy += SkillConfig.lightning.cost; // 退还能量
            return false;
        }

        // 按价值排序，优先攻击高价值鱼
        fishes.sort((a, b) => b.score - a.score);
        const chainCount = Math.min(SkillConfig.lightning.chainCount, fishes.length);
        const targets = fishes.slice(0, chainCount);

        // 对每个目标造成伤害
        for (const fish of targets) {
            fish.takeDamage(SkillConfig.lightning.damage);
            // 闪电粒子
            if (particleSystem) {
                particleSystem.burst(fish.x, fish.y, {
                    count: 12,
                    type: 'spark',
                    color: '#7DF9FF',
                    speedMin: 50,
                    speedMax: 150,
                    lifeMin: 0.3,
                    lifeMax: 0.6,
                    sizeMin: 2,
                    sizeMax: 5
                });
            }
        }

        // 屏幕震动
        if (camera) camera.shake(8, 0.3);
        if (audio) audio.play('hit');

        this.eventBus.emit(Events.SKILL_USE, 'lightning', targets.length);
        this.eventBus.emit('skill:lightning', targets);
        return true;
    }

    _useCoinRain(context) {
        const { economy, particleSystem, audio } = context;
        const config = SkillConfig.coin_rain;

        // 直接给予金币（简化版，不做物理掉落）
        const totalCoins = config.coinCount * config.coinValue;
        if (economy) {
            economy.addCoins(totalCoins, 'skill');
        }

        // 金币雨粒子
        if (particleSystem) {
            for (let i = 0; i < config.coinCount; i++) {
                const x = Math.random() * (context.width || 800);
                const y = -20;
                particleSystem.burst(x, y, {
                    count: 1,
                    type: 'coin',
                    color: '#FFD700',
                    speedMin: 100,
                    speedMax: 200,
                    angleMin: Math.PI * 0.3,
                    angleMax: Math.PI * 0.7,
                    lifeMin: 1.5,
                    lifeMax: 2.5,
                    sizeMin: 6,
                    sizeMax: 10,
                    gravity: 200
                });
            }
        }

        if (audio) audio.play('coin');
        this.eventBus.emit(Events.SKILL_USE, 'coin_rain', totalCoins);
        this.eventBus.emit('skill:coin_rain', totalCoins);
        return true;
    }

    /**
     * 击杀鱼类获得能量
     */
    onFishKilled(score = 0) {
        const bonus = this.killEnergyBonus + Math.floor(score / 100);
        this.addEnergy(bonus);
    }

    addEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        this.eventBus.emit(Events.ENERGY_CHANGE, this.energy, this.maxEnergy);
    }

    update(dt) {
        // 能量恢复
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * dt);
            this.eventBus.emit(Events.ENERGY_CHANGE, this.energy, this.maxEnergy);
        }

        // 冰冻计时
        if (this._freezeActive) {
            this._freezeTimer -= dt;
            if (this._freezeTimer <= 0) {
                this._freezeActive = false;
                this.eventBus.emit('skill:freeze_end');
            }
        }

        // 冷却计时
        for (const key in this._cooldowns) {
            if (this._cooldowns[key] > 0) {
                this._cooldowns[key] -= dt;
            }
        }
    }

    get isFreezeActive() {
        return this._freezeActive;
    }

    get freezeRemaining() {
        return this._freezeActive ? Math.ceil(this._freezeTimer) : 0;
    }

    getEnergyPercent() {
        return this.energy / this.maxEnergy;
    }

    canUseSkill(type) {
        const config = SkillConfig[type];
        if (!config) return false;
        return this.energy >= config.cost && this._cooldowns[type] <= 0;
    }

    save() {
        this.saveData.energy = Math.floor(this.energy);
    }
}
