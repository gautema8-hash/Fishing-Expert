/**
 * 炮弹类
 * 飞行、拖尾粒子、命中判定、暴击形态、锁定追踪
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class Bullet {
    constructor() {
        this.reset();
        this._pooled = true;
        this._active = false;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.level = 1;
        this.damage = 1;
        this.isCrit = false;
        this.isRage = false;
        this.skin = 'dragon';
        this.size = 8;
        this.state = 'flying'; // flying / exploding / dead
        this._active = false;
        this._trailTimer = 0;
        this._targetFish = null;
        this._life = 5; // 最大存活时间
        this._explosionTimer = 0;
        this._bounceCount = 0;          // 已反弹次数
        this._bouncePulse = 0;          // 反弹缩放脉冲（视觉效果）
        this._justBounced = false;      // 本帧是否刚反弹（供外部生成水花粒子）
    }

    init(config) {
        this.x = config.x;
        this.y = config.y;
        this.angle = config.angle;
        this.level = config.level;
        this.damage = config.damage;
        this.isCrit = config.isCrit || false;
        this.isRage = config.isRage || false;
        this.skin = config.skin || 'dragon';
        this.size = 6 + this.level * 0.5;
        this.state = 'flying';
        this._active = true;
        this._life = 5;
        this._trailTimer = 0;
        this._targetFish = config.targetFish || null;
        this._bounceCount = 0;
        this._bouncePulse = 0;
        this._justBounced = false;

        const speed = GameConfig.bullet.baseSpeed * (1 + (this.level - 1) * 0.03);
        this.vx = Math.cos(this.angle) * speed;
        this.vy = Math.sin(this.angle) * speed;
    }

    update(dt, gameWidth, gameHeight) {
        if (!this._active) return;

        if (this.state === 'exploding') {
            this._explosionTimer += dt;
            if (this._explosionTimer > 0.3) {
                this.state = 'dead';
                this._active = false;
            }
            return;
        }

        this._life -= dt;
        if (this._life <= 0) {
            this.state = 'dead';
            this._active = false;
            return;
        }

        // 锁定追踪
        if (this._targetFish && this._targetFish._active && this._targetFish.isAlive) {
            const targetAngle = Utils.angleBetween(this.x, this.y, this._targetFish.x, this._targetFish.y);
            this.angle = Utils.lerpAngle(this.angle, targetAngle, 0.1);
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            this.vx = Math.cos(this.angle) * speed;
            this.vy = Math.sin(this.angle) * speed;
        }

        // 移动
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 拖尾粒子
        this._trailTimer -= dt;
        if (this._trailTimer <= 0) {
            this._trailTimer = GameConfig.bullet.trailParticleInterval;
        }

        // 反弹脉冲衰减
        this._bouncePulse = Math.max(0, this._bouncePulse - dt * 5);

        // 边界反弹（出界不再直接销毁，而是反弹并衰减速度）
        const maxBounces = GameConfig.bullet.maxBounces || 3;
        const decay = GameConfig.bullet.bounceSpeedDecay || 0.9;
        const margin = this.size;
        let bounced = false;

        // 左边界
        if (this.x < margin) {
            this.x = margin;
            this.vx = Math.abs(this.vx) * decay;
            bounced = true;
        }
        // 右边界
        if (this.x > gameWidth - margin) {
            this.x = gameWidth - margin;
            this.vx = -Math.abs(this.vx) * decay;
            bounced = true;
        }
        // 上边界
        if (this.y < margin) {
            this.y = margin;
            this.vy = Math.abs(this.vy) * decay;
            bounced = true;
        }
        // 下边界
        if (this.y > gameHeight - margin) {
            this.y = gameHeight - margin;
            this.vy = -Math.abs(this.vy) * decay;
            bounced = true;
        }

        if (bounced) {
            this._onBounce();
            // 反弹后重新计算朝向（vx/vy 已改变）
            this.angle = Math.atan2(this.vy, this.vx);
            // 超过最大反弹次数则销毁
            if (this._bounceCount >= maxBounces) {
                this.state = 'dead';
                this._active = false;
            }
        }
    }

    /**
     * 反弹触发：计数、视觉脉冲、标记供外部生成水花
     */
    _onBounce() {
        this._bounceCount++;
        this._bouncePulse = 1;
        this._justBounced = true;
    }

    /**
     * 命中鱼
     */
    hit(fish) {
        this.state = 'exploding';
        this._explosionTimer = 0;
        this.x = fish.x;
        this.y = fish.y;
    }

    render(ctx) {
        if (!this._active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        // 反弹缩放脉冲
        if (this._bouncePulse > 0) {
            const pulseScale = 1 + this._bouncePulse * 0.3;
            ctx.scale(pulseScale, pulseScale);
        }

        const color = this.isCrit ? GameConfig.bullet.critColor :
                      this.isRage ? '#FF6B35' : GameConfig.bullet.normalColor;

        if (this.state === 'exploding') {
            // 爆炸效果
            const progress = this._explosionTimer / 0.3;
            ctx.globalCompositeOperation = 'lighter';
            const explosionRadius = this.size * (1 + progress * 4);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, explosionRadius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${1 - progress})`);
            gradient.addColorStop(0.3, `rgba(255, 215, 0, ${0.8 - progress * 0.8})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, explosionRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        // 炮弹主体
        ctx.globalCompositeOperation = 'lighter';

        // 外发光
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2.5);
        glowGradient.addColorStop(0, color);
        glowGradient.addColorStop(0.5, Utils.rgba(color, 0.5));
        glowGradient.addColorStop(1, Utils.rgba(color, 0));
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 核心
        const coreGradient = ctx.createRadialGradient(-this.size * 0.2, -this.size * 0.2, 0, 0, 0, this.size);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.4, color);
        coreGradient.addColorStop(1, Utils.rgba(color, 0.6));
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // 暴击炮弹：烈焰质感
        if (this.isCrit) {
            ctx.fillStyle = 'rgba(255, 107, 53, 0.6)';
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 + Date.now() * 0.01;
                const fx = Math.cos(angle) * this.size * 1.5;
                const fy = Math.sin(angle) * this.size * 1.5;
                ctx.beginPath();
                ctx.arc(fx, fy, this.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 电光拖尾（在炮弹后方）
        ctx.globalCompositeOperation = 'lighter';
        const trailGradient = ctx.createLinearGradient(-this.size * 4, 0, 0, 0);
        trailGradient.addColorStop(0, Utils.rgba(color, 0));
        trailGradient.addColorStop(0.5, Utils.rgba(color, 0.4));
        trailGradient.addColorStop(1, color);
        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.ellipse(-this.size * 2, 0, this.size * 2, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 电火花
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            const sx = -this.size * (1 + Math.random());
            const sy = (Math.random() - 0.5) * this.size;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - this.size * 0.5, sy + (Math.random() - 0.5) * this.size);
            ctx.lineTo(sx - this.size, sy + (Math.random() - 0.5) * this.size * 1.5);
            ctx.stroke();
        }

        ctx.restore();
    }

    getTrailParticle() {
        if (this._trailTimer > 0) return null;
        return {
            x: this.x - Math.cos(this.angle) * this.size,
            y: this.y - Math.sin(this.angle) * this.size,
            color: this.isCrit ? '#FF6B35' : '#36E0E8',
            size: this.size * 0.6,
            type: 'trail'
        };
    }
}

/**
 * 炮弹管理器
 * 性能优化：Bullet 对象池复用，避免频繁 new/GC
 */
export class BulletManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.bullets = [];
        this._maxBullets = GameConfig.bullet.maxBullets;
        // Bullet 对象池
        this._bulletPool = [];
        this._maxPoolSize = 80;
    }

    fire(config) {
        if (this.bullets.length >= this._maxBullets) {
            // 移除最老的炮弹（释放回池）
            const old = this.bullets.shift();
            this._releaseBullet(old);
        }
        const bullet = this._acquireBullet();
        bullet.init(config);
        this.bullets.push(bullet);
        return bullet;
    }

    /**
     * 从对象池获取 Bullet
     */
    _acquireBullet() {
        let b = this._bulletPool.pop();
        if (!b) {
            b = new Bullet();
        }
        return b;
    }

    /**
     * 释放 Bullet 回对象池
     */
    _releaseBullet(b) {
        if (!b) return;
        b.reset();
        if (this._bulletPool.length < this._maxPoolSize) {
            this._bulletPool.push(b);
        }
    }

    update(dt, gameWidth, gameHeight) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt, gameWidth, gameHeight);
            // 反弹标记供外部（Game/粒子系统）检测后重置
            if (bullet._justBounced) {
                bullet._justBounced = false;
            }
            if (!bullet._active) {
                this.bullets.splice(i, 1);
                this._releaseBullet(bullet);
            }
        }
    }

    render(ctx) {
        for (const bullet of this.bullets) {
            bullet.render(ctx);
        }
    }

    clear() {
        // 释放所有炮弹回对象池
        for (const b of this.bullets) {
            this._releaseBullet(b);
        }
        this.bullets = [];
    }

    get count() {
        return this.bullets.length;
    }

    getActiveBullets() {
        return this.bullets.filter(b => b._active && b.state === 'flying');
    }
}
