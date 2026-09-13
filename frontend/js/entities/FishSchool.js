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
        this._nextSpawnInterval = 2;       // 下一次生成间隔（随机）
        this._recentFishTypes = [];        // 最近生成的鱼类（用于种类多样性）
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
        // 生成普通鱼（随机间隔，一次可生成 1~maxFishPerSpawn 条）
        this._spawnTimer += dt;
        if (this._spawnTimer >= this._nextSpawnInterval && this.fishes.length < this._maxFish) {
            this._spawnTimer = 0;
            const sys = FishConfig.spawnSystem;
            this._nextSpawnInterval = Utils.random(sys.minInterval, sys.maxInterval);
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
        const sys = FishConfig.spawnSystem;
        const spawnList = FishConfig.getSpawnList(this._currentLevel);

        // 单次生成 1~maxFishPerSpawn 条，种类尽量多样
        const count = Utils.randomInt(1, sys.maxFishPerSpawn || 3);
        for (let n = 0; n < count; n++) {
            if (this.fishes.length >= this._maxFish) break;

            const selected = this._pickDiverseFish(spawnList);
            const fishType = selected.id;
            const config = FishConfig.types[fishType];
            if (!config) continue;

            // 结群鱼类按概率生成鱼群
            if (config.schoolFish && Math.random() < (sys.schoolChance || 0.35)) {
                this._spawnSchool(fishType, gameWidth, gameHeight);
                continue;
            }

            // 四方向随机生成（参考鱼类 spawnDirections 偏好）
            const dir = this._pickSpawnDirection(config.spawnDirections);
            const pos = this._spawnPosByDirection(dir, gameWidth, gameHeight);

            const fish = new Fish();
            const side = Math.cos(pos.angle) >= 0 ? 1 : -1;
            fish.init(fishType, pos.x, pos.y, side);
            // init 只处理左右朝向，上下方向需手动覆盖 angle
            fish.angle = pos.angle;
            fish.targetAngle = pos.angle;

            // 速度随机化（在 speedRange 范围内）
            if (config.speedRange) {
                fish.baseSpeed = Utils.random(config.speedRange[0], config.speedRange[1]);
                fish.speed = fish.baseSpeed;
            }

            this.fishes.push(fish);
            this.eventBus.emit('fish:spawn', fish);
        }
    }

    /**
     * 根据鱼类出现方向偏好随机挑选一个方向（默认全方向）
     */
    _pickSpawnDirection(prefs) {
        const dirs = (prefs && prefs.length) ? prefs : ['left', 'right', 'top', 'bottom'];
        return dirs[Math.floor(Math.random() * dirs.length)];
    }

    /**
     * 根据方向计算出生坐标与初始朝向角
     */
    _spawnPosByDirection(direction, gameWidth, gameHeight) {
        switch (direction) {
            case 'left':
                return { x: -50, y: Utils.random(50, gameHeight - 50), angle: 0 };
            case 'right':
                return { x: gameWidth + 50, y: Utils.random(50, gameHeight - 50), angle: Math.PI };
            case 'top':
                return { x: Utils.random(50, gameWidth - 50), y: -50, angle: Math.PI / 2 };
            case 'bottom':
            default:
                return { x: Utils.random(50, gameWidth - 50), y: gameHeight + 50, angle: -Math.PI / 2 };
        }
    }

    /**
     * 加权随机选鱼，同时降低与最近生成种类重复的概率
     */
    _pickDiverseFish(spawnList) {
        let selected = Utils.weightedRandom(spawnList);
        // 若刚生成过该类鱼，按概率重抽一次以提高多样性
        if (this._recentFishTypes.includes(selected.id) && Math.random() < 0.6) {
            selected = Utils.weightedRandom(spawnList);
        }
        this._recentFishTypes.push(selected.id);
        if (this._recentFishTypes.length > 4) this._recentFishTypes.shift();
        return selected;
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
        const dir = this._pickSpawnDirection(config.spawnDirections);
        const pos = this._spawnPosByDirection(dir, gameWidth, gameHeight);

        // 鱼群中心沿进入方向移动
        const speed = config.speedRange
            ? Utils.random(config.speedRange[0], config.speedRange[1])
            : config.speed;

        const school = {
            x: pos.x,
            y: pos.y,
            vx: Math.cos(pos.angle) * speed,
            vy: Math.sin(pos.angle) * speed,
            type: fishType,
            fishes: []
        };

        for (let i = 0; i < schoolSize; i++) {
            if (this.fishes.length >= this._maxFish) break;
            const fish = new Fish();
            const offsetX = Utils.random(-80, 80);
            const offsetY = Utils.random(-50, 50);
            const side = Math.cos(pos.angle) >= 0 ? 1 : -1;
            fish.init(fishType, pos.x + offsetX, pos.y + offsetY, side);
            // 上下方向需手动覆盖朝向
            fish.angle = pos.angle;
            fish.targetAngle = pos.angle;
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

            // 边界移除（x/y 任一方向出框即销毁鱼群）
            if (school.x < -300 || school.x > gameWidth + 300 ||
                school.y < -300 || school.y > gameHeight + 300) {
                this.schools.splice(i, 1);
            }
        }
    }

    _spawnBoss(gameWidth, gameHeight) {
        const boss = new BossDragonKing();
        const hpMult = 1 + (this._currentLevel - 1) * 0.2;
        const scoreMult = 1 + (this._currentLevel - 1) * 0.15;
        // BOSS 从 top 或 right 随机入场（预警机制保持不变）
        const fromTop = Math.random() < 0.5;
        const startX = fromTop ? Utils.random(gameWidth * 0.3, gameWidth * 0.7) : gameWidth + 200;
        const startY = fromTop ? -200 : gameHeight * 0.4;
        boss.init(startX, startY, -1, hpMult, scoreMult, this.eventBus);
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
