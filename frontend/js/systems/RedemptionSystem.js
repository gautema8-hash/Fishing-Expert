/**
 * 兑换码系统
 * 玩家输入礼包码兑换奖励
 * 运营可配置兑换码，用于发福利、活动奖励、补偿
 */
import { Events } from '../core/EventBus.js';

// 预配置兑换码（实际运营中由后端生成，此处为前端演示）
export const RedemptionCodes = {
    'WELCOME': {
        name: '新手欢迎码',
        rewards: { coins: 10000, diamonds: 10, items: { lock: 3, rage: 2 } },
        description: '新手专属欢迎礼包'
    },
    'DRAGON': {
        name: '龙王礼包码',
        rewards: { coins: 50000, diamonds: 20, items: { lock: 5, rage: 5 } },
        description: '东海龙王限定礼包'
    },
    'FISH2024': {
        name: '捕鱼达人码',
        rewards: { coins: 20000, diamonds: 5 },
        description: '捕鱼达人周年庆礼包'
    },
    'GOLD': {
        name: '黄金礼包码',
        rewards: { coins: 100000 },
        description: '海量金币礼包'
    },
    'DIAMOND': {
        name: '钻石礼包码',
        rewards: { diamonds: 50, coins: 10000 },
        description: '钻石豪华礼包'
    },
    'VIP666': {
        name: 'VIP专属码',
        rewards: { coins: 30000, diamonds: 15, items: { lock: 3, rage: 3 } },
        description: 'VIP玩家专属福利'
    },
    'NEWYEAR': {
        name: '新年礼包码',
        rewards: { coins: 88888, diamonds: 28, items: { lock: 8, rage: 8 } },
        description: '新年大吉大利礼包'
    },
    'LUCKY': {
        name: '幸运礼包码',
        rewards: { coins: 15000, diamonds: 8 },
        description: '幸运转盘专属礼包'
    }
};

export class RedemptionSystem {
    constructor(eventBus, saveData, economy, itemSystem) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;
        this.itemSystem = itemSystem;

        // 已使用的兑换码
        this.usedCodes = saveData.usedRedemptionCodes || [];
        this.saveData.usedRedemptionCodes = this.usedCodes;
    }

    /**
     * 兑换码
     */
    redeem(code) {
        if (!code || typeof code !== 'string') {
            return { success: false, message: '请输入兑换码' };
        }

        const upperCode = code.trim().toUpperCase();

        // 检查是否已使用
        if (this.usedCodes.includes(upperCode)) {
            return { success: false, message: '该兑换码已使用过' };
        }

        // 检查兑换码是否存在
        const codeData = RedemptionCodes[upperCode];
        if (!codeData) {
            return { success: false, message: '兑换码无效，请检查后重试' };
        }

        // 发放奖励
        const rewards = codeData.rewards;
        if (rewards.coins) {
            this.economy.addCoins(rewards.coins, 'redemption');
        }
        if (rewards.diamonds) {
            this.economy.addDiamonds(rewards.diamonds);
        }
        if (rewards.items) {
            for (const [item, count] of Object.entries(rewards.items)) {
                this.itemSystem.addItem(item, count);
            }
        }

        // 标记已使用
        this.usedCodes.push(upperCode);

        this.eventBus.emit(Events.SHOW_TOAST, `兑换成功：${codeData.name}！`);
        return {
            success: true,
            message: `兑换成功：${codeData.name}`,
            rewards: rewards,
            codeName: codeData.name
        };
    }

    /**
     * 检查兑换码是否可用
     */
    isCodeAvailable(code) {
        const upperCode = code.trim().toUpperCase();
        return RedemptionCodes[upperCode] && !this.usedCodes.includes(upperCode);
    }

    /**
     * 获取已使用数量
     */
    getUsedCount() {
        return this.usedCodes.length;
    }

    /**
     * 获取可用兑换码数量
     */
    getAvailableCount() {
        return Object.keys(RedemptionCodes).length - this.usedCodes.length;
    }
}
