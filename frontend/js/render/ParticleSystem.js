/**
 * 粒子系统
 * 水墨爆炸、金粉、金珠、流光拖尾、珍珠气泡等粒子效果
 * v2 升级：
 *  - 软粒子：所有粒子使用径向渐变，中心实、边缘透明，消除硬边
 *  - 粒子光照：非自发光粒子顶部亮、底部暗（方向光来自水面），自发光粒子不受影响
 *  - 新增 4 种粒子：scaleSpark(鱼鳞闪光) / waterFlow(水流微光) / gillBubble(鱼鳃气泡) / hitFlash(受击白闪)
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class Particle {
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
        this.life = 0;
        this.maxLife = 1;
        this.size = 4;
        this.sizeSpeed = 0;
        this.color = '#FFFFFF';
        this.alpha = 1;
        this.gravity = 0;
        this.friction = 0.98;
        this.blendMode = 'lighter';
        this.type = 'normal';
        this.rotation = 0;
        this.rotationSpeed = 0;
        // v2：自发光标志（true 时不受顶部方向光影响，保持自发光；gold/coin/flame 为 true）
        this.isEmissive = false;
        // v2：左右摇摆（鱼鳃气泡等上升气泡用），0 为不摇摆
        this.swayAmplitude = 0;
        this.swayFrequency = 0;
        this._swayT = 0;
        this._active = false;
    }

    init(config) {
        Object.assign(this, config);
        this.life = this.maxLife;
        this._active = true;
    }

    update(dt) {
        if (!this._active) return;

        this.life -= dt;
        if (this.life <= 0) {
            this._active = false;
            return;
        }

        // 物理更新
        this.vy += this.gravity * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 鱼鳃气泡：左右摇摆上升
        if (this.swayAmplitude > 0) {
            this._swayT += dt;
            this.x += Math.sin(this._swayT * this.swayFrequency) * this.swayAmplitude * dt;
        }

        this.size += this.sizeSpeed * dt;
        this.rotation += this.rotationSpeed * dt;

        // 透明度随生命周期衰减
        const lifeRatio = this.life / this.maxLife;
        this.alpha = lifeRatio;
    }

    /**
     * 颜色按亮度系数微调（用于粒子顶部光照）
     */
    _shade(hex, factor) {
        const c = Utils.hexToRgb(hex);
        const r = Math.min(255, Math.round(c.r * factor));
        const g = Math.min(255, Math.round(c.g * factor));
        const b = Math.min(255, Math.round(c.b * factor));
        return `rgb(${r}, ${g}, ${b})`;
    }

    render(ctx) {
        if (!this._active || this.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.globalCompositeOperation = this.blendMode;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        switch (this.type) {
            case 'ink':
                this._renderInk(ctx);
                break;
            case 'gold':
                this._renderGold(ctx);
                break;
            case 'coin':
                this._renderCoin(ctx);
                break;
            case 'trail':
                this._renderTrail(ctx);
                break;
            case 'bubble':
                this._renderBubble(ctx);
                break;
            case 'flame':
                this._renderFlame(ctx);
                break;
            case 'spark':
                this._renderSpark(ctx);
                break;
            case 'scaleSpark':
                this._renderScaleSpark(ctx);
                break;
            case 'waterFlow':
                this._renderWaterFlow(ctx);
                break;
            case 'gillBubble':
                this._renderGillBubble(ctx);
                break;
            case 'hitFlash':
                this._renderHitFlash(ctx);
                break;
            default:
                this._renderDefault(ctx);
        }

        ctx.restore();
    }

    /**
     * 默认软粒子：径向渐变，中心实边缘透明
     * 非自发光粒子受顶部方向光影响：亮点上移、顶部提亮、底部压暗
     * （环境光 0.3 + 漫反射 0.7：顶部亮度 1.0，底部亮度 ~0.45）
     */
    _litHotY() { return this.isEmissive ? 0 : -this.size * 0.3; }

    _renderDefault(ctx) {
        const hotY = this._litHotY();
        const gradient = ctx.createRadialGradient(0, hotY, 0, 0, 0, this.size);
        gradient.addColorStop(0, this.isEmissive ? this.color : this._shade(this.color, this._litShadeTop()));
        gradient.addColorStop(0.6, this.isEmissive ? this.color : this._shade(this.color, 0.75));
        gradient.addColorStop(1, Utils.rgba(this.color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderInk(ctx) {
        // 水墨粒子：不规则墨滴（软边径向渐变，消除硬边）
        const inkGrad = ctx.createRadialGradient(0, -this.size * 0.2, 0, 0, 0, this.size);
        inkGrad.addColorStop(0, `rgba(10, 10, 26, ${this.alpha * 0.8})`);
        inkGrad.addColorStop(0.7, `rgba(10, 10, 26, ${this.alpha * 0.5})`);
        inkGrad.addColorStop(1, 'rgba(10, 10, 26, 0)');
        ctx.fillStyle = inkGrad;
        ctx.beginPath();
        const points = 6;
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const r = this.size * (0.7 + Math.sin(angle * 3 + this.life * 10) * 0.3);
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    _renderGold(ctx) {
        // 金粉粒子：发光金色圆点（自发光，不受光照影响）
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, '#FFD700');
        gradient.addColorStop(1, Utils.rgba('#FFD700', 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderCoin(ctx) {
        // 金珠：旋转的金币（自发光）
        const scaleX = Math.cos(this.life * 8);
        ctx.scale(scaleX, 1);
        const gradient = ctx.createRadialGradient(-this.size * 0.3, -this.size * 0.3, 0, 0, 0, this.size);
        gradient.addColorStop(0, '#FFF8DC');
        gradient.addColorStop(0.5, '#FFD700');
        gradient.addColorStop(1, '#B8860B');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _renderTrail(ctx) {
        // 流光拖尾：拉长的光带（顶部受光，上部更亮）
        const topC = this.isEmissive ? this.color : this._shade(this.color, 1.0);
        const botC = this.isEmissive ? this.color : this._shade(this.color, 0.5);
        const gradient = ctx.createLinearGradient(-this.size * 2, 0, this.size, 0);
        gradient.addColorStop(0, Utils.rgba(this.color, 0));
        gradient.addColorStop(0.5, topC);
        gradient.addColorStop(1, botC);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 2, this.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderBubble(ctx) {
        // 珍珠气泡：半透明发光球体
        const gradient = ctx.createRadialGradient(-this.size * 0.3, -this.size * 0.3, 0, 0, 0, this.size);
        gradient.addColorStop(0, Utils.rgba('#FFFFFF', 0.8));
        gradient.addColorStop(0.5, Utils.rgba('#36E0E8', 0.2));
        gradient.addColorStop(1, Utils.rgba('#36E0E8', 0.05));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        // 高光
        ctx.fillStyle = Utils.rgba('#FFFFFF', 0.6);
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderFlame(ctx) {
        // 暴击烈焰：红金色火焰（自发光）
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.2, '#FFD700');
        gradient.addColorStop(0.5, '#FF6B35');
        gradient.addColorStop(1, Utils.rgba('#FF4500', 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderSpark(ctx) {
        // 电火花：十字星芒
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.moveTo(0, -this.size);
        ctx.lineTo(0, this.size);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 鱼鳞闪光：鱼游动时偶尔闪烁的小亮点（自发光白/金）
     */
    _renderScaleSpark(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.4, this.color);
        gradient.addColorStop(1, Utils.rgba(this.color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 水流粒子：背景层缓慢漂浮的微光颗粒（淡蓝，受顶光影响）
     */
    _renderWaterFlow(ctx) {
        const gradient = ctx.createRadialGradient(0, -this.size * 0.3, 0, 0, 0, this.size);
        gradient.addColorStop(0, this._shade(this.color, 1.0));
        gradient.addColorStop(1, Utils.rgba(this.color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 鱼鳃气泡：鱼呼吸时吐出的小气泡，半透明、上升摇摆
     */
    _renderGillBubble(ctx) {
        const gradient = ctx.createRadialGradient(-this.size * 0.3, -this.size * 0.3, 0, 0, 0, this.size);
        gradient.addColorStop(0, Utils.rgba('#FFFFFF', 0.5));
        gradient.addColorStop(0.6, Utils.rgba('#BEE8FF', 0.18));
        gradient.addColorStop(1, Utils.rgba('#BEE8FF', 0.02));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 受击白闪：命中时纯白径向闪光，快速放大消失（自发光）
     */
    _renderHitFlash(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class ParticleSystem {
    constructor(maxParticles = 800) {
        this._particles = [];
        this._maxParticles = maxParticles;
        this._bubbleTimer = 0;
        // v2：水流粒子生成计时
        this._waterFlowTimer = 0;
    }

    /**
     * 爆发式发射粒子
     */
    burst(x, y, config) {
        const count = config.count || 10;
        for (let i = 0; i < count; i++) {
            if (this._particles.length >= this._maxParticles) break;

            const angle = config.angle !== undefined
                ? config.angle + Utils.random(-config.spread || Math.PI, config.spread || Math.PI)
                : Utils.random(0, Math.PI * 2);
            const speed = Utils.random(config.speedMin || 50, config.speedMax || 200);

            const type = config.type || 'normal';
            const p = new Particle();
            p.init({
                x: x + Utils.random(-5, 5),
                y: y + Utils.random(-5, 5),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                maxLife: Utils.random(config.lifeMin || 0.5, config.lifeMax || 1.5),
                size: Utils.random(config.sizeMin || 2, config.sizeMax || 6),
                sizeSpeed: config.sizeSpeed || -2,
                color: config.color || '#FFD700',
                gravity: config.gravity || 0,
                friction: config.friction || 0.95,
                blendMode: config.blendMode || 'lighter',
                type,
                // gold / coin / flame 类为自发光粒子，不受顶光影响
                isEmissive: config.isEmissive === true || ['gold', 'coin', 'flame'].includes(type),
                rotationSpeed: Utils.random(-3, 3)
            });
            this._particles.push(p);
        }
    }

    /**
     * 拖尾粒子（size 5-15px 软粒子）
     */
    trail(x, y, config) {
        if (this._particles.length >= this._maxParticles) return;
        const p = new Particle();
        p.init({
            x, y,
            vx: Utils.random(-10, 10),
            vy: Utils.random(-10, 10),
            maxLife: config.life || 0.3,
            size: Utils.random(config.size || 5, (config.size || 5) + 10),
            sizeSpeed: -8,
            color: config.color || '#36E0E8',
            friction: 0.9,
            blendMode: 'lighter',
            type: config.type || 'trail',
            isEmissive: config.isEmissive === true
        });
        this._particles.push(p);
    }

    /**
     * 水墨爆炸特效
     */
    inkExplosion(x, y, intensity = 1) {
        // 水墨扩散
        this.burst(x, y, {
            count: Math.floor(15 * intensity),
            type: 'ink',
            speedMin: 30,
            speedMax: 120 * intensity,
            lifeMin: 0.8,
            lifeMax: 2,
            sizeMin: 8,
            sizeMax: 20 * intensity,
            sizeSpeed: 10,
            gravity: 20,
            friction: 0.92,
            blendMode: 'source-over'
        });
        // 金粉四散
        this.burst(x, y, {
            count: Math.floor(20 * intensity),
            type: 'gold',
            speedMin: 50,
            speedMax: 250 * intensity,
            lifeMin: 0.5,
            lifeMax: 1.2,
            sizeMin: 2,
            sizeMax: 5,
            gravity: 100,
            friction: 0.96
        });
    }

    /**
     * 暴击爆炸特效（爆炸粒子放大到 20-50px）
     */
    critExplosion(x, y) {
        // 金色龙焰冲击波（爆炸粒子 20-50px）
        this.burst(x, y, {
            count: 40,
            type: 'flame',
            speedMin: 100,
            speedMax: 400,
            lifeMin: 0.6,
            lifeMax: 1.5,
            sizeMin: 10,
            sizeMax: 25,
            gravity: -50,
            friction: 0.94
        });
        // 金色火花
        this.burst(x, y, {
            count: 30,
            type: 'spark',
            color: '#FFD700',
            speedMin: 80,
            speedMax: 350,
            lifeMin: 0.3,
            lifeMax: 0.8,
            sizeMin: 3,
            sizeMax: 8,
            gravity: 50
        });
        this.inkExplosion(x, y, 2);
    }

    /**
     * 生成珍珠气泡
     */
    spawnBubble(canvasWidth, canvasHeight) {
        if (this._particles.length >= this._maxParticles) return;
        const p = new Particle();
        p.init({
            x: Utils.random(0, canvasWidth),
            y: canvasHeight + 20,
            vx: Utils.random(-15, 15),
            vy: Utils.random(-40, -80),
            maxLife: Utils.random(4, 8),
            size: Utils.random(4, 12),
            sizeSpeed: 0.5,
            color: '#36E0E8',
            friction: 0.99,
            blendMode: 'lighter',
            type: 'bubble'
        });
        this._particles.push(p);
    }

    /**
     * v2：鱼鳞闪光（鱼游动时偶尔闪烁的小亮点，白色/金色）
     */
    emitScaleSpark(x, y, color = '#FFFFFF') {
        if (this._particles.length >= this._maxParticles) return;
        const p = new Particle();
        p.init({
            x: x + Utils.random(-3, 3),
            y: y + Utils.random(-3, 3),
            vx: Utils.random(-20, 20),
            vy: Utils.random(-30, -5),
            maxLife: Utils.random(0.3, 0.5),
            size: Utils.random(2, 4),
            sizeSpeed: -6,
            color,
            gravity: 0,
            friction: 0.95,
            blendMode: 'lighter',
            type: 'scaleSpark',
            isEmissive: true
        });
        this._particles.push(p);
    }

    /**
     * v2：水流粒子（背景层缓慢漂浮的微光颗粒，淡蓝色）
     */
    emitWaterFlow(canvasWidth, canvasHeight) {
        if (this._particles.length >= this._maxParticles) return;
        const p = new Particle();
        p.init({
            x: Utils.random(0, canvasWidth),
            y: canvasHeight + Utils.random(0, 50),
            vx: Utils.random(-8, 8),
            vy: Utils.random(-15, -5),
            maxLife: Utils.random(5, 10),
            size: Utils.random(1, 3),
            sizeSpeed: 0,
            color: '#88CCFF',
            gravity: 0,
            friction: 0.995,
            blendMode: 'lighter',
            type: 'waterFlow',
            isEmissive: false
        });
        this._particles.push(p);
    }

    /**
     * v2：鱼鳃气泡（鱼呼吸时吐出的小气泡，上升左右摇摆）
     */
    emitGillBubble(x, y) {
        if (this._particles.length >= this._maxParticles) return;
        const p = new Particle();
        p.init({
            x: x + Utils.random(-4, 4),
            y: y + Utils.random(-4, 4),
            vx: Utils.random(-10, 10),
            vy: Utils.random(-30, -60),
            maxLife: Utils.random(1.5, 3),
            size: Utils.random(3, 8),
            sizeSpeed: 0.5,
            color: '#BEE8FF',
            gravity: -5, // 微上浮
            friction: 0.99,
            swayAmplitude: 20,
            swayFrequency: Utils.random(2, 4),
            blendMode: 'lighter',
            type: 'gillBubble',
            isEmissive: false
        });
        this._particles.push(p);
    }

    /**
     * v2：受击白闪（命中时白色闪光，快速放大消失）
     */
    emitHitFlash(x, y) {
        if (this._particles.length >= this._maxParticles) return;
        const p = new Particle();
        p.init({
            x, y,
            vx: 0,
            vy: 0,
            maxLife: Utils.random(0.15, 0.3),
            size: Utils.random(15, 30),
            sizeSpeed: 120, // 快速放大
            color: '#FFFFFF',
            gravity: 0,
            friction: 1,
            blendMode: 'lighter',
            type: 'hitFlash',
            isEmissive: true
        });
        this._particles.push(p);
    }

    update(dt, canvasWidth, canvasHeight) {
        // 气泡生成
        this._bubbleTimer += dt;
        if (this._bubbleTimer >= GameConfig.particles.bubbleSpawnInterval) {
            this._bubbleTimer = 0;
            if (this._countByType('bubble') < GameConfig.particles.bubbleMaxCount) {
                this.spawnBubble(canvasWidth, canvasHeight);
            }
        }

        // v2：水流微光粒子定时生成（数量受控，不挤占对象池）
        this._waterFlowTimer += dt;
        if (this._waterFlowTimer >= 0.15) {
            this._waterFlowTimer = 0;
            if (this._countByType('waterFlow') < 60) {
                this.emitWaterFlow(canvasWidth, canvasHeight);
            }
        }

        // 更新所有粒子
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.update(dt);
            if (!p._active) {
                this._particles.splice(i, 1);
            }
        }
    }

    _countByType(type) {
        let count = 0;
        for (const p of this._particles) {
            if (p.type === type && p._active) count++;
        }
        return count;
    }

    render(ctx) {
        for (const p of this._particles) {
            p.render(ctx);
        }
    }

    clear() {
        this._particles = [];
    }

    get count() {
        return this._particles.length;
    }

    setMaxParticles(max) {
        this._maxParticles = max;
    }
}
