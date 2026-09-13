/**
 * 公会系统
 * 公会信息、成员管理、公会商店、公会BOSS、贡献度
 * 社交留存核心模块
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

// Mock公会数据
const MockGuild = {
    id: 'guild_001',
    name: '东海龙宫',
    leader: '龙宫太子',
    level: 5,
    exp: 3500,
    expMax: 5000,
    memberCount: 8,
    memberMax: 20,
    description: '欢迎加入东海龙宫公会，一起捕鱼称霸深海！',
    created: '2024-01-01',
    members: [
        { id: 'm1', name: '龙宫太子', avatar: '🐉', role: '会长', level: 35, vip: 8, contribution: 15000, online: true },
        { id: 'm2', name: '美人鱼公主', avatar: '🧜‍♀️', role: '副会长', level: 32, vip: 7, contribution: 12000, online: true },
        { id: 'm3', name: '章鱼博士', avatar: '🐙', role: '长老', level: 28, vip: 5, contribution: 8500, online: false },
        { id: 'm4', name: '鲨鱼猎人', avatar: '🦈', role: '精英', level: 25, vip: 4, contribution: 6000, online: true },
        { id: 'm5', name: '珊瑚精灵', avatar: '🪸', role: '成员', level: 20, vip: 3, contribution: 3500, online: false },
        { id: 'm6', name: '海龟长老', avatar: '🐢', role: '成员', level: 18, vip: 2, contribution: 2800, online: false },
        { id: 'm7', name: '虾兵蟹将', avatar: '🦐', role: '成员', level: 15, vip: 1, contribution: 1500, online: true },
        { id: 'm8', name: '你', avatar: '🐲', role: '成员', level: 12, vip: 0, contribution: 500, online: true, isSelf: true }
    ]
};

// 公会商店商品
export const GuildShopItems = [
    { id: 'gs1', name: '金币礼包', cost: 200, type: 'coins', value: 10000, icon: '🪙' },
    { id: 'gs2', name: '锁定道具×3', cost: 150, type: 'item', item: 'lock', value: 3, icon: '🔒' },
    { id: 'gs3', name: '狂暴道具×3', cost: 150, type: 'item', item: 'rage', value: 3, icon: '🔥' },
    { id: 'gs4', name: '钻石×5', cost: 500, type: 'diamonds', value: 5, icon: '💎' },
    { id: 'gs5', name: '经验药水', cost: 300, type: 'exp', value: 500, icon: '🧪' },
    { id: 'gs6', name: '公会专属头像框', cost: 1000, type: 'cosmetic', value: 'frame', icon: '🖼️' }
];

// 公会BOSS
export const GuildBoss = {
    id: 'guild_boss',
    name: '深海魔鲸',
    icon: '🐋',
    maxHp: 50000,
    currentHp: 35000,
    level: 3,
    reward: { coins: 100000, diamonds: 50 },
    refreshTime: '每日20:00',
    topDamage: [
        { name: '龙宫太子', damage: 8000 },
        { name: '美人鱼公主', damage: 6500 },
        { name: '鲨鱼猎人', damage: 4000 }
    ]
};

export class GuildSystem {
    constructor(eventBus, saveData, economy, itemSystem) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;
        this.itemSystem = itemSystem;

        // 玩家公会信息
        this.guild = saveData.guild || { ...MockGuild };
        this.saveData.guild = this.guild;

        // 玩家贡献度
        this.contribution = saveData.guildContribution || 500;
        this.saveData.guildContribution = this.contribution;

        // 今日已购买记录
        this.todayPurchases = saveData.guildTodayPurchases || {};
        this.saveData.guildTodayPurchases = this.todayPurchases;

        // 公会BOSS状态
        this.boss = saveData.guildBoss || { ...GuildBoss };
        this.saveData.guildBoss = this.boss;
    }

    /**
     * 获取公会信息
     */
    getGuildInfo() {
        return {
            ...this.guild,
            expPercent: (this.guild.exp / this.guild.expMax) * 100,
            myContribution: this.contribution
        };
    }

    /**
     * 获取成员列表
     */
    getMembers() {
        return [...this.guild.members].sort((a, b) => {
            const roleOrder = { '会长': 0, '副会长': 1, '长老': 2, '精英': 3, '成员': 4 };
            if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
            return b.contribution - a.contribution;
        });
    }

    /**
     * 获取公会商店
     */
    getShopItems() {
        return GuildShopItems.map(item => ({
            ...item,
            purchased: this.todayPurchases[item.id] || false,
            canAfford: this.contribution >= item.cost
        }));
    }

    /**
     * 购买公会商店物品
     */
    purchaseItem(itemId) {
        const item = GuildShopItems.find(i => i.id === itemId);
        if (!item) return { success: false, message: '商品不存在' };
        if (this.todayPurchases[itemId]) return { success: false, message: '今日已购买' };
        if (this.contribution < item.cost) return { success: false, message: '贡献度不足' };

        this.contribution -= item.cost;
        this.todayPurchases[itemId] = true;

        // 发放奖励
        switch (item.type) {
            case 'coins':
                this.economy.addCoins(item.value, 'guild_shop');
                break;
            case 'diamonds':
                this.economy.addDiamonds(item.value);
                break;
            case 'item':
                this.itemSystem.addItem(item.item, item.value);
                break;
            case 'exp':
                this.guild.exp += item.value;
                break;
        }

        this.eventBus.emit(Events.SHOW_TOAST, `购买成功：${item.name}`);
        return { success: true, message: '购买成功' };
    }

    /**
     * 获取公会BOSS信息
     */
    getBossInfo() {
        return {
            ...this.boss,
            hpPercent: (this.boss.currentHp / this.boss.maxHp) * 100
        };
    }

    /**
     * 攻击公会BOSS
     */
    attackBoss(damage = 100) {
        if (this.boss.currentHp <= 0) {
            return { success: false, message: 'BOSS已被击杀，等待刷新' };
        }

        this.boss.currentHp = Math.max(0, this.boss.currentHp - damage);
        this.contribution += Math.floor(damage / 10);

        if (this.boss.currentHp <= 0) {
            // BOSS被击杀
            this.economy.addCoins(this.boss.reward.coins, 'guild_boss');
            this.economy.addDiamonds(this.boss.reward.diamonds);
            this.eventBus.emit(Events.SHOW_TOAST, `公会BOSS被击杀！获得${Utils.formatCoin(this.boss.reward.coins)}金币+${this.boss.reward.diamonds}钻石！`);
            return { success: true, killed: true, message: 'BOSS击杀！' };
        }

        return { success: true, killed: false, damage };
    }

    /**
     * 增加贡献度
     */
    addContribution(amount) {
        this.contribution += amount;
        this.guild.exp += Math.floor(amount / 2);
        return this.contribution;
    }

    /**
     * 退出公会
     */
    leaveGuild() {
        this.guild = null;
        this.saveData.guild = null;
        this.eventBus.emit(Events.SHOW_TOAST, '已退出公会');
        return true;
    }

    /**
     * 获取在线成员数
     */
    getOnlineCount() {
        return this.guild.members.filter(m => m.online).length;
    }
}
