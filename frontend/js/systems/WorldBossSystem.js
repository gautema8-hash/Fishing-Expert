/**
 * 世界BOSS限时活动系统
 * 定时刷新世界BOSS，全服玩家共同击杀（单机模拟）
 * 按伤害排名发奖，限时活动增加紧张感
 */
import { Utils } from '../core/Utils.js';
import { Events } from '../core/EventBus.js';

export class WorldBossSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;

        // 活动状态
        this.active = false;
        this.boss = null;
        this._eventTimer = 0;
        this._eventDuration = 120; // 活动持续120秒
        this._eventInterval = 300; // 每5分钟一次活动
        this._countdown = 0;

        // 玩家伤害统计
        this.playerDamage = 0;
        this.totalDamage = 0;
        this._damageRanking = [];

        // 世界BOSS配置
        this.worldBossConfig = {
            name: '深渊巨龙',
            hp: 5000,
            score: 10000,
            size: 200,
            color: '#8B0000',
            accentColor: '#FF4500'
        };
    }

    /**
     * 更新活动计时
     */
    update(dt, fishManager, gameWidth, gameHeight) {
        if (this.active) {
            this._eventTimer -= dt;
            if (this._eventTimer <= 0) {
                this._endEvent(false);
            }
            // 检查BOSS是否被击杀
            if (this.boss && (!this.boss._active || this.boss.state === 'dead')) {
                this._endEvent(true);
            }
        } else {
            this._countdown -= dt;
            if (this._countdown <= 0) {
                this._startEvent(fishManager, gameWidth, gameHeight);
            }
        }
    }

    /**
     * 开始世界BOSS活动
     */
    _startEvent(fishManager, gameWidth, gameHeight) {
        this.active = true;
        this._eventTimer = this._eventDuration;
        this.playerDamage = 0;
        this.totalDamage = 0;

        // 生成世界BOSS（由Game.js监听事件后生成增强BOSS）
        this.eventBus.emit('worldboss:start', {
            name: this.worldBossConfig.name,
            duration: this._eventDuration,
            config: this.worldBossConfig
        });

        this.eventBus.emit(Events.SHOW_TOAST, `🌍 世界BOSS ${this.worldBossConfig.name} 出现了！`);

        // 触发屏幕震动
        this.eventBus.emit('camera:shake', { intensity: 15, duration: 0.5 });
    }

    /**
     * 结束活动
     */
    _endEvent(killed) {
        this.active = false;
        this._countdown = this._eventInterval;

        if (killed) {
            // 计算排名奖励
            const rank = this._calculateRank();
            const reward = this._calculateReward(rank);
            this.eventBus.emit('worldboss:end', {
                killed: true,
                rank,
                reward,
                playerDamage: this.playerDamage
            });
            this.eventBus.emit(Events.SHOW_TOAST, `🎉 世界BOSS被击杀！排名第${rank}，获得${reward}金币！`);
        } else {
            this.eventBus.emit('worldboss:end', {
                killed: false,
                playerDamage: this.playerDamage
            });
            this.eventBus.emit(Events.SHOW_TOAST, '世界BOSS逃跑了...');
        }

        this.boss = null;
    }

    /**
     * 记录玩家伤害
     */
    addPlayerDamage(damage) {
        if (!this.active) return;
        this.playerDamage += damage;
        this.totalDamage += damage;
    }

    /**
     * 计算排名（模拟全服排名）
     */
    _calculateRank() {
        // 模拟其他玩家伤害
        const mockPlayers = [
            { name: '龙宫至尊', damage: Utils.randomInt(2000, 8000) },
            { name: '东海龙王', damage: Utils.randomInt(1500, 6000) },
            { name: '黄金猎手', damage: Utils.randomInt(1000, 4000) },
            { name: '珊瑚守护者', damage: Utils.randomInt(500, 3000) },
            { name: '深海探险家', damage: Utils.randomInt(300, 2000) }
        ];
        const allPlayers = [...mockPlayers, { name: '我', damage: this.playerDamage }];
        allPlayers.sort((a, b) => b.damage - a.damage);
        const myRank = allPlayers.findIndex(p => p.name === '我') + 1;
        this._damageRanking = allPlayers;
        return myRank;
    }

    /**
     * 计算排名奖励
     */
    _calculateReward(rank) {
        const baseReward = this.worldBossConfig.score;
        if (rank === 1) return baseReward * 2;
        if (rank === 2) return baseReward * 1.5;
        if (rank === 3) return baseReward * 1.2;
        if (rank <= 10) return baseReward;
        return Math.floor(baseReward * 0.5);
    }

    /**
     * 获取活动剩余时间
     */
    getRemainingTime() {
        return this.active ? Math.ceil(this._eventTimer) : 0;
    }

    /**
     * 获取距离下次活动时间
     */
    getNextEventCountdown() {
        return this.active ? 0 : Math.ceil(this._countdown);
    }

    /**
     * 获取伤害排名
     */
    getRanking() {
        return this._damageRanking;
    }

    /**
     * 手动触发活动（用于测试/活动按钮）
     */
    triggerEvent(fishManager, gameWidth, gameHeight) {
        if (this.active) return false;
        this._countdown = 0;
        return true;
    }
}
