/**
 * 关卡系统
 * 闯关机制、难度递增、星级评分、积分统计
 */
import { Utils } from '../core/Utils.js';
import { LevelConfig } from '../config/levelConfig.js';
import { Events } from '../core/EventBus.js';

export class LevelSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;

        this.currentLevel = saveData.progress.currentLevel || 1;
        this.killCount = 0;
        this.critCount = 0;
        this.score = 0;
        this.totalKills = saveData.progress.totalKills || 0;
        this.totalScore = saveData.progress.totalScore || 0;
        this.highestLevel = saveData.progress.highestLevel || 1;

        this.params = LevelConfig.getLevelParams(this.currentLevel);
        this._levelComplete = false;
    }

    /**
     * 记录击杀
     */
    recordKill(fishScore, isCrit = false) {
        this.killCount++;
        this.totalKills++;
        this.saveData.progress.totalKills = this.totalKills;

        const scoreGain = Math.floor(fishScore * this.params.fishValueMultiplier);
        this.score += scoreGain;
        this.totalScore += scoreGain;
        this.saveData.progress.totalScore = this.totalScore;

        if (isCrit) {
            this.critCount++;
        }

        // 检查通关
        if (!this._levelComplete && this.killCount >= this.params.killTarget) {
            this._completeLevel();
        }
    }

    _completeLevel() {
        this._levelComplete = true;
        const stars = LevelConfig.calculateStars(this.killCount, this.params.killTarget, this.critCount);
        const reward = LevelConfig.calculateReward(this.currentLevel, stars);

        this.eventBus.emit(Events.LEVEL_COMPLETE, {
            level: this.currentLevel,
            stars,
            score: this.score,
            kills: this.killCount,
            crits: this.critCount,
            reward
        });
    }

    /**
     * 进入下一关
     */
    nextLevel() {
        this.currentLevel++;
        this.saveData.progress.currentLevel = this.currentLevel;
        if (this.currentLevel > this.highestLevel) {
            this.highestLevel = this.currentLevel;
            this.saveData.progress.highestLevel = this.highestLevel;
        }
        this.killCount = 0;
        this.critCount = 0;
        this.score = 0;
        this._levelComplete = false;
        this.params = LevelConfig.getLevelParams(this.currentLevel);

        this.eventBus.emit(Events.LEVEL_UP, this.currentLevel, this.params);
    }

    /**
     * 重置当前关卡
     */
    resetLevel() {
        this.killCount = 0;
        this.critCount = 0;
        this.score = 0;
        this._levelComplete = false;
    }

    /**
     * 获取关卡进度
     */
    getProgress() {
        return {
            level: this.currentLevel,
            killCount: this.killCount,
            killTarget: this.params.killTarget,
            progress: Math.min(1, this.killCount / this.params.killTarget),
            score: this.score,
            critCount: this.critCount
        };
    }

    get isLevelComplete() {
        return this._levelComplete;
    }
}
