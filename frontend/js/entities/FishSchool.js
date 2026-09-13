/**
 * 鱼群管理器
 * 鱼群生成、Boids 行为（分离/对齐/凝聚）、BOSS 驱散
 *
 * 性能优化：
 *  - Fish 对象池：预分配复用，避免频繁 new/GC
 *  - 景深分组渲染：far/mid/near 三数组，无需每帧 sort
 *  - 存活鱼缓存：update 结束时填充，避免每帧多次 getAllAliveFish 数组分配
 *  - 动态鱼数：根据 FPS 自动调整 _maxFish
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
        this._maxFish = 35;
        this._currentLevel = 1;
        this._bossEnabled = false;
        this._bossSpawnInterval = 60;
        this._frozen = false;
        this._nextSpawnInterval = 2;       // 下一次生成间隔（随机）
        this._recentFishTypes = [];        // 最近生成的鱼类（用于种类多样性，记忆长度8）
        this._recentMemoryLength = 8;      // 最近生成记忆窗口长度

        // ===== 性能优化：Fish 对象池 =====
        this._fishPool = [];               // 空闲 Fish 对象栈
        this._maxPoolSize = 80;            // 池最大容量（含在途复用）
        // 预热：预分配 40 个 Fish 对象
        for (let i = 0; i < 40; i++) {
            this._fishPool.push(new Fish());
        }

        // ===== 性能优化：景深分组渲染 =====
        this._farFish = [];                // 远景鱼（depth='far'）
        this._midFish = [];                // 中景鱼（depth='mid'）
        this._nearFish = [];               // 近景鱼（depth='near'）

        // ===== 性能优化：存活鱼缓存 =====
        this._aliveFishCache = [];         // 缓存的存活鱼数组
        this._aliveFishCacheDirty = true;  // 缓存是否需要重建

        // ===== 性能优化：动态鱼数倍率 =====
        this._fishMultiplier = 1.0;       // 当前鱼数倍率（FPS 自适应调整）
        this._baseMaxFish = 35;           // 关卡设定的基础上限
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
        this._baseMaxFish = params.maxFish;
        this._applyFishMultiplier();
        this._bossEnabled = params.bossEnabled;
        this._bossSpawnInterval = params.bossSpawnInterval;
    }

    /**
     * 性能优化：动态设置鱼数倍率（FPS 自适应）
     * @param {number} mult - 倍率 0.6~1.0
     */
    setDynamicFishMultiplier(mult) {
        this._fishMultiplier = Math.max(0.5, Math.min(1.0, mult));
        this._applyFishMultiplier();
    }

    /**
     * 应用鱼数倍率到 _maxFish
     */
    _applyFishMultiplier() {
        this._maxFish = Math.max(5, Math.floor(this._baseMaxFish * this._fishMultiplier));
    }

    // ===== 对象池辅助方法 =====

    /**
     * 从对象池获取一个 Fish（池空则新建）
     * @returns {Fish}
     */
    _acquireFish() {
        let fish = this._fishPool.pop();
        if (!fish) {
            fish = new Fish();
        }
        return fish;
    }

    /**
     * 将 Fish 释放回对象池（调用 reset 清理状态）
     * @param {Fish} fish
     */
    _releaseFish(fish) {
        if (!fish) return;
        fish.reset();
        fish._active = false;
        if (this._fishPool.length < this._maxPoolSize) {
            this._fishPool.push(fish);
        }
    }

    /**
     * 将鱼按 depth 归入对应渲染组
     */
    _addToDepthGroup(fish) {
        const depth = fish.config?.depth || 'mid';
        if (depth === 'far') this._farFish.push(fish);
        else if (depth === 'near') this._nearFish.push(fish);
        else this._midFish.push(fish);
    }

    /**
     * 从渲染组中移除鱼
     */
    _removeFromDepthGroup(fish) {
        const depth = fish.config?.depth || 'mid';
        const group = depth === 'far' ? this._farFish
                    : depth === 'near' ? this._nearFish : this._midFish;
        const idx = group.indexOf(fish);
        if (idx !== -1) group.splice(idx, 1);
    }

    /**
     * 更新所有鱼
     */
    update(dt, gameWidth, gameHeight, bullets = []) {
        // 生成普通鱼（随机间隔，一次可生成 1~maxFishPerSpawn 条）
        this._spawnTimer += dt;
        // 最低鱼数保障：场上鱼数低于20条时立即补生成，不等待 spawnTimer
        if (this.fishes.length < 20 && this.fishes.length < this._maxFish) {
            this._spawnTimer = 0;
            const sys = FishConfig.spawnSystem;
            this._nextSpawnInterval = Utils.random(sys.minInterval, sys.maxInterval);
            this._spawnFish(gameWidth, gameHeight);
        } else if (this._spawnTimer >= this._nextSpawnInterval && this.fishes.length < this._maxFish) {
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

            // 移除死亡/超出边界的鱼，释放回对象池
            if (!fish._active || fish.state === 'dead') {
                this.fishes.splice(i, 1);
                this._removeFromDepthGroup(fish);
                this._releaseFish(fish);
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

        // 标记存活鱼缓存为脏（下一帧重建）
        this._aliveFishCacheDirty = true;
    }

    _spawnFish(gameWidth, gameHeight) {
        const sys = FishConfig.spawnSystem;
        const spawnList = FishConfig.getSpawnList(this._currentLevel);

        // 同屏种类多样性检查：种类过少时强制从稀有/未出现种类中挑选
        const onScreenBefore = this._countOnScreenTypes();
        const distinctTypes = onScreenBefore.size;
        // 同屏鱼数量足够时（>=12），目标至少8~10种；不足5种时强制多样性
        const needDiversity = distinctTypes < 5 && this.fishes.length >= 10;

        // 单次生成 1~maxFishPerSpawn 条，种类尽量多样
        const count = Utils.randomInt(1, sys.maxFishPerSpawn || 3);
        for (let n = 0; n < count; n++) {
            if (this.fishes.length >= this._maxFish) break;

            const selected = this._pickDiverseFish(spawnList, needDiversity);
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

            const fish = this._acquireFish();
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
            this._addToDepthGroup(fish);
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
     * 统计当前屏幕上各鱼种的数量
     * @returns {Map<string, number>} fishTypeId -> count
     */
    _countOnScreenTypes() {
        const counts = new Map();
        for (const fish of this.fishes) {
            if (!fish || !fish._active || fish.state === 'dead') continue;
            const id = fish.type || (fish.config && fish.config.id);
            if (id) counts.set(id, (counts.get(id) || 0) + 1);
        }
        return counts;
    }

    /**
     * 加权随机选鱼，同时降低与最近生成种类重复的概率，
     * 并结合"同屏种类计数"优先选择当前数量少/未出现的种类。
     * @param {Array<{id:string, weight:number}>} spawnList
     * @param {boolean} forceDiverse 同屏种类不足时，强制从稀有/未出现种类中选择
     */
    _pickDiverseFish(spawnList, forceDiverse = false) {
        const onScreen = this._countOnScreenTypes();

        // 强制多样性：同屏种类过少时，从"未出现"的种类中按权重挑选
        if (forceDiverse) {
            const unseen = spawnList.filter(item => !onScreen.has(item.id));
            if (unseen.length > 0) {
                return Utils.weightedRandom(unseen);
            }
        }

        // 根据同屏数量对权重做调整：同屏数量越少权重越高
        // 数量为0（未出现）的种类权重放大，促进新种类上场
        const boosted = spawnList.map(item => {
            const cnt = onScreen.get(item.id) || 0;
            let bonus = 1;
            if (cnt === 0) bonus = 3;            // 未出现的种类大幅加权
            else if (cnt === 1) bonus = 1.6;
            else if (cnt >= 4) bonus = 0.4;      // 已泛滥的种类降权
            return { id: item.id, weight: item.weight * bonus };
        });

        let selected = Utils.weightedRandom(boosted);

        // 若刚生成过该类鱼，按 0.8 概率重抽一次以提高多样性
        if (this._recentFishTypes.includes(selected.id) && Math.random() < 0.8) {
            selected = Utils.weightedRandom(boosted);
        }

        this._recentFishTypes.push(selected.id);
        // 记忆窗口长度
        const maxLen = this._recentMemoryLength || 8;
        while (this._recentFishTypes.length > maxLen) this._recentFishTypes.shift();
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

        const fish = this._acquireFish();
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
        this._addToDepthGroup(fish);
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
            const fish = this._acquireFish();
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
            this._addToDepthGroup(fish);
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
     * 性能优化：使用缓存数组，避免每帧多次创建新数组
     * 返回的数组只读，调用方不要修改
     */
    getAllAliveFish() {
        if (this._aliveFishCacheDirty) {
            this._aliveFishCache.length = 0;
            for (const fish of this.fishes) {
                if (fish.isAlive) this._aliveFishCache.push(fish);
            }
            if (this.boss && this.boss.state === 'alive') {
                this._aliveFishCache.push(this.boss);
            }
            this._aliveFishCacheDirty = false;
        }
        return this._aliveFishCache;
    }

    /**
     * 性能优化：按景深分组渲染，无需每帧排序
     * 远景先画，中景次之，近景最后，BOSS 最上层
     */
    render(ctx) {
        for (const fish of this._farFish) fish.render(ctx);
        for (const fish of this._midFish) fish.render(ctx);
        for (const fish of this._nearFish) fish.render(ctx);

        // BOSS 最后画（在最上层）
        if (this.boss) {
            this.boss.render(ctx);
        }
    }

    clear() {
        // 释放所有活动鱼回对象池
        for (const fish of this.fishes) {
            this._releaseFish(fish);
        }
        this.fishes = [];
        this.schools = [];
        this.boss = null;
        this._spawnTimer = 0;
        this._bossTimer = 0;
        // 清空景深分组
        this._farFish.length = 0;
        this._midFish.length = 0;
        this._nearFish.length = 0;
        // 清空存活鱼缓存
        this._aliveFishCache.length = 0;
        this._aliveFishCacheDirty = true;
    }

    get fishCount() {
        return this.fishes.length;
    }
}
