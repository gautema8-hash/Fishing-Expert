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
        // 倍率分级
        this.tier = null;               // 当前 tier 配置对象（含 color/name/trailLength/particleSize）
        this.tierIndex = 0;             // 0..4（对应 1..5 级）
        this._trailInterval = GameConfig.bullet.trailParticleInterval;
    }

    /**
     * 根据倍率(level)解析炮弹分级
     * 返回 { index(0..4), tier(1..5), name, color, trailLength, particleSize }
     */
    _resolveTier(level) {
        const tiers = GameConfig.bullet.tiers;
        for (let i = 0; i < tiers.length; i++) {
            if (level >= tiers[i].min && level < tiers[i].max) {
                return { ...tiers[i], index: i, tier: i + 1 };
            }
        }
        const last = tiers[tiers.length - 1];
        return { ...last, index: tiers.length - 1, tier: tiers.length };
    }

    /**
     * 神级炮弹的动态彩虹色（hsl 字符串）
     */
    _rainbowColor() {
        const hue = (Date.now() * 0.08) % 360;
        return `hsl(${hue.toFixed(0)}, 100%, 65%)`;
    }

    /**
     * 颜色叠加透明度（兼容 hex 与 hsl 字符串）
     */
    _rgba(color, alpha) {
        if (typeof color === 'string' && color[0] === '#') {
            return Utils.rgba(color, alpha);
        }
        // hsl(...) -> hsla(..., alpha)
        if (typeof color === 'string' && color.indexOf('hsl(') === 0) {
            return color.replace('hsl(', 'hsla(').slice(0, -1) + `, ${alpha})`;
        }
        return color;
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
        // 炮弹尺寸随倍率增大：size = base + level/200，上限 bulletSizeMax
        const sizeBase = GameConfig.bullet.bulletSizeBase ?? 6;
        const sizePerLevel = GameConfig.bullet.bulletSizePerLevel ?? (1 / 200);
        const sizeMax = GameConfig.bullet.bulletSizeMax ?? 80;
        this.size = Math.min(sizeMax, sizeBase + this.level * sizePerLevel);
        // 解析分级
        this.tier = this._resolveTier(this.level);
        this.tierIndex = this.tier.index;
        // 拖尾粒子间隔：tier>=4（传说及以上，index>=3）频率翻倍
        this._trailInterval = GameConfig.bullet.trailParticleInterval * (this.tierIndex >= 3 ? 0.5 : 1);
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

        // 拖尾粒子计时（实际生成在 getTrailParticle 中，到期后由其重置间隔）
        this._trailTimer -= dt;

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

        // 主色：由 tier 决定；神级为动态彩虹
        const tier = this.tier;
        const isRainbow = tier.color === 'rainbow';
        const mainColor = isRainbow ? this._rainbowColor() : tier.color;

        if (this.state === 'exploding') {
            // 爆炸效果
            const progress = this._explosionTimer / 0.3;
            ctx.globalCompositeOperation = 'lighter';
            // 爆炸半径随 tier 放大：tier3×1.5, tier4×2, tier5×3
            let radiusMult = 1;
            if (this.tierIndex >= 4) radiusMult = 3;
            else if (this.tierIndex >= 3) radiusMult = 2;
            else if (this.tierIndex >= 2) radiusMult = 1.5;
            const explosionRadius = this.size * (1 + progress * 4) * radiusMult;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, explosionRadius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${1 - progress})`);
            gradient.addColorStop(0.3, this._rgba(mainColor, 0.8 - progress * 0.8));
            gradient.addColorStop(1, this._rgba(mainColor, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, explosionRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        // 炮弹主体
        ctx.globalCompositeOperation = 'lighter';

        // 外发光（半径随 tier 增大）
        const glowR = this.size * (2.0 + this.tierIndex * 0.4);
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
        glowGradient.addColorStop(0, mainColor);
        glowGradient.addColorStop(0.5, this._rgba(mainColor, 0.5));
        glowGradient.addColorStop(1, this._rgba(mainColor, 0));
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();

        // 核心（神级使用彩虹渐变）
        let coreGradient;
        if (isRainbow) {
            coreGradient = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
            const t = (Date.now() * 0.002) % 1;
            const c1 = `hsl(${(t * 360) % 360}, 100%, 70%)`;
            const c2 = `hsl(${(t * 360 + 120) % 360}, 100%, 60%)`;
            const c3 = `hsl(${(t * 360 + 240) % 360}, 100%, 55%)`;
            coreGradient.addColorStop(0, '#FFFFFF');
            coreGradient.addColorStop(0.4, c1);
            coreGradient.addColorStop(0.7, c2);
            coreGradient.addColorStop(1, c3);
        } else {
            coreGradient = ctx.createRadialGradient(-this.size * 0.2, -this.size * 0.2, 0, 0, 0, this.size);
            coreGradient.addColorStop(0, '#FFFFFF');
            coreGradient.addColorStop(0.4, mainColor);
            coreGradient.addColorStop(1, this._rgba(mainColor, 0.6));
        }
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // 狂暴：红色光晕叠加在 tier 色之上
        if (this.isRage) {
            ctx.fillStyle = 'rgba(255, 80, 40, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 暴击：环绕火球（保留原视觉）
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

        // 拖尾（长度/宽度随 tier）
        const trailLen = this.size * tier.trailLength;
        const trailW = this.size * (0.35 + this.tierIndex * 0.08);
        const trailGradient = ctx.createLinearGradient(-trailLen, 0, 0, 0);
        trailGradient.addColorStop(0, this._rgba(mainColor, 0));
        trailGradient.addColorStop(0.5, this._rgba(mainColor, 0.4));
        trailGradient.addColorStop(1, mainColor);
        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.ellipse(-trailLen / 2, 0, trailLen / 2, trailW, 0, 0, Math.PI * 2);
        ctx.fill();

        // 电火花（基础，所有 tier 都有）
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

        // tier>=2（强化及以上）：电光粒子（随机闪烁小电弧）
        if (this.tierIndex >= 1) {
            ctx.strokeStyle = 'rgba(255, 255, 200, 0.85)';
            ctx.lineWidth = 1.2;
            const arcs = this.tierIndex >= 3 ? 4 : 2;
            for (let i = 0; i < arcs; i++) {
                const ex = (Math.random() - 0.5) * this.size * 2;
                const ey = (Math.random() - 0.5) * this.size * 2;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex + (Math.random() - 0.5) * this.size * 0.8, ey + (Math.random() - 0.5) * this.size * 0.8);
                ctx.lineTo(ex + (Math.random() - 0.5) * this.size * 1.5, ey + (Math.random() - 0.5) * this.size * 1.5);
                ctx.stroke();
            }
        }

        // tier>=3（烈焰及以上）：火焰粒子（橙红随机光点）
        if (this.tierIndex >= 2) {
            const flameCount = this.tierIndex >= 4 ? 6 : 4;
            for (let i = 0; i < flameCount; i++) {
                const fx = (Math.random() - 0.5) * this.size * 2.5;
                const fy = (Math.random() - 0.5) * this.size * 2.5;
                const fr = this.size * (0.15 + Math.random() * 0.2);
                ctx.fillStyle = `rgba(255, ${(120 + Math.random() * 80) | 0}, 40, ${0.5 + Math.random() * 0.4})`;
                ctx.beginPath();
                ctx.arc(fx, fy, fr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // tier>=4（传说及以上）：环绕光效（双向旋转光环）
        if (this.tierIndex >= 3) {
            const ringAngle = Date.now() * 0.005;
            const ringR = this.size * 1.8;
            ctx.strokeStyle = this._rgba(mainColor, 0.6);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, ringR, ringAngle, ringAngle + Math.PI * 1.4);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, ringR * 1.25, -ringAngle * 1.3, -ringAngle * 1.3 + Math.PI * 1.2);
            ctx.stroke();
        }

        // tier>=5（神级）：龙纹光效（多重彩虹光环）
        if (this.tierIndex >= 4) {
            const t = (Date.now() * 0.003) % 1;
            const now = Date.now() * 0.001;
            for (let r = 0; r < 3; r++) {
                const ringR = this.size * (2.2 + r * 0.5);
                const hue = ((t * 360 + r * 120) % 360).toFixed(0);
                ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.5)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, ringR, now * (1 + r * 0.3), now * (1 + r * 0.3) + Math.PI * (1 + r * 0.3));
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    getTrailParticle() {
        if (this._trailTimer > 0) return null;
        // 对象池复用时 reset() 会把 tier 置空，此时炮弹已不活跃，直接跳过
        if (!this.tier) return null;
        // 到期：生成一个拖尾粒子并重置间隔
        this._trailTimer = this._trailInterval;
        const color = this.tier.color === 'rainbow'
            ? this._rainbowColor()
            : this.tier.color;
        return {
            x: this.x - Math.cos(this.angle) * this.size,
            y: this.y - Math.sin(this.angle) * this.size,
            color: color,
            size: this.size * this.tier.particleSize,
            type: this.tierIndex >= 2 ? 'fire' : 'trail'
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
