/**
 * JellyfishRenderer.js - 水母专用渲染器
 * 生物类型：jellyfish / splitfish
 *
 * 渲染策略：
 *  - 伞盖：裁剪水母图片上半部分（约 35%）绘制，scaleY 脉冲收缩/舒张形成推进感
 *         （收缩 0.3s：1.0→0.7；舒张 0.9s：0.7→1.05→1.0，周期约 1.2s）
 *  - 触手：8 条细长半透明程序化触手从伞盖底部垂下，正弦波飘动；
 *         收缩相收拢、舒张相展开；glow 模式 lighter 叠加发光
 *  - 整体缓慢上下漂浮（bob），符合水母浮游特性
 *  - 受击闪白；死亡时触手停止飘动并淡出
 *
 * 局部坐标系：+X 为游向（已由 ctx.rotate(fish.angle) 对齐），+Y 向下。
 */
import { Utils } from '../core/Utils.js';
import { ImageSlicer } from './ImageSlicer.js';

const BELL_CROP = 0.35;     // 伞盖裁剪比例（图片上 35%）
const TENTACLE_COUNT = 8;   // 触手数量（6~10 之间取 8）
const SEGMENTS = 8;         // 每条触手的节点段数
const PERIOD = 1.2;         // 伞盖脉冲周期（秒）
const CONTRACT = 0.3;       // 收缩相时长（秒）
const BELL_SCALE = 1.15;    // 伞盖显示宽度相对 fish.size 的倍数

export class JellyfishRenderer {
    constructor() {
        this._bellCache = new Map(); // imageSrc -> 裁剪后的伞盖 canvas（按图片缓存共享）
        // 复用脉冲结果对象，避免每帧 new 临时对象
        this._pulse = { sy: 1, relax: 1 };
    }

    /**
     * 获取（或生成并缓存）伞盖裁剪图
     */
    _getBell(image) {
        if (!image || !image.naturalWidth || !image.naturalHeight) return null;
        const key = image.src || ('jf_' + image.naturalWidth + 'x' + image.naturalHeight);
        let bell = this._bellCache.get(key);
        if (!bell) {
            const imgW = image.naturalWidth;
            const imgH = image.naturalHeight;
            // 只保留上半部分伞盖，下半部分触手用程序化触手替代
            bell = ImageSlicer.crop(image, 0, 0, imgW, imgH * BELL_CROP);
            this._bellCache.set(key, bell);
        }
        return bell;
    }

    /**
     * 计算伞盖脉冲
     * 收缩相（0~0.3s）：scaleY 1.0→0.7，relax=0
     * 舒张相（0.3~1.2s）：scaleY 0.7→1.05→1.0，relax 0→1
     * 结果写入 this._pulse（sy=纵向缩放，relax=舒张进度 0=收缩/1=舒张）
     */
    _computePulse(t) {
        const p = this._pulse;
        const phase = t % PERIOD;
        if (phase < CONTRACT) {
            // 收缩相：easeIn 快速压扁
            const u = phase / CONTRACT;
            const e = u * u;
            p.sy = Utils.lerp(1.0, 0.7, e);
            p.relax = 0;
        } else {
            // 舒张相：0.7 → 1.05（easeOut）→ 1.0（缓慢回落）
            const u = (phase - CONTRACT) / (PERIOD - CONTRACT);
            if (u < 0.5) {
                const k = u / 0.5;
                p.sy = 0.7 + (1.05 - 0.7) * (1 - (1 - k) * (1 - k));
            } else {
                const k = (u - 0.5) / 0.5;
                p.sy = 1.05 - 0.05 * k;
            }
            p.relax = u;
        }
    }

    /**
     * 渲染水母
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fish - Fish 实例
     * @param {HTMLImageElement} image - 水母完整图片
     * @returns {boolean} true=已接管渲染；false=无法处理
     */
    render(ctx, fish, image) {
        const cfg = fish.config;
        if (!cfg) return false;
        const bell = this._getBell(image);
        if (!bell) return false;

        const size = fish.size;
        const t = fish._time || 0;
        const dying = fish.state === 'dying';
        const deathT = fish._deathTimer || 0;
        const dyingFade = dying ? Math.max(0, 1 - deathT * 2) : 1;
        const deathAmt = dying ? Math.min(1, deathT * 2) : 0;

        ctx.save();

        const specialAlpha = cfg.special === 'invisible' ? (fish._invisibleAlpha || 1) : 1;
        ctx.globalAlpha = (fish._depthAlpha || 1) * specialAlpha * dyingFade;

        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);
        if (fish._roll) ctx.rotate(fish._roll);
        if (dying) {
            const flipT = Math.min(1, deathT * 2.5);
            ctx.rotate(Math.PI * flipT);
        }
        ctx.scale(fish._depthScale || 1, fish._depthScale || 1);

        // 计算伞盖脉冲（写入 this._pulse）
        this._computePulse(t);
        const sy = this._pulse.sy;
        const relax = this._pulse.relax;

        // 整体缓慢上下漂浮（bob）
        const bobY = Math.sin(t * 1.3) * size * 0.06;

        // 发光（glow=true）：伞盖下方柔和光晕
        const glowColor = cfg.glowColor || cfg.accentColor || '#FF69B4';
        this._renderGlow(ctx, size, glowColor, t);

        ctx.save();
        ctx.translate(0, bobY);

        // 1) 触手（先画，伞盖后画盖住根部）；收缩时收拢、舒张时展开
        this._renderTentacles(ctx, size, t, relax, deathAmt, cfg);

        // 2) 伞盖：scaleY 脉冲；压扁时横向鼓出（scaleX 增大）
        const bellW = size * BELL_SCALE;
        const bellH = bellW * (bell.height / bell.width);
        const sx = 1 + (1 - sy) * 0.4;
        ctx.translate(0, -size * 0.12);
        ctx.scale(sx, sy);
        ctx.drawImage(bell, -bellW / 2, -bellH / 2, bellW, bellH);
        ctx.restore();

        // 3) 受击闪白 / hurt 状态变白
        if (fish._hitFlash > 0 || fish.animState === 'hurt') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(fish._hitFlash * 0.5, fish.animState === 'hurt' ? 0.35 : 0) * (fish._depthAlpha || 1);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.12, size * 0.5, size * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
        return true;
    }

    /**
     * 绘制垂下的细长触手
     * 每段角度 = π/2（向下）+ sin(time*freq + seg*0.45 + phase)*amp
     * 收缩相（relax 小）根部收拢、振幅小；舒张相展开飘动
     */
    _renderTentacles(ctx, size, t, relax, deathAmt, cfg) {
        // 收拢/展开系数：收缩时 0.35，舒张时 1.0
        const spread = Utils.lerp(0.35, 1.0, relax);
        // 飘动振幅随舒张展开；死亡时趋近 0（停止飘动）
        const ampBase = Utils.lerp(0.05, 0.16, relax);
        const amp = Utils.lerp(ampBase, 0.02, deathAmt);
        const segLen = size * 0.12;
        const waveFreq = 2.2;
        const nSeg = SEGMENTS;

        // glow：lighter 叠加让触手发光
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = Utils.rgba(cfg.accentColor, 0.35);
        ctx.lineWidth = Math.max(1, size * 0.022);

        for (let i = 0; i < TENTACLE_COUNT; i++) {
            // 根部沿伞盖底部展开，收缩时聚拢到中心
            const rootX = (i / (TENTACLE_COUNT - 1) - 0.5) * size * 0.6 * spread;
            const rootY = -size * 0.04;
            const phase = i * 0.9 + 1.7;
            const lenVar = 0.85 + 0.2 * Math.sin(i * 1.7);

            let px = rootX, py = rootY;
            ctx.beginPath();
            ctx.moveTo(px, py);
            for (let j = 1; j <= nSeg; j++) {
                // 越靠近末端摆幅越大（末端更柔软）
                const ang = Math.PI / 2 + Math.sin(t * waveFreq + j * 0.45 + phase) * amp * (0.5 + j / nSeg);
                px += Math.cos(ang) * segLen * lenVar;
                py += Math.sin(ang) * segLen * lenVar;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * 伞盖下方柔和发光（lighter 叠加，随时间呼吸明暗）
     */
    _renderGlow(ctx, size, glowColor, t) {
        const pulse = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.5));
        ctx.globalCompositeOperation = 'lighter';
        const glowY = -size * 0.1;
        const grad = ctx.createRadialGradient(0, glowY, 0, 0, glowY, size * 1.4);
        grad.addColorStop(0, glowColor + Math.floor(pulse * 90).toString(16).padStart(2, '0'));
        grad.addColorStop(0.5, glowColor + '1E');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, glowY, size * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

// 全局单例（伞盖裁剪缓存跨水母共享）
export const jellyfishRenderer = new JellyfishRenderer();
