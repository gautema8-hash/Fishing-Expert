/**
 * 鱼类基类
 * 骨骼动画：脊椎分段弯曲摆动，胸鳍/背鳍/尾鳍独立骨骼扇动
 * 3D 伪立体：菲涅尔光影、俯仰姿态、景深缩放
 */
import { Utils } from '../core/Utils.js';
import { FishConfig } from '../config/fishConfig.js';

export class Fish {
    constructor() {
        this.reset();
        this._pooled = true;
        this._active = false;
    }

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
    }

    /**
     * 更新鱼
     */
    update(dt, gameWidth, gameHeight, bullets = []) {
        if (!this._active || this.state === 'dead') return;

        this._time += dt;
        this._pathTime += dt;

        if (this.state === 'dying') {
            this._deathTimer += dt;
            this._hitFlash = Math.max(0, this._hitFlash - dt * 5);
            if (this._deathTimer > 0.5) {
                this.state = 'dead';
                this._active = false;
            }
            return;
        }

        // 受击闪烁衰减
        this._hitFlash = Math.max(0, this._hitFlash - dt * 3);

        // 躲避炮弹
        this._updateDodge(dt, bullets);

        // AI 行为
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
                    // 直线游动，偶尔微调
                    this._wanderTimer -= dt;
                    if (this._wanderTimer <= 0) {
                        this._wanderTimer = FishConfig.ai.wanderChangeInterval;
                        this._wanderAngle = this.angle + Utils.random(-0.3, 0.3);
                    }
                    this.targetAngle = Utils.lerpAngle(this.targetAngle, this._wanderAngle, 0.02);
                    break;

                case 'sine':
                    // S 型游动
                    this.targetAngle = Utils.lerpAngle(
                        this.targetAngle,
                        (this.x > 0 ? 0 : Math.PI) + Math.sin(this._pathTime * 1.5) * 0.4,
                        0.05
                    );
                    break;

                case 'circle':
                    // 环形游动
                    this.targetAngle += 0.8 * dt;
                    break;

                case 'float':
                    // 水母漂浮：缓慢上下浮动 + 横向移动
                    this.targetAngle = Utils.lerpAngle(
                        this.targetAngle,
                        (this.x > 0 ? 0 : Math.PI) + Math.sin(this._pathTime * 0.8) * 0.6,
                        0.03
                    );
                    break;

                case 'erratic':
                    // 海马：频繁变向的不稳定游动
                    this._wanderTimer -= dt;
                    if (this._wanderTimer <= 0) {
                        this._wanderTimer = Utils.random(0.3, 0.8);
                        this._wanderAngle = this.angle + Utils.random(-0.8, 0.8);
                    }
                    this.targetAngle = Utils.lerpAngle(this.targetAngle, this._wanderAngle, 0.08);
                    break;

                case 'random':
                default:
                    // 随机游走
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
                // 电鳗：周期性放电
                this._electricTimer = (this._electricTimer || 0) + dt;
                if (this._electricTimer > 2.5) {
                    this._electricTimer = 0;
                    this._electricPulse = 1.0;
                    // 放电粒子由外部粒子系统处理，这里设置状态
                }
                this._electricPulse = Math.max(0, (this._electricPulse || 0) - dt * 2);
                break;

            case 'invisible':
                // 幽灵鱼：周期性隐身
                this._invisibleTimer = (this._invisibleTimer || 0) + dt;
                const cycle = this._invisibleTimer % 4; // 4秒一个周期
                if (cycle < 1.5) {
                    // 可见阶段
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 1, 1, 0.1);
                } else if (cycle < 2) {
                    // 渐隐
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 1, 0.15, 0.1);
                } else if (cycle < 3.5) {
                    // 隐身阶段
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 0.15, 0.15, 0.1);
                } else {
                    // 渐显
                    this._invisibleAlpha = Utils.lerp(this._invisibleAlpha || 0.15, 1, 0.1);
                }
                break;

            case 'split':
                // 分裂鱼：脉动发光
                this._splitPulse = Math.sin(this._time * 3) * 0.3 + 0.7;
                break;
        }
    }

    _handleBoundaries(gameWidth, gameHeight) {
        const margin = this.size * 2;
        // 超出边界则转向
        if (this.x < -margin) {
            this.x = -margin;
            this.targetAngle = Utils.lerpAngle(this.targetAngle, 0, 0.1);
        }
        if (this.x > gameWidth + margin) {
            this.x = gameWidth + margin;
            this.targetAngle = Utils.lerpAngle(this.targetAngle, Math.PI, 0.1);
        }
        if (this.y < margin) {
            this.y = margin;
            this.targetAngle = Utils.lerpAngle(this.targetAngle, Math.PI / 2, 0.1);
        }
        if (this.y > gameHeight - margin * 2) {
            this.y = gameHeight - margin * 2;
            this.targetAngle = Utils.lerpAngle(this.targetAngle, -Math.PI / 2, 0.1);
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
        return false;
    }

    /**
     * 渲染鱼（骨骼动画 + 菲涅尔光影）
     */
    render(ctx) {
        if (!this._active) return;

        ctx.save();
        // 幽灵鱼隐身透明度
        const specialAlpha = this.config?.special === 'invisible' ? (this._invisibleAlpha || 1) : 1;
        ctx.globalAlpha = this._depthAlpha * specialAlpha * (this.state === 'dying' ? Math.max(0, 1 - this._deathTimer * 2) : 1);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.rotate(this._roll);
        ctx.scale(this._depthScale, this._depthScale * (1 + this._pitch));

        const cfg = this.config;
        const boneAnim = FishConfig.boneAnimation;
        const speedInfluence = 1 + (this.speed / this.baseSpeed - 1) * boneAnim.speedInfluence;

        // 发光效果（水母/灯笼鱼/特殊鱼）
        if (cfg.glow) {
            const glowColor = cfg.glowColor || cfg.lureColor || cfg.accentColor;
            let pulse = Math.sin(this._time * 3) * 0.2 + 0.8;
            // 电鳗放电脉冲
            if (cfg.special === 'electric' && this._electricPulse > 0) {
                pulse = this._electricPulse;
            }
            // 分裂鱼脉动
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

        // 计算骨骼段
        const segments = cfg.boneSegments;
        const segmentLength = this.size / segments;
        const bonePositions = [];

        // 头部位置
        let bx = 0, by = 0;
        let bAngle = 0;
        bonePositions.push({ x: bx, y: by, angle: bAngle, width: this.size * 0.4 });

        // 身体骨骼：正弦波叠加
        for (let i = 1; i < segments; i++) {
            const wave = Math.sin(this._time * boneAnim.bodyWaveFrequency * speedInfluence - i * 0.6) * boneAnim.bodyWaveAmplitude;
            bAngle += wave;
            bx -= Math.cos(bAngle) * segmentLength;
            by -= Math.sin(bAngle) * segmentLength;
            const width = this.size * 0.4 * (1 - i / segments * 0.6);
            bonePositions.push({ x: bx, y: by, angle: bAngle, width });
        }

        // 绘制鱼身（骨骼分段）
        this._renderBody(ctx, bonePositions, cfg);

        // 绘制背鳍
        this._renderDorsalFin(ctx, bonePositions, cfg, speedInfluence);

        // 绘制胸鳍
        this._renderPectoralFins(ctx, bonePositions, cfg, speedInfluence);

        // 绘制尾鳍
        this._renderTailFin(ctx, bonePositions, cfg, speedInfluence);

        // 绘制头部
        this._renderHead(ctx, bonePositions[0], cfg);

        // 受击闪烁
        if (this._hitFlash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = this._hitFlash * 0.5;
            for (const pos of bonePositions) {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pos.width * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _renderBody(ctx, bones, cfg) {
        // 菲涅尔光影：边缘亮，中心暗
        for (let i = 0; i < bones.length - 1; i++) {
            const curr = bones[i];
            const next = bones[i + 1];
            const t = i / bones.length;

            // 鱼身渐变
            const gradient = ctx.createLinearGradient(curr.x, -curr.width, curr.x, curr.width);
            gradient.addColorStop(0, Utils.rgba(cfg.accentColor, 0.9)); // 背部高光
            gradient.addColorStop(0.3, cfg.color);
            gradient.addColorStop(0.7, cfg.color);
            gradient.addColorStop(1, Utils.rgba(cfg.finColor, 0.8)); // 腹部

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

            // 菲涅尔边缘光
            ctx.strokeStyle = Utils.rgba(cfg.accentColor, 0.3 * (1 - t * 0.5));
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 鳞片纹理（大鱼）
        if (this.size > 50) {
            ctx.fillStyle = Utils.rgba(cfg.accentColor, 0.15);
            for (let i = 1; i < bones.length - 1; i += 2) {
                const pos = bones[i];
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - pos.width * 0.1, pos.width * 0.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _renderHead(ctx, head, cfg) {
        // 头部
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

    _renderTailFin(ctx, bones, cfg, speedInfluence) {
        const tail = bones[bones.length - 1];
        const tailAnim = FishConfig.boneAnimation;
        const swing = Math.sin(this._time * tailAnim.tailFrequency * speedInfluence) * tailAnim.tailAmplitude;

        ctx.save();
        ctx.translate(tail.x, tail.y);
        ctx.rotate(tail.angle + swing);

        // 尾鳍
        const gradient = ctx.createLinearGradient(0, -tail.width, 0, tail.width);
        gradient.addColorStop(0, Utils.rgba(cfg.accentColor, 0.8));
        gradient.addColorStop(0.5, cfg.finColor);
        gradient.addColorStop(1, Utils.rgba(cfg.accentColor, 0.8));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-tail.width * 0.8, -tail.width * 1.2, -tail.width * 1.2, -tail.width * 0.8);
        ctx.quadraticCurveTo(-tail.width * 0.6, 0, -tail.width * 1.2, tail.width * 0.8);
        ctx.quadraticCurveTo(-tail.width * 0.8, tail.width * 1.2, 0, 0);
        ctx.closePath();
        ctx.fill();

        // 尾鳍纹理
        ctx.strokeStyle = Utils.rgba(cfg.accentColor, 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-tail.width * 0.8, -tail.width * 0.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(-tail.width * 0.8, tail.width * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    _renderPectoralFins(ctx, bones, cfg, speedInfluence) {
        const finAnim = FishConfig.boneAnimation;
        const swing = Math.sin(this._time * finAnim.finFrequency * speedInfluence) * finAnim.finAmplitude;
        const head = bones[0];

        // 左右胸鳍
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(head.x - head.width * 0.1, side * head.width * 0.25);
            ctx.rotate(side * (Math.PI / 4 + swing));

            const gradient = ctx.createLinearGradient(0, 0, head.width * 0.5, 0);
            gradient.addColorStop(0, cfg.finColor);
            gradient.addColorStop(1, Utils.rgba(cfg.accentColor, 0.3));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(head.width * 0.25, 0, head.width * 0.3, head.width * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _renderDorsalFin(ctx, bones, cfg, speedInfluence) {
        if (bones.length < 3) return;
        const finAnim = FishConfig.boneAnimation;
        const wave = Math.sin(this._time * finAnim.finFrequency * speedInfluence * 0.5) * 0.1;

        ctx.fillStyle = Utils.rgba(cfg.finColor, 0.7);
        ctx.beginPath();
        ctx.moveTo(bones[1].x, -bones[1].width * 0.4);

        for (let i = 2; i < bones.length - 1; i++) {
            const pos = bones[i];
            const finHeight = pos.width * (0.3 + Math.sin(i * 0.8 + this._time) * 0.1 + wave);
            ctx.lineTo(pos.x, -pos.width * 0.4 - finHeight);
        }

        ctx.lineTo(bones[bones.length - 2].x, -bones[bones.length - 2].width * 0.35);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 获取碰撞半径
     */
    getCollisionRadius() {
        return this.size * this._depthScale * 0.5;
    }

    get isBoss() {
        return this.config?.isBoss || false;
    }

    get isAlive() {
        return this.state === 'alive';
    }
}
