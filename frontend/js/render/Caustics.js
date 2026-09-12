/**
 * 水面焦散光影
 * 阳光穿透水面，在水下场景投射动态晃动的水波纹焦散光斑
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
 * 体积雾效果
 * 深海远处雾气渐浓，近处通透，光影穿透雾层形成光束
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
        this._initFogLayers();
        this._initLightBeams();
    }

    _initFogLayers() {
        // 多层雾，不同密度和移动速度
        for (let i = 0; i < 4; i++) {
            this._fogLayers.push({
                y: this.height * (0.3 + i * 0.2),
                height: this.height * 0.4,
                speed: 5 + i * 3,
                offset: Math.random() * 1000,
                density: 0.1 + i * 0.08
            });
        }
    }

    _initLightBeams() {
        // 丁达尔光束
        for (let i = 0; i < 5; i++) {
            this._lightBeams.push({
                x: this.width * (0.1 + i * 0.2),
                width: 60 + Math.random() * 80,
                angle: -0.1 + Math.random() * 0.2,
                speed: 0.2 + Math.random() * 0.3,
                offset: Math.random() * 100,
                intensity: 0.3 + Math.random() * 0.3
            });
        }
    }

    update(dt) {
        this._time += dt;
    }

    render(ctx, dayPhase = 0) {
        if (!this._enabled) return;

        ctx.save();

        // 根据昼夜调整雾色和密度
        let fogColor, beamColor, densityMult;
        if (dayPhase < 0.33) {
            fogColor = { r: 100, g: 160, b: 200 };
            beamColor = { r: 200, g: 230, b: 255 };
            densityMult = 0.6;
        } else if (dayPhase < 0.66) {
            fogColor = { r: 120, g: 80, b: 100 };
            beamColor = { r: 255, g: 180, b: 120 };
            densityMult = 0.9;
        } else {
            fogColor = { r: 20, g: 40, b: 70 };
            beamColor = { r: 80, g: 120, b: 180 };
            densityMult = 1.2;
        }

        // 绘制体积雾层（远处浓，近处淡）
        for (const layer of this._fogLayers) {
            const layerOffset = Math.sin(this._time * 0.1 + layer.offset) * 50;
            const gradient = ctx.createLinearGradient(0, layer.y - layer.height / 2, 0, layer.y + layer.height / 2);
            gradient.addColorStop(0, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, 0)`);
            gradient.addColorStop(0.5, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, ${layer.density * this._density * densityMult})`);
            gradient.addColorStop(1, `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(layerOffset - 100, layer.y - layer.height / 2, this.width + 200, layer.height);
        }

        // 绘制丁达尔光束
        ctx.globalCompositeOperation = 'lighter';
        for (const beam of this._lightBeams) {
            const beamX = beam.x + Math.sin(this._time * beam.speed + beam.offset) * 40;
            const beamIntensity = beam.intensity * (0.7 + Math.sin(this._time * 0.5 + beam.offset) * 0.3);

            ctx.save();
            ctx.translate(beamX, 0);
            ctx.rotate(beam.angle + Math.sin(this._time * 0.2 + beam.offset) * 0.05);

            const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
            gradient.addColorStop(0, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${beamIntensity * densityMult})`);
            gradient.addColorStop(0.5, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${beamIntensity * 0.3 * densityMult})`);
            gradient.addColorStop(1, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(-beam.width / 2, 0);
            ctx.lineTo(beam.width / 2, 0);
            ctx.lineTo(beam.width * 1.5, this.height);
            ctx.lineTo(-beam.width * 1.5, this.height);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // 全局雾遮罩（远处渐浓）
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
