/**
 * BOSS 中国金龙
 * 超逼真AI金龙图片渲染 + 龙身波浪扭动、龙须摆动、龙鳞闪光
 * 高血量、出场预警、金光闪烁、驱散小鱼
 */
import { Fish } from './Fish.js';
import { Utils } from '../core/Utils.js';

export class BossDragonKing extends Fish {
    constructor() {
        super();
        this._whiskers = [];
        this._horns = [];
        this._warningTimer = 0;
        this._isWarning = false;
        this._skillTimer = 0;
        this._skillCooldown = 12;
        this._chargeTimer = 0;
        this._isCharging = false;
        this._isTelegraphing = false;
        this._telegraphTimer = 0;
        this._chargeDirection = 0;
        this._sparkles = [];          // 龙鳞闪光粒子池（同屏上限15）
        this._dirTimer = 15;          // 漫游方向随机调整倒计时
        this._dirBias = 0;            // 临时方向偏置（缓慢衰减）
    }

    reset() {
        super.reset();
        this._whiskers = [];
        this._horns = [];
        this._warningTimer = 0;
        this._isWarning = false;
        this._skillTimer = 0;
        this._chargeTimer = 0;
        this._isCharging = false;
        this._isTelegraphing = false;
        this._telegraphTimer = 0;
        this._chargeDirection = 0;
        this._sparkles = [];
        this._dirTimer = 15;
        this._dirBias = 0;
    }

    init(x, y, direction = 1, hpMultiplier = 1, scoreMultiplier = 1, eventBus = null) {
        super.init('dragonking', x, y, direction);
        this.eventBus = eventBus;
        this.hp = Math.floor(this.config.hp * hpMultiplier);
        this.maxHp = this.hp;
        this.score = Math.floor(this.config.score * scoreMultiplier);
        this._isWarning = true;
        this._warningTimer = this.config.bossWarningDuration;
        this.state = 'warning';

        // 尝试获取金龙图片（AI生成，超逼真）
        this._tryAcquireImage();

        // 初始化龙须
        for (let i = 0; i < 2; i++) {
            this._whiskers.push({
                side: i === 0 ? -1 : 1,
                segments: 8,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    update(dt, gameWidth, gameHeight, bullets = []) {
        if (!this._active) return;

        this._time += dt;

        // 出场预警阶段
        if (this.state === 'warning') {
            this._warningTimer -= dt;
            if (this._warningTimer <= 0) {
                this.state = 'alive';
            }
            return;
        }

        if (this.state === 'dying') {
            this._deathTimer += dt;
            if (this._deathTimer > 1.5) {
                this.state = 'dead';
                this._active = false;
            }
            return;
        }

        this._hitFlash = Math.max(0, this._hitFlash - dt * 2);
        this._pathTime += dt;

        // BOSS 技能：周期性冲撞（先预警后冲撞）
        this._skillTimer += dt;
        if (this._skillTimer >= this._skillCooldown && !this._isCharging && !this._isTelegraphing) {
            this._isTelegraphing = true;
            this._telegraphTimer = 1.2;
            this._skillTimer = 0;
            // 锁定冲撞方向
            this._chargeDirection = this.angle;
        }

        // 预警阶段：红色闪烁，速度减慢
        if (this._isTelegraphing) {
            this._telegraphTimer -= dt;
            this.speed = this.baseSpeed * 0.3;
            if (this._telegraphTimer <= 0) {
                this._isTelegraphing = false;
                this._isCharging = true;
                this._chargeTimer = 1.5;
                this.angle = this._chargeDirection;
                // 触发冲撞事件（用于粒子和屏幕震动）
                if (this.eventBus) {
                    this.eventBus.emit('boss:charge_start', { x: this.x, y: this.y });
                }
            }
        } else if (this._isCharging) {
            this._chargeTimer -= dt;
            if (this._chargeTimer <= 0) {
                this._isCharging = false;
            }
            // 冲撞时速度翻倍
            this.speed = this.baseSpeed * 3;
            // 冲撞时发射轨迹粒子事件
            if (this.eventBus && Math.random() < 0.3) {
                this.eventBus.emit('boss:charge_trail', { x: this.x, y: this.y });
            }
        } else {
            this.speed = this.baseSpeed;
        }

        // 漫游方向偶发大调整：每 15-20 秒注入一次临时偏置，随后缓慢衰减
        this._dirTimer -= dt;
        if (this._dirTimer <= 0) {
            this._dirTimer = Utils.random(15, 20);
            this._dirBias = Utils.random(-0.4, 0.4);
        }
        this._dirBias *= Math.max(0, 1 - 0.5 * dt);

        // BOSS 游动路径：更自然的 S 形巡游（横向摆角更平缓 + 垂直波浪更大）
        const baseAngle = (this.x > gameWidth / 2) ? Math.PI : 0;
        this.targetAngle = Math.sin(this._pathTime * 0.25) * 0.25 + baseAngle + this._dirBias;
        this.angle = Utils.lerpAngle(this.angle, this.targetAngle, 0.5 * dt);

        // 移动：垂直方向波浪幅度加大，模拟水中蜿蜒升降
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt + Math.sin(this._pathTime * 0.6) * 30 * dt;

        // 边界（允许 BOSS 部分身体在屏幕外，营造巨型压迫感）
        const halfBoss = this.size * 1.5; // BOSS半宽，允许大部分身体出屏
        if (this.x < -halfBoss) { this.x = -halfBoss; this.targetAngle = 0; }
        if (this.x > gameWidth + halfBoss) { this.x = gameWidth + halfBoss; this.targetAngle = Math.PI; }
        this.y = Utils.clamp(this.y, -this.size * 0.5, gameHeight - this.size * 0.5);
    }

    render(ctx) {
        if (!this._active) return;

        // 预警阶段：全屏金光闪烁
        if (this.state === 'warning') {
            const flash = Math.sin(this._time * 15) * 0.5 + 0.5;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 400);
            gradient.addColorStop(0, `rgba(255, 215, 0, ${flash * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.globalAlpha = this.state === 'dying' ? Math.max(0, 1 - this._deathTimer) : 1;
        // 整体缓慢上下浮动，模拟水中悬浮（与游进速度解耦）
        const bobY = Math.sin(this._time * 0.8) * 15;
        ctx.translate(this.x, this.y + bobY);
        ctx.rotate(this.angle);

        // ===== 图片渲染路径：AI金龙图片就绪时优先使用（超逼真商业级）=====
        if (!this._useImage && this.config && this.config.imagePath) {
            this._tryAcquireImage();
        }
        if (this._useImage && this._image) {
            this._renderBossImage(ctx);
        } else {
            // ===== 程序化绘制（fallback，保留原有骨骼动画龙）=====
            const cfg = this.config;
            const segments = cfg.boneSegments;
            const segmentLength = this.size / segments * 0.8;
            const bonePositions = [];

            // 龙身骨骼：大波浪扭动
            let bx = 0, by = 0, bAngle = 0;
            bonePositions.push({ x: bx, y: by, angle: bAngle, width: this.size * 0.35 });

            for (let i = 1; i < segments; i++) {
                const wave = Math.sin(this._time * 1.5 - i * 0.5) * 0.12;
                bAngle += wave;
                bx -= Math.cos(bAngle) * segmentLength;
                by -= Math.sin(bAngle) * segmentLength;
                const width = this.size * 0.35 * (1 - i / segments * 0.5);
                bonePositions.push({ x: bx, y: by, angle: bAngle, width });
            }

            // 绘制龙身
            this._renderDragonBody(ctx, bonePositions, cfg);

            // 绘制龙鳞
            this._renderScales(ctx, bonePositions);

            // 绘制背鳍（龙鬃）
            this._renderDragonMane(ctx, bonePositions);

            // 绘制龙爪
            this._renderDragonClaws(ctx, bonePositions);

            // 绘制龙头
            this._renderDragonHead(ctx, bonePositions[0], cfg);

            // 绘制龙须
            this._renderWhiskers(ctx, bonePositions[0]);
        }

        // 受击闪烁（图片模式用整体金光，程序化模式沿骨骼闪烁）
        if (this._hitFlash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = this._hitFlash * 0.4;
            if (this._useImage && this._image) {
                const imgW = this.size * 1.8;
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.ellipse(0, 0, imgW * 0.5, this.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                for (const pos of bonePositions) {
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, pos.width * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 冲撞特效
        if (this._isCharging) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5;
            const headX = (this._useImage && this._image) ? this.size * 0.7 : bonePositions[0].x;
            const headY = 0;
            const gradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, this.size);
            gradient.addColorStop(0, 'rgba(255, 100, 50, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(headX, headY, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 冲撞预警特效：红色闪烁光环
        if (this._isTelegraphing) {
            ctx.globalCompositeOperation = 'lighter';
            const flash = Math.sin(this._time * 20) * 0.3 + 0.5;
            ctx.globalAlpha = flash;
            const headX = (this._useImage && this._image) ? this.size * 0.7 : bonePositions[0].x;
            const headY = 0;
            // 预警光环
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(headX, headY, this.size * 1.2 + Math.sin(this._time * 15) * 10, 0, Math.PI * 2);
            ctx.stroke();
            // 冲撞方向指示线
            ctx.strokeStyle = `rgba(255, 68, 68, ${flash * 0.5})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.lineTo(headX + Math.cos(this._chargeDirection) * 300, headY + Math.sin(this._chargeDirection) * 300);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // BOSS 血条（在屏幕坐标绘制）
        if (this.state === 'alive' || this.state === 'dying') {
            this._renderHealthBar(ctx);
        }
    }

    /**
     * BOSS金龙图片渲染（AI超逼真图片 + 外发光 + 呼吸光效 + 龙鳞闪光 + 轻微游动摆动）
     */
    _renderBossImage(ctx) {
        const img = this._image;
        if (!img) return;

        const t = this._time;

        // ===== 整体摆动：左右摇摆幅度加大，配合横向微位移，营造龙身蜿蜒感 =====
        const sway = Math.sin(t * 1.5) * 0.08;
        ctx.rotate(sway);
        // 沿垂直于游进方向的轻微浮动位移（与摆动同频，增强流动感）
        ctx.translate(Math.sin(t * 1.5) * this.size * 0.02, Math.sin(t * 1.5 + Math.PI / 2) * this.size * 0.03);

        // 呼吸缩放（略微增强，威严又不失优雅）
        const breath = 1 + Math.sin(t * 1.2) * 0.04;
        ctx.scale(breath, breath);

        // ===== 外层金色光晕（减弱透明度，避免龙身边缘模糊）=====
        const glowPulse = Math.sin(t * 2.5) * 0.15 + 0.85;
        ctx.globalCompositeOperation = 'lighter';
        const glowRadius = this.size * 2.5;
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.10 * glowPulse})`);
        glowGradient.addColorStop(0.4, `rgba(255, 180, 0, ${0.05 * glowPulse})`);
        glowGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // ===== 绘制金龙图片（仅绘制一次，干净清晰）=====
        // 完整 S 形龙身使用 config.imageScale（缺省2.2），fishConfig 中 dragonking=2.8
        const bossImageScale = (this.config && this.config.imageScale) ? this.config.imageScale : 2.2;
        const imgW = this.size * bossImageScale;
        const ratio = (img.naturalWidth > 0 && img.naturalHeight > 0)
            ? img.naturalHeight / img.naturalWidth : 0.8;
        const imgH = imgW * ratio;
        ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);

        // ===== 龙鳞闪光粒子（对象池管理，同屏上限15，带生命周期淡入淡出）=====
        this._updateAndRenderSparkles(ctx, t);

        // ===== 水中光影流动（caustics 光斑扫过龙身）=====
        ctx.globalCompositeOperation = 'lighter';
        const causticX = Math.sin(t * 0.5) * this.size * 0.3;
        const causticY = Math.cos(t * 0.7) * this.size * 0.15;
        const causticR = this.size * 0.9;
        const causticGrad = ctx.createRadialGradient(causticX, causticY, 0, causticX, causticY, causticR);
        causticGrad.addColorStop(0, 'rgba(190, 225, 255, 0.08)');
        causticGrad.addColorStop(0.5, 'rgba(160, 210, 255, 0.04)');
        causticGrad.addColorStop(1, 'rgba(160, 210, 255, 0)');
        ctx.fillStyle = causticGrad;
        ctx.beginPath();
        ctx.arc(causticX, causticY, causticR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // ===== 飘动龙须（从龙头向后飘逸，金色半透明 + 末端发光）=====
        this._renderImageWhiskers(ctx, t);

        // ===== 内层边缘金光（已移除：叠加发光会导致图片模糊）=====
    }

    /**
     * 龙鳞闪光粒子：对象池 + 生命周期淡入淡出，同屏不超过 15 个
     */
    _updateAndRenderSparkles(ctx, t) {
        // 清理过期粒子
        const alive = [];
        for (const s of this._sparkles) {
            if (t - s.birth < s.life) alive.push(s);
        }
        this._sparkles = alive;

        // 按概率补充新粒子（偏向龙身区域）
        if (Math.random() < 0.25 && this._sparkles.length < 15) {
            const roll = Math.random();
            let color;
            if (roll < 0.70) color = '255,215,0';        // 金色 #FFD700
            else if (roll < 0.85) color = '255,255,205';  // 白金 #FFFFCC
            else color = '255,165,0';                    // 橙金 #FFA500
            this._sparkles.push({
                x: Utils.random(-this.size * 1.0, this.size * 0.8),
                y: Utils.random(-this.size * 0.4, this.size * 0.4),
                size: Utils.random(3, 12),
                color,
                life: Utils.random(0.4, 0.9),
                birth: t
            });
        }

        // 绘制（lighter 叠加，透明度按 sin(pi*t) 淡入淡出）
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this._sparkles) {
            const age = t - s.birth;
            const alpha = Math.sin(Math.PI * age / s.life);
            if (alpha <= 0.02) continue;
            const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
            g.addColorStop(0, `rgba(255, 255, 220, ${0.9 * alpha})`);
            g.addColorStop(0.5, `rgba(${s.color}, ${0.5 * alpha})`);
            g.addColorStop(1, `rgba(${s.color}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * 图片模式下的飘动龙须：从龙头位置向后拖出两条波动曲线，末端发光
     */
    _renderImageWhiskers(ctx, t) {
        const headX = this.size * 0.62;
        ctx.save();
        ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
            const startY = side * this.size * 0.08;
            // 三段贝塞尔：向后（-x）飘逸，随时间上下波动
            const sway1 = Math.sin(t * 2 + side) * this.size * 0.06;
            const sway2 = Math.sin(t * 1.6 + side + 1) * this.size * 0.10;
            const endX = headX - this.size * 0.55;
            const endY = startY + side * this.size * 0.12 + sway2;

            ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(headX, startY);
            ctx.quadraticCurveTo(
                headX - this.size * 0.18, startY + sway1,
                headX - this.size * 0.36, startY + sway1 * 1.5
            );
            ctx.quadraticCurveTo(
                headX - this.size * 0.46, startY + sway1 * 1.5,
                endX, endY
            );
            ctx.stroke();

            // 须尖发光
            ctx.globalCompositeOperation = 'lighter';
            const tipGlow = ctx.createRadialGradient(endX, endY, 0, endX, endY, 10);
            tipGlow.addColorStop(0, 'rgba(255, 230, 150, 0.8)');
            tipGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = tipGlow;
            ctx.beginPath();
            ctx.arc(endX, endY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    }

    _renderDragonBody(ctx, bones, cfg) {
        for (let i = 0; i < bones.length - 1; i++) {
            const curr = bones[i];
            const next = bones[i + 1];

            const gradient = ctx.createLinearGradient(curr.x, -curr.width, curr.x, curr.width);
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.2, cfg.accentColor);
            gradient.addColorStop(0.5, cfg.color);
            gradient.addColorStop(0.8, '#0A1525');
            gradient.addColorStop(1, cfg.finColor);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(
                (curr.x + next.x) / 2,
                (curr.y + next.y) / 2,
                curr.width * 0.75,
                curr.width * 0.5,
                (curr.angle + next.angle) / 2,
                0, Math.PI * 2
            );
            ctx.fill();

            // 金色边缘光
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    _renderScales(ctx, bones) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        for (let i = 1; i < bones.length - 1; i++) {
            const pos = bones[i];
            // 两排鳞片
            for (const row of [-0.2, 0.2]) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y + pos.width * row, pos.width * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _renderDragonMane(ctx, bones) {
        // 龙鬃（背部毛发状鳍）
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        for (let i = 1; i < bones.length - 1; i++) {
            const pos = bones[i];
            const maneHeight = pos.width * (0.4 + Math.sin(i * 0.5 + this._time * 2) * 0.15);
            ctx.beginPath();
            ctx.moveTo(pos.x - pos.width * 0.2, -pos.width * 0.4);
            ctx.lineTo(pos.x, -pos.width * 0.4 - maneHeight);
            ctx.lineTo(pos.x + pos.width * 0.2, -pos.width * 0.4);
            ctx.closePath();
            ctx.fill();
        }
    }

    _renderDragonClaws(ctx, bones) {
        // 龙爪（在身体中段两侧）
        if (bones.length < 6) return;
        const clawPositions = [bones[3], bones[6]];
        for (const pos of clawPositions) {
            for (const side of [-1, 1]) {
                ctx.save();
                ctx.translate(pos.x, pos.y + side * pos.width * 0.4);
                ctx.rotate(side * Math.PI / 3);
                ctx.fillStyle = '#FFD700';
                // 爪根
                ctx.fillRect(-3, -2, 12, 5);
                // 爪尖
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(8, -2 + i * 2);
                    ctx.lineTo(18, -4 + i * 3);
                    ctx.lineTo(10, 0 + i * 2);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }
        }
    }

    _renderDragonHead(ctx, head, cfg) {
        // 龙头
        const gradient = ctx.createRadialGradient(head.x + 20, 0, 0, head.x, 0, head.width * 0.8);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.3, cfg.accentColor);
        gradient.addColorStop(0.7, cfg.color);
        gradient.addColorStop(1, '#0A1525');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(head.x + head.width * 0.2, 0, head.width * 0.55, head.width * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // 龙角
        ctx.fillStyle = '#FFD700';
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(head.x - head.width * 0.1, side * head.width * 0.3);
            ctx.rotate(side * -0.5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-15, side * -15, -25, side * -30);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#FFD700';
            ctx.stroke();
            // 角分叉
            ctx.beginPath();
            ctx.moveTo(-15, side * -15);
            ctx.lineTo(-20, side * -5);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }

        // 龙眉
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(head.x + head.width * 0.1, side * head.width * 0.2);
            ctx.quadraticCurveTo(head.x + head.width * 0.25, side * head.width * 0.35, head.x + head.width * 0.35, side * head.width * 0.25);
            ctx.stroke();
        }

        // 眼睛（发光）
        for (const side of [-1, 1]) {
            const eyeX = head.x + head.width * 0.3;
            const eyeY = side * head.width * 0.15;

            // 眼白
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(eyeX, eyeY, head.width * 0.1, head.width * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();

            // 瞳孔（金色竖瞳）
            ctx.fillStyle = '#FF6B35';
            ctx.beginPath();
            ctx.ellipse(eyeX + 3, eyeY, head.width * 0.04, head.width * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();

            // 发光
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, head.width * 0.2);
            glow.addColorStop(0, 'rgba(255, 107, 53, 0.5)');
            glow.addColorStop(1, 'rgba(255, 107, 53, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, head.width * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 龙嘴
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(head.x + head.width * 0.45, -head.width * 0.05);
        ctx.quadraticCurveTo(head.x + head.width * 0.55, 0, head.x + head.width * 0.45, head.width * 0.05);
        ctx.stroke();

        // 龙牙
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(head.x + head.width * 0.48, -head.width * 0.03);
        ctx.lineTo(head.x + head.width * 0.5, head.width * 0.05);
        ctx.lineTo(head.x + head.width * 0.52, -head.width * 0.03);
        ctx.fill();
    }

    _renderWhiskers(ctx, head) {
        for (const whisker of this._whiskers) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            const startX = head.x + head.width * 0.4;
            const startY = whisker.side * head.width * 0.1;
            const segLength = 12;

            ctx.beginPath();
            ctx.moveTo(startX, startY);

            let wx = startX, wy = startY;
            let wAngle = whisker.side * 0.3;
            for (let i = 0; i < whisker.segments; i++) {
                const wave = Math.sin(this._time * 2 - i * 0.5 + whisker.phase) * 0.15;
                wAngle += wave;
                wx -= Math.cos(wAngle) * segLength;
                wy -= Math.sin(wAngle) * segLength;
                ctx.lineTo(wx, wy);
            }
            ctx.stroke();

            // 须尖发光
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(wx, wy, 0, wx, wy, 8);
            glow.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(wx, wy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    _renderHealthBar(ctx) {
        const barWidth = 400;
        const barHeight = 20;
        const barX = (ctx.canvas.width - barWidth) / 2;
        const barY = 60;

        // 血条发光效果
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        // 血条
        const hpRatio = this.hp / this.maxHp;
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        gradient.addColorStop(0, '#FF6B35');
        gradient.addColorStop(0.5, '#FFD700');
        gradient.addColorStop(1, '#FF6B35');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // 边框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 关闭发光
        ctx.shadowBlur = 0;
    }

    get isWarning() {
        return this.state === 'warning';
    }

    getCollisionRadius() {
        // 巨型 BOSS 碰撞盒略小于视觉尺寸，避免"空打"感，但仍覆盖主要身体
        return this.size * 0.6;
    }
}
