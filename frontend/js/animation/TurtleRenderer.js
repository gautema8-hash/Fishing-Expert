/**
 * TurtleRenderer.js - 乌龟专用渲染器
 * 实现四腿交替划水、头部伸缩、尾巴摆动的真实游泳动画
 *
 * 渲染策略（覆盖式动画）：
 *   1. 先绘制完整乌龟图片作为壳和身体基底（带轻微上下浮动 bob 和左右摇摆 sway）
 *   2. 在图片上方叠加 4 条程序化动画腿（位置对准图片中静态腿，产生运动错觉）
 *   3. 叠加可伸缩动画头部（从壳右缘缓慢伸出/缩回）
 *   4. 叠加小尾巴（左右小幅摆动）
 *   5. 受击闪白 / 死亡翻转上浮特效
 *
 * 划水步态：对角线交替（前左+后右 ↔ 前右+后左），模拟海龟真实游泳
 */
import { Utils } from '../core/Utils.js';

export class TurtleRenderer {
    constructor() {
        // ===== 动画参数常量（避免运行时重复计算）=====
        this._legPaddleFreq = 3.0;       // 划水角频率 rad/s（约 0.5 次/秒 完整循环）
        this._headExtendPeriod = 2.0;    // 头部伸缩周期（秒）
        this._tailSwayFreq = 2.5;        // 尾巴摆动角频率 rad/s
        this._bobFreq = 2.0;             // 身体上下浮动频率
        this._swayFreq = 1.5;            // 身体左右摇摆频率
    }

    /**
     * 渲染乌龟
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fish - Fish 实例（提供 x,y,angle,size,config,_time,state 等）
     * @param {HTMLImageElement} image - 乌龟图片（头朝右）
     * @returns {boolean} 渲染成功返回 true，调用方应停止后续渲染
     */
    render(ctx, fish, image) {
        if (!fish || !fish._active) return false;
        if (!image || !image.complete || image.naturalWidth === 0) return false;

        const cfg = fish.config;
        const S = fish.size;
        const time = fish._time;
        const isDying = fish.state === 'dying';

        ctx.save();

        // ===== 透明度处理 =====
        const dyingFade = isDying ? Math.max(0, 1 - fish._deathTimer * 2) : 1;
        ctx.globalAlpha = (fish._depthAlpha || 1) * dyingFade;

        // ===== 定位与朝向 =====
        // 局部坐标系：+X 为乌龟游向（头朝右），+Y 为画面下方
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);
        if (fish._roll) ctx.rotate(fish._roll);

        // 死亡翻转（肚皮朝上，逐渐翻转）
        if (isDying) {
            const flipT = Math.min(1, fish._deathTimer * 2.5);
            ctx.rotate(Math.PI * flipT);
        }

        // 景深缩放 + 俯仰拉伸
        ctx.scale(fish._depthScale || 1, (fish._depthScale || 1) * (1 + (fish._pitch || 0)));

        // ===== 水中悬浮感：上下浮动 bob + 左右摇摆 sway =====
        const bobY = Math.sin(time * this._bobFreq) * S * 0.03;
        const swayRot = Math.sin(time * this._swayFreq) * 0.04;
        ctx.translate(0, bobY);
        ctx.rotate(swayRot);

        // ===== 1. 绘制乌龟图片基底 =====
        // 以 this.size 为基准宽度，高度按原始宽高比缩放
        const imageScale = (cfg && cfg.imageScale) ? cfg.imageScale : 1.6;
        const imgW = S * imageScale;
        const ratio = (image.naturalWidth > 0 && image.naturalHeight > 0)
            ? image.naturalHeight / image.naturalWidth : 0.7;
        const imgH = imgW * ratio;
        ctx.drawImage(image, -imgW / 2, -imgH / 2, imgW, imgH);

        // ===== 2. 计算划水相位 =====
        // 对角线步态：相位A（前左+后右）与相位B（前右+后左）反相交替
        // strokeA / strokeB 范围 0（完全收回）~ 1（划到最深处）
        let strokeA = 0.5;
        let strokeB = 0.5;
        if (!isDying) {
            const sA = Math.sin(time * this._legPaddleFreq);
            const sB = Math.sin(time * this._legPaddleFreq + Math.PI); // 与 A 反相
            strokeA = (sA + 1) * 0.5;
            strokeB = (sB + 1) * 0.5;
        }

        // ===== 3. 绘制尾巴（先于腿，被后腿部分遮挡）=====
        this._renderTail(ctx, S, time, isDying);

        // ===== 4. 绘制四条动画腿（覆盖图片中的静态腿）=====
        // 腿根局部坐标（头朝 +X）：
        //   前左腿(上侧)：x=-0.20S, y=-0.25S  baseAngle≈-2.1rad（指向左上方）
        //   前右腿(下侧)：x=-0.20S, y=+0.25S  baseAngle≈+2.1rad（指向左下方）
        //   后左腿(上侧)：x=-0.35S, y=-0.20S  baseAngle≈-2.4rad（更偏左）
        //   后右腿(下侧)：x=-0.35S, y=+0.20S  baseAngle≈+2.4rad（更偏左）
        //
        // 相位A：前左（上侧）+ 后右（下侧）同时划水
        this._renderLeg(ctx, S, cfg, -0.20 * S, -0.25 * S, -2.1, strokeA, true, false);
        this._renderLeg(ctx, S, cfg, -0.35 * S,  0.20 * S,  2.4, strokeA, false, true);
        // 相位B：前右（下侧）+ 后左（上侧）同时划水
        this._renderLeg(ctx, S, cfg, -0.20 * S,  0.25 * S,  2.1, strokeB, false, false);
        this._renderLeg(ctx, S, cfg, -0.35 * S, -0.20 * S, -2.4, strokeB, true, true);

        // ===== 5. 绘制可伸缩头部（最后绘制，在最上层）=====
        this._renderHead(ctx, S, cfg, time, isDying);

        // ===== 6. 受击闪白 / hurt 状态变白 =====
        if (fish._hitFlash > 0 || fish.animState === 'hurt') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(
                fish._hitFlash * 0.5,
                fish.animState === 'hurt' ? 0.35 : 0
            );
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(0, 0, S * 0.55, S * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
        return true;
    }

    /**
     * 绘制一条桨状腿（蹼足）
     *
     * 划水动作：
     *   - 收回阶段（stroke→0）：腿向前收拢，蹼叶变窄（减少阻力）
     *   - 划水阶段（stroke→1）：腿向后扫动，蹼叶张开（推水前进）
     *
     * 上侧腿与下侧腿为镜像关系，旋转方向相反：
     *   上侧腿 power stroke 为逆时针（角度偏移为负）
     *   下侧腿 power stroke 为顺时针（角度偏移为正）
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} S - 乌龟尺寸
     * @param {Object} cfg - 乌龟颜色配置
     * @param {number} pivotX - 腿根局部 X
     * @param {number} pivotY - 腿根局部 Y
     * @param {number} baseAngle - 腿根默认方向角（弧度）
     * @param {number} stroke - 划水进度 0(收回)~1(划到底)
     * @param {boolean} isUpper - 是否上侧腿（镜像翻转旋转方向）
     * @param {boolean} isBack - 是否后腿（更小幅度和桨长）
     */
    _renderLeg(ctx, S, cfg, pivotX, pivotY, baseAngle, stroke, isUpper, isBack) {
        // 桨叶长度：前腿较长（主要推进器），后腿较短（转向辅助）
        const paddleLen = isBack ? S * 0.30 : S * 0.45;
        // 桨叶最大宽度
        const paddleBaseW = isBack ? S * 0.08 : S * 0.12;
        // 划水总摆幅（弧度）：前腿约 70°，后腿约 45°
        const sweepRange = isBack ? 0.7 : 1.2;

        // 计算划水角度偏移
        // 收回时偏移约 +0.35rad（~20°），划到底偏移约 -0.87rad（~-50°）
        // 上侧腿与下侧腿镜像：方向相反
        let angleOffset;
        if (isUpper) {
            // 上侧：收回时腿略向前（顺时针），划水时向后扫（逆时针）
            angleOffset = Utils.lerp(0.35, -0.87, stroke);
        } else {
            // 下侧：收回时腿略向前（逆时针），划水时向后扫（顺时针）
            angleOffset = Utils.lerp(-0.35, 0.87, stroke);
        }

        // 蹼叶张合：划水时张开（宽），收回时收拢（窄）
        const webbingOpen = 0.65 + stroke * 0.35; // 0.65 ~ 1.0
        const paddleW = paddleBaseW * webbingOpen;

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(baseAngle + angleOffset);

        // 绘制渐变填充的桨叶
        // 根部深绿（finColor）→ 中部主色（color）→ 尖端亮绿（accentColor，半透明透光）
        const grad = ctx.createLinearGradient(0, 0, paddleLen, 0);
        grad.addColorStop(0, Utils.rgba(cfg.finColor || '#1E6B42', 0.92));
        grad.addColorStop(0.5, Utils.rgba(cfg.color || '#2D8B5E', 0.85));
        grad.addColorStop(1, Utils.rgba(cfg.accentColor || '#4ADE80', 0.55));
        ctx.fillStyle = grad;

        // 桨叶形状：根部窄 → 中部宽 → 尖端圆弧收束
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // 上边缘（从根部向尖端）
        ctx.quadraticCurveTo(paddleLen * 0.25, -paddleW, paddleLen * 0.65, -paddleW * 0.7);
        // 尖端圆弧
        ctx.quadraticCurveTo(paddleLen * 1.0, 0, paddleLen * 0.65, paddleW * 0.7);
        // 下边缘（从尖端回根部）
        ctx.quadraticCurveTo(paddleLen * 0.25, paddleW, 0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * 绘制小尾巴（左右小幅摆动）
     * 尾巴位于壳后端（-X 方向），呈小三角形
     */
    _renderTail(ctx, S, time, isDying) {
        // 死亡时尾巴自然下垂（不摆动）
        const sway = isDying ? 0 : Math.sin(time * this._tailSwayFreq) * 0.2;
        const tailLen = S * 0.12;

        ctx.save();
        ctx.translate(-S * 0.38, 0);
        ctx.rotate(sway);

        // 尾巴渐变：根部深绿 → 尖端透明
        const grad = ctx.createLinearGradient(0, 0, -tailLen, 0);
        grad.addColorStop(0, Utils.rgba('#1E6B42', 0.9));
        grad.addColorStop(1, Utils.rgba('#1E6B42', 0.2));
        ctx.fillStyle = grad;

        // 三角形尾尖
        ctx.beginPath();
        ctx.moveTo(0, -S * 0.03);
        ctx.lineTo(-tailLen, 0);
        ctx.lineTo(0, S * 0.03);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * 绘制可伸缩头部
     *
     * 头部从壳右前缘缓慢伸出再缩回，周期约 2 秒。
     * 伸出时头部向前延伸约 10px（S=56 时），缩回时贴近壳缘。
     * 头部带眼睛（白眼珠 + 黑瞳孔 + 高光点）。
     */
    _renderHead(ctx, S, cfg, time, isDying) {
        // 伸缩周期：正弦曲线，0=完全缩回，1=完全伸出
        const cyclePhase = (time / this._headExtendPeriod) % 1;
        const extendT = (Math.sin(cyclePhase * Math.PI * 2 - Math.PI / 2) + 1) * 0.5;
        // 伸出幅度：死亡时不伸出
        const extension = isDying ? 0 : extendT * S * 0.18;

        // 头部根部位置（壳右前缘）
        const baseX = S * 0.15;
        const headLen = S * 0.20 + extension;
        const headH = S * 0.14;

        ctx.save();
        ctx.translate(baseX, 0);

        // 头部颜色渐变：颈部深绿 → 头顶亮绿
        const grad = ctx.createLinearGradient(0, 0, headLen, 0);
        grad.addColorStop(0, Utils.rgba(cfg.finColor || '#1E6B42', 0.95));
        grad.addColorStop(0.4, Utils.rgba(cfg.color || '#2D8B5E', 0.95));
        grad.addColorStop(1, Utils.rgba(cfg.accentColor || '#4ADE80', 0.9));
        ctx.fillStyle = grad;

        // 画头部（圆角椭圆）
        ctx.beginPath();
        ctx.ellipse(headLen * 0.5, 0, headLen * 0.55, headH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // ===== 眼睛 =====
        const eyeX = headLen * 0.72;
        const eyeY = -headH * 0.15;
        const eyeR = headH * 0.12;

        // 白眼珠
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        // 黑瞳孔
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(eyeX + eyeR * 0.2, eyeY, eyeR * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // 高光点
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eyeX + eyeR * 0.35, eyeY - eyeR * 0.25, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ===== 全局单例（无状态，所有乌龟共享同一渲染器）=====
export const turtleRenderer = new TurtleRenderer();
