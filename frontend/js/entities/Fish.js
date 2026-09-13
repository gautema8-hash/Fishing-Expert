/**
 * 鱼类基类（Canvas2D 深度优化版）
 *  - 伪3D光影：菲涅尔边缘光（Fresnel）+ 顶部方向光高光/底部阴影 + 程序化鱼鳞纹理
 *  - 骨骼动画：8~12 节脊椎（头/躯干/尾差异化摆幅）+ 独立胸鳍/背鳍/尾鳍骨骼
 *  - 动画状态机：idle / swim / fast / turn / escape / hurt / dying 七种状态
 *  - Verlet 物理：鱼鳍边缘节点柔性飘动（阻尼 0.85，3 次约束迭代）
 *
 * 公开接口签名保持不变：init / update / render / hit / getCollisionRadius / isBoss / isAlive
 */
import { Utils } from '../core/Utils.js';
import { FishConfig } from '../config/fishConfig.js';
import { VerletSystem } from '../render/VerletPhysics.js';

export class Fish {
    constructor() {
        this.reset();
        this._pooled = true;
        this._active = false;
    }

    /** 鳞片纹理静态缓存（按 scaleType + 强调色 只生成一次） */
    static _scaleTextureCache = {};

    reset() {
        this.id = '';
        this.type = 'goldfish';
        this.config = null;
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = 100;
        this.baseSpeed = 100;
        this.hp = 1;
        this.maxHp = 1;
        this.score = 10;
        this.size = 36;
        this.state = 'alive'; // alive / dying / dead
        this._active = false;
        this._time = 0;
        this._pathTime = 0;
        this._dodgeTimer = 0;
        this._dodging = false;
        this._hitFlash = 0;
        this._deathTimer = 0;
        this._school = null;
        this._schoolOffset = { x: 0, y: 0 };
        this._depthScale = 1;
        this._depthAlpha = 1;
        this._pitch = 0; // 俯仰
        this._roll = 0;  // 侧倾
        this._targetX = 0;
        this._targetY = 0;
        this._wanderAngle = 0;
        this._wanderTimer = 0;

        // ===== 新增：动画状态机 =====
        this.animState = 'idle';          // idle/swim/fast/turn/escape/hurt/dying
        this._hurtTimer = 0;              // 受击僵直剩余时间
        this._prevAngle = 0;              // 上一帧朝向（计算转向速率）
        this._turnRate = 0;               // 当前转向速率 rad/s
        this._lastDt = 0.016;

        // ===== 新增：Verlet 鱼鳍物理 =====
        // 注意：_finSys 不在 reset 中置 null，以便对象池复用时重用 VerletSystem
        // _setupFinPhysics() 会调用 sys.clear() 清空旧节点后重建
        this._chainPecL = null;
        this._chainPecR = null;
        this._chainDorsal = null;
        this._chainTailTop = null;
        this._chainTailBot = null;

        // ===== 新增：鱼鳞闪烁粒子（自包含）=====
        this._scaleSparks = [];
        this._nextSparkTime = 0;

        // ===== 新增：图片渲染支持（失败自动降级为程序化绘制）=====
        this._image = null;          // 当前鱼的图片对象
        this._useImage = false;      // 是否使用图片渲染
    }

    /**
     * 初始化鱼
     */
    init(type, x, y, direction = 1) {
        this.config = FishConfig.types[type];
        if (!this.config) {
            console.warn(`[Fish] Unknown fish type: ${type}`);
            return;
        }

        this.type = type;
        this.id = Utils.generateId();
        this.x = x;
        this.y = y;
        this.angle = direction > 0 ? 0 : Math.PI;
        this.targetAngle = this.angle;
        this.baseSpeed = this.config.speed;
        this.speed = this.baseSpeed;
        this.hp = this.config.hp;
        this.maxHp = this.config.hp;
        this.score = this.config.score;
        this.size = this.config.size;
        this.state = 'alive';
        this._active = true;
        this._time = Math.random() * 10;
        this._pathTime = 0;
        this._hitFlash = 0;
        this._deathTimer = 0;

        // 动画状态复位
        this.animState = 'swim';
        this._hurtTimer = 0;
        this._prevAngle = this.angle;
        this._turnRate = 0;
        this._scaleSparks.length = 0;
        this._nextSparkTime = this._time + Utils.random(0.5, 2);

        // 景深
        if (this.config.depth === 'far') {
            this._depthScale = 0.6;
            this._depthAlpha = 0.7;
        } else if (this.config.depth === 'mid') {
            this._depthScale = 0.85;
            this._depthAlpha = 0.9;
        } else {
            this._depthScale = 1;
            this._depthAlpha = 1;
        }

        // 初始游走方向
        this._wanderAngle = this.angle + Utils.random(-0.5, 0.5);

        // 构建鱼鳍 Verlet 物理链
        this._setupFinPhysics();

        // 尝试获取鱼类图片（未加载/失败均降级为程序化绘制）
        this._image = null;
        this._useImage = false;
        this._tryAcquireImage();
    }

    /**
     * 尝试从全局 ResourceManager 获取已加载的鱼类图片
     * 任何异常都降级为程序化绘制，保证游戏不白屏
     */
    _tryAcquireImage() {
        try {
            const imgPath = this.config && this.config.imagePath;
            if (!imgPath) return;
            const rm = (typeof window !== 'undefined' && window.__game && window.__game.resourceManager)
                ? window.__game.resourceManager : null;
            if (!rm || typeof rm.isFishImageLoaded !== 'function') return;
            if (rm.isFishImageLoaded(imgPath)) {
                const img = rm.getFishImage(imgPath);
                if (img && img.complete && img.naturalWidth > 0) {
                    this._image = img;
                    this._useImage = true;
                }
            }
        } catch (e) {
            this._useImage = false;
            this._image = null;
        }
    }

    /**
     * 为当前鱼构建鱼鳍边缘节点 Verlet 链
     * 性能优化：复用已有 VerletSystem 对象（池化复用场景），避免每次 init 都 new
     */
    _setupFinPhysics() {
        const p = FishConfig.physics;
        const S = this.size;

        // 复用已创建的 VerletSystem，仅清空节点/约束后重建
        // 首次调用时 this._finSys 为 null，需新建
        if (!this._finSys) {
            this._finSys = new VerletSystem({
                damping: p.damping,
                iterations: p.iterations,
                waterForce: { x: 0, y: 0 }
            });
        } else {
            // 清空旧节点和约束，重置索引
            this._finSys.clear();
        }

        const sys = this._finSys;

        // 通用：从锚点向外伸展 k 个柔性节点
        const buildChain = (rx, ry, dx, dy, k, stiffness, mass) => {
            const root = sys.addNode(rx, ry, { pinned: true, mass: p.headMass });
            const nodes = [root];
            let px = rx, py = ry;
            for (let i = 1; i <= k; i++) {
                px += dx;
                py += dy;
                // 末端节点更轻（鱼尾轻、鱼鳍尖轻）
                const m = mass * (1 - (i / (k + 1)) * 0.5);
                nodes.push(sys.addNode(px, py, { mass: m }));
            }
            for (let i = 0; i < nodes.length - 1; i++) {
                sys.addConstraint(nodes[i], nodes[i + 1], stiffness);
            }
            return { root, nodes };
        };

        // 左/右胸鳍（独立扇动，各 p.pectoralNodes 个边缘节点）
        this._chainPecL = buildChain(-S * 0.05, S * 0.15, -S * 0.10, S * 0.20, p.pectoralNodes, p.finStiffness, 0.6);
        this._chainPecR = buildChain(-S * 0.05, -S * 0.15, -S * 0.10, -S * 0.20, p.pectoralNodes, p.finStiffness, 0.6);
        // 背鳍（随水流飘动）
        this._chainDorsal = buildChain(-S * 0.1, -S * 0.25, -S * 0.06, -S * 0.28, p.dorsalNodes, p.finStiffness * 0.8, 0.4);
        // 尾鳍上/下两叶（独立）
        this._chainTailTop = buildChain(-S * 0.55, -S * 0.05, -S * 0.16, -S * 0.16, p.tailLobeNodes, p.finStiffness, p.tailMass);
        this._chainTailBot = buildChain(-S * 0.55, S * 0.05, -S * 0.16, S * 0.16, p.tailLobeNodes, p.finStiffness, p.tailMass);

        this._finSys = sys;
    }

    /**
     * 更新鱼
     */
    update(dt, gameWidth, gameHeight, bullets = []) {
        if (!this._active || this.state === 'dead') return;
        this._lastDt = dt;

        this._time += dt;
        this._pathTime += dt;

        if (this.state === 'dying') {
            this._deathTimer += dt;
            this._hitFlash = Math.max(0, this._hitFlash - dt * 5);
            // 死亡状态：翻转上浮 + 鱼鳍下垂
            if (this._deathTimer > 0.5) {
                this.state = 'dead';
                this._active = false;
            }
            return;
        }

        // 受击闪烁衰减
        this._hitFlash = Math.max(0, this._hitFlash - dt * 3);

        // 记录转向前朝向（用于计算转向速率）
        const prevAngle = this.angle;

        // 躲避炮弹
        this._updateDodge(dt, bullets);

        // AI 行为（会改变 this.angle）
        this._updateAI(dt, gameWidth, gameHeight);

        // 特殊行为
        this._updateSpecialBehavior(dt);

        // 移动
        const moveSpeed = this._dodging ? this.speed * FishConfig.ai.dodgeSpeedMultiplier : this.speed;
        this.x += Math.cos(this.angle) * moveSpeed * dt;
        this.y += Math.sin(this.angle) * moveSpeed * dt;

        // 边界处理
        this._handleBoundaries(gameWidth, gameHeight);

        // 俯仰/侧倾姿态
        const speedRatio = moveSpeed / this.baseSpeed;
        this._pitch = Utils.lerp(this._pitch, (speedRatio - 1) * 0.2, 0.1);
        this._roll = Utils.lerp(this._roll, Math.sin(this._time * 2) * 0.05, 0.05);

        // 计算转向速率（rad/s）
        const angleDelta = Math.abs(Utils.lerpAngle(prevAngle, this.angle, 1));
        this._turnRate = angleDelta / Math.max(dt, 0.0001);

        // 受击僵直计时
        if (this._hurtTimer > 0) this._hurtTimer -= dt;

        // 状态机切换
        this._updateAnimState();

        // 鱼鳞闪烁：大鱼偶发自发光点
        if (this.size > 50 && this._time > this._nextSparkTime) {
            this._nextSparkTime = this._time + Utils.random(0.8, 2.5);
            this.emitScaleSpark();
        }
        // 衰减已有闪烁
        for (let i = this._scaleSparks.length - 1; i >= 0; i--) {
            this._scaleSparks[i].t -= dt * 2.2;
            if (this._scaleSparks[i].t <= 0) this._scaleSparks.splice(i, 1);
        }
    }

    /**
     * 动画状态机切换（优先级：dying > hurt > escape > fast > turn > idle > swim）
     */
    _updateAnimState() {
        const rules = FishConfig.stateRules;
        if (this.state === 'dying') { this.animState = 'dying'; return; }
        if (this._hurtTimer > 0) { this.animState = 'hurt'; return; }
        if (this._dodging) { this.animState = 'escape'; return; }

        const speedRatio = this.speed / this.baseSpeed;
        if (speedRatio > rules.fastSpeedRatio) { this.animState = 'fast'; return; }
        if (this._turnRate > rules.turnRadPerSec) { this.animState = 'turn'; return; }
        if (speedRatio < rules.idleSpeedRatio) { this.animState = 'idle'; return; }
        this.animState = 'swim';
    }

    _updateAI(dt, gameWidth, gameHeight) {
        const ai = FishConfig.ai;

        if (this._school) {
            // 鱼群行为：跟随鱼群中心
            const schoolX = this._school.x + this._schoolOffset.x;
            const schoolY = this._school.y + this._schoolOffset.y;
            const targetAngle = Utils.angleBetween(this.x, this.y, schoolX, schoolY);
            this.targetAngle = Utils.lerpAngle(this.targetAngle, targetAngle, 0.05);
        } else {
            // 独立行为
            switch (this.config.pathType) {
                case 'linear':
                    this._wanderTimer -= dt;
                    if (this._wanderTimer <= 0) {
                        this._wanderTimer = FishConfig.ai.wanderChangeInterval;
                        this._wanderAngle = this.angle + Utils.random(-0.3, 0.3);
                    }
                    this.targetAngle = Utils.lerpAngle(this.targetAngle, this._wanderAngle, 0.02);
                    break;

                case 'sine':
                    this.targetAngle = Utils.lerpAngle(
                        this.targetAngle,
                        (this.x > 0 ? 0 : Math.PI) + Math.sin(this._pathTime * 1.5) * 0.4,
                        0.05
                    );
                    break;

                case 'circle':
                    this.targetAngle += 0.8 * dt;
                    break;

                case 'float':
                    this.targetAngle = Utils.lerpAngle(
                        this.targetAngle,
                        (this.x > 0 ? 0 : Math.PI) + Math.sin(this._pathTime * 0.8) * 0.6,
                        0.03
                    );
                    break;

                case 'erratic':
                    this._wanderTimer -= dt;
                    if (this._wanderTimer <= 0) {
                        this._wanderTimer = Utils.random(0.3, 0.8);
                        this._wanderAngle = this.angle + Utils.random(-0.8, 0.8);
                    }
                    this.targetAngle = Utils.lerpAngle(this.targetAngle, this._wanderAngle, 0.08);
                    break;

                case 'random':
                default:
                    this._wanderTimer -= dt;
                    if (this._wanderTimer <= 0) {
                        this._wanderTimer = Utils.random(1, 3);
                        this._wanderAngle = Utils.random(0, Math.PI * 2);
                    }
                    this.targetAngle = Utils.lerpAngle(this.targetAngle, this._wanderAngle, 0.03);
                    break;
            }
        }

        // 平滑转向
        this.angle = Utils.lerpAngle(this.angle, this.targetAngle, FishConfig.ai.turnSpeed * dt);
    }

    _updateDodge(dt, bullets) {
        if (!bullets || bullets.length === 0) {
            this._dodging = false;
            return;
        }

        const dodgeRadius = FishConfig.ai.dodgeRadius;
        let nearestBullet = null;
        let nearestDist = Infinity;

        for (const bullet of bullets) {
            if (!bullet._active) continue;
            const dist = Utils.distance(this.x, this.y, bullet.x, bullet.y);
            if (dist < dodgeRadius && dist < nearestDist) {
                nearestDist = dist;
                nearestBullet = bullet;
            }
        }

        if (nearestBullet) {
            this._dodging = true;
            // 逃离方向：与炮弹方向垂直
            const bulletAngle = Math.atan2(nearestBullet.vy, nearestBullet.vx);
            const escapeAngle = bulletAngle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
            this.targetAngle = Utils.lerpAngle(this.targetAngle, escapeAngle, 0.2);
        } else {
            this._dodging = false;
        }
    }

    /**
     * 特殊行为更新
     */
    _updateSpecialBehavior(dt) {
        const special = this.config?.special;
        if (!special) return;

        switch (special) {
            case 'electric':
                this._electricTimer = (this._electricTimer || 0) + dt;
                if (this._electricTimer > 2.5) {
                    this._electricTimer = 0;
                    this._electricPulse = 1.0;
                }
                this._electricPulse = Math.max(0, (this._electricPulse || 0) - dt * 2);
                break;

            case 'invisible':
                this._invisibleTimer = (this._invisibleTimer || 0) + dt;
                const cycle = this._invisibleTimer % 4;
                if (cycle < 1.5) {
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 1, 1, 0.1);
                } else if (cycle < 2) {
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 1, 0.15, 0.1);
                } else if (cycle < 3.5) {
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 0.15, 0.15, 0.1);
                } else {
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 0.15, 1, 0.1);
                }
                break;

            case 'split':
                this._splitPulse = Math.sin(this._time * 3) * 0.3 + 0.7;
                break;
        }
    }

    _handleBoundaries(gameWidth, gameHeight) {
        // 出框即标记失效（不再拉回），由 FishManager 的 update 循环自动移除
        const sys = FishConfig.spawnSystem;
        const margin = (sys && sys.outOfBoundsMargin != null) ? sys.outOfBoundsMargin : this.size * 2;
        if (this.x < -margin || this.x > gameWidth + margin ||
            this.y < -margin || this.y > gameHeight + margin) {
            this._active = false;
            this.state = 'dead';
        }
    }

    /**
     * 受击
     */
    hit(damage = 1) {
        if (this.state !== 'alive') return false;
        this.hp -= damage;
        this._hitFlash = 1;
        if (this.hp <= 0) {
            this.state = 'dying';
            this._deathTimer = 0;
            return true; // 击杀
        }
        // 受击僵直 0.3 秒
        this._hurtTimer = FishConfig.stateRules.hurtDuration;
        return false;
    }

    /**
     * 触发一次鱼鳞微高光闪烁（供粒子系统/外部调用）
     * @param {number} [x] 局部 x（缺省随机选一段身体）
     * @param {number} [y] 局部 y
     */
    emitScaleSpark(x, y) {
        if (x == null || y == null) {
            x = Utils.random(-this.size * 0.4, this.size * 0.1);
            y = Utils.random(-this.size * 0.15, this.size * 0.15);
        }
        this._scaleSparks.push({ x, y, t: 1 });
    }

    /**
     * 渲染鱼（骨骼动画 + 伪3D光影 + Verlet 鱼鳍）
     */
    render(ctx) {
        if (!this._active) return;

        // ===== 图片渲染路径：图片就绪时优先使用 =====
        if (this._useImage && this._image) {
            this._renderImage(ctx);
            return;
        }
        // 图片异步加载可能晚于 init，此处惰性重试（加载完成后自动切换到图片渲染）
        if (!this._useImage && this.config && this.config.imagePath) {
            this._tryAcquireImage();
            if (this._useImage && this._image) {
                this._renderImage(ctx);
                return;
            }
        }

        // ===== 以下为原有程序化绘制（完全保留作为 fallback）=====
        ctx.save();
        const specialAlpha = this.config?.special === 'invisible' ? (this._invisibleAlpha || 1) : 1;
        const dyingFade = this.state === 'dying' ? Math.max(0, 1 - this._deathTimer * 2) : 1;
        ctx.globalAlpha = this._depthAlpha * specialAlpha * dyingFade;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.rotate(this._roll);

        // 死亡翻转（肚皮朝上，逐渐翻正感）
        if (this.state === 'dying') {
            const flipT = Math.min(1, this._deathTimer * 2.5);
            ctx.rotate(Math.PI * flipT);
        }
        ctx.scale(this._depthScale, this._depthScale * (1 + this._pitch));

        const cfg = this.config;
        const boneAnim = FishConfig.boneAnimation;
        const st = FishConfig.animStates[this.animState] || FishConfig.animStates.swim;
        const speedInfluence = 1 + (this.speed / this.baseSpeed - 1) * boneAnim.speedInfluence;

        // 发光效果（水母/灯笼鱼/特殊鱼）
        if (cfg.glow) {
            const glowColor = cfg.glowColor || cfg.lureColor || cfg.accentColor;
            let pulse = Math.sin(this._time * 3) * 0.2 + 0.8;
            if (cfg.special === 'electric' && this._electricPulse > 0) {
                pulse = this._electricPulse;
            }
            if (cfg.special === 'split') {
                pulse = this._splitPulse || 0.8;
            }
            ctx.globalCompositeOperation = 'lighter';
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
            glowGradient.addColorStop(0, glowColor + Math.floor(pulse * 80).toString(16).padStart(2, '0'));
            glowGradient.addColorStop(0.5, glowColor + '20');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // ===== 计算脊椎骨骼（spineSegments 节，头小尾大摆幅）=====
        const segments = cfg.spineSegments || cfg.boneSegments;
        const segmentLength = this.size / segments;
        const bonePositions = [];

        const baseFreq = boneAnim.bodyWaveFrequency * speedInfluence * st.freq;
        const baseAmp = boneAnim.bodyWaveAmplitude * st.bodyAmp * st.bendMult;
        const headAmp = boneAnim.headAmpScale;     // 0.3x
        const tailAmp = boneAnim.tailAmpScale;     // 1.5x

        let bx = 0, by = 0, bAngle = 0;
        bonePositions.push({ x: bx, y: by, angle: bAngle, width: this.size * 0.4 });

        for (let i = 1; i < segments; i++) {
            const t = i / (segments - 1);
            const ampRamp = Utils.lerp(headAmp, tailAmp, t); // 头部0.3 → 尾部1.5
            const wave = Math.sin(this._time * baseFreq - i * 0.6) * baseAmp * ampRamp;
            bAngle += wave;
            bx -= Math.cos(bAngle) * segmentLength;
            by -= Math.sin(bAngle) * segmentLength;
            const width = this.size * 0.4 * (1 - t * 0.6);
            bonePositions.push({ x: bx, y: by, angle: bAngle, width });
        }

        // Verlet 鱼鳍物理步进（根节点吸附到骨骼锚点）
        this._stepFinPhysics(bonePositions);

        // 绘制顺序：身体 → 背鳍 → 胸鳍 → 尾鳍 → 头部 → 闪烁
        this._renderBody(ctx, bonePositions, cfg, st);
        this._renderDorsalFin(ctx, bonePositions, cfg, st);
        this._renderPectoralFins(ctx, bonePositions, cfg, st);
        this._renderTailFin(ctx, bonePositions, cfg, st);
        this._renderHead(ctx, bonePositions[0], cfg, st);

        // 受击白色闪烁 / hurt 状态变白
        if (this._hitFlash > 0 || this.animState === 'hurt') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(this._hitFlash * 0.5, this.animState === 'hurt' ? 0.35 : 0);
            for (const pos of bonePositions) {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pos.width * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }

    /**
     * 鱼鳍 Verlet 步进：固定根节点到骨骼，施加水流力，求解约束
     */
    _stepFinPhysics(bones) {
        if (!this._finSys) return;
        const sys = this._finSys;
        const p = FishConfig.physics;
        const b1 = bones[1] || bones[0];
        const b2 = bones[2] || b1;
        const tail = bones[bones.length - 1];

        // 根节点吸附到身体锚点
        sys.setNode(this._chainPecL.root, b1.x, b1.y + b1.width * 0.3);
        sys.setNode(this._chainPecR.root, b1.x, b1.y - b1.width * 0.3);
        sys.setNode(this._chainDorsal.root, b2.x, b2.y - b2.width * 0.35);
        sys.setNode(this._chainTailTop.root, tail.x, tail.y - tail.width * 0.1);
        sys.setNode(this._chainTailBot.root, tail.x, tail.y + tail.width * 0.1);

        // 水流力：沿游向反向阻力（鱼身后甩）+ 垂直正弦扰动（飘动）
        const sp = Math.max(0.3, this.speed / this.baseSpeed);
        sys.setWaterForce(-p.waterForceX * sp, Math.sin(this._time * 4) * p.turbulenceY);
        sys.update(this._lastDt);
    }

    /**
     * 鱼身渲染：基础渐变 + 鳞片纹理 + 菲涅尔边缘光 + 方向光高光/阴影
     */
    _renderBody(ctx, bones, cfg, st) {
        const F0 = cfg.fresnelIntensity != null ? cfg.fresnelIntensity : 0.1;
        const pitchBoost = 1 + Math.abs(this._pitch) * 2;

        // 1) 基础身体分段渐变（顶部 accentColor 提亮，底部 finColor 压暗 = 方向光模拟）
        for (let i = 0; i < bones.length - 1; i++) {
            const curr = bones[i];
            const next = bones[i + 1];
            const t = i / bones.length;

            const gradient = ctx.createLinearGradient(curr.x, -curr.width, curr.x, curr.width);
            // 俯仰角度影响高光强度（_pitch 大时顶部更亮）
            const topAlpha = Utils.clamp(0.9 * (0.8 + Math.abs(this._pitch)), 0.3, 1);
            gradient.addColorStop(0, Utils.rgba(cfg.accentColor, topAlpha));
            gradient.addColorStop(0.3, cfg.color);
            gradient.addColorStop(0.7, cfg.color);
            gradient.addColorStop(1, Utils.rgba(cfg.finColor, 0.85));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(
                (curr.x + next.x) / 2,
                (curr.y + next.y) / 2,
                curr.width * 0.7,
                curr.width * 0.45,
                (curr.angle + next.angle) / 2,
                0, Math.PI * 2
            );
            ctx.fill();

            // 菲涅尔边缘描边（随距离尾部衰减）
            ctx.strokeStyle = Utils.rgba(cfg.accentColor, F0 * (1 - t * 0.5));
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 2) 程序化鱼鳞纹理（大鱼，按 scaleType 预渲染 OffscreenCanvas）
        if (this.size > 50) {
            this._renderScaleTexture(ctx, bones, cfg);
        }

        // 3) 菲涅尔边缘光晕：沿鱼身外轮廓叠一层亮边
        this._renderFresnelRim(ctx, bones, cfg, F0, pitchBoost);

        // 4) 顶部方向光高光带（水面阳光）
        this._renderDirectionalSheen(ctx, bones, cfg);

        // 5) 鱼鳞闪烁亮点
        this._renderScaleSparks(ctx, cfg);
    }

    /**
     * 菲涅尔边缘光晕：F(θ) = F0 + (1-F0)(1-cosθ)^5
     * 用外轮廓路径 + 双层描边近似（顶部掠射角更亮）
     */
    _renderFresnelRim(ctx, bones, cfg, F0, pitchBoost) {
        const n = bones.length;
        if (n < 2) return;
        ctx.save();
        ctx.lineWidth = Math.max(1.2, this.size * 0.03);
        ctx.lineJoin = 'round';

        // 外轮廓：上沿从首到尾，下沿从尾回到首
        ctx.beginPath();
        ctx.moveTo(bones[0].x, bones[0].y - bones[0].width * 0.45);
        for (let i = 1; i < n; i++) {
            ctx.lineTo(bones[i].x, bones[i].y - bones[i].width * 0.45);
        }
        for (let i = n - 1; i >= 0; i--) {
            ctx.lineTo(bones[i].x, bones[i].y + bones[i].width * 0.45);
        }
        ctx.closePath();

        // 菲涅尔强度：F0 基准 + 俯仰掠射角增强
        const fresnel = F0 + (1 - F0) * Math.pow(1 - Math.cos(Math.abs(this._pitch) * 2), 5);
        ctx.strokeStyle = Utils.rgba(cfg.accentColor, Utils.clamp(fresnel * pitchBoost, 0.05, 0.85));
        ctx.stroke();
        ctx.restore();
    }

    /**
     * 顶部方向光高光带（水面上方阳光）
     */
    _renderDirectionalSheen(ctx, bones, cfg) {
        const n = bones.length;
        if (n < 2) return;
        ctx.save();
        // 沿背部的高光带
        ctx.beginPath();
        ctx.moveTo(bones[0].x, bones[0].y - bones[0].width * 0.35);
        for (let i = 1; i < n; i++) {
            ctx.lineTo(bones[i].x, bones[i].y - bones[i].width * 0.35);
        }
        // 回拉一点形成高光条
        for (let i = n - 1; i >= 0; i--) {
            ctx.lineTo(bones[i].x, bones[i].y - bones[i].width * 0.15);
        }
        ctx.closePath();
        const sheen = ctx.createLinearGradient(0, -this.size * 0.4, 0, 0);
        sheen.addColorStop(0, Utils.rgba('#FFFFFF', 0.22 * (1 + Math.abs(this._pitch))));
        sheen.addColorStop(1, Utils.rgba('#FFFFFF', 0));
        ctx.fillStyle = sheen;
        ctx.fill();
        ctx.restore();
    }

    /**
     * 程序化鱼鳞纹理（预渲染到 OffscreenCanvas，按 scaleType 缓存）
     */
    _renderScaleTexture(ctx, bones, cfg) {
        const tex = Fish._getScaleTexture(cfg.scaleType || 'cycloid', cfg.accentColor);
        if (!tex) return;

        const n = bones.length;
        ctx.save();
        // 裁剪到鱼身轮廓内
        ctx.beginPath();
        ctx.moveTo(bones[0].x, bones[0].y - bones[0].width * 0.45);
        for (let i = 1; i < n; i++) ctx.lineTo(bones[i].x, bones[i].y - bones[i].width * 0.45);
        for (let i = n - 1; i >= 0; i--) ctx.lineTo(bones[i].x, bones[i].y + bones[i].width * 0.45);
        ctx.closePath();
        ctx.clip();

        // 平铺纹理（随鱼身宽度自适应）
        const pat = ctx.createPattern(tex, 'repeat');
        if (pat) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = pat;
            ctx.fillRect(bones[n - 1].x - this.size * 0.1, -this.size * 0.5, this.size * 1.3, this.size);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    /**
     * 鱼鳞微高光闪烁粒子
     */
    _renderScaleSparks(ctx, cfg) {
        if (!this._scaleSparks.length) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this._scaleSparks) {
            ctx.fillStyle = Utils.rgba(cfg.accentColor, Utils.clamp(s.t, 0, 1) * 0.9);
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.size * 0.04 * s.t + 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * 静态：按鳞片类型预渲染纹理到 OffscreenCanvas（只生成一次）
     */
    static _getScaleTexture(scaleType, accentColor) {
        const key = scaleType + '|' + accentColor;
        if (Fish._scaleTextureCache[key]) return Fish._scaleTextureCache[key];
        if (typeof document === 'undefined') return null;

        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const c = canvas.getContext('2d');
        c.clearRect(0, 0, size, size);
        c.strokeStyle = accentColor;
        c.fillStyle = accentColor;
        c.lineWidth = 2;

        const r = 16;
        for (let row = -1; row < size / (r * 1.2) + 1; row++) {
            for (let col = -1; col < size / (r * 1.5) + 1; col++) {
                const cx = col * r * 1.5 + (row % 2) * r * 0.75;
                const cy = row * r * 1.2;
                switch (scaleType) {
                    case 'ctenoid': // 栉鳞：半圆 + 小刺
                        c.beginPath();
                        c.arc(cx, cy, r, Math.PI, Math.PI * 2);
                        c.stroke();
                        c.beginPath();
                        c.moveTo(cx - r, cy);
                        c.lineTo(cx - r + 3, cy + 4);
                        c.moveTo(cx + r, cy);
                        c.lineTo(cx + r - 3, cy + 4);
                        c.stroke();
                        break;
                    case 'ganoid': // 硬鳞：菱形甲片
                        c.beginPath();
                        c.moveTo(cx, cy - r);
                        c.lineTo(cx + r, cy);
                        c.lineTo(cx, cy + r);
                        c.lineTo(cx - r, cy);
                        c.closePath();
                        c.stroke();
                        break;
                    case 'dragon': // 龙鳞：大圆弧 + 中心高光
                        c.beginPath();
                        c.arc(cx, cy, r * 1.1, Math.PI * 0.9, Math.PI * 2.1);
                        c.stroke();
                        c.globalAlpha = 0.6;
                        c.beginPath();
                        c.arc(cx, cy - r * 0.4, r * 0.18, 0, Math.PI * 2);
                        c.fill();
                        c.globalAlpha = 1;
                        break;
                    case 'cycloid':
                    default: // 圆鳞：光滑半圆阵列
                        c.beginPath();
                        c.arc(cx, cy, r, Math.PI, Math.PI * 2);
                        c.stroke();
                        break;
                }
            }
        }
        Fish._scaleTextureCache[key] = canvas;
        return canvas;
    }

    _renderHead(ctx, head, cfg, st) {
        const headGradient = ctx.createRadialGradient(head.x + head.width * 0.2, 0, 0, head.x, 0, head.width * 0.6);
        headGradient.addColorStop(0, Utils.rgba(cfg.accentColor, 0.8));
        headGradient.addColorStop(0.5, cfg.color);
        headGradient.addColorStop(1, cfg.finColor);
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.ellipse(head.x + head.width * 0.15, 0, head.width * 0.5, head.width * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(head.x + head.width * 0.3, -head.width * 0.15, head.width * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(head.x + head.width * 0.33, -head.width * 0.15, head.width * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛高光
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(head.x + head.width * 0.35, -head.width * 0.17, head.width * 0.02, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 尾鳍：Verlet 物理节点 + 半透明薄膜渐变
     */
    _renderTailFin(ctx, bones, cfg, st) {
        const tail = bones[bones.length - 1];
        const tailAnim = FishConfig.boneAnimation;
        const swing = Math.sin(this._time * tailAnim.tailFrequency * st.tailFreq) * tailAnim.tailAmplitude * st.tailAmp;

        ctx.save();
        ctx.translate(tail.x, tail.y);
        ctx.rotate(tail.angle + swing);

        // 半透明薄膜（alpha 0.6~0.8）
        ctx.globalAlpha = 0.72;
        const gradient = ctx.createLinearGradient(0, -tail.width, 0, tail.width);
        gradient.addColorStop(0, Utils.rgba(cfg.accentColor, 0.55));
        gradient.addColorStop(0.5, Utils.rgba(cfg.finColor, 0.85));
        gradient.addColorStop(1, Utils.rgba(cfg.accentColor, 0.55));
        ctx.fillStyle = gradient;

        // 使用 Verlet 节点绘制两叶
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // 上叶（物理节点）
        if (this._chainTailTop) {
            for (let i = 1; i < this._chainTailTop.nodes.length; i++) {
                const n = this._finSys.nodes[this._chainTailTop.nodes[i]];
                ctx.lineTo(n.x - tail.x, n.y - tail.y);
            }
        } else {
            ctx.quadraticCurveTo(-tail.width * 0.8, -tail.width * 1.2, -tail.width * 1.2, -tail.width * 0.8);
        }
        // 下叶
        if (this._chainTailBot) {
            for (let i = this._chainTailBot.nodes.length - 1; i >= 1; i--) {
                const n = this._finSys.nodes[this._chainTailBot.nodes[i]];
                ctx.lineTo(n.x - tail.x, n.y - tail.y);
            }
        } else {
            ctx.quadraticCurveTo(-tail.width * 0.6, 0, -tail.width * 1.2, tail.width * 0.8);
            ctx.quadraticCurveTo(-tail.width * 0.8, tail.width * 1.2, 0, 0);
        }
        ctx.closePath();
        ctx.fill();

        // 尾鳍纹理线
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = Utils.rgba(cfg.accentColor, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-tail.width * 0.8, -tail.width * 0.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(-tail.width * 0.8, tail.width * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * 胸鳍：独立扇动 + Verlet 边缘飘动 + 边缘渐变透明
     */
    _renderPectoralFins(ctx, bones, cfg, st) {
        const finAnim = FishConfig.boneAnimation;
        const swing = Math.sin(this._time * finAnim.finFrequency * st.finFreq) * finAnim.finAmplitude * st.finAmp;
        const head = bones[0];

        for (const side of [-1, 1]) {
            const chain = side > 0 ? this._chainPecL : this._chainPecR;
            ctx.save();
            ctx.translate(head.x - head.width * 0.1, side * head.width * 0.25);
            ctx.rotate(side * (Math.PI / 4 + swing));

            // 半透明薄膜
            ctx.globalAlpha = 0.65;
            const gradient = ctx.createLinearGradient(0, 0, head.width * 0.6, side * head.width * 0.2);
            gradient.addColorStop(0, Utils.rgba(cfg.finColor, 0.8));
            gradient.addColorStop(1, Utils.rgba(cfg.accentColor, 0.05)); // 边缘透明 + 透光加亮
            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            if (chain) {
                // 用物理节点描绘鳍边
                for (let i = 1; i < chain.nodes.length; i++) {
                    const n = this._finSys.nodes[chain.nodes[i]];
                    // 物理节点在鱼体坐标系，需相对当前 translate 变换（简化：直接投影到旋转系）
                    const lx = n.x - (head.x - head.width * 0.1);
                    const ly = n.y - side * head.width * 0.25;
                    // 反向旋转回到胸鳍局部
                    const a = -side * (Math.PI / 4 + swing);
                    const rx = lx * Math.cos(a) - ly * Math.sin(a);
                    const ry = lx * Math.sin(a) + ly * Math.cos(a);
                    ctx.lineTo(rx, ry);
                }
            } else {
                ctx.ellipse(head.width * 0.25, 0, head.width * 0.3, head.width * 0.12, 0, 0, Math.PI * 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * 背鳍：Verlet 物理节点 + 半透明飘动
     */
    _renderDorsalFin(ctx, bones, cfg, st) {
        if (bones.length < 3) return;
        ctx.save();
        ctx.globalAlpha = 0.65;
        const gradient = ctx.createLinearGradient(0, -this.size * 0.4, 0, 0);
        gradient.addColorStop(0, Utils.rgba(cfg.accentColor, 0.1)); // 顶端透明透光
        gradient.addColorStop(1, Utils.rgba(cfg.finColor, 0.85));
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(bones[1].x, -bones[1].width * 0.4);

        // 沿骨骼画背鳍基线
        for (let i = 2; i < bones.length - 1; i++) {
            const pos = bones[i];
            const finHeight = pos.width * 0.3;
            ctx.lineTo(pos.x, -pos.width * 0.4 - finHeight);
        }

        // Verlet 背鳍顶端节点
        if (this._chainDorsal) {
            for (let i = this._chainDorsal.nodes.length - 1; i >= 1; i--) {
                const n = this._finSys.nodes[this._chainDorsal.nodes[i]];
                ctx.lineTo(n.x, n.y);
            }
        }
        ctx.lineTo(bones[bones.length - 2].x, -bones[bones.length - 2].width * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * 图片渲染路径
     * 支持：景深缩放/透明度、朝向旋转、死亡翻转、隐身、受击闪白、BOSS/发光外发光、轻微游动摆动
     * 图片以 this.size 为基准宽度，高度按原始宽高比缩放
     */
    _renderImage(ctx) {
        const img = this._image;
        if (!img) { this._useImage = false; return; }

        ctx.save();
        const specialAlpha = this.config?.special === 'invisible' ? (this._invisibleAlpha || 1) : 1;
        const dyingFade = this.state === 'dying' ? Math.max(0, 1 - this._deathTimer * 2) : 1;
        ctx.globalAlpha = this._depthAlpha * specialAlpha * dyingFade;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.rotate(this._roll);

        // 死亡翻转（肚皮朝上，与程序化路径一致）
        if (this.state === 'dying') {
            const flipT = Math.min(1, this._deathTimer * 2.5);
            ctx.rotate(Math.PI * flipT);
        }

        // 轻微游动摆动（sin 波，模拟鱼身摆动）
        const sway = Math.sin(this._time * 4) * 0.05;
        ctx.rotate(sway);

        ctx.scale(this._depthScale, this._depthScale * (1 + this._pitch));

        // BOSS / 发光鱼 外发光
        if (this.isBoss || this.config?.glow) {
            const glowColor = this.config?.glowColor || this.config?.lureColor || this.config?.accentColor || '#FFD700';
            let pulse = Math.sin(this._time * 3) * 0.2 + 0.8;
            if (this.config?.special === 'electric' && this._electricPulse > 0) {
                pulse = this._electricPulse;
            }
            if (this.config?.special === 'split') {
                pulse = this._splitPulse || 0.8;
            }
            ctx.globalCompositeOperation = 'lighter';
            const glowRadius = this.isBoss ? this.size * 2.2 : this.size * 1.5;
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
            glowGradient.addColorStop(0, glowColor + Math.floor(pulse * 80).toString(16).padStart(2, '0'));
            glowGradient.addColorStop(0.5, glowColor + '20');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 图片尺寸：以 this.size 为基准宽度，高度按原始比例
        // 宽扁鱼/长鱼可通过 config.imageScale 放大贴图，避免身体被 1.6 倍基准宽度裁剪
        const imageScale = (this.config && this.config.imageScale) ? this.config.imageScale : 1.6;
        const imgW = this.size * imageScale;
        const ratio = (img.naturalWidth > 0 && img.naturalHeight > 0)
            ? img.naturalHeight / img.naturalWidth : 0.6;
        const imgH = imgW * ratio;

        // 注意：已通过 ctx.rotate(this.angle) 让局部 +x 沿鱼游向，
        // 头朝右的精灵图在局部坐标系中自然朝向游向，无需再水平翻转。
        ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);

        // 受击闪白 / hurt 状态变白
        if (this._hitFlash > 0 || this.animState === 'hurt') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(this._hitFlash * 0.5, this.animState === 'hurt' ? 0.35 : 0);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.6, this.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }

    /**
     * 获取碰撞半径
     */
    getCollisionRadius() {
        return this.size * this._depthScale * 0.6;
    }

    get isBoss() {
        return this.config?.isBoss || false;
    }

    get isAlive() {
        return this.state === 'alive';
    }
}
