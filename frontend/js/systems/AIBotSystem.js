/**
 * AI 机器人陪玩系统
 * 模拟联机房间中的其他玩家，显示炮台、发射炮弹
 * 让单机游戏也有多人同屏的热闹氛围
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class AIBot {
    constructor(id, name, x, color, skillLevel) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = 0; // 由外部设置
        this.color = color;
        this.skillLevel = skillLevel; // 0-1, 越高越强
        this.angle = -Math.PI / 2;
        this.targetAngle = -Math.PI / 2;
        this.level = Math.ceil(skillLevel * 8) + 1; // 1-9倍炮
        this._fireTimer = 0;
        this._fireInterval = Utils.random(0.3, 0.8) / (0.5 + skillLevel * 0.5);
        this._aimTimer = 0;
        this._muzzleFlash = 0;
        this._flowAngle = 0;
        this.bullets = [];
        this._maxBullets = 5;
    }

    update(dt, fishes, gameWidth, gameHeight) {
        this.y = gameHeight - 30;

        // 流光环绕
        this._flowAngle += 2 * dt;

        // 炮口闪光
        this._muzzleFlash = Math.max(0, this._muzzleFlash - dt * 5);

        // 瞄准：定期选择目标
        this._aimTimer -= dt;
        if (this._aimTimer <= 0 && fishes.length > 0) {
            this._aimTimer = Utils.random(0.2, 0.6);
            // 高技能AI优先瞄准高价值鱼
            let targetFish;
            if (Math.random() < this.skillLevel) {
                const sorted = [...fishes].sort((a, b) => b.score - a.score);
                targetFish = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
            } else {
                targetFish = fishes[Math.floor(Math.random() * fishes.length)];
            }
            if (targetFish) {
                this.targetAngle = Utils.angleBetween(this.x, this.y, targetFish.x, targetFish.y);
            }
        }

        // 平滑旋转
        this.angle = Utils.lerpAngle(this.angle, this.targetAngle, 0.1);

        // 发射
        this._fireTimer -= dt;
        if (this._fireTimer <= 0) {
            this._fireTimer = this._fireInterval * Utils.random(0.8, 1.2);
            this._fire();
        }

        // 更新子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += Math.cos(b.angle) * b.speed * dt;
            b.y += Math.sin(b.angle) * b.speed * dt;
            b.life -= dt;
            if (b.life <= 0 || b.x < -50 || b.x > gameWidth + 50 || b.y < -50 || b.y > gameHeight + 50) {
                this.bullets.splice(i, 1);
            }
        }
    }

    _fire() {
        if (this.bullets.length >= this._maxBullets) return;
        this._muzzleFlash = 1;
        const muzzleX = this.x + Math.cos(this.angle) * 35;
        const muzzleY = this.y + Math.sin(this.angle) * 35;
        this.bullets.push({
            x: muzzleX,
            y: muzzleY,
            angle: this.angle,
            speed: 500 + this.level * 30,
            life: 2,
            level: this.level
        });
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 玩家名字
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.name, 0, 35);
        ctx.fillText(this.name, 0, 35);

        // 倍率标识
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`×${this.level}`, 0, 48);

        ctx.rotate(this.angle);

        // 流光环绕
        ctx.strokeStyle = this.color + '60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 28, this._flowAngle, this._flowAngle + Math.PI * 1.2);
        ctx.stroke();

        // 炮管
        const gradient = ctx.createLinearGradient(0, -8, 0, 8);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, '#fff');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(5, -6, 32, 12, 4);
        ctx.fill();

        // 炮口闪光
        if (this._muzzleFlash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = this.color + Math.floor(this._muzzleFlash * 200).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(38, 0, 10 * this._muzzleFlash, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 炮座
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#06223A';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 渲染子弹
        for (const b of this.bullets) {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            ctx.globalCompositeOperation = 'lighter';
            // 拖尾
            const trailGrad = ctx.createLinearGradient(-20, 0, 5, 0);
            trailGrad.addColorStop(0, 'transparent');
            trailGrad.addColorStop(1, this.color + 'AA');
            ctx.fillStyle = trailGrad;
            ctx.fillRect(-20, -2, 25, 4);
            // 弹头
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

export class AIBotManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.bots = [];
        this._enabled = true;
        this._botConfigs = [
            { name: '东海侠客', color: '#FF6B6B', skill: 0.7 },
            { name: '珊瑚仙子', color: '#FF69B4', skill: 0.5 },
            { name: '深海猎手', color: '#7DF9FF', skill: 0.85 },
            { name: '珍珠商人', color: '#FFD700', skill: 0.4 },
            { name: '龙宫护卫', color: '#98FB98', skill: 0.6 }
        ];
    }

    init(gameWidth) {
        if (!this._enabled) return;
        // 随机生成2-3个AI玩家
        const botCount = Utils.randomInt(2, 3);
        const shuffled = [...this._botConfigs].sort(() => Math.random() - 0.5);
        const positions = this._generatePositions(gameWidth, botCount);

        for (let i = 0; i < botCount; i++) {
            const cfg = shuffled[i];
            this.bots.push(new AIBot(
                `bot_${i}`,
                cfg.name,
                positions[i],
                cfg.color,
                cfg.skill
            ));
        }
    }

    _generatePositions(gameWidth, count) {
        const positions = [];
        const margin = 80;
        const spacing = (gameWidth - margin * 2) / (count + 1);
        for (let i = 0; i < count; i++) {
            positions.push(margin + spacing * (i + 1) + Utils.random(-20, 20));
        }
        return positions;
    }

    update(dt, fishes, gameWidth, gameHeight) {
        for (const bot of this.bots) {
            bot.update(dt, fishes, gameWidth, gameHeight);
        }
    }

    render(ctx) {
        for (const bot of this.bots) {
            bot.render(ctx);
        }
    }

    setEnabled(enabled) {
        this._enabled = enabled;
        if (!enabled) {
            this.bots = [];
        }
    }

    getBotCount() {
        return this.bots.length;
    }
}
