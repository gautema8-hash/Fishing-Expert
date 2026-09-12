/**
 * 每日重置系统
 * 检查日期变化，重置每日任务、转盘次数、广告次数等
 */
export class DailyResetSystem {
    constructor(saveData) {
        this.saveData = saveData;
        this._checkDailyReset();
    }

    /**
     * 检查是否需要每日重置
     */
    _checkDailyReset() {
        const today = new Date().toDateString();
        const lastReset = this.saveData.lastDailyReset;

        if (lastReset !== today) {
            this._performDailyReset(lastReset);
            this.saveData.lastDailyReset = today;
        }
    }

    /**
     * 执行每日重置
     */
    _performDailyReset(lastReset) {
        // 重置每日任务进度
        if (this.saveData.tasks) {
            for (const key in this.saveData.tasks) {
                if (this.saveData.tasks[key].daily) {
                    this.saveData.tasks[key].progress = 0;
                    this.saveData.tasks[key].claimed = false;
                }
            }
        }

        // 重置转盘每日免费次数
        if (this.saveData.wheel) {
            this.saveData.wheel.freeSpinsToday = 1;
            this.saveData.wheel.lastFreeSpin = null;
        }

        // 重置广告每日次数
        if (this.saveData.adData) {
            this.saveData.adData.watchedToday = 0;
            this.saveData.adData.lastWatch = null;
        }

        // 重置签到（如果是新的一天）
        if (this.saveData.signIn) {
            // 签到逻辑由SignInSystem处理
        }

        // 计算连续登录天数
        if (lastReset) {
            const lastDate = new Date(lastReset);
            const today = new Date();
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                this.saveData.consecutiveDays = (this.saveData.consecutiveDays || 0) + 1;
            } else if (diffDays > 1) {
                this.saveData.consecutiveDays = 1;
            }
        } else {
            this.saveData.consecutiveDays = 1;
        }
    }

    /**
     * 强制重置（用于测试）
     */
    forceReset() {
        this.saveData.lastDailyReset = null;
        this._checkDailyReset();
    }

    /**
     * 获取连续登录天数
     */
    getConsecutiveDays() {
        return this.saveData.consecutiveDays || 1;
    }
}
