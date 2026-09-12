/**
 * 金币类
 * 物理吸附逻辑：击杀掉落 → 爆炸扩散 → 延迟吸附 → 弧线飞行 → 到达消散
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class Coin {
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
        this.value = 1;
        this.state = 'explode'; // explode / attract / collected
        this._active = false;
        this._attractTimer = 0;
        this._attractDelay = GameConfig.economy.coinAttractDelay;
        this._targetX = 0;
        this._targetY = 0;
        this._size = 8;
        this._rotation = 0;
        this._rotationSpeed = 0;
        this._life = 0;
        this._maxLife = 3;
        this._trailTimer = 0;
        this._arcOffset = 0;
    }

    init(x, y, value, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.state = 'explode';
        this._active = true;
        this._attractTimer = 0;
        this._attractDelay = GameConfig.economy.coinAttractDelay + Utils.random(0, 0.3);
        this._targetX = targetX;
        this._targetY = targetY;
        this._size = 6 + Math.min(value / 10, 8);
        this._rotation = Math.random() * Math.PI * 2;
        this._rotationSpeed = Utils.random(-8, 8);
        this._life = 0;
        this._maxLife = 3;
        this._arcOffset = Utils.random(-30, 30);

        // 初始爆炸速度
        const angle = Utils.random(0, Math.PI * 2);
        const speed = Utils.random(80, 200);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 100; // 略微向上
    }

    update(dt) {
        if (!this._active) return;

        this._life += dt;
        this._rotation += this._rotationSpeed * dt;

        if (this.state === 'explode') {
            // 爆炸扩散阶段：物理运动
            this.vy += 200 * dt; // 重力
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            this._attractTimer += dt;
            if (this._attractTimer >= this._attractDelay) {
                this.state = 'attract';
            }
        } else if (this.state === 'attract') {
            // 吸附阶段：向目标飞行，带弧线惯性
            const dx = this._targetX - this.x;
            const dy = this._targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20) {
                this.state = 'collected';
                this._active = false;
                return;
            }

            // 磁吸加速度
            const attractForce = 1500;
            const ax = (dx / dist) * attractForce;
            const ay = (dy / dist) * attractForce;

            // 弧线惯性：垂直方向的偏移力
            const perpX = -dy / dist;
            const perpY = dx / dist;
            const arcForce = Math.sin(this._life * 5) * 200 * this._arcOffset / 30;

            this.vx += (ax + perpX * arcForce) * dt;
            this.vy += (ay + perpY * arcForce) * dt;

            // 速度限制
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const maxSpeed = 800;
            if (speed > maxSpeed) {
                this.vx = (this.vx / speed) * maxSpeed;
                this.vy = (this.vy / speed) * maxSpeed;
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // 越接近目标旋转越快
            this._rotationSpeed = Utils.lerp(this._rotationSpeed, 20, 0.1);
        }

        // 超时保护
        if (this._life > this._maxLife) {
            this.state = 'collected';
            this._active = false;
        }
    }

    render(ctx) {
        if (!this._active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this._rotation);

        const scaleX = Math.cos(this._rotation * 0.5);
        ctx.scale(Math.max(0.1, Math.abs(scaleX)) * (scaleX >= 0 ? 1 : -1), 1);

        // 外发光
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this._size * 2);
        glow.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, this._size * 2, 0, Math.PI * 2);
        ctx.fill();

        // 金币本体
        const coinGradient = ctx.createRadialGradient(-this._size * 0.3, -this._size * 0.3, 0, 0, 0, this._size);
        coinGradient.addColorStop(0, '#FFF8DC');
        coinGradient.addColorStop(0.4, '#FFD700');
        coinGradient.addColorStop(0.8, '#DAA520');
        coinGradient.addColorStop(1, '#8B6914');
        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this._size, 0, Math.PI * 2);
        ctx.fill();

        // 金币边框
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 金币中心纹样（龙纹简化）
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this._size * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-this._size * 0.3, -this._size * 0.3, this._size * 0.25, this._size * 0.15, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 金粉拖尾
        if (this.state === 'attract') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const trailGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this._size * 3);
            trailGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
            trailGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this._size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    get isCollected() {
        return this.state === 'collected';
    }
}

/**
 * 金币管理器
 */
export class CoinManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.coins = [];
        this._targetX = 100;
        this._targetY = 50;
    }

    setTarget(x, y) {
        this._targetX = x;
        this._targetY = y;
    }

    /**
     * 从位置生成金币爆炸
     */
    spawnCoins(x, y, totalValue) {
        const count = Math.min(Math.max(Math.ceil(totalValue / 20), GameConfig.economy.coinPerKillMin), GameConfig.economy.coinPerKillMax);
        const valuePerCoin = Math.ceil(totalValue / count);

        for (let i = 0; i < count; i++) {
            const coin = new Coin();
            coin.init(x, y, valuePerCoin, this._targetX, this._targetY);
            this.coins.push(coin);
        }
    }

    update(dt) {
        let collectedValue = 0;
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.update(dt);
            if (coin.isCollected) {
                collectedValue += coin.value;
                this.coins.splice(i, 1);
            }
        }
        return collectedValue;
    }

    render(ctx) {
        for (const coin of this.coins) {
            coin.render(ctx);
        }
    }

    clear() {
        this.coins = [];
    }

    get count() {
        return this.coins.length;
    }
}
