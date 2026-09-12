/**
 * 炮台类
 * 多档位倍率切换、瞄准、发射、3套皮肤、流光环绕
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class Cannon {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2; // 默认朝上
        this.targetAngle = -Math.PI / 2;
        this.level = 1;
        this.skin = 'dragon';
        this.autoFire = false;
        this._fireTimer = 0;
        this._flowAngle = 0;
        this._muzzleFlash = 0;
        this._skinChangeEffect = 0;
        this._rageActive = false;
        this._rageTimer = 0;
        this.fireRateMultiplier = 1.0;
    }

    /**
     * 瞄准目标
     */
    aim(targetX, targetY) {
        this.targetAngle = Utils.angleBetween(this.x, this.y, targetX, targetY);
        // 限制角度（不朝下）
        this.targetAngle = Utils.clamp(this.targetAngle, -Math.PI + 0.2, -0.2);
    }

    /**
     * 更新炮台
     */
    update(dt) {
        // 平滑旋转
        this.angle = Utils.lerpAngle(this.angle, this.targetAngle, 0.2);

        // 流光环绕
        this._flowAngle += GameConfig.cannon.flowRotationSpeed * dt;

        // 炮口闪光衰减
        this._muzzleFlash = Math.max(0, this._muzzleFlash - dt * 5);

        // 皮肤切换特效
        this._skinChangeEffect = Math.max(0, this._skinChangeEffect - dt * 2);

        // 狂暴计时
        if (this._rageActive) {
            this._rageTimer -= dt;
            if (this._rageTimer <= 0) {
                this._rageActive = false;
            }
        }
    }

    /**
     * 能否发射
     */
    canFire() {
        return this._fireTimer <= 0;
    }

    /**
     * 发射（返回炮弹参数）
     */
    fire() {
        if (!this.canFire()) return null;

        const fireRate = GameConfig.cannon.baseFireRate * (1 + (this.level - 1) * 0.05) * this.fireRateMultiplier;
        this._fireTimer = 1 / fireRate;
        this._muzzleFlash = 1;

        const muzzleX = this.x + Math.cos(this.angle) * 50;
        const muzzleY = this.y + Math.sin(this.angle) * 50;

        return {
            x: muzzleX,
            y: muzzleY,
            angle: this.angle,
            level: this.level,
            damage: GameConfig.bullet.baseDamage * (1 + (this.level - 1) * 0.1),
            isCrit: false,
            isRage: this._rageActive,
            skin: this.skin
        };
    }

    /**
     * 升级倍率
     */
    upgrade() {
        if (this.level < GameConfig.cannon.maxLevel) {
            this.level++;
            return true;
        }
        return false;
    }

    /**
     * 降级倍率
     */
    downgrade() {
        if (this.level > GameConfig.cannon.minLevel) {
            this.level--;
            return true;
        }
        return false;
    }

    /**
     * 切换皮肤
     */
    changeSkin(skin) {
        if (GameConfig.cannon.skins[skin]) {
            this.skin = skin;
            this._skinChangeEffect = 1;
            return true;
        }
        return false;
    }

    /**
     * 激活狂暴
     */
    activateRage(duration = 15) {
        this._rageActive = true;
        this._rageTimer = duration;
    }

    /**
     * 获取炮弹消耗
     */
    getBulletCost() {
        return GameConfig.economy.baseBulletCost * this.level;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const skinConfig = GameConfig.cannon.skins[this.skin];

        // 狂暴状态红光
        if (this._rageActive) {
            ctx.globalCompositeOperation = 'lighter';
            const rageGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
            rageGlow.addColorStop(0, 'rgba(255, 107, 53, 0.4)');
            rageGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
            ctx.fillStyle = rageGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 高倍炮台流光环绕
        if (this.level >= 5 || this.skin !== 'dragon') {
            this._renderFlowEffect(ctx, skinConfig.color);
        }

        // 底座
        this._renderBase(ctx, skinConfig);

        // 炮管
        ctx.save();
        ctx.rotate(this.angle);
        this._renderBarrel(ctx, skinConfig);

        // 炮口闪光
        if (this._muzzleFlash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            const flash = ctx.createRadialGradient(55, 0, 0, 55, 0, 30 * this._muzzleFlash);
            flash.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            flash.addColorStop(0.3, this._rageActive ? 'rgba(255, 107, 53, 0.7)' : 'rgba(54, 224, 232, 0.7)');
            flash.addColorStop(1, 'rgba(54, 224, 232, 0)');
            ctx.fillStyle = flash;
            ctx.beginPath();
            ctx.arc(55, 0, 30 * this._muzzleFlash, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();

        // 皮肤切换特效
        if (this._skinChangeEffect > 0) {
            ctx.globalCompositeOperation = 'lighter';
            const effect = ctx.createRadialGradient(0, 0, 0, 0, 0, 60 * this._skinChangeEffect);
            effect.addColorStop(0, `rgba(255, 215, 0, ${this._skinChangeEffect * 0.6})`);
            effect.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = effect;
            ctx.beginPath();
            ctx.arc(0, 0, 60 * this._skinChangeEffect, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }

    _renderBase(ctx, skinConfig) {
        // 底座外圈
        const baseGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
        if (this.skin === 'gold') {
            baseGradient.addColorStop(0, '#FFD700');
            baseGradient.addColorStop(0.5, '#B8860B');
            baseGradient.addColorStop(1, '#6B4400');
        } else if (this.skin === 'glass') {
            baseGradient.addColorStop(0, 'rgba(54, 224, 232, 0.6)');
            baseGradient.addColorStop(0.5, 'rgba(20, 80, 100, 0.8)');
            baseGradient.addColorStop(1, 'rgba(10, 40, 60, 0.9)');
        } else {
            baseGradient.addColorStop(0, '#2A5A7A');
            baseGradient.addColorStop(0.5, '#1A3A5A');
            baseGradient.addColorStop(1, '#0A1A2A');
        }

        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fill();

        // 鎏金边框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 龙纹浮雕
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this._flowAngle * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, 32, angle, angle + 0.5);
            ctx.stroke();
        }

        // 倍率显示
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;
        ctx.fillText(`×${this.level}`, 0, 0);
        ctx.shadowBlur = 0;
    }

    _renderBarrel(ctx, skinConfig) {
        const barrelLength = 50;
        const barrelWidth = 16 + this.level * 0.8;

        // 炮管渐变
        const barrelGradient = ctx.createLinearGradient(0, -barrelWidth / 2, 0, barrelWidth / 2);
        if (this.skin === 'gold') {
            barrelGradient.addColorStop(0, '#FFD700');
            barrelGradient.addColorStop(0.3, '#DAA520');
            barrelGradient.addColorStop(0.7, '#B8860B');
            barrelGradient.addColorStop(1, '#8B6914');
        } else if (this.skin === 'glass') {
            barrelGradient.addColorStop(0, 'rgba(125, 249, 255, 0.8)');
            barrelGradient.addColorStop(0.5, 'rgba(54, 224, 232, 0.6)');
            barrelGradient.addColorStop(1, 'rgba(20, 80, 100, 0.8)');
        } else {
            barrelGradient.addColorStop(0, '#3A6A8A');
            barrelGradient.addColorStop(0.3, '#2A5A7A');
            barrelGradient.addColorStop(0.7, '#1A3A5A');
            barrelGradient.addColorStop(1, '#0A2A4A');
        }

        ctx.fillStyle = barrelGradient;
        ctx.beginPath();
        ctx.roundRect(5, -barrelWidth / 2, barrelLength, barrelWidth, 4);
        ctx.fill();

        // 炮管金边
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(5, -barrelWidth / 2, barrelLength, barrelWidth, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 炮口
        ctx.fillStyle = this._rageActive ? '#FF6B35' : '#0A1A2A';
        ctx.beginPath();
        ctx.arc(barrelLength + 5, 0, barrelWidth / 3, 0, Math.PI * 2);
        ctx.fill();

        // 炮口发光环
        ctx.strokeStyle = this._rageActive ? '#FF6B35' : skinConfig.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = this._rageActive ? '#FF6B35' : skinConfig.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(barrelLength + 5, 0, barrelWidth / 3 + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 炮管装饰环
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(5 + i * 15, -barrelWidth / 2);
            ctx.lineTo(5 + i * 15, barrelWidth / 2);
            ctx.stroke();
        }
    }

    _renderFlowEffect(ctx, color) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
            const angle = this._flowAngle + (i / 3) * Math.PI * 2;
            const x = Math.cos(angle) * 50;
            const y = Math.sin(angle) * 50;

            const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
            glow.addColorStop(0, color);
            glow.addColorStop(1, Utils.rgba(color, 0));
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // 流光轨迹
        ctx.strokeStyle = Utils.rgba(color, 0.3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 50, this._flowAngle, this._flowAngle + Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();
    }

    get isRaging() {
        return this._rageActive;
    }
}
