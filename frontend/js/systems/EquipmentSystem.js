/**
 * 装备系统
 * 4部位装备（武器/护甲/饰品/宝物）、4品质（普通/稀有/史诗/传说）
 * 装备强化、装备抽卡、属性加成
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

// 装备池配置
export const EquipmentPool = {
    weapon: [
        { id: 'w1', name: '青铜鱼叉', rarity: 'common', stats: { attack: 5 }, icon: '🔱' },
        { id: 'w2', name: '玄铁炮台', rarity: 'rare', stats: { attack: 12, critRate: 2 }, icon: '⚔️' },
        { id: 'w3', name: '琉璃法杖', rarity: 'epic', stats: { attack: 25, critRate: 5, coinBonus: 5 }, icon: '🪄' },
        { id: 'w4', name: '龙王三叉戟', rarity: 'legendary', stats: { attack: 50, critRate: 10, coinBonus: 10 }, icon: '🔱' }
    ],
    armor: [
        { id: 'a1', name: '鱼鳞甲', rarity: 'common', stats: { defense: 5 }, icon: '🛡️' },
        { id: 'a2', name: '珊瑚护甲', rarity: 'rare', stats: { defense: 12, coinBonus: 3 }, icon: '🪸' },
        { id: 'a3', name: '玄冰战袍', rarity: 'epic', stats: { defense: 25, coinBonus: 8, critRate: 3 }, icon: '🥼' },
        { id: 'a4', name: '龙王龙鳞甲', rarity: 'legendary', stats: { defense: 50, coinBonus: 15, critRate: 5 }, icon: '🐉' }
    ],
    accessory: [
        { id: 'ac1', name: '珍珠项链', rarity: 'common', stats: { coinBonus: 3 }, icon: '📿' },
        { id: 'ac2', name: '玛瑙手镯', rarity: 'rare', stats: { coinBonus: 6, critRate: 2 }, icon: '💎' },
        { id: 'ac3', name: '翡翠扳指', rarity: 'epic', stats: { coinBonus: 12, critRate: 5, attack: 8 }, icon: '💍' },
        { id: 'ac4', name: '定海神珠', rarity: 'legendary', stats: { coinBonus: 20, critRate: 8, attack: 15 }, icon: '🔮' }
    ],
    treasure: [
        { id: 't1', name: '古铜钱', rarity: 'common', stats: { coinBonus: 5 }, icon: '🪙' },
        { id: 't2', name: '夜明珠', rarity: 'rare', stats: { coinBonus: 10, critRate: 3 }, icon: '🔵' },
        { id: 't3', name: '和氏璧', rarity: 'epic', stats: { coinBonus: 18, critRate: 6, attack: 10 }, icon: '🟢' },
        { id: 't4', name: '传国玉玺', rarity: 'legendary', stats: { coinBonus: 30, critRate: 10, attack: 20 }, icon: '👑' }
    ]
};

// 品质配置
export const RarityConfig = {
    common: { name: '普通', color: '#9CA3AF', bgColor: 'rgba(156,163,175,0.15)', weight: 60 },
    rare: { name: '稀有', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)', weight: 25 },
    epic: { name: '史诗', color: '#A855F7', bgColor: 'rgba(168,85,247,0.15)', weight: 12 },
    legendary: { name: '传说', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)', weight: 3 }
};

// 抽卡消耗
export const DrawCost = {
    single: 100,      // 单抽钻石
    ten: 900          // 十连抽钻石（9折）
};

export class EquipmentSystem {
    constructor(eventBus, saveData, economy) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;

        // 已装备的装备
        this.equipped = saveData.equipped || {
            weapon: null,
            armor: null,
            accessory: null,
            treasure: null
        };
        this.saveData.equipped = this.equipped;

        // 背包中的装备
        this.inventory = saveData.equipmentInventory || [];
        this.saveData.equipmentInventory = this.inventory;

        // 装备强化等级
        this.enhanceLevels = saveData.enhanceLevels || {};
        this.saveData.enhanceLevels = this.enhanceLevels;
    }

    /**
     * 抽卡（单抽）
     */
    drawSingle() {
        if (this.economy.getDiamonds() < DrawCost.single) {
            return { success: false, message: '钻石不足' };
        }
        this.economy.spendDiamonds(DrawCost.single);
        const item = this._randomEquip();
        this._addToInventory(item);
        return { success: true, item };
    }

    /**
     * 十连抽
     */
    drawTen() {
        if (this.economy.getDiamonds() < DrawCost.ten) {
            return { success: false, message: '钻石不足' };
        }
        this.economy.spendDiamonds(DrawCost.ten);
        const items = [];
        for (let i = 0; i < 10; i++) {
            const item = this._randomEquip();
            this._addToInventory(item);
            items.push(item);
        }
        return { success: true, items };
    }

    /**
     * 随机抽取装备
     */
    _randomEquip() {
        // 随机部位
        const slots = ['weapon', 'armor', 'accessory', 'treasure'];
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const pool = EquipmentPool[slot];

        // 按品质权重随机
        const totalWeight = pool.reduce((sum, item) => sum + RarityConfig[item.rarity].weight, 0);
        let random = Math.random() * totalWeight;
        let selected = pool[0];
        for (const item of pool) {
            random -= RarityConfig[item.rarity].weight;
            if (random <= 0) {
                selected = item;
                break;
            }
        }

        return { ...selected, slot, uid: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    }

    /**
     * 添加到背包
     */
    _addToInventory(item) {
        this.inventory.push(item);
        // 背包上限50件
        if (this.inventory.length > 50) {
            this.inventory.shift();
        }
    }

    /**
     * 装备
     */
    equip(uid) {
        const index = this.inventory.findIndex(e => e.uid === uid);
        if (index === -1) return false;

        const item = this.inventory[index];
        const slot = item.slot;

        // 如果该部位已有装备，换回背包
        if (this.equipped[slot]) {
            this.inventory.push(this.equipped[slot]);
        }

        // 装备新物品
        this.equipped[slot] = item;
        this.inventory.splice(index, 1);

        this.eventBus.emit(Events.SHOW_TOAST, `已装备：${item.name}`);
        this.eventBus.emit('equipment:changed');
        return true;
    }

    /**
     * 卸下装备
     */
    unequip(slot) {
        if (!this.equipped[slot]) return false;
        this.inventory.push(this.equipped[slot]);
        this.equipped[slot] = null;
        this.eventBus.emit('equipment:changed');
        return true;
    }

    /**
     * 强化装备
     */
    enhance(uid) {
        const item = this._findItem(uid);
        if (!item) return { success: false, message: '装备不存在' };

        const currentLevel = this.enhanceLevels[uid] || 0;
        if (currentLevel >= 10) {
            return { success: false, message: '已达最高等级' };
        }

        // 强化消耗：金币
        const cost = (currentLevel + 1) * 500 * (item.rarity === 'legendary' ? 3 : item.rarity === 'epic' ? 2 : 1);
        if (this.economy.getCoins() < cost) {
            return { success: false, message: '金币不足' };
        }

        this.economy.spendCoins(cost, 'enhance');
        this.enhanceLevels[uid] = currentLevel + 1;

        this.eventBus.emit(Events.SHOW_TOAST, `${item.name} 强化至 +${currentLevel + 1}！`);
        this.eventBus.emit('equipment:changed');
        return { success: true, level: currentLevel + 1 };
    }

    /**
     * 分解装备（获得金币）
     */
    decompose(uid) {
        const index = this.inventory.findIndex(e => e.uid === uid);
        if (index === -1) return false;

        const item = this.inventory[index];
        const reward = item.rarity === 'legendary' ? 5000 : item.rarity === 'epic' ? 2000 : item.rarity === 'rare' ? 800 : 200;
        this.economy.addCoins(reward, 'decompose');
        this.inventory.splice(index, 1);
        delete this.enhanceLevels[uid];

        this.eventBus.emit(Events.SHOW_TOAST, `分解获得 ${Utils.formatCoin(reward)} 金币`);
        return true;
    }

    /**
     * 获取总属性加成
     */
    getTotalStats() {
        const total = { attack: 0, defense: 0, critRate: 0, coinBonus: 0 };
        for (const slot in this.equipped) {
            const item = this.equipped[slot];
            if (!item) continue;
            const enhanceLevel = this.enhanceLevels[item.uid] || 0;
            const enhanceMultiplier = 1 + enhanceLevel * 0.1;
            for (const stat in item.stats) {
                total[stat] = (total[stat] || 0) + item.stats[stat] * enhanceMultiplier;
            }
        }
        return total;
    }

    /**
     * 获取装备信息（含强化等级）
     */
    getEquippedInfo() {
        const result = {};
        for (const slot in this.equipped) {
            const item = this.equipped[slot];
            if (item) {
                result[slot] = {
                    ...item,
                    enhanceLevel: this.enhanceLevels[item.uid] || 0
                };
            } else {
                result[slot] = null;
            }
        }
        return result;
    }

    /**
     * 获取背包物品（含强化等级）
     */
    getInventoryInfo() {
        return this.inventory.map(item => ({
            ...item,
            enhanceLevel: this.enhanceLevels[item.uid] || 0
        }));
    }

    _findItem(uid) {
        return this.inventory.find(e => e.uid === uid) ||
               Object.values(this.equipped).find(e => e && e.uid === uid);
    }
}
