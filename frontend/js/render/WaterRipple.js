/**
 * 水波纹特效
 * 炮弹入水/命中时产生环形扩散水波纹，伴随水体扭曲
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class WaterRipple {
    constructor() {
        this.reset();
        this._pooled = true;
        this._active = false;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.maxRadius = 80;
        this.expandSpeed = 200;
        this.ringCount = 3;
        this.alpha = 1;
        this.intensity = 1;
        this.color = '#36E0E8';
        this._active = false;
        this._startTime = 0;
    }

    init(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = config.maxRadius || GameConfig.waterRipple.baseMaxRadius;
        this.expandSpeed = config.expandSpeed || GameConfig.waterRipple.baseExpandSpeed;
        this.ringCount = config.ringCount || GameConfig.waterRipple.baseRingCount;
        this.intensity = config.intensity || 1;
        this.color = config.color || '#36E0E8';
        this.alpha = 1;
        this._active = true;
    }

    update(dt) {
        if (!this._active) return;

        this.radius += this.expandSpeed * dt;
        const progress = this.radius / this.maxRadius;
        this.alpha = Math.max(0, 1 - progress);

        if (this.radius >= this.maxRadius) {
            this._active = false;
        }
    }

    render(ctx) {
        if (!this._active || this.alpha <= 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.ringCount; i++) {
            const ringRadius = this.radius - i * (this.radius * 0.15);
            if (ringRadius <= 0) continue;

            const ringAlpha = this.alpha * (1 - i * 0.25);
            const lineWidth = (3 - i * 0.8) * this.intensity;

            // 主波纹环
            ctx.strokeStyle = Utils.rgba(this.color, ringAlpha * 0.6);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();

            // 内发光环
            const gradient = ctx.createRadialGradient(
                this.x, this.y, ringRadius * 0.8,
                this.x, this.y, ringRadius
            );
            gradient.addColorStop(0, Utils.rgba(this.color, 0));
            gradient.addColorStop(0.7, Utils.rgba(this.color, ringAlpha * 0.15));
            gradient.addColorStop(1, Utils.rgba(this.color, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 中心光点
        if (this.radius < this.maxRadius * 0.3) {
            const centerAlpha = this.alpha * 2;
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 20);
            gradient.addColorStop(0, Utils.rgba('#FFFFFF', centerAlpha * 0.8));
            gradient.addColorStop(0.5, Utils.rgba(this.color, centerAlpha * 0.4));
            gradient.addColorStop(1, Utils.rgba(this.color, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export class WaterRippleManager {
    constructor() {
        this._ripples = [];
        this._maxRipples = 30;
    }

    /**
     * 创建水波纹
     */
    create(x, y, config = {}) {
        if (this._ripples.length >= this._maxRipples) {
            // 移除最老的
            this._ripples.shift();
        }
        const ripple = new WaterRipple();
        ripple.init(x, y, config);
        this._ripples.push(ripple);
    }

    /**
     * 炮弹入水波纹
     */
    bulletSplash(x, y, bulletLevel = 1) {
        // 倍率越高波纹越大，但线性放大会让高倍率(15000)产生巨型波纹且几分钟不消散，
        // 因此用对数级增长并封顶 intensity ≤ 4
        const intensity = Math.min(4, 1 + bulletLevel / 2000);
        this.create(x, y, {
            maxRadius: GameConfig.waterRipple.baseMaxRadius * intensity,
            ringCount: GameConfig.waterRipple.baseRingCount,
            intensity
        });
    }

    /**
     * 命中鱼体波纹
     */
    fishHit(x, y, fishSize = 30) {
        const intensity = GameConfig.waterRipple.hitMultiplier * (fishSize / 40);
        this.create(x, y, {
            maxRadius: GameConfig.waterRipple.baseMaxRadius * intensity,
            ringCount: Math.floor(GameConfig.waterRipple.baseRingCount * intensity),
            intensity,
            color: '#FFD700'
        });
    }

    /**
     * 大鱼/BOSS 击杀波纹
     */
    bigKill(x, y, isBoss = false) {
        const multiplier = isBoss ? GameConfig.waterRipple.bossMultiplier : GameConfig.waterRipple.bigFishMultiplier;
        this.create(x, y, {
            maxRadius: GameConfig.waterRipple.baseMaxRadius * multiplier,
            ringCount: Math.floor(GameConfig.waterRipple.baseRingCount * multiplier),
            intensity: multiplier,
            color: isBoss ? '#FFD700' : '#36E0E8'
        });
        // 第二圈延迟波纹
        setTimeout(() => {
            this.create(x, y, {
                maxRadius: GameConfig.waterRipple.baseMaxRadius * multiplier * 1.3,
                ringCount: 2,
                intensity: multiplier * 0.5
            });
        }, 150);
    }

    /**
     * 暴击波纹
     */
    critHit(x, y) {
        const multiplier = GameConfig.waterRipple.critMultiplier;
        this.create(x, y, {
            maxRadius: GameConfig.waterRipple.baseMaxRadius * multiplier,
            ringCount: 5,
            intensity: multiplier,
            color: '#FF6B35'
        });
    }

    update(dt) {
        for (let i = this._ripples.length - 1; i >= 0; i--) {
            this._ripples[i].update(dt);
            if (!this._ripples[i]._active) {
                this._ripples.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const ripple of this._ripples) {
            ripple.render(ctx);
        }
    }

    clear() {
        this._ripples = [];
    }

    get count() {
        return this._ripples.length;
    }
}
