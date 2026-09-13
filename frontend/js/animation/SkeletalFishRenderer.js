/**
 * SkeletalFishRenderer.js - 鱼类骨骼渲染器
 * 将图片切片与 FishSkeleton 骨骼姿态结合，实现身体连续弯曲变形
 *
 * 渲染流程：
 * 1. 从 FishSkeleton 获取脊椎世界坐标（头→尾）
 * 2. 将图片垂直切片映射到骨骼（右切片→头骨，左切片→尾骨）
 * 3. 每片按骨骼位置/角度独立绘制，条带重叠掩盖接缝
 * 4. 叠加独立扇动的胸鳍（程序化半透明薄膜）
 * 5. 发光/受击/死亡等特效
 *
 * 性能：切片画布按鱼种缓存共享，每鱼仅 N 次 drawImage（N=8~12）
 */
import { ImageSlicer } from './ImageSlicer.js';
import { Utils } from '../core/Utils.js';

export class SkeletalFishRenderer {
    constructor() {
        this._sliceCache = new Map(); // imageSrc -> slices
        this._boneIndexCache = new Map(); // numSlices|numSpine -> Int8Array of bone indices
    }

    /**
     * 获取或创建切片到骨骼的索引映射（缓存）
     */
    _getBoneMapping(numSlices, numSpine) {
        const key = numSlices + '|' + numSpine;
        let mapping = this._boneIndexCache.get(key);
        if (!mapping) {
            mapping = new Int8Array(numSlices);
            for (let i = 0; i < numSlices; i++) {
                mapping[i] = Math.min(numSpine - 1, Math.round((1 - i / (numSlices - 1)) * (numSpine - 1)));
            }
            this._boneIndexCache.set(key, mapping);
        }
        return mapping;
    }

    /**
     * 获取或创建图片切片（按鱼种缓存）
     */
    _getSlices(image, numSegments) {
        if (!image || !image.naturalWidth) return null;
        const key = `${image.src || 'img'}|${numSegments}`;
        let slices = this._sliceCache.get(key);
        if (!slices) {
            slices = ImageSlicer.sliceVertical(image, numSegments, 4);
            if (slices.length > 0) {
                this._sliceCache.set(key, slices);
            }
        }
        return slices.length > 0 ? slices : null;
    }

    /**
     * 渲染骨骼驱动的鱼
     * 性能优化：直接遍历骨骼避免数组分配、小鱼跳过鳍叠加、切片缓存共享
     */
    render(ctx, fish, skeleton, image) {
        const cfg = fish.config;
        const size = fish.size;
        const imageScale = cfg.imageScale || 1.6;
        const numSegments = skeleton.numSegments;
        const slices = this._getSlices(image, numSegments);
        if (!slices) return false;

        const spine = skeleton.spine;
        if (!spine || spine.length < 2) return false;

        ctx.save();

        // 景深/透明度
        const specialAlpha = cfg.special === 'invisible' ? (fish._invisibleAlpha || 1) : 1;
        const dyingFade = fish.state === 'dying' ? Math.max(0, 1 - fish._deathTimer * 2) : 1;
        ctx.globalAlpha = (fish._depthAlpha || 1) * specialAlpha * dyingFade;

        // 定位到鱼的世界坐标 + 朝向
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);
        if (fish._roll) ctx.rotate(fish._roll);

        // 死亡翻转
        if (fish.state === 'dying') {
            const flipT = Math.min(1, fish._deathTimer * 2.5);
            ctx.rotate(Math.PI * flipT);
        }

        ctx.scale(fish._depthScale || 1, (fish._depthScale || 1) * (1 + (fish._pitch || 0)));

        // 发光外光晕
        if (fish.isBoss || cfg.glow) {
            this._renderGlow(ctx, fish, size);
        }

        // ===== 核心：骨骼驱动的切片变形渲染 =====
        const imgW = image.naturalWidth;
        const imgH = image.naturalHeight;
        const displayScale = (size * imageScale) / imgW;
        const displayH = imgH * displayScale;
        const spineLen = spine.length;
        const boneMapping = this._getBoneMapping(slices.length, spineLen);

        // 从尾部向头部绘制（后绘制的头部覆盖在上面）
        // slice[0]=左=尾 → spine[last], slice[last]=右=头 → spine[0]
        for (let i = slices.length - 1; i >= 0; i--) {
            const slice = slices[i];
            const bone = spine[boneMapping[i]];

            ctx.save();
            ctx.translate(bone.wx, bone.wy);
            ctx.rotate(bone.wAngle);
            ctx.drawImage(slice.canvas, -slice.srcW * displayScale * 0.5, -displayH * 0.5, slice.srcW * displayScale, displayH);
            ctx.restore();
        }

        // ===== 独立扇动的胸鳍（仅中等以上鱼，小鱼跳过以省性能）=====
        if (size >= 35) {
            this._renderPectoralFins(ctx, fish, skeleton, spine);
        }

        // 受击闪白
        if (fish._hitFlash > 0 || fish.animState === 'hurt') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(fish._hitFlash * 0.5, fish.animState === 'hurt' ? 0.35 : 0) * (fish._depthAlpha || 1);
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < spineLen; i++) {
                const b = spine[i];
                ctx.beginPath();
                ctx.ellipse(b.wx, b.wy, b.width * 0.7, b.width * 0.5, b.wAngle, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
        return true;
    }

    /**
     * 发光外光晕
     */
    _renderGlow(ctx, fish, size) {
        const cfg = fish.config;
        const glowColor = cfg.glowColor || cfg.lureColor || cfg.accentColor || '#FFD700';
        let pulse = Math.sin(fish._time * 3) * 0.2 + 0.8;
        if (cfg.special === 'electric' && fish._electricPulse > 0) pulse = fish._electricPulse;
        if (cfg.special === 'split') pulse = fish._splitPulse || 0.8;

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

    /**
     * 独立扇动胸鳍（半透明程序化薄膜，叠加在图片上）
     * 位置：第2节脊椎两侧，随骨骼角度自然贴合身体
     */
    _renderPectoralFins(ctx, fish, skeleton, spine) {
        if (!spine || spine.length < 2) return;
        const cfg = fish.config;
        const finSwing = skeleton.getFinSwing();
        const anchor = spine[1]; // 第2节脊椎（使用预计算的 wx/wy/wAngle）

        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(anchor.wx, anchor.wy + side * anchor.width * 0.5);
            ctx.rotate(anchor.wAngle + side * (Math.PI / 4 + finSwing));

            ctx.globalAlpha = 0.55;
            const grad = ctx.createLinearGradient(0, 0, fish.size * 0.35, 0);
            grad.addColorStop(0, Utils.rgba(cfg.finColor, 0.7));
            grad.addColorStop(1, Utils.rgba(cfg.accentColor, 0.05));
            ctx.fillStyle = grad;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(fish.size * 0.15, side * fish.size * 0.06, fish.size * 0.35, side * fish.size * 0.12);
            ctx.quadraticCurveTo(fish.size * 0.2, 0, 0, 0);
            ctx.fill();
            ctx.restore();
        }
    }
}

// 全局单例（切片缓存共享）
export const skeletalFishRenderer = new SkeletalFishRenderer();
