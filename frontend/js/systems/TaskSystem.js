/**
 * 任务系统
 * 每日任务、完成领取奖励
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

export class TaskSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.daily = saveData.daily;
        this.tasks = this._initTasks();
        this._checkDailyReset();
    }

    _initTasks() {
        const today = Utils.getTodayString();
        if (this.daily.tasks && this.daily.tasks.date === today) {
            return this.daily.tasks.list;
        }
        // 生成每日任务
        const list = [
            { id: 'kill_20', name: '击杀20条鱼', target: 20, progress: 0, reward: { coins: 1000 }, type: 'kill', claimed: false },
            { id: 'kill_50', name: '击杀50条鱼', target: 50, progress: 0, reward: { coins: 3000 }, type: 'kill', claimed: false },
            { id: 'fire_100', name: '发射100发炮弹', target: 100, progress: 0, reward: { coins: 1500 }, type: 'fire', claimed: false },
            { id: 'crit_5', name: '触发5次暴击', target: 5, progress: 0, reward: { coins: 2000, diamonds: 1 }, type: 'crit', claimed: false },
            { id: 'boss_1', name: '击杀1个BOSS', target: 1, progress: 0, reward: { coins: 5000, diamonds: 2 }, type: 'boss', claimed: false },
            { id: 'use_item_3', name: '使用3次道具', target: 3, progress: 0, reward: { coins: 1500 }, type: 'item', claimed: false }
        ];
        this.daily.tasks = { date: today, list };
        return list;
    }

    _checkDailyReset() {
        const today = Utils.getTodayString();
        if (!this.daily.tasks || this.daily.tasks.date !== today) {
            this.tasks = this._initTasks();
        }
    }

    /**
     * 更新任务进度
     */
    updateProgress(type, amount = 1) {
        this._checkDailyReset();
        for (const task of this.tasks) {
            if (task.type === type && !task.claimed) {
                task.progress = Math.min(task.target, task.progress + amount);
                if (task.progress >= task.target) {
                    this.eventBus.emit(Events.TASK_PROGRESS, task);
                }
            }
        }
        this.daily.tasks.list = this.tasks;
    }

    /**
     * 领取任务奖励
     */
    claimReward(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.claimed || task.progress < task.target) return null;
        task.claimed = true;
        this.daily.tasks.list = this.tasks;
        this.eventBus.emit(Events.TASK_COMPLETE, task);
        return task.reward;
    }

    /**
     * 获取所有任务
     */
    getTasks() {
        this._checkDailyReset();
        return this.tasks;
    }

    /**
     * 获取可领取任务数
     */
    getClaimableCount() {
        return this.tasks.filter(t => !t.claimed && t.progress >= t.target).length;
    }
}
