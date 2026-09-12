/**
 * 成就系统
 * 各类游戏成就，完成后领取奖励
 * 提升玩家目标感和留存
 */
import { Events } from '../core/EventBus.js';

export const AchievementList = [
    {
        id: 'first_blood',
        name: '初出茅庐',
        icon: '🐟',
        description: '击杀第一条鱼',
        condition: { type: 'totalKills', value: 1 },
        reward: { coins: 500, diamonds: 0, items: {} }
    },
    {
        id: 'fish_hunter',
        name: '捕鱼达人',
        icon: '🎯',
        description: '累计击杀100条鱼',
        condition: { type: 'totalKills', value: 100 },
        reward: { coins: 5000, diamonds: 2, items: {} }
    },
    {
        id: 'fish_master',
        name: '渔界宗师',
        icon: '🏆',
        description: '累计击杀1000条鱼',
        condition: { type: 'totalKills', value: 1000 },
        reward: { coins: 30000, diamonds: 10, items: { lock: 3 } }
    },
    {
        id: 'boss_slayer',
        name: '屠龙勇士',
        icon: '🐉',
        description: '首次击杀BOSS',
        condition: { type: 'bossKills', value: 1 },
        reward: { coins: 10000, diamonds: 5, items: {} }
    },
    {
        id: 'crit_master',
        name: '暴击大师',
        icon: '💥',
        description: '累计触发100次暴击',
        condition: { type: 'totalCrits', value: 100 },
        reward: { coins: 8000, diamonds: 3, items: { rage: 2 } }
    },
    {
        id: 'rich_player',
        name: '富甲一方',
        icon: '💰',
        description: '累计获得10万金币',
        condition: { type: 'totalCoins', value: 100000 },
        reward: { coins: 20000, diamonds: 5, items: {} }
    },
    {
        id: 'cannon_max',
        name: '火力全开',
        icon: '💣',
        description: '炮台倍率达到10倍',
        condition: { type: 'maxCannonLevel', value: 10 },
        reward: { coins: 15000, diamonds: 5, items: {} }
    },
    {
        id: 'skill_user',
        name: '技能大师',
        icon: '✨',
        description: '累计使用技能20次',
        condition: { type: 'skillUses', value: 20 },
        reward: { coins: 10000, diamonds: 3, items: {} }
    },
    {
        id: 'pet_collector',
        name: '宠物收藏家',
        icon: '🐾',
        description: '解锁全部4只宠物',
        condition: { type: 'petsUnlocked', value: 4 },
        reward: { coins: 50000, diamonds: 15, items: {} }
    },
    {
        id: 'level_10',
        name: '深海探险家',
        icon: '🌊',
        description: '通关第10关',
        condition: { type: 'highestLevel', value: 10 },
        reward: { coins: 25000, diamonds: 8, items: { lock: 2, rage: 2 } }
    }
];

export class AchievementSystem {
    constructor(eventBus, saveData, economy, itemSystem) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;
        this.itemSystem = itemSystem;

        // 成就进度
        this.achievements = saveData.achievements || {};
        this.saveData.achievements = this.achievements;

        // 统计数据
        this._stats = {
            totalKills: 0,
            bossKills: 0,
            totalCrits: 0,
            totalCoins: 0,
            maxCannonLevel: 1,
            skillUses: 0,
            petsUnlocked: 0
        };

        this._initAchievements();
    }

    _initAchievements() {
        for (const ach of AchievementList) {
            if (!this.achievements[ach.id]) {
                this.achievements[ach.id] = {
                    unlocked: false,
                    claimed: false,
                    progress: 0
                };
            }
        }
    }

    /**
     * 更新统计数据
     */
    updateStats(stats) {
        Object.assign(this._stats, stats);
        this._checkAchievements();
    }

    /**
     * 增加某项统计
     */
    addStat(type, amount = 1) {
        if (this._stats[type] !== undefined) {
            this._stats[type] += amount;
            this._checkAchievements();
        }
    }

    /**
     * 设置某项统计
     */
    setStat(type, value) {
        if (this._stats[type] !== undefined) {
            this._stats[type] = Math.max(this._stats[type], value);
            this._checkAchievements();
        }
    }

    /**
     * 检查成就解锁
     */
    _checkAchievements() {
        for (const ach of AchievementList) {
            const state = this.achievements[ach.id];
            if (state.unlocked) continue;

            const progress = this._getProgress(ach);
            state.progress = progress;

            if (progress >= ach.condition.value) {
                state.unlocked = true;
                this.eventBus.emit(Events.SHOW_TOAST, `🏆 成就解锁：${ach.name}！`);
                this.eventBus.emit('achievement:unlocked', ach);
            }
        }
    }

    _getProgress(achievement) {
        const { type, value } = achievement.condition;
        switch (type) {
            case 'totalKills': return this._stats.totalKills;
            case 'bossKills': return this._stats.bossKills;
            case 'totalCrits': return this._stats.totalCrits;
            case 'totalCoins': return this._stats.totalCoins;
            case 'maxCannonLevel': return this._stats.maxCannonLevel;
            case 'skillUses': return this._stats.skillUses;
            case 'petsUnlocked': return this._stats.petsUnlocked;
            case 'highestLevel': return this._stats.highestLevel || 0;
            default: return 0;
        }
    }

    /**
     * 领取成就奖励
     */
    claimReward(achievementId) {
        const ach = AchievementList.find(a => a.id === achievementId);
        const state = this.achievements[achievementId];
        if (!ach || !state || !state.unlocked || state.claimed) return false;

        state.claimed = true;

        // 发放奖励
        if (ach.reward.coins) {
            this.economy.addCoins(ach.reward.coins, 'achievement');
        }
        if (ach.reward.diamonds) {
            this.economy.addDiamonds(ach.reward.diamonds);
        }
        if (ach.reward.items) {
            for (const [item, count] of Object.entries(ach.reward.items)) {
                this.itemSystem.addItem(item, count);
            }
        }

        this.eventBus.emit(Events.SHOW_TOAST, `领取成就奖励：${ach.name}`);
        return true;
    }

    /**
     * 获取所有成就信息（用于UI）
     */
    getAllAchievements() {
        return AchievementList.map(ach => {
            const state = this.achievements[ach.id];
            const progress = this._getProgress(ach);
            return {
                ...ach,
                unlocked: state.unlocked,
                claimed: state.claimed,
                progress: Math.min(progress, ach.condition.value),
                progressPercent: Math.min(100, (progress / ach.condition.value) * 100),
                canClaim: state.unlocked && !state.claimed
            };
        });
    }

    /**
     * 获取可领取成就数量
     */
    getClaimableCount() {
        return this.getAllAchievements().filter(a => a.canClaim).length;
    }

    /**
     * 获取已解锁成就数量
     */
    getUnlockedCount() {
        return this.getAllAchievements().filter(a => a.unlocked).length;
    }
}
