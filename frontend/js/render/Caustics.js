/**
 * 水面焦散光影
 * 阳光穿透水面，在水下场景投射动态晃动的水波纹焦散光斑
 * v2：焦散颜色/强度随昼夜平滑切换（白昼蓝白 / 黄昏金红 / 深夜幽蓝）
 */
import { Utils } from '../core/Utils.js';

export class Caustics {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._time = 0;
        this._intensity = 0.4;
        this._enabled = true;
        this._offscreenCanvas = document.createElement('canvas');
        this._offscreenCanvas.width = 256;
        this._offscreenCanvas.height = 256;
        this._offscreenCtx = this._offscreenCanvas.getContext('2d');
        this._tileX = Math.ceil(width / 256) + 1;
        this._tileY = Math.ceil(height / 256) + 1;
        this._generateTexture();
    }

    /**
     * 程序化生成焦散纹理
     * 使用多层正弦波叠加模拟水面光斑
     */
    _generateTexture() {
        const ctx = this._offscreenCtx;
        const w = 256, h = 256;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // 多层正弦波叠加
                let value = 0;
                value += Math.sin(x * 0.05 + y * 0.03) * 0.3;
                value += Math.sin(x * 0.03 - y * 0.05 + 1.3) * 0.3;
                value += Math.sin(x * 0.07 + y * 0.07 + 2.1) * 0.2;
                value += Math.sin((x + y) * 0.04 + 0.8) * 0.2;
                value = (value + 1) / 2; // 归一化到 0-1

                // 增强对比度
                value = Math.pow(value, 2);

                const idx = (y * w + x) * 4;
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = Math.floor(value * 255);
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    update(dt) {
        this._time += dt;
    }

    render(ctx, dayPhase = 0) {
        if (!this._enabled) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 根据昼夜调整强度和颜色
        // 白昼蓝白(220,240,255) / 黄昏金红(255,200,150) / 深夜幽蓝(100,150,200)
        let intensity = this._intensity;
        let color = { r: 200, g: 240, b: 255 };

        if (dayPhase < 0.33) {
            // 白昼：明亮蓝白
            intensity *= 1.2;
            color = { r: 220, g: 240, b: 255 };
        } else if (dayPhase < 0.66) {
            // 黄昏：金红
            intensity *= 0.8;
            color = { r: 255, g: 200, b: 150 };
        } else {
            // 深夜：微弱幽蓝
            intensity *= 0.3;
            color = { r: 100, g: 150, b: 200 };
        }

        // 动态偏移纹理坐标，模拟水流晃动
        const offsetX = Math.sin(this._time * 0.3) * 30 + Math.sin(this._time * 0.7) * 15;
        const offsetY = Math.cos(this._time * 0.25) * 20 + Math.cos(this._time * 0.6) * 10;

        // 平铺绘制焦散纹理
        ctx.globalAlpha = intensity;
        for (let ty = -1; ty < this._tileY; ty++) {
            for (let tx = -1; tx < this._tileX; tx++) {
                const x = tx * 256 + offsetX + (ty % 2) * 128;
                const y = ty * 256 + offsetY;
                // 顶部更亮，底部渐暗
                const depthFade = Utils.clamp(1 - y / this.height * 0.5, 0.2, 1);
                ctx.globalAlpha = intensity * depthFade;
                ctx.drawImage(this._offscreenCanvas, x, y);
            }
        }

        // 顶部光束效果
        const beamGradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
        beamGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.15})`);
        beamGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = beamGradient;
        ctx.fillRect(0, 0, this.width, this.height * 0.6);

        ctx.restore();
    }

    setIntensity(value) {
        this._intensity = Utils.clamp(value, 0, 1);
    }

    setEnabled(enabled) {
        this._enabled = enabled;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this._tileX = Math.ceil(width / 256) + 1;
        this._tileY = Math.ceil(height / 256) + 1;
    }
}

/**
 * 体积雾效果（v2 增强版）
 *  - 屏幕空间径向光束：3-5 束从水面顶部向下投射，位置缓慢漂移
 *  - 光束横向中心亮、边缘透明（软边），内部叠加正弦条纹模拟水中微粒
 *  - 昼夜强度：白昼 0.15 / 黄昏 0.12 / 深夜 0.05
 *  - 深度雾：getFogParams(y, size) 按鱼的水深与大小计算雾浓度/蓝染色
 *  - 雾层水平缓慢流动（正弦偏移）
 */
export class VolumetricFog {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._time = 0;
        this._density = 0.3;
        this._enabled = true;
        this._lightBeams = [];
        this._fogLayers = [];
        // 当前昼夜阶段缓存（供 getFogParams 使用）
        this._currentDayPhase = 0;
        this._initFogLayers();
        this._initLightBeams();
    }

    _initFogLayers() {
        // 多层雾，不同密度和移动速度，随水流缓慢水平流动
        for (let i = 0; i < 4; i++) {
            this._fogLayers.push({
                y: this.height * (0.3 + i * 0.2),
                height: this.height * 0.4,
                speed: 5 + i * 3,
                offset: Math.random() * 1000,
                density: 0.1 + i * 0.08,
                flowPhase: Math.random() * Math.PI * 2
            });
        }
    }

    _initLightBeams() {
        // 丁达尔光束 5 束，位置随机、宽度上窄下宽、缓慢漂移
        for (let i = 0; i < 5; i++) {
            this._lightBeams.push({
                x: this.width * (0.1 + i * 0.2),
                width: 60 + Math.random() * 80,
                angle: -0.1 + Math.random() * 0.2,
                speed: 0.2 + Math.random() * 0.3,
                offset: Math.random() * 100,
                intensity: 0.10 + Math.random() * 0.08 // 基础强度 ~0.15（白昼）
            });
        }
    }

    update(dt) {
        this._time += dt;
    }

    /**
     * 根据鱼的水深(y)与大小(远近)计算雾参数
     * @param {number} y    鱼的屏幕 y 坐标（0=水面顶部，height=海底）
     * @param {number} size 鱼体半径（像素），越小表示越远
     * @returns {{fogAmount:number, alpha:number, tint:{r:number,g:number,b:number}, tintStrength:number}}
     *   fogAmount   雾浓度 0(近/浅) ~ 1(远/深)
     *   alpha       鱼应使用的整体透明度（远处更透明）
     *   tint        深海蓝雾色 (5,25,50)
     *   tintStrength 蓝染色强度（叠加在鱼身上的程度）
     */
    getFogParams(y, size = 30) {
        const depthT = Utils.clamp(y / this.height, 0, 1); // 0浅水 1深水
        const distT = Utils.clamp(1 - size / 60, 0, 1);     // 0近 1远
        const fogAmount = Utils.clamp(depthT * 0.55 + distT * 0.45, 0, 1);
        return {
            fogAmount,
            alpha: 1 - fogAmount * 0.45,      // 远处/深水鱼透明度降低
            tint: { r: 5, g: 25, b: 50 },     // 深海蓝
            tintStrength: fogAmount * 0.65    // 远处鱼偏蓝、对比度低
        };
    }

    render(ctx, dayPhase = 0) {
        if (!this._enabled) return;
        this._currentDayPhase = dayPhase;

        ctx.save();

        // 根据昼夜调整雾色和密度
        // 雾色：白昼(100,160,200) / 黄昏(120,80,100) / 深夜(20,40,70)
        // 体积光：白昼(200,230,255) / 黄昏(255,180,120) / 深夜(80,120,180)
        let fogColor, beamColor, densityMult, beamAlphaScale;
        if (dayPhase < 0.33) {
            fogColor = { r: 100, g: 160, b: 200 };
            beamColor = { r: 200, g: 230, b: 255 };
            densityMult = 0.6;
            beamAlphaScale = 1.0;  // 白昼光束强 ~0.15
        } else if (dayPhase < 0.66) {
            fogColor = { r: 120, g: 80, b: 100 };
            beamColor = { r: 255, g: 180, b: 120 };
            densityMult = 0.9;
            beamAlphaScale = 0.8;  // 黄昏暖光 ~0.12
        } else {
            fogColor = { r: 20, g: 40, b: 70 };
            beamColor = { r: 80, g: 120, b: 180 };
            densityMult = 1.2;
            beamAlphaScale = 0.33; // 深夜弱光 ~0.05
        }

        // 绘制体积雾层（远处浓，近处淡），随水流水平流动
        for (const layer of this._fogLayers) {
            const layerOffset = Math.sin(this._time * 0.1 + layer.offset) * 50
                + Math.sin(this._time * 0.05 + layer.flowPhase) * 30; // 缓慢水平流动
            const gradient = ctx.createLinearGradient(0, layer.y - layer.height / 2, 0, layer.y + layer.height / 2);
            gradient.addColorStop(0, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, 0)`);
            gradient.addColorStop(0.5, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, ${layer.density * this._density * densityMult})`);
            gradient.addColorStop(1, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(layerOffset - 100, layer.y - layer.height / 2, this.width + 200, layer.height);
        }

        // 绘制丁达尔光束（软边 + 微粒条纹纹理）
        ctx.globalCompositeOperation = 'lighter';
        for (const beam of this._lightBeams) {
            const beamX = beam.x + Math.sin(this._time * beam.speed + beam.offset) * 40;
            const beamIntensity = beam.intensity * (0.7 + Math.sin(this._time * 0.5 + beam.offset) * 0.3);

            ctx.save();
            ctx.translate(beamX, 0);
            ctx.rotate(beam.angle + Math.sin(this._time * 0.2 + beam.offset) * 0.05);

            // 分 10 行绘制：每行宽度按梯形展开（顶窄底宽），
            // 横向渐变实现中心亮、边缘透明的软边；纵向衰减 + 正弦条纹模拟水中微粒
            const rows = 10;
            const beamH = this.height;
            for (let r = 0; r < rows; r++) {
                const tMid = (r + 0.5) / rows;
                const y0 = (r / rows) * beamH;
                const y1 = ((r + 1) / rows) * beamH;
                const halfW = Utils.lerp(beam.width * 0.5, beam.width * 1.5, tMid);
                // 纵向衰减：顶部亮、底部淡
                const depthFade = Math.pow(1 - tMid, 0.8);
                // 微粒条纹：多组正弦叠加产生细微明暗变化
                const stripe = 0.72
                    + Math.sin(this._time * 2.0 + beam.offset + r * 1.7) * 0.18
                    + Math.sin(this._time * 3.3 + r * 0.9) * 0.10;
                const a = beamIntensity * depthFade * stripe * beamAlphaScale;
                if (a <= 0.001) continue;

                const hGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
                hGrad.addColorStop(0, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, 0)`);
                hGrad.addColorStop(0.5, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${a})`);
                hGrad.addColorStop(1, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, 0)`);
                ctx.fillStyle = hGrad;
                ctx.fillRect(-halfW, y0, halfW * 2, y1 - y0 + 1);
            }
            ctx.restore();
        }

        // 全局雾遮罩（水下越深雾越浓）
        ctx.globalCompositeOperation = 'source-over';
        const globalFog = ctx.createLinearGradient(0, 0, 0, this.height);
        globalFog.addColorStop(0, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, ${0.05 * densityMult})`);
        globalFog.addColorStop(0.7, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, ${0.1 * densityMult})`);
        globalFog.addColorStop(1, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, ${0.2 * densityMult})`);
        ctx.fillStyle = globalFog;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.restore();
    }

    setDensity(value) {
        this._density = Utils.clamp(value, 0, 1);
    }

    setEnabled(enabled) {
        this._enabled = enabled;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }
}
