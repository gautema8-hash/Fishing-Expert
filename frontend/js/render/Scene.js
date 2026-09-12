/**
 * 场景管理器
 * 多层视差滚动、龙宫背景绘制、昼夜切换
 */
import { Utils } from '../core/Utils.js';
import { GameConfig } from '../config/gameConfig.js';

export class Scene {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._time = 0;
        this._scrollOffset = 0;
        this._dayPhase = 0; // 0=白昼, 0.33=黄昏, 0.66=深夜
        this._breathingPhase = 0;

        // 预生成背景元素
        this._coralColumns = this._generateCoralColumns();
        this._seaweeds = this._generateSeaweeds();
        this._palaceLights = this._generatePalaceLights();
        this._bubbles = [];
    }

    _generateCoralColumns() {
        const columns = [];
        for (let i = 0; i < 8; i++) {
            columns.push({
                x: i * (this.width / 4) + Utils.random(-100, 100),
                height: Utils.random(150, 350),
                width: Utils.random(30, 60),
                type: Utils.randomChoice(['coral', 'jade', 'dragon_pillar']),
                swayOffset: Math.random() * Math.PI * 2
            });
        }
        return columns;
    }

    _generateSeaweeds() {
        const seaweeds = [];
        for (let i = 0; i < 20; i++) {
            seaweeds.push({
                x: Utils.random(0, this.width * 2),
                height: Utils.random(60, 180),
                segments: Math.floor(Utils.random(4, 8)),
                swaySpeed: Utils.random(0.5, 1.5),
                swayAmount: Utils.random(5, 15),
                color: Utils.randomChoice(['#1E6B42', '#2D8B5E', '#0D4F3A', '#1A5C3A'])
            });
        }
        return seaweeds;
    }

    _generatePalaceLights() {
        const lights = [];
        for (let i = 0; i < 6; i++) {
            lights.push({
                x: Utils.random(100, this.width - 100),
                y: Utils.random(100, this.height * 0.5),
                radius: Utils.random(40, 80),
                intensity: Utils.random(0.3, 0.6),
                flickerSpeed: Utils.random(1, 3),
                flickerOffset: Math.random() * Math.PI * 2
            });
        }
        return lights;
    }

    update(dt) {
        this._time += dt;
        this._scrollOffset += GameConfig.scene.bgScrollSpeed * dt;
        this._breathingPhase += GameConfig.scene.breathingSpeed * dt;

        // 昼夜循环
        this._dayPhase = (this._time / GameConfig.scene.dayNightCycleDuration) % 1;
    }

    /**
     * 获取当前昼夜阶段颜色
     */
    getDayColors() {
        const phase = this._dayPhase;
        if (phase < 0.33) {
            // 白昼
            const t = phase / 0.33;
            return {
                bgTop: Utils.lerpColor('#1A4A6B', '#0D3A5C', t),
                bgBottom: Utils.lerpColor('#0A2A4A', '#06223A', t),
                fog: '#64A0C8',
                light: '#C8E6FF'
            };
        } else if (phase < 0.66) {
            // 黄昏
            const t = (phase - 0.33) / 0.33;
            return {
                bgTop: Utils.lerpColor('#0D3A5C', '#3D1F3D', t),
                bgBottom: Utils.lerpColor('#06223A', '#1A0F2A', t),
                fog: '#785064',
                light: '#FFB478'
            };
        } else {
            // 深夜
            const t = (phase - 0.66) / 0.34;
            return {
                bgTop: Utils.lerpColor('#3D1F3D', '#0A1525', t),
                bgBottom: Utils.lerpColor('#1A0F2A', '#03101F', t),
                fog: '#142846',
                light: '#5078B4'
            };
        }
    }

    /**
     * 渲染背景层（远景龙宫，视差最慢）
     */
    renderBackground(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.1);

        ctx.save();
        ctx.translate(offset.x, offset.y);

        // 深海渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, colors.bgTop);
        gradient.addColorStop(1, colors.bgBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(-100, -100, this.width + 200, this.height + 200);

        // 远景龙宫轮廓（朦胧）
        this._renderPalaceSilhouette(ctx, colors);

        // 远景珊瑚柱
        for (const col of this._coralColumns) {
            if (col.type === 'dragon_pillar') {
                this._renderDragonPillar(ctx, col, colors, 0.3);
            }
        }

        ctx.restore();
    }

    /**
     * 渲染中景层（珊瑚海草，视差中等）
     */
    renderMidground(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.4);

        ctx.save();
        ctx.translate(offset.x, offset.y);

        // 中景珊瑚柱
        for (const col of this._coralColumns) {
            if (col.type !== 'dragon_pillar') {
                this._renderCoralColumn(ctx, col, colors);
            }
        }

        // 海草
        for (const seaweed of this._seaweeds) {
            this._renderSeaweed(ctx, seaweed);
        }

        ctx.restore();
    }

    /**
     * 渲染前景层（近景海草，视差最快）
     */
    renderForeground(ctx, camera) {
        const offset = camera.getLayerOffset(0.7);
        ctx.save();
        ctx.translate(offset.x, offset.y);

        // 底部沙地
        const sandGradient = ctx.createLinearGradient(0, this.height - 80, 0, this.height);
        sandGradient.addColorStop(0, 'rgba(20, 50, 70, 0)');
        sandGradient.addColorStop(1, 'rgba(15, 40, 60, 0.8)');
        ctx.fillStyle = sandGradient;
        ctx.fillRect(-100, this.height - 80, this.width + 200, 100);

        ctx.restore();
    }

    /**
     * 渲染龙宫宫灯光效
     */
    renderLights(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.2);

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.globalCompositeOperation = 'lighter';

        for (const light of this._palaceLights) {
            const flicker = 0.7 + Math.sin(this._time * light.flickerSpeed + light.flickerOffset) * 0.3;
            const breathing = 0.8 + Math.sin(this._breathingPhase) * 0.2;
            const intensity = light.intensity * flicker * breathing;

            const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
            gradient.addColorStop(0, Utils.rgba(colors.light, intensity * 0.8));
            gradient.addColorStop(0.5, Utils.rgba(colors.light, intensity * 0.3));
            gradient.addColorStop(1, Utils.rgba(colors.light, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
            ctx.fill();

            // 宫灯本体
            ctx.fillStyle = Utils.rgba('#FFD700', intensity);
            ctx.beginPath();
            ctx.arc(light.x, light.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _renderPalaceSilhouette(ctx, colors) {
        // 远景龙宫建筑轮廓
        ctx.fillStyle = Utils.rgba(colors.fog, 0.15);
        const baseY = this.height * 0.6;

        // 主殿
        ctx.beginPath();
        ctx.moveTo(this.width * 0.3, baseY);
        ctx.lineTo(this.width * 0.35, baseY - 120);
        ctx.lineTo(this.width * 0.4, baseY - 100);
        ctx.lineTo(this.width * 0.45, baseY - 150);
        ctx.lineTo(this.width * 0.5, baseY - 130);
        ctx.lineTo(this.width * 0.55, baseY - 150);
        ctx.lineTo(this.width * 0.6, baseY - 100);
        ctx.lineTo(this.width * 0.65, baseY - 120);
        ctx.lineTo(this.width * 0.7, baseY);
        ctx.closePath();
        ctx.fill();

        // 侧塔
        ctx.fillRect(this.width * 0.15, baseY - 80, 40, 80);
        ctx.fillRect(this.width * 0.8, baseY - 80, 40, 80);
    }

    _renderDragonPillar(ctx, col, colors, alpha = 0.5) {
        const x = ((col.x - this._scrollOffset * 0.1) % (this.width + 200)) - 100;
        const baseY = this.height;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 柱身
        const gradient = ctx.createLinearGradient(x - col.width / 2, 0, x + col.width / 2, 0);
        gradient.addColorStop(0, '#1A3A5A');
        gradient.addColorStop(0.3, '#2A5A7A');
        gradient.addColorStop(0.7, '#2A5A7A');
        gradient.addColorStop(1, '#1A3A5A');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - col.width / 2, baseY - col.height, col.width, col.height);

        // 龙纹浮雕
        ctx.strokeStyle = Utils.rgba('#FFD700', 0.3);
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const y = baseY - col.height + 30 + i * (col.height / 3);
            ctx.beginPath();
            ctx.moveTo(x - col.width / 2 + 5, y);
            ctx.bezierCurveTo(x - 5, y - 10, x + 5, y + 10, x + col.width / 2 - 5, y);
            ctx.stroke();
        }

        // 柱顶装饰
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x - col.width / 2 - 5, baseY - col.height - 8, col.width + 10, 8);

        ctx.restore();
    }

    _renderCoralColumn(ctx, col, colors) {
        const x = ((col.x - this._scrollOffset * 0.3) % (this.width + 200)) - 100;
        const sway = Math.sin(this._time * 0.5 + col.swayOffset) * 5;
        const baseY = this.height;

        ctx.save();

        if (col.type === 'coral') {
            // 珊瑚丛
            ctx.fillStyle = '#2D6B4E';
            for (let i = 0; i < 5; i++) {
                const branchX = x + (i - 2) * 15;
                const branchH = col.height * (0.5 + Math.random() * 0.5);
                ctx.beginPath();
                ctx.moveTo(branchX, baseY);
                ctx.quadraticCurveTo(branchX + sway, baseY - branchH * 0.5, branchX + sway * 1.5, baseY - branchH);
                ctx.lineWidth = 8 - i;
                ctx.strokeStyle = i % 2 === 0 ? '#2D8B5E' : '#1E6B42';
                ctx.stroke();
            }
        } else {
            // 玉柱
            const gradient = ctx.createLinearGradient(x - col.width / 2, 0, x + col.width / 2, 0);
            gradient.addColorStop(0, '#1A4A3A');
            gradient.addColorStop(0.5, '#2A6B4A');
            gradient.addColorStop(1, '#1A4A3A');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(x - col.width / 2, baseY);
            ctx.lineTo(x - col.width / 2 + sway, baseY - col.height);
            ctx.lineTo(x + col.width / 2 + sway, baseY - col.height);
            ctx.lineTo(x + col.width / 2, baseY);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    _renderSeaweed(ctx, seaweed) {
        const x = ((seaweed.x - this._scrollOffset * 0.5) % (this.width + 200)) - 100;
        const baseY = this.height;

        ctx.save();
        ctx.strokeStyle = seaweed.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x, baseY);
        for (let i = 1; i <= seaweed.segments; i++) {
            const t = i / seaweed.segments;
            const sway = Math.sin(this._time * seaweed.swaySpeed + i * 0.5) * seaweed.swayAmount * t;
            const px = x + sway;
            const py = baseY - seaweed.height * t;
            ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.restore();
    }

    /**
     * 全局光影呼吸遮罩
     */
    renderBreathingMask(ctx) {
        const breathing = 0.03 + Math.sin(this._breathingPhase) * GameConfig.scene.breathingIntensity;
        ctx.save();
        ctx.fillStyle = `rgba(0, 10, 20, ${breathing})`;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    get dayPhase() {
        return this._dayPhase;
    }
}
