/**
 * 赛季系统
 * 赛季通行证、赛季等级、专属奖励、赛季排行榜
 * 长线运营核心付费点
 */
import { Events } from '../core/EventBus.js';

// 赛季配置
export const SeasonConfig = {
    seasonId: 'S1',
    seasonName: '东海龙宫·第一赛季',
    durationDays: 30,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    maxLevel: 50,
    xpPerLevel: 100,
    premiumPrice: 68, // 高级通行证价格（元）
    dailyXpLimit: 500
};

// 赛季通行证奖励（免费+高级）
export const SeasonRewards = [
    { level: 1, free: { coins: 5000 }, premium: { coins: 10000, diamonds: 5 } },
    { level: 5, free: { coins: 8000 }, premium: { coins: 15000, diamonds: 10 } },
    { level: 10, free: { items: { lock: 3 } }, premium: { items: { lock: 5, rage: 3 }, diamonds: 15 } },
    { level: 15, free: { coins: 15000 }, premium: { coins: 30000, diamonds: 20 } },
    { level: 20, free: { skin: 'glass' }, premium: { skin: 'gold', diamonds: 30 } },
    { level: 25, free: { coins: 20000 }, premium: { coins: 50000, diamonds: 25 } },
    { level: 30, free: { pet: 'pearl' }, premium: { pet: 'coral', diamonds: 40 } },
    { level: 35, free: { coins: 30000 }, premium: { coins: 80000, diamonds: 35 } },
    { level: 40, free: { items: { rage: 5 } }, premium: { items: { lock: 10, rage: 10 }, diamonds: 50 } },
    { level: 45, free: { coins: 50000 }, premium: { coins: 120000, diamonds: 60 } },
    { level: 50, free: { title: '龙宫达人' }, premium: { title: '东海龙王', skin: 'gold', diamonds: 100 } }
];

// 赛季任务（获取赛季经验）
export const SeasonTasks = [
    { id: 'st1', name: '每日登录', xp: 50, type: 'daily' },
    { id: 'st2', name: '击杀100条鱼', xp: 100, type: 'daily' },
    { id: 'st3', name: '击杀1个BOSS', xp: 150, type: 'daily' },
    { id: 'st4', name: '发射500发炮弹', xp: 80, type: 'daily' },
    { id: 'st5', name: '使用技能5次', xp: 60, type: 'daily' },
    { id: 'st6', name: '通关第5关', xp: 200, type: 'weekly' },
    { id: 'st7', name: '累计击杀500条鱼', xp: 300, type: 'weekly' },
    { id: 'st8', name: '参与世界BOSS', xp: 250, type: 'weekly' }
];

export class SeasonSystem {
    constructor(eventBus, saveData, economy, itemSystem) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;
        this.itemSystem = itemSystem;

        // 赛季数据
        this.seasonData = saveData.seasonData || {
            seasonId: SeasonConfig.seasonId,
            level: 1,
            xp: 0,
            totalXp: 0,
            premium: false,
            claimedFree: [],
            claimedPremium: [],
            dailyXp: 0,
            lastDailyReset: new Date().toDateString(),
            tasks: {}
        };
        this.saveData.seasonData = this.seasonData;

        // 检查每日重置
        this._checkDailyReset();
    }

    /**
     * 检查每日重置
     */
    _checkDailyReset() {
        const today = new Date().toDateString();
        if (this.seasonData.lastDailyReset !== today) {
            this.seasonData.dailyXp = 0;
            this.seasonData.lastDailyReset = today;
            // 重置每日任务
            for (const task of SeasonTasks) {
                if (task.type === 'daily') {
                    this.seasonData.tasks[task.id] = { progress: 0, claimed: false };
                }
            }
        }
    }

    /**
     * 添加赛季经验
     */
    addXp(amount) {
        // 每日上限
        if (this.seasonData.dailyXp >= SeasonConfig.dailyXpLimit) {
            return false;
        }
        const actualXp = Math.min(amount, SeasonConfig.dailyXpLimit - this.seasonData.dailyXp);
        this.seasonData.xp += actualXp;
        this.seasonData.totalXp += actualXp;
        this.seasonData.dailyXp += actualXp;

        // 检查升级
        let leveledUp = false;
        while (this.seasonData.xp >= SeasonConfig.xpPerLevel && this.seasonData.level < SeasonConfig.maxLevel) {
            this.seasonData.xp -= SeasonConfig.xpPerLevel;
            this.seasonData.level++;
            leveledUp = true;
        }

        if (leveledUp) {
            this.eventBus.emit(Events.SHOW_TOAST, `赛季等级提升至 Lv.${this.seasonData.level}！`);
            this.eventBus.emit('season:levelup', this.seasonData.level);
        }

        return true;
    }

    /**
     * 更新任务进度
     */
    updateTask(taskId, progress = 1) {
        const task = SeasonTasks.find(t => t.id === taskId);
        if (!task) return;

        if (!this.seasonData.tasks[taskId]) {
            this.seasonData.tasks[taskId] = { progress: 0, claimed: false };
        }

        this.seasonData.tasks[taskId].progress += progress;

        // 任务完成，自动发放经验
        if (this.seasonData.tasks[taskId].progress >= 1 && !this.seasonData.tasks[taskId].claimed) {
            this.seasonData.tasks[taskId].claimed = true;
            this.addXp(task.xp);
            this.eventBus.emit(Events.SHOW_TOAST, `赛季任务完成：${task.name} +${task.xp}经验`);
        }
    }

    /**
     * 领取免费奖励
     */
    claimFreeReward(level) {
        if (this.seasonData.claimedFree.includes(level)) {
            return { success: false, message: '已领取' };
        }
        if (this.seasonData.level < level) {
            return { success: false, message: '等级不足' };
        }

        const reward = SeasonRewards.find(r => r.level === level);
        if (!reward || !reward.free) {
            return { success: false, message: '无奖励' };
        }

        this._grantReward(reward.free);
        this.seasonData.claimedFree.push(level);
        this.eventBus.emit(Events.SHOW_TOAST, `领取赛季 Lv.${level} 免费奖励！`);
        return { success: true };
    }

    /**
     * 领取高级奖励
     */
    claimPremiumReward(level) {
        if (!this.seasonData.premium) {
            return { success: false, message: '需购买高级通行证' };
        }
        if (this.seasonData.claimedPremium.includes(level)) {
            return { success: false, message: '已领取' };
        }
        if (this.seasonData.level < level) {
            return { success: false, message: '等级不足' };
        }

        const reward = SeasonRewards.find(r => r.level === level);
        if (!reward || !reward.premium) {
            return { success: false, message: '无奖励' };
        }

        this._grantReward(reward.premium);
        this.seasonData.claimedPremium.push(level);
        this.eventBus.emit(Events.SHOW_TOAST, `领取赛季 Lv.${level} 高级奖励！`);
        return { success: true };
    }

    /**
     * 购买高级通行证
     */
    buyPremium() {
        if (this.seasonData.premium) {
            return { success: false, message: '已购买' };
        }
        // 模拟购买（实际需接入支付）
        this.seasonData.premium = true;
        this.eventBus.emit(Events.SHOW_TOAST, '高级通行证已激活！');
        return { success: true };
    }

    /**
     * 发放奖励
     */
    _grantReward(reward) {
        if (reward.coins) {
            this.economy.addCoins(reward.coins, 'season');
        }
        if (reward.diamonds) {
            this.economy.addDiamonds(reward.diamonds);
        }
        if (reward.items) {
            for (const [item, count] of Object.entries(reward.items)) {
                this.itemSystem.addItem(item, count);
            }
        }
    }

    /**
     * 获取赛季信息
     */
    getSeasonInfo() {
        const now = new Date();
        const end = new Date(SeasonConfig.endDate);
        const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

        return {
            seasonId: SeasonConfig.seasonId,
            seasonName: SeasonConfig.seasonName,
            level: this.seasonData.level,
            maxLevel: SeasonConfig.maxLevel,
            xp: this.seasonData.xp,
            xpPerLevel: SeasonConfig.xpPerLevel,
            xpPercent: (this.seasonData.xp / SeasonConfig.xpPerLevel) * 100,
            premium: this.seasonData.premium,
            premiumPrice: SeasonConfig.premiumPrice,
            daysLeft,
            dailyXp: this.seasonData.dailyXp,
            dailyXpLimit: SeasonConfig.dailyXpLimit
        };
    }

    /**
     * 获取奖励列表（含领取状态）
     */
    getRewardsList() {
        return SeasonRewards.map(r => ({
            ...r,
            freeClaimed: this.seasonData.claimedFree.includes(r.level),
            premiumClaimed: this.seasonData.claimedPremium.includes(r.level),
            freeAvailable: this.seasonData.level >= r.level && !this.seasonData.claimedFree.includes(r.level),
            premiumAvailable: this.seasonData.premium && this.seasonData.level >= r.level && !this.seasonData.claimedPremium.includes(r.level)
        }));
    }

    /**
     * 获取任务列表
     */
    getTasksList() {
        return SeasonTasks.map(task => ({
            ...task,
            progress: this.seasonData.tasks[task.id]?.progress || 0,
            claimed: this.seasonData.tasks[task.id]?.claimed || false
        }));
    }
}
