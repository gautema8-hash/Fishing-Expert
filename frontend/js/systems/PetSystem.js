/**
 * 宠物系统
 * 跟随炮台的宠物，提供被动加成（金币加成、暴击加成、自动瞄准）
 * 可升级升星，多只宠物可切换
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

export const PetType = {
    DRAGON_BABY: 'dragon_baby',
    PEARL_SPIRIT: 'pearl_spirit',
    CORAL_FAIRY: 'coral_fairy',
    GOLDEN_KOI: 'golden_koi'
};

export const PetConfig = {
    dragon_baby: {
        name: '小龙崽',
        icon: '🐲',
        description: '东海龙王幼子，提供暴击率加成',
        rarity: 'SSR',
        baseCoinBonus: 0.05,
        baseCritBonus: 0.02,
        baseAutoAimRange: 0,
        unlockCost: 10000,
        color: '#FFD700'
    },
    pearl_spirit: {
        name: '珍珠精灵',
        icon: '🦪',
        description: '深海珍珠化身，提供金币加成',
        rarity: 'SR',
        baseCoinBonus: 0.10,
        baseCritBonus: 0,
        baseAutoAimRange: 0,
        unlockCost: 5000,
        color: '#FFE4E1'
    },
    coral_fairy: {
        name: '珊瑚仙子',
        icon: '🪸',
        description: '珊瑚礁守护者，提供自动瞄准辅助',
        rarity: 'SR',
        baseCoinBonus: 0.03,
        baseCritBonus: 0.01,
        baseAutoAimRange: 80,
        unlockCost: 8000,
        color: '#FF6B9D'
    },
    golden_koi: {
        name: '黄金锦鲤',
        icon: '🐟',
        description: '招财进宝锦鲤，大幅提升金币收益',
        rarity: 'SSR',
        baseCoinBonus: 0.15,
        baseCritBonus: 0.01,
        baseAutoAimRange: 0,
        unlockCost: 20000,
        color: '#FFA500'
    }
};

export class PetSystem {
    constructor(eventBus, saveData, economy) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;

        // 宠物数据
        this.pets = saveData.pets || { active: null, owned: {} };
        if (!this.pets.owned) this.pets.owned = {};
        this.saveData.pets = this.pets;

        // 跟随位置（平滑移动到炮台旁）
        this._followX = 0;
        this._followY = 0;
        this._targetX = 0;
        this._targetY = 0;
        this._floatOffset = 0;
        this._angle = 0;
    }

    /**
     * 获取当前激活宠物
     */
    getActivePet() {
        if (!this.pets.active) return null;
        return this.pets.owned[this.pets.active] || null;
    }

    /**
     * 获取宠物配置
     */
    getPetConfig(type) {
        return PetConfig[type] || null;
    }

    /**
     * 解锁宠物
     */
    unlockPet(type) {
        const config = PetConfig[type];
        if (!config) return false;
        if (this.pets.owned[type]) {
            this.eventBus.emit(Events.SHOW_TOAST, '已拥有该宠物');
            return false;
        }

        if (!this.economy.spendCoins(config.unlockCost)) {
            this.eventBus.emit(Events.SHOW_TOAST, '金币不足');
            return false;
        }

        this.pets.owned[type] = {
            type,
            level: 1,
            stars: 1,
            exp: 0
        };
        this.saveData.pets = this.pets;

        this.eventBus.emit(Events.SHOW_TOAST, `🎉 解锁 ${config.name}！`);
        this.eventBus.emit('pet:unlocked', type);
        return true;
    }

    /**
     * 切换激活宠物
     */
    setActivePet(type) {
        if (!this.pets.owned[type]) {
            this.eventBus.emit(Events.SHOW_TOAST, '未拥有该宠物');
            return false;
        }
        this.pets.active = type;
        this.saveData.pets = this.pets;
        const config = PetConfig[type];
        this.eventBus.emit(Events.SHOW_TOAST, `${config.icon} ${config.name} 出战！`);
        this.eventBus.emit('pet:active_changed', type);
        return true;
    }

    /**
     * 升级宠物（消耗金币）
     */
    upgradePet(type) {
        const pet = this.pets.owned[type];
        if (!pet) return false;
        if (pet.level >= 30) {
            this.eventBus.emit(Events.SHOW_TOAST, '已达最高等级');
            return false;
        }

        const cost = this.getUpgradeCost(type);
        if (!this.economy.spendCoins(cost)) {
            this.eventBus.emit(Events.SHOW_TOAST, '金币不足');
            return false;
        }

        pet.level++;
        this.saveData.pets = this.pets;
        this.eventBus.emit(Events.SHOW_TOAST, `${PetConfig[type].name} 升级到 Lv.${pet.level}！`);
        this.eventBus.emit('pet:upgraded', type, pet.level);
        return true;
    }

    /**
     * 获取升级消耗
     */
    getUpgradeCost(type) {
        const pet = this.pets.owned[type];
        if (!pet) return Infinity;
        const config = PetConfig[type];
        return Math.floor(config.unlockCost * 0.1 * Math.pow(1.3, pet.level - 1));
    }

    /**
     * 获取宠物当前金币加成
     */
    getCoinBonus() {
        const pet = this.getActivePet();
        if (!pet) return 0;
        const config = PetConfig[pet.type];
        return config.baseCoinBonus * pet.level * (1 + (pet.stars - 1) * 0.2);
    }

    /**
     * 获取宠物当前暴击加成
     */
    getCritBonus() {
        const pet = this.getActivePet();
        if (!pet) return 0;
        const config = PetConfig[pet.type];
        return config.baseCritBonus * pet.level * (1 + (pet.stars - 1) * 0.2);
    }

    /**
     * 获取宠物自动瞄准范围
     */
    getAutoAimRange() {
        const pet = this.getActivePet();
        if (!pet) return 0;
        const config = PetConfig[pet.type];
        return config.baseAutoAimRange * pet.level;
    }

    /**
     * 更新宠物跟随位置
     */
    update(dt, cannonX, cannonY) {
        // 目标位置：炮台左上方，带浮动
        this._floatOffset += dt * 2;
        const floatY = Math.sin(this._floatOffset) * 8;
        this._targetX = cannonX - 60;
        this._targetY = cannonY - 40 + floatY;

        // 平滑跟随
        this._followX = Utils.lerp(this._followX, this._targetX, 0.08);
        this._followY = Utils.lerp(this._followY, this._targetY, 0.08);

        // 轻微旋转
        this._angle = Math.sin(this._floatOffset * 0.5) * 0.1;
    }

    /**
     * 渲染宠物
     */
    render(ctx) {
        const pet = this.getActivePet();
        if (!pet) return;

        const config = PetConfig[pet.type];

        ctx.save();
        ctx.translate(this._followX, this._followY);
        ctx.rotate(this._angle);

        // 发光光环
        const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
        gradient.addColorStop(0, config.color + '60');
        gradient.addColorStop(0.5, config.color + '20');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.fill();

        // 宠物图标（用emoji，带缩放呼吸）
        const scale = 1 + Math.sin(this._floatOffset * 1.5) * 0.08;
        ctx.font = `${28 * scale}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.icon, 0, 0);

        // 等级标识
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = config.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(`Lv.${pet.level}`, 0, 22);
        ctx.fillText(`Lv.${pet.level}`, 0, 22);

        ctx.restore();
    }

    /**
     * 获取所有宠物信息（用于UI渲染）
     */
    getAllPetInfo() {
        const info = [];
        for (const type in PetConfig) {
            const config = PetConfig[type];
            const owned = this.pets.owned[type];
            info.push({
                type,
                name: config.name,
                icon: config.icon,
                description: config.description,
                rarity: config.rarity,
                color: config.color,
                owned: !!owned,
                level: owned ? owned.level : 0,
                stars: owned ? owned.stars : 0,
                unlockCost: config.unlockCost,
                upgradeCost: owned ? this.getUpgradeCost(type) : 0,
                isActive: this.pets.active === type,
                coinBonus: owned ? (config.baseCoinBonus * owned.level * 100).toFixed(1) + '%' : '0%',
                critBonus: owned ? (config.baseCritBonus * owned.level * 100).toFixed(1) + '%' : '0%'
            });
        }
        return info;
    }
}
