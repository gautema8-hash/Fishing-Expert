/**
 * 摄像机
 * 视口管理、屏幕震动、视差偏移计算
 */
import { Utils } from '../core/Utils.js';

export class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.targetX = 0;
        this.targetY = 0;

        // 屏幕震动
        this.shakeX = 0;
        this.shakeY = 0;
        this._shakeIntensity = 0;
        this._shakeDuration = 0;
        this._shakeTime = 0;
        this._shakeSeed = Math.random() * 1000;
    }

    /**
     * 触发屏幕震动
     * @param {number} intensity - 震动强度（像素）
     * @param {number} duration - 持续时间（秒）
     */
    shake(intensity, duration) {
        // 取较大的震动强度
        if (intensity > this._shakeIntensity || this._shakeTime <= 0) {
            this._shakeIntensity = intensity;
            this._shakeDuration = duration;
            this._shakeTime = duration;
        }
    }

    /**
     * 更新摄像机
     */
    update(dt) {
        // 平滑跟随目标
        this.x = Utils.lerp(this.x, this.targetX, 0.1);
        this.y = Utils.lerp(this.y, this.targetY, 0.1);

        // 屏幕震动衰减
        if (this._shakeTime > 0) {
            this._shakeTime -= dt;
            const progress = this._shakeTime / this._shakeDuration;
            const currentIntensity = this._shakeIntensity * Utils.easeOutQuad(progress);

            // 使用柏林噪声风格的伪随机震动
            this._shakeSeed += dt * 50;
            this.shakeX = (Math.sin(this._shakeSeed) * 0.5 + Math.sin(this._shakeSeed * 1.7) * 0.3 + Math.sin(this._shakeSeed * 2.3) * 0.2) * currentIntensity;
            this.shakeY = (Math.cos(this._shakeSeed * 1.3) * 0.5 + Math.cos(this._shakeSeed * 1.9) * 0.3 + Math.cos(this._shakeSeed * 2.7) * 0.2) * currentIntensity;

            if (this._shakeTime <= 0) {
                this.shakeX = 0;
                this.shakeY = 0;
                this._shakeIntensity = 0;
            }
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    /**
     * 获取指定层的视差偏移
     * @param {number} layerSpeed - 层速度系数（0-1，0为远景，1为前景）
     */
    getLayerOffset(layerSpeed) {
        return {
            x: this.x * layerSpeed + this.shakeX,
            y: this.y * layerSpeed + this.shakeY
        };
    }

    /**
     * 应用摄像机变换到 canvas context
     */
    applyTransform(ctx, layerSpeed = 1) {
        const offset = this.getLayerOffset(layerSpeed);
        ctx.translate(offset.x, offset.y);
    }

    /**
     * 重置大小
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    get isShaking() {
        return this._shakeTime > 0;
    }
}
