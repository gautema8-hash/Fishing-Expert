/**
 * OctopusRenderer.js - 章鱼/鱿鱼/墨鱼专用渲染器
 * 生物类型：octopus / dumbo_octopus / squid / glass_squid / cuttlefish
 *
 * 渲染策略：
 *  - 外套膜（头部/躯体）：裁剪章鱼图片上半部分（约 45%）绘制，带呼吸收缩（scaleY 脉动）
 *  - 触手：8 条程序化多段正弦波触手替代原图触手，每段相位沿触手递增形成向后传播的波浪
 *  - 触手颜色：根部 config.color 不透明 → 末端 accentColor 透明渐变带状；glow 时 lighter 叠加
 *  - 游动推进：波浪频率随速度加快；死亡时触手停止摆动并向下垂落
 *
 * 局部坐标系：+X 为游向（已由 ctx.rotate(fish.angle) 对齐），触手整体向 -X（后方）拖曳。
 */
import { Utils } from '../core/Utils.js';
import { ImageSlicer } from './ImageSlicer.js';

const TENTACLE_COUNT = 8;    // 触手数量
const SEGMENTS = 7;          // 每条触手的节点段数（7 段 = 8 个节点）
const CROP_RATIO = 0.45;     // 外套膜裁剪比例（图片上 45%）
const MANTLE_SCALE = 1.35;   // 外套膜显示宽度相对 fish.size 的倍数
const BREATH_PERIOD = 1.5;   // 外套膜呼吸周期（秒）

export class OctopusRenderer {
    constructor() {
        this._mantleCache = new Map(); // imageSrc -> 裁剪后的外套膜 canvas（按图片缓存共享）
        // 预分配触手节点缓冲区：避免每帧 new 临时对象
        this._cx = new Float32Array(SEGMENTS + 1);
        this._cy = new Float32Array(SEGMENTS + 1);
        this._lx = new Float32Array(SEGMENTS + 1);
        this._ly = new Float32Array(SEGMENTS + 1);
        this._rx = new Float32Array(SEGMENTS + 1);
        this._ry = new Float32Array(SEGMENTS + 1);
    }

    /**
     * 获取（或生成并缓存）外套膜裁剪图
     */
    _getMantle(image) {
        if (!image || !image.naturalWidth || !image.naturalHeight) return null;
        const key = image.src || ('oct_' + image.naturalWidth + 'x' + image.naturalHeight);
        let mantle = this._mantleCache.get(key);
        if (!mantle) {
            const imgW = image.naturalWidth;
            const imgH = image.naturalHeight;
            // 只保留上半部分头部/外套膜，下半部分触手用程序化触手替代
            mantle = ImageSlicer.crop(image, 0, 0, imgW, imgH * CROP_RATIO);
            this._mantleCache.set(key, mantle);
        }
        return mantle;
    }

    /**
     * 渲染章鱼
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fish - Fish 实例（x,y,angle,size,config,_time,state,_hitFlash,_depthScale,_depthAlpha,animState,_deathTimer 等）
     * @param {HTMLImageElement} image - 章鱼完整图片
     * @returns {boolean} true=已接管渲染；false=无法处理（交由降级路径）
     */
    render(ctx, fish, image) {
        const cfg = fish.config;
        if (!cfg) return false;
        const mantle = this._getMantle(image);
        if (!mantle) return false;

        const size = fish.size;
        const t = fish._time || 0;
        const dying = fish.state === 'dying';
        const deathT = fish._deathTimer || 0;
        // 速度比（驱动触手摆动频率）
        const speedRatio = Math.max(0.2, (fish.speed || size) / Math.max(1, fish.baseSpeed || fish.speed || 1));

        ctx.save();

        // 透明度：景深 * 隐身 * 死亡淡出
        const specialAlpha = cfg.special === 'invisible' ? (fish._invisibleAlpha || 1) : 1;
        const dyingFade = dying ? Math.max(0, 1 - deathT * 2) : 1;
        ctx.globalAlpha = (fish._depthAlpha || 1) * specialAlpha * dyingFade;

        // 定位 + 朝向（局部 +X = 游向）
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);
        if (fish._roll) ctx.rotate(fish._roll);
        // 死亡翻转（肚皮朝上，与主渲染路径一致）
        if (dying) {
            const flipT = Math.min(1, deathT * 2.5);
            ctx.rotate(Math.PI * flipT);
        }
        ctx.scale(fish._depthScale || 1, (fish._depthScale || 1) * (1 + (fish._pitch || 0)));

        // BOSS / 发光 外光晕
        if (fish.isBoss || cfg.glow) {
            this._renderGlow(ctx, fish, size);
        }

        // 死亡程度 0~1：触手停止摆动并向下垂落
        const deathAmt = dying ? Math.min(1, deathT * 2) : 0;

        // 1) 先画 8 条程序化触手（外套膜后画覆盖根部，衔接更自然）
        this._renderTentacles(ctx, fish, size, t, speedRatio, deathAmt);

        // 2) 外套膜：呼吸收缩（scaleY 在 0.95~1.05 间脉动，周期约 1.5s）
        const breathe = 1 + 0.05 * Math.sin(t * (Math.PI * 2 / BREATH_PERIOD));
        const mantleW = size * MANTLE_SCALE;
        const mantleH = mantleW * (mantle.height / mantle.width);
        ctx.save();
        ctx.translate(0, -size * 0.08); // 外套膜略上移，根部接在下方
        ctx.scale(1, breathe);
        ctx.drawImage(mantle, -mantleW / 2, -mantleH / 2, mantleW, mantleH);
        ctx.restore();

        // 3) 受击闪白 / hurt 状态变白
        if (fish._hitFlash > 0 || fish.animState === 'hurt') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(fish._hitFlash * 0.5, fish.animState === 'hurt' ? 0.35 : 0) * (fish._depthAlpha || 1);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.08, size * 0.55, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
        return true;
    }

    /**
     * 绘制 8 条程序化触手
     * 每条触手：7 段节点，每段角度 = baseAngle + sin(time*freq + seg*0.55 + phase)*amp
     * 相位沿触手递增 → 波浪自根部向末端传播；根部粗末端细的渐变带状填充
     */
    _renderTentacles(ctx, fish, size, t, speedRatio, deathAmt) {
        const cfg = fish.config;
        const glow = fish.isBoss || cfg.glow;

        // 摆动频率随速度加快；振幅死亡时衰减
        const waveFreq = 3.0 + speedRatio * 2.5;
        const amplitude = Utils.lerp(0.22, 0.04, deathAmt);
        const segLen = size * 0.105; // 单段长度（总触手长 ≈ size*0.72）
        const nSeg = SEGMENTS;

        if (glow) ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < TENTACLE_COUNT; i++) {
            // 根部沿外套膜下沿横向分布
            const rootX = (i / (TENTACLE_COUNT - 1) - 0.5) * size * 0.36;
            const rootY = size * 0.06;
            // 基础角：整体指向后方（-X ≈ π），两侧扇形展开；死亡时向正下方（π/2）下垂
            const fan = (i / (TENTACLE_COUNT - 1) - 0.5) * 1.3;
            let baseAngle = Math.PI + fan;
            if (deathAmt > 0) {
                baseAngle = Utils.lerpAngle(baseAngle, Math.PI / 2, deathAmt);
            }
            const phase = i * 1.13;                          // 每条触手独立相位
            const lenVar = 0.85 + 0.15 * Math.sin(i * 2.3);  // 长度差异，避免整齐划一

            // --- 计算中心节点链 ---
            let px = rootX, py = rootY;
            this._cx[0] = px; this._cy[0] = py;
            for (let j = 1; j <= nSeg; j++) {
                const ang = baseAngle + Math.sin(t * waveFreq + j * 0.55 + phase) * amplitude;
                px += Math.cos(ang) * segLen * lenVar;
                py += Math.sin(ang) * segLen * lenVar;
                this._cx[j] = px; this._cy[j] = py;
            }

            // --- 计算左右边缘（垂直于切线），形成根部粗末端细的带状 ---
            const rootW = size * 0.055, tipW = size * 0.004;
            for (let j = 0; j <= nSeg; j++) {
                const x0 = this._cx[Math.max(0, j - 1)];
                const y0 = this._cy[Math.max(0, j - 1)];
                const x1 = this._cx[Math.min(nSeg, j + 1)];
                const y1 = this._cy[Math.min(nSeg, j + 1)];
                let tx = x1 - x0, ty = y1 - y0;
                const tl = Math.sqrt(tx * tx + ty * ty) || 1;
                tx /= tl; ty /= tl;
                const w = Utils.lerp(rootW, tipW, j / nSeg);
                this._lx[j] = this._cx[j] - ty * w * 0.5;
                this._ly[j] = this._cy[j] + tx * w * 0.5;
                this._rx[j] = this._cx[j] + ty * w * 0.5;
                this._ry[j] = this._cy[j] - tx * w * 0.5;
            }

            // --- 颜色渐变：根部 color 不透明 → 末端 accentColor 透明 ---
            const grad = ctx.createLinearGradient(this._cx[0], this._cy[0], px, py);
            grad.addColorStop(0, Utils.rgba(cfg.color, glow ? 0.85 : 0.95));
            grad.addColorStop(1, Utils.rgba(cfg.accentColor, 0.0));
            ctx.fillStyle = grad;

            // 沿左缘从根到尖，再沿右缘从尖回到根，闭合填充
            ctx.beginPath();
            ctx.moveTo(this._lx[0], this._ly[0]);
            for (let j = 1; j <= nSeg; j++) ctx.lineTo(this._lx[j], this._ly[j]);
            for (let j = nSeg; j >= 0; j--) ctx.lineTo(this._rx[j], this._ry[j]);
            ctx.closePath();
            ctx.fill();
        }

        if (glow) ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * 发光外光晕（lighter 叠加）
     */
    _renderGlow(ctx, fish, size) {
        const cfg = fish.config;
        const glowColor = cfg.glowColor || cfg.accentColor || '#BB8FCE';
        const pulse = Math.sin(fish._time * 3) * 0.2 + 0.8;
        ctx.globalCompositeOperation = 'lighter';
        const glowRadius = fish.isBoss ? size * 2.2 : size * 1.5;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        grad.addColorStop(0, glowColor + Math.floor(pulse * 80).toString(16).padStart(2, '0'));
        grad.addColorStop(0.5, glowColor + '20');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

// 全局单例（外套膜裁剪缓存跨鱼共享）
export const octopusRenderer = new OctopusRenderer();
