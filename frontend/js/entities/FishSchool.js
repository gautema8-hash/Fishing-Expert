/**
 * 鱼群管理器
 * 鱼群生成、Boids 行为（分离/对齐/凝聚）、BOSS 驱散
 */
import { Fish } from './Fish.js';
import { BossDragonKing } from './Boss.js';
import { Utils } from '../core/Utils.js';
import { FishConfig } from '../config/fishConfig.js';
import { GameConfig } from '../config/gameConfig.js';

export class FishManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.fishes = [];
        this.boss = null;
        this.schools = [];
        this._spawnTimer = 0;
        this._bossTimer = 0;
        this._maxFish = 25;
        this._currentLevel = 1;
        this._bossEnabled = false;
        this._bossSpawnInterval = 60;
        this._frozen = false;
    }

    /**
     * 设置冰冻状态
     */
    setFrozen(frozen) {
        this._frozen = frozen;
    }

    /**
     * 设置关卡参数
     */
    setLevelParams(params) {
        this._currentLevel = params.level;
        this._maxFish = params.maxFish;
        this._bossEnabled = params.bossEnabled;
        this._bossSpawnInterval = params.bossSpawnInterval;
    }

    /**
     * 更新所有鱼
     */
    update(dt, gameWidth, gameHeight, bullets = []) {
        // 生成普通鱼
        this._spawnTimer += dt;
        if (this._spawnTimer >= 2 && this.fishes.length < this._maxFish) {
            this._spawnTimer = 0;
            this._spawnFish(gameWidth, gameHeight);
        }

        // BOSS 生成
        if (this._bossEnabled && !this.boss) {
            this._bossTimer += dt;
            if (this._bossTimer >= this._bossSpawnInterval) {
                this._bossTimer = 0;
                this._spawnBoss(gameWidth, gameHeight);
            }
        }

        // 更新鱼群
        this._updateSchools(dt, gameWidth, gameHeight);

        // 更新所有鱼
        const updateDt = this._frozen ? 0 : dt;
        for (let i = this.fishes.length - 1; i >= 0; i--) {
            const fish = this.fishes[i];
            fish.update(updateDt, gameWidth, gameHeight, bullets);
            fish._frozen = this._frozen;

            // BOSS 驱散小鱼
            if (this.boss && this.boss.state === 'alive') {
                const dist = Utils.distance(fish.x, fish.y, this.boss.x, this.boss.y);
                if (dist < FishConfig.types.dragonking.bossDisperseRadius) {
                    const escapeAngle = Utils.angleBetween(this.boss.x, this.boss.y, fish.x, fish.y);
                    fish.targetAngle = escapeAngle;
                    fish.speed = fish.baseSpeed * 2;
                } else {
                    fish.speed = fish.baseSpeed;
                }
            }

            // 移除死亡/超出边界的鱼
            if (!fish._active || fish.state === 'dead') {
                this.fishes.splice(i, 1);
            }
        }

        // 更新 BOSS
        if (this.boss) {
            this.boss.update(updateDt, gameWidth, gameHeight, bullets);
            this.boss._frozen = this._frozen;
            if (!this.boss._active || this.boss.state === 'dead') {
                this.boss = null;
            }
        }
    }

    _spawnFish(gameWidth, gameHeight) {
        const spawnList = FishConfig.getSpawnList(this._currentLevel);
        const selected = Utils.weightedRandom(spawnList);
        const fishType = selected.id;
        const config = FishConfig.types[fishType];

        // 结群鱼类生成鱼群
        if (config.schoolFish && Math.random() < 0.4) {
            this._spawnSchool(fishType, gameWidth, gameHeight);
            return;
        }

        // 单条鱼
        const fish = new Fish();
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side > 0 ? -50 : gameWidth + 50;
        const y = Utils.random(80, gameHeight - 150);
        fish.init(fishType, x, y, side);
        this.fishes.push(fish);
        this.eventBus.emit('fish:spawn', fish);
    }

    /**
     * 公开方法：在指定位置生成指定类型的鱼
     * @param {string} fishType - 鱼类ID
     * @param {Object} options - {x, y, angle, size, score}
     * @returns {Fish|null}
     */
    spawnFish(fishType, options = {}) {
        if (this.fishes.length >= this._maxFish) return null;
        const config = FishConfig.types[fishType];
        if (!config) return null;

        const fish = new Fish();
        const x = options.x !== undefined ? options.x : 0;
        const y = options.y !== undefined ? options.y : 0;
        const side = options.angle !== undefined ? (Math.cos(options.angle) >= 0 ? 1 : -1) : 1;

        fish.init(fishType, x, y, side);

        // 自定义属性
        if (options.angle !== undefined) {
            fish.angle = options.angle;
            fish.targetAngle = options.angle;
        }
        if (options.size) {
            fish.size = options.size;
            fish._depthScale = options.size / config.size;
        }
        if (options.score) {
            fish.score = options.score;
        }

        this.fishes.push(fish);
        this.eventBus.emit('fish:spawn', fish);
        return fish;
    }

    _spawnSchool(fishType, gameWidth, gameHeight) {
        const config = FishConfig.types[fishType];
        const schoolSize = Utils.randomInt(config.schoolSize[0], config.schoolSize[1]);
        const side = Math.random() > 0.5 ? 1 : -1;
        const centerX = side > 0 ? -100 : gameWidth + 100;
        const centerY = Utils.random(100, gameHeight - 200);

        const school = {
            x: centerX,
            y: centerY,
            vx: side * config.speed,
            vy: 0,
            type: fishType,
            fishes: []
        };

        for (let i = 0; i < schoolSize; i++) {
            if (this.fishes.length >= this._maxFish) break;
            const fish = new Fish();
            const offsetX = Utils.random(-80, 80);
            const offsetY = Utils.random(-50, 50);
            fish.init(fishType, centerX + offsetX, centerY + offsetY, side);
            fish._school = school;
            fish._schoolOffset = { x: offsetX, y: offsetY };
            school.fishes.push(fish);
            this.fishes.push(fish);
        }

        this.schools.push(school);
    }

    _updateSchools(dt, gameWidth, gameHeight) {
        for (let i = this.schools.length - 1; i >= 0; i--) {
            const school = this.schools[i];
            // 移除空鱼群
            school.fishes = school.fishes.filter(f => f._active && f.state === 'alive');
            if (school.fishes.length === 0) {
                this.schools.splice(i, 1);
                continue;
            }

            // 鱼群中心移动
            const config = FishConfig.types[school.type];
            school.x += school.vx * dt;
            school.y += Math.sin(Date.now() * 0.001) * 20 * dt;

            // 边界反弹
            if (school.x < -200 || school.x > gameWidth + 200) {
                this.schools.splice(i, 1);
            }
        }
    }

    _spawnBoss(gameWidth, gameHeight) {
        const boss = new BossDragonKing();
        const hpMult = 1 + (this._currentLevel - 1) * 0.2;
        const scoreMult = 1 + (this._currentLevel - 1) * 0.15;
        boss.init(gameWidth + 200, gameHeight * 0.4, -1, hpMult, scoreMult, this.eventBus);
        this.boss = boss;
        this.eventBus.emit('boss:warning', boss);

        // 延迟触发出场事件
        setTimeout(() => {
            if (this.boss === boss) {
                this.eventBus.emit('boss:appear', boss);
            }
        }, boss.config.bossWarningDuration * 1000);
    }

    /**
     * 生成世界BOSS（增强版）
     */
    spawnWorldBoss(gameWidth, gameHeight, config) {
        // 如果已有BOSS，先移除
        if (this.boss) {
            this.boss._active = false;
            this.boss = null;
        }

        const boss = new BossDragonKing();
        boss.init(gameWidth + 200, gameHeight * 0.35, -1, 1, 1, this.eventBus);
        // 覆盖为世界BOSS属性
        boss.hp = config.hp || 5000;
        boss.maxHp = boss.hp;
        boss.score = config.score || 10000;
        boss.size = config.size || 200;
        boss._isWorldBoss = true;
        boss._worldBossConfig = config;
        this.boss = boss;
        this.eventBus.emit('boss:warning', boss);

        setTimeout(() => {
            if (this.boss === boss) {
                this.eventBus.emit('boss:appear', boss);
            }
        }, boss.config.bossWarningDuration * 1000);

        return boss;
    }

    /**
     * 检测炮弹与鱼的碰撞
     */
    checkBulletCollision(bullet) {
        if (!bullet._active) return null;

        // 检测 BOSS
        if (this.boss && this.boss.state === 'alive') {
            const bossRadius = this.boss.getCollisionRadius();
            if (Utils.circleCollision(bullet.x, bullet.y, bullet.size || 8, this.boss.x, this.boss.y, bossRadius)) {
                return this.boss;
            }
        }

        // 检测普通鱼
        for (const fish of this.fishes) {
            if (!fish.isAlive) continue;
            const fishRadius = fish.getCollisionRadius();
            if (Utils.circleCollision(bullet.x, bullet.y, bullet.size || 8, fish.x, fish.y, fishRadius)) {
                return fish;
            }
        }
        return null;
    }

    /**
     * 获取所有可碰撞的鱼（用于锁定道具）
     */
    getAllAliveFish() {
        const result = [];
        for (const fish of this.fishes) {
            if (fish.isAlive) result.push(fish);
        }
        if (this.boss && this.boss.state === 'alive') {
            result.push(this.boss);
        }
        return result;
    }

    render(ctx) {
        // 按景深排序：远景先画
        const sorted = [...this.fishes].sort((a, b) => {
            const depthOrder = { far: 0, mid: 1, near: 2 };
            return (depthOrder[a.config?.depth] || 1) - (depthOrder[b.config?.depth] || 1);
        });

        for (const fish of sorted) {
            fish.render(ctx);
        }

        // BOSS 最后画（在最上层）
        if (this.boss) {
            this.boss.render(ctx);
        }
    }

    clear() {
        this.fishes = [];
        this.schools = [];
        this.boss = null;
        this._spawnTimer = 0;
        this._bossTimer = 0;
    }

    get fishCount() {
        return this.fishes.length;
    }
}
