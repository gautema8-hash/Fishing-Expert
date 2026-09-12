/**
 * 渲染器
 * 多 Canvas 分层管理，统一渲染调度
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
        this._initCanvases();
    }

    _initCanvases() {
        // 图层定义（从下到上）
        const layerDefs = [
            { id: 'bg', zIndex: 1, opacity: 1 },
            { id: 'mid', zIndex: 2, opacity: 1 },
            { id: 'game', zIndex: 3, opacity: 1 },
            { id: 'fx', zIndex: 4, opacity: 1 },
            { id: 'ui', zIndex: 5, opacity: 1 }
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
     * 结束渲染帧
     */
    endFrame() {
        // 可添加后期处理
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
     */
    setQuality(quality) {
        this._quality = quality;
        // 根据画质调整
        switch (quality) {
            case 'low':
                // 低画质：关闭部分层的特效
                break;
            case 'medium':
                break;
            case 'high':
            default:
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
