/**
 * 渲染器
 * 多 Canvas 分层管理，统一渲染调度
 * v2 升级：
 *  - 新增第 6 层 glow（发光层，位于 fx 与 ui 之间）：所有自发光物体在此用纯色绘制
 *  - 新增 Bloom 泛光后处理：缩小采集亮部 → 小尺寸多次模糊 → lighter 混合叠加
 *  - 画质分级：high 全效果 / medium 减少模糊次数 / low 关闭 Bloom
 */
import { Camera } from './Camera.js';

export class Renderer {
    constructor(container) {
        this.container = container;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera = new Camera(this.width, this.height);
        this._canvases = {};
        this._layers = [];
        this._quality = 'high';

        // Bloom 离屏小尺寸画布（1/4 分辨率，用于高效模糊）
        this._bloomCanvas = document.createElement('canvas');
        this._bloomCanvas.id = 'canvas-bloom-offscreen';
        this._bloomCtx = this._bloomCanvas.getContext('2d');

        this._initCanvases();
    }

    _initCanvases() {
        // 图层定义（从下到上）
        // glow 层用法：发光鱼 / 金币 / 炮弹 / 暴击特效 / UI 金边在绘制主画面的同时，
        // 也用纯色（任意颜色均可，Bloom 只采集亮度）绘制到 getCtx('glow')。
        // 该层每帧结束时会被后处理模糊成光晕，原始纯色图形会被清除，不会直接显示。
        const layerDefs = [
            { id: 'bg', zIndex: 1, opacity: 1 },
            { id: 'mid', zIndex: 2, opacity: 1 },
            { id: 'game', zIndex: 3, opacity: 1 },
            { id: 'fx', zIndex: 4, opacity: 1 },
            { id: 'glow', zIndex: 5, opacity: 1 }, // 新增：发光采集层
            { id: 'ui', zIndex: 6, opacity: 1 }
        ];

        for (const def of layerDefs) {
            const canvas = document.createElement('canvas');
            canvas.id = `canvas-${def.id}`;
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = def.zIndex;
            canvas.style.pointerEvents = def.id === 'game' ? 'auto' : 'none';
            canvas.width = this.width;
            canvas.height = this.height;

            const ctx = canvas.getContext('2d');
            this.container.appendChild(canvas);

            this._canvases[def.id] = { canvas, ctx, ...def };
            this._layers.push(def.id);
        }
    }

    /**
     * 获取指定层的 context
     * 发光物体请同时绘制到 getCtx('glow') 以获得泛光效果
     */
    getCtx(layerId) {
        return this._canvases[layerId]?.ctx;
    }

    /**
     * 清空指定层
     */
    clearLayer(layerId) {
        const layer = this._canvases[layerId];
        if (layer) {
            layer.ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    /**
     * 清空所有层
     */
    clearAll() {
        for (const layerId of this._layers) {
            this.clearLayer(layerId);
        }
    }

    /**
     * 开始渲染帧
     */
    beginFrame() {
        this.clearAll();
    }

    /**
     * 结束渲染帧：执行 Bloom 泛光后处理
     */
    endFrame() {
        this._postProcess();
    }

    /**
     * Bloom 泛光后处理
     * 流程：
     *  1. 将 glow 层缩小到 1/4 采集亮部（缩小本身带来一次自然模糊）
     *  2. 在 1/4 小尺寸上多次 Gaussian blur（high: 3 次半径 5px；medium: 1 次半径 3px）
     *  3. 清空 glow 层，把模糊亮部放大回原尺寸，以 'lighter' 混合叠加（alpha 0.5~0.7）
     * low 画质直接关闭，清空 glow 层。
     */
    _postProcess() {
        const glow = this._canvases['glow'];
        if (!glow) return;
        const gctx = glow.ctx;

        // low 画质：关闭 Bloom，仅清空发光层
        if (this._quality === 'low') {
            gctx.clearRect(0, 0, this.width, this.height);
            return;
        }

        // 1. 缩小采集亮部（1/4 尺寸，性能友好）
        const bw = Math.max(1, Math.floor(this.width / 4));
        const bh = Math.max(1, Math.floor(this.height / 4));
        if (this._bloomCanvas.width !== bw || this._bloomCanvas.height !== bh) {
            this._bloomCanvas.width = bw;
            this._bloomCanvas.height = bh;
        }
        const bctx = this._bloomCtx;
        bctx.clearRect(0, 0, bw, bh);
        bctx.imageSmoothingEnabled = true;
        bctx.imageSmoothingQuality = 'high';
        bctx.drawImage(glow.canvas, 0, 0, bw, bh);

        // 2. 多次模糊近似高斯（在小尺寸上进行，总半径等效 4-8px）
        const passes = this._quality === 'high' ? 3 : 1;
        const blurR = this._quality === 'high' ? 5 : 3;
        for (let i = 0; i < passes; i++) {
            bctx.save();
            bctx.filter = `blur(${blurR}px)`;
            bctx.drawImage(this._bloomCanvas, 0, 0, bw, bh);
            bctx.restore();
        }

        // 3. 清空 glow 层原始纯色，叠加模糊后的光晕（lighter 发光叠加）
        gctx.clearRect(0, 0, this.width, this.height);
        gctx.save();
        gctx.globalCompositeOperation = 'lighter';
        gctx.globalAlpha = this._quality === 'high' ? 0.65 : 0.5;
        gctx.imageSmoothingEnabled = true;
        gctx.imageSmoothingQuality = 'high';
        gctx.filter = 'blur(2px)';
        gctx.drawImage(this._bloomCanvas, 0, 0, bw, bh, 0, 0, this.width, this.height);
        gctx.restore();
    }

    /**
     * 调整大小
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.camera.resize(width, height);

        for (const layerId of this._layers) {
            const layer = this._canvases[layerId];
            layer.canvas.width = width;
            layer.canvas.height = height;
        }
    }

    /**
     * 设置画质
     *  high   : Bloom 全开（3 次模糊，叠加强度 0.65）
     *  medium : Bloom 简化（1 次模糊，叠加强度 0.5）
     *  low    : 关闭 Bloom
     */
    setQuality(quality) {
        this._quality = quality;
        // 根据画质调整
        switch (quality) {
            case 'low':
                // 低画质：关闭 Bloom
                break;
            case 'medium':
                // 中画质：减少模糊次数
                break;
            case 'high':
            default:
                // 高画质：全效果
                break;
        }
    }

    get quality() {
        return this._quality;
    }

    /**
     * 销毁
     */
    destroy() {
        for (const layerId of this._layers) {
            const layer = this._canvases[layerId];
            if (layer.canvas.parentNode) {
                layer.canvas.parentNode.removeChild(layer.canvas);
            }
        }
        this._canvases = {};
        this._layers = [];
    }
}
