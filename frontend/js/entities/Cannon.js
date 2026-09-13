/**
 * 炮台类
 * 多档位倍率切换、瞄准、发射、5级皮肤自动切换（按倍率）、变身动画、呼吸光效
 *
 * 皮肤规则：
 *  - level(倍率) 落在 GameConfig.cannon.levelSkins[i] 的 [min, max) 区间时，自动选用第 i 级皮肤
 *  - 皮肤等级跨越变化时触发变身动画（缩放脉冲 + 金色光环扩散 + 粒子）
 *  - 呼吸光强由该级皮肤的 glowIntensity 决定，Lv1 微光，Lv5 强光
 *
 * 多炮台支持（为多人联机预留）：
 *  - constructor(x, y, options) 支持 angleLimit / isPlayer / playerName / avatar
 *  - 图片资源在类级别共享，多实例不重复加载
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class Cannon {
    // ===== 类级共享资源：5张皮肤图片只加载一次，所有炮台实例复用 =====
    static _skinImages = null;       // { 0: Image, 1: Image, ... 4: Image }
    static _skinReady = false;       // 是否全部加载完成
    static _skinLoadStarted = false;

    /**
     * 预加载所有等级皮肤图片（幂等，只执行一次）
     */
    static _preloadSkinImages() {
        if (Cannon._skinLoadStarted) return;
        Cannon._skinLoadStarted = true;

        const skins = GameConfig.cannon.levelSkins || [];
        const cache = {};
        let pending = skins.length;

        if (pending === 0) {
            Cannon._skinImages = cache;
            Cannon._skinReady = true;
            return;
        }

        skins.forEach((skin, idx) => {
            const img = new Image();
            img.onload = () => {
                pending--;
                if (pending <= 0) Cannon._skinReady = true;
            };
            img.onerror = () => {
                // 单张失败不阻塞其它皮肤，标记就绪即可，渲染时会走 fallback
                pending--;
                if (pending <= 0) Cannon._skinReady = true;
            };
            img.src = skin.image;
            cache[idx] = img;
        });
        Cannon._skinImages = cache;
    }

    /**
     * 根据 level(倍率) 返回皮肤等级索引 0..4
     * 配置为半开区间 [min, max)
     */
    static getSkinLevelByLevel(level) {
        const skins = GameConfig.cannon.levelSkins || [];
        for (let i = 0; i < skins.length; i++) {
            if (level >= skins[i].min && level < skins[i].max) return i;
        }
        // 兜底：超出区间时取最高级
        return skins.length > 0 ? skins.length - 1 : 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {object} [options={}]
     * @param {{min:number,max:number}} [options.angleLimit] 角度限制（弧度），默认朝上半圆
     * @param {boolean} [options.isPlayer=true] 是否玩家自己的炮台
     * @param {string}  [options.playerName=''] 玩家名（多人显示用）
     * @param {string}  [options.avatar='']    头像（预留）
     */
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2; // 默认朝上
        this.targetAngle = -Math.PI / 2;
        this.level = 100;
        this.skin = 'dragon'; // 保留旧 VIP 皮肤 key，仅用于 fallback 程序化绘制与 fire() 返回

        // 多炮台配置
        this._angleLimit = options.angleLimit || { min: -Math.PI + 0.2, max: -0.2 };
        this.isPlayer = options.isPlayer !== false;
        this.playerName = options.playerName || '';
        this.avatar = options.avatar || '';

        // 状态
        this.autoFire = false;
        this._fireTimer = 0;
        this._flowAngle = 0;
        this._muzzleFlash = 0;
        this._skinChangeEffect = 0;
        this._rageActive = false;
        this._rageTimer = 0;
        this.fireRateMultiplier = 1.0;
        this._time = 0; // 用于呼吸光效

        // 皮肤等级（实例缓存，用于检测跨级切换）
        this._skinLevel = Cannon.getSkinLevelByLevel(this.level);

        // 触发类级图片预加载（幂等）
        Cannon._preloadSkinImages();
    }

    // ===== 多炮台接口 =====

    /**
     * 动态设置角度限制
     */
    setAngleLimit(min, max) {
        this._angleLimit = { min, max };
    }

    /**
     * 当前皮肤配置对象（来自 levelSkins）
     */
    get currentSkinConfig() {
        const skins = GameConfig.cannon.levelSkins || [];
        return skins[this._skinLevel] || { color: '#FFD700', glowIntensity: 0.5, name: '', image: '' };
    }

    /**
     * 当前皮肤等级 0..4
     */
    getCurrentSkinLevel() {
        return this._skinLevel;
    }

    // ===== 瞄准 / 发射 =====

    /**
     * 瞄准目标（仅玩家炮台调用；非玩家炮台可直接写 targetAngle）
     */
    aim(targetX, targetY) {
        this.targetAngle = Utils.angleBetween(this.x, this.y, targetX, targetY);
        // 使用实例角度限制（支持多炮台朝向不同方向）
        this.targetAngle = Utils.clamp(this.targetAngle, this._angleLimit.min, this._angleLimit.max);
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

        // 皮肤切换特效衰减
        this._skinChangeEffect = Math.max(0, this._skinChangeEffect - dt * 2);

        // 呼吸时间累积
        this._time += dt;

        // 检测倍率跨级 → 自动切换皮肤 + 触发变身动画
        const newSkinLevel = Cannon.getSkinLevelByLevel(this.level);
        if (newSkinLevel !== this._skinLevel) {
            this._skinLevel = newSkinLevel;
            this._skinChangeEffect = 1; // 触发变身
        }

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
     * 注意：damage 公式已被 Bullet 分级代理修改为 baseDamage * level / 100，保持不变
     */
    fire() {
        if (!this.canFire()) return null;

        const fireRate = GameConfig.cannon.baseFireRate * (1 + (this.level - 1) * 0.05) * this.fireRateMultiplier;
        this._fireTimer = 1 / fireRate;
        this._muzzleFlash = 1;

        const muzzleX = this.x + Math.cos(this.angle) * 75;
        const muzzleY = this.y + Math.sin(this.angle) * 75;

        return {
            x: muzzleX,
            y: muzzleY,
            angle: this.angle,
            level: this.level,
            // 伤害 = 基础伤害 × 倍率 / 100（100倍=1，1000倍=10，10000倍=100）
            damage: GameConfig.bullet.baseDamage * this.level / 100,
            isCrit: false,
            isRage: this._rageActive,
            skin: this.skin,
            skinLevel: this._skinLevel
        };
    }

    /**
     * 升级倍率
     */
    upgrade() {
        if (this.level < GameConfig.cannon.maxLevel) {
            this.level += 100;
            return true;
        }
        return false;
    }

    /**
     * 降级倍率
     */
    downgrade() {
        if (this.level > GameConfig.cannon.minLevel) {
            this.level -= 100;
            return true;
        }
        return false;
    }

    /**
     * 手动切换 VIP 皮肤（保留旧接口；倍率驱动的等级皮肤仍然自动生效）
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

    // ===== 渲染 =====

    render(ctx) {
        const skinCfg = this.currentSkinConfig;
        const glow = skinCfg.glowIntensity ?? 0.5;
        const glowColor = skinCfg.color || '#FFD700';

        ctx.save();
        ctx.translate(this.x, this.y);

        // ---- 呼吸光效（随等级增强，使用 lighter 叠加）----
        this._renderBreathingGlow(ctx, glowColor, glow);

        // ---- 狂暴状态红光（叠加在呼吸光之上）----
        if (this._rageActive) {
            ctx.globalCompositeOperation = 'lighter';
            const rageGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
            rageGlow.addColorStop(0, 'rgba(255, 107, 53, 0.4)');
            rageGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
            ctx.fillStyle = rageGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 90, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // ---- 变身动画：整体缩放脉冲（先放大再恢复）----
        let transformScale = 1;
        if (this._skinChangeEffect > 0) {
            // effect 从 1 衰减到 0；sin(progress * PI) 在中间达到 1
            const progress = 1 - this._skinChangeEffect; // 0 -> 1
            transformScale = 1 + Math.sin(progress * Math.PI) * 0.3;
        }
        ctx.scale(transformScale, transformScale);

        // ---- 绘制炮台主体（按皮肤等级选图）----
        this._renderCannonBody(ctx, skinCfg);

        // ---- 倍率文字（中心）----
        this._renderLevelText(ctx);

        // ---- 玩家名（多人预留，画在炮台下方）----
        if (this.playerName) {
            this._renderPlayerName(ctx);
        }

        // ---- 变身特效：金色光环扩散 + 粒子 ----
        if (this._skinChangeEffect > 0) {
            this._renderSkinChangeEffect(ctx, glowColor);
        }

        ctx.restore();
    }

    /**
     * 呼吸光晕
     */
    _renderBreathingGlow(ctx, color, glowIntensity) {
        const t = this._time;
        const radius = 50 + glowIntensity * 30 + Math.sin(t * 2) * 10;
        const alpha = Math.max(0.05, 0.1 + glowIntensity * 0.15 + Math.sin(t * 2) * 0.05);

        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        g.addColorStop(0, Utils.rgba(color, alpha));
        g.addColorStop(0.6, Utils.rgba(color, alpha * 0.4));
        g.addColorStop(1, Utils.rgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * 炮台主体：优先用等级皮肤图片，否则 fallback 程序化绘制
     */
    _renderCannonBody(ctx, skinCfg) {
        // 尺寸随等级略增：Lv1=140, Lv2=145, Lv3=150, Lv4=155, Lv5=160
        const size = 140 + this._skinLevel * 5;
        const img = Cannon._skinImages ? Cannon._skinImages[this._skinLevel] : null;
        const imgReady = img && Cannon._skinReady && img.complete && img.naturalWidth > 0;

        ctx.save();
        // 图片设计为炮管朝上，旋转 angle+PI/2 使炮管指向瞄准方向
        ctx.rotate(this.angle + Math.PI / 2);

        if (imgReady) {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            // fallback：用旧的程序化绘制
            this._renderBase(ctx, skinCfg);
            this._renderBarrel(ctx, skinCfg);
        }

        // 炮口闪光（旋转空间中炮管朝上，炮口位于 (0,-75)）
        if (this._muzzleFlash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            const flashR = 30 * this._muzzleFlash;
            const flash = ctx.createRadialGradient(0, -75, 0, 0, -75, flashR);
            flash.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            flash.addColorStop(0.3, this._rageActive ? 'rgba(255, 107, 53, 0.7)' : Utils.rgba(skinCfg.color, 0.7));
            flash.addColorStop(1, Utils.rgba(skinCfg.color, 0));
            ctx.fillStyle = flash;
            ctx.beginPath();
            ctx.arc(0, -75, flashR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    }

    /**
     * 倍率文字
     */
    _renderLevelText(ctx) {
        ctx.save();
        ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 20, 40, 0.9)';
        ctx.strokeText(`×${this.level}`, 0, 0);
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;
        ctx.fillText(`×${this.level}`, 0, 0);
        ctx.restore();
    }

    /**
     * 玩家名（多人预留）
     */
    _renderPlayerName(ctx) {
        ctx.save();
        ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 20, 40, 0.9)';
        ctx.strokeText(this.playerName, 0, 50);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.playerName, 0, 50);
        ctx.restore();
    }

    /**
     * 变身特效：金色光环扩散 + 简单粒子光点
     */
    _renderSkinChangeEffect(ctx, color) {
        const e = this._skinChangeEffect; // 1 -> 0
        ctx.globalCompositeOperation = 'lighter';

        // 扩散光环（半径从 0 到 80*e，透明度随 e 衰减）
        const ringR = 80 * (1 - e) + 20; // 随时间扩张
        const ringAlpha = e * 0.8;
        const ring = ctx.createRadialGradient(0, 0, ringR * 0.3, 0, 0, ringR);
        ring.addColorStop(0, Utils.rgba(color, 0));
        ring.addColorStop(0.8, Utils.rgba(color, ringAlpha * 0.6));
        ring.addColorStop(1, Utils.rgba(color, 0));
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.fill();

        // 中心金光
        const coreR = 60 * e;
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
        core.addColorStop(0, `rgba(255, 235, 150, ${e * 0.7})`);
        core.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fill();

        // 粒子光点（8 个，沿圆周向外飞散）
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + this._flowAngle * 0.5;
            const dist = 20 + (1 - e) * 60;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const pr = 3 * e + 1;
            ctx.fillStyle = Utils.rgba(color, e * 0.8);
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ===== 程序化 fallback 绘制（图片未加载时使用，与旧版保持一致）=====

    _renderBase(ctx, skinConfig) {
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

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this._flowAngle * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, 32, angle, angle + 0.5);
            ctx.stroke();
        }
    }

    _renderBarrel(ctx, skinConfig) {
        const barrelLength = 50;
        const barrelWidth = 16 + this.level * 0.8;

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

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(5, -barrelWidth / 2, barrelLength, barrelWidth, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = this._rageActive ? '#FF6B35' : '#0A1A2A';
        ctx.beginPath();
        ctx.arc(barrelLength + 5, 0, barrelWidth / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this._rageActive ? '#FF6B35' : skinConfig.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = this._rageActive ? '#FF6B35' : skinConfig.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(barrelLength + 5, 0, barrelWidth / 3 + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(5 + i * 15, -barrelWidth / 2);
            ctx.lineTo(5 + i * 15, barrelWidth / 2);
            ctx.stroke();
        }
    }

    get isRaging() {
        return this._rageActive;
    }
}
