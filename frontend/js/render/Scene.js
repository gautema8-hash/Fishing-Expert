/**
 * 场景管理器
 * 多层视差滚动、龙宫背景绘制、昼夜切换
 * v2 升级：
 *  - 5 层视差：renderFarBackground(0.05) / renderBackground(0.15) /
 *              renderMidground(0.35) / renderForeground(0.6) / renderNearForeground(0.9)
 *  - 珊瑚多段独立摇摆（底部不动、顶部摆幅最大，频率 0.3-0.8Hz）
 *  - 海草多级摆动 + 全局水流方向影响
 *  - 宫灯呼吸光（周期 3-5s，亮度 0.6-1.0）+ 光晕 + 灯绳
 *  - 远景层次：远山轮廓 / 远景鱼群剪影 / 龙宫塔楼细节
 *  - 分层雾：远景层雾最浓、中景次之、游戏层按鱼个体计算
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
        // 全局水流方向（1=向右，-1=向左），影响海草/近景剪影飘动
        this._waterDirection = 1;

        // 预生成背景元素
        this._coralColumns = this._generateCoralColumns();
        this._seaweeds = this._generateSeaweeds();
        this._palaceLights = this._generatePalaceLights();
        // v2：远景山脉轮廓 / 近景剪影 / 远景鱼群
        this._farRidges = this._generateFarRidges();
        this._nearSilhouettes = this._generateNearSilhouettes();
        this._distantFishSchools = this._generateDistantFishSchools();
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
                flickerOffset: Math.random() * Math.PI * 2,
                // 呼吸周期 3-5 秒 → 角速度 2π/period ≈ 1.26~2.09
                breathSpeed: Utils.random(1.3, 2.1),
                breathOffset: Math.random() * Math.PI * 2
            });
        }
        return lights;
    }

    /**
     * 预生成最远层山脉/海沟轮廓（两层，朦胧）
     */
    _generateFarRidges() {
        const layers = [];
        for (let l = 0; l < 2; l++) {
            const points = [];
            const count = 12;
            for (let i = 0; i <= count; i++) {
                points.push({
                    x: (i / count) * (this.width * 1.5),
                    y: this.height * (0.5 + l * 0.12) + Utils.random(-50, 50)
                });
            }
            layers.push(points);
        }
        return layers;
    }

    /**
     * 预生成最近层剪影（模糊海草/岩石，快速移动，半透明）
     */
    _generateNearSilhouettes() {
        const list = [];
        for (let i = 0; i < 10; i++) {
            list.push({
                x: Utils.random(0, this.width * 2),
                type: Utils.randomChoice(['rock', 'weed']),
                w: Utils.random(20, 50),
                h: Utils.random(40, 120),
                phase: Math.random() * Math.PI * 2
            });
        }
        return list;
    }

    /**
     * 预生成远景鱼群剪影（半透明小鱼群，缓慢游动）
     */
    _generateDistantFishSchools() {
        const schools = [];
        for (let i = 0; i < 3; i++) {
            const fish = [];
            const n = Math.floor(Utils.random(5, 10));
            for (let j = 0; j < n; j++) {
                fish.push({
                    dx: Utils.random(-120, 120),
                    dy: Utils.random(-30, 30),
                    len: Utils.random(6, 12)
                });
            }
            schools.push({
                x: Utils.random(0, this.width * 1.5),
                y: Utils.random(this.height * 0.25, this.height * 0.5),
                speed: Utils.random(10, 25),
                fish
            });
        }
        return schools;
    }

    update(dt) {
        this._time += dt;
        this._scrollOffset += GameConfig.scene.bgScrollSpeed * dt;
        this._breathingPhase += GameConfig.scene.breathingSpeed * dt;

        // 昼夜循环
        this._dayPhase = (this._time / GameConfig.scene.dayNightCycleDuration) % 1;
    }

    /**
     * 获取当前昼夜阶段颜色（分段 lerp，切换平滑无突变）
     * 白昼：天蓝 #1A4A6B→#0A2A4A；黄昏：紫金 #3D1F3D→#1A0F2A；深夜：幽蓝 #0A1525→#03101F
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
     * 渲染最远层（视差 0.05）：朦胧远山/海沟轮廓 + 远景鱼群剪影，极慢移动
     */
    renderFarBackground(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.05);

        ctx.save();
        ctx.translate(offset.x, offset.y);

        // 远山/海沟剪影（两层，越远越淡）
        for (let l = 0; l < this._farRidges.length; l++) {
            const pts = this._farRidges[l];
            ctx.fillStyle = Utils.rgba(colors.fog, l === 0 ? 0.12 : 0.2);
            ctx.beginPath();
            ctx.moveTo(-200, this.height + 100);
            for (const p of pts) {
                ctx.lineTo(p.x - 200, p.y);
            }
            ctx.lineTo(this.width + 200, this.height + 100);
            ctx.closePath();
            ctx.fill();
        }

        // 远景鱼群剪影（半透明，缓慢水平游动 + 轻微上下浮动）
        for (const school of this._distantFishSchools) {
            const sx = (((school.x - this._scrollOffset * 0.05 + this._time * school.speed) % (this.width + 400)) + this.width + 400) % (this.width + 400) - 200;
            for (const f of school.fish) {
                const fx = sx + f.dx;
                const fy = school.y + f.dy + Math.sin(this._time * 0.8 + f.dx * 0.1) * 6;
                ctx.fillStyle = Utils.rgba(colors.fog, 0.25);
                // 鱼身
                ctx.beginPath();
                ctx.ellipse(fx, fy, f.len, f.len * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                // 尾巴
                ctx.beginPath();
                ctx.moveTo(fx - f.len * 0.8, fy);
                ctx.lineTo(fx - f.len * 1.6, fy - f.len * 0.4);
                ctx.lineTo(fx - f.len * 1.6, fy + f.len * 0.4);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * 渲染背景层（视差 0.15）：深海渐变 + 龙宫轮廓 + 雾浓度 0.4
     */
    renderBackground(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.15);

        ctx.save();
        ctx.translate(offset.x, offset.y);

        // 深海渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, colors.bgTop);
        gradient.addColorStop(1, colors.bgBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(-100, -100, this.width + 200, this.height + 200);

        // 远景龙宫轮廓（朦胧，含塔楼/飞檐细节）
        this._renderPalaceSilhouette(ctx, colors);

        // 远景珊瑚柱
        for (const col of this._coralColumns) {
            if (col.type === 'dragon_pillar') {
                this._renderDragonPillar(ctx, col, colors, 0.3);
            }
        }

        // 远景层雾（浓度 0.4，随水流轻微流动）
        const fogRgb = Utils.hexToRgb(colors.fog);
        const flow = Math.sin(this._time * 0.15) * 20;
        const fogGrad = ctx.createLinearGradient(flow, 0, flow, this.height);
        fogGrad.addColorStop(0, `rgba(${fogRgb.r}, ${fogRgb.g}, ${fogRgb.b}, 0.05)`);
        fogGrad.addColorStop(0.6, `rgba(${fogRgb.r}, ${fogRgb.g}, ${fogRgb.b}, 0.2)`);
        fogGrad.addColorStop(1, `rgba(${fogRgb.r}, ${fogRgb.g}, ${fogRgb.b}, 0.4)`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(-100, -100, this.width + 200, this.height + 200);

        ctx.restore();
    }

    /**
     * 渲染中景层（视差 0.35）：珊瑚海草 + 雾浓度 0.2
     */
    renderMidground(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.35);

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

        // 中景层雾（浓度 0.2，比远景淡）
        const fogRgb = Utils.hexToRgb(colors.fog);
        const flow = Math.sin(this._time * 0.12 + 2) * 15;
        const fogGrad = ctx.createLinearGradient(flow, 0, flow, this.height);
        fogGrad.addColorStop(0, `rgba(${fogRgb.r}, ${fogRgb.g}, ${fogRgb.b}, 0)`);
        fogGrad.addColorStop(1, `rgba(${fogRgb.r}, ${fogRgb.g}, ${fogRgb.b}, 0.2)`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(-100, -100, this.width + 200, this.height + 200);

        ctx.restore();
    }

    /**
     * 渲染近景层（视差 0.6）：底部沙地
     */
    renderForeground(ctx, camera) {
        const offset = camera.getLayerOffset(0.6);
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
     * 渲染最近层（视差 0.9）：模糊的海草/岩石剪影，快速移动，半透明
     */
    renderNearForeground(ctx, camera) {
        const offset = camera.getLayerOffset(0.9);
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.globalAlpha = 0.5; // 近景剪影半透明，不遮挡游戏层

        for (const s of this._nearSilhouettes) {
            const x = (((s.x - this._scrollOffset * 0.9) % (this.width + 200)) + this.width + 200) % (this.width + 200) - 100;
            if (s.type === 'rock') {
                // 近景岩石剪影
                ctx.fillStyle = '#05101E';
                ctx.beginPath();
                ctx.ellipse(x, this.height, s.w, s.h, 0, Math.PI, 0);
                ctx.fill();
            } else {
                // 近景海草剪影（多级摆动 + 水流方向影响）
                ctx.strokeStyle = '#04182A';
                ctx.lineWidth = s.w * 0.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x, this.height);
                for (let i = 1; i <= 4; i++) {
                    const t = i / 4;
                    const sway = Math.sin(this._time * 1.2 + s.phase + i * 0.6) * 18 * t;
                    const flow = this._waterDirection * 10 * t * t;
                    ctx.lineTo(x + sway + flow, this.height - s.h * t);
                }
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * 渲染龙宫宫灯光效（呼吸光 + 光晕 + 灯绳）
     */
    renderLights(ctx, camera) {
        const colors = this.getDayColors();
        const offset = camera.getLayerOffset(0.2);

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.globalCompositeOperation = 'lighter';

        for (const light of this._palaceLights) {
            // 轻微闪烁
            const flicker = 0.85 + Math.sin(this._time * light.flickerSpeed + light.flickerOffset) * 0.15;
            // 呼吸：周期 3-5 秒，亮度在 0.6-1.0 之间变化
            const breathT = (Math.sin(this._time * light.breathSpeed + light.breathOffset) + 1) / 2;
            const brightness = 0.6 + breathT * 0.4;
            const intensity = light.intensity * flicker * brightness;

            // 灯绳：从顶部垂下的细线
            ctx.strokeStyle = 'rgba(10, 26, 42, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(light.x, 0);
            ctx.lineTo(light.x, light.y - 8);
            ctx.stroke();

            // 光晕：半径随呼吸大小变化
            const haloR = light.radius * (0.8 + breathT * 0.5);
            const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, haloR);
            gradient.addColorStop(0, Utils.rgba(colors.light, intensity * 0.9));
            gradient.addColorStop(0.4, Utils.rgba(colors.light, intensity * 0.35));
            gradient.addColorStop(1, Utils.rgba(colors.light, 0));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(light.x, light.y, haloR, 0, Math.PI * 2);
            ctx.fill();

            // 宫灯本体
            ctx.fillStyle = Utils.rgba('#FFD700', intensity);
            ctx.beginPath();
            ctx.arc(light.x, light.y, 7, 0, Math.PI * 2);
            ctx.fill();
            // 灯芯亮核
            ctx.fillStyle = Utils.rgba('#FFFFFF', intensity * 0.9);
            ctx.beginPath();
            ctx.arc(light.x, light.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 远景龙宫建筑轮廓（增强：主殿飞檐 + 双侧双层塔楼）
     */
    _renderPalaceSilhouette(ctx, colors) {
        ctx.fillStyle = Utils.rgba(colors.fog, 0.18);
        const baseY = this.height * 0.62;

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

        // 主殿飞檐
        ctx.fillRect(this.width * 0.42, baseY - 166, this.width * 0.16, 6);

        // 双侧双层塔楼
        for (const tx of [0.12, 0.85]) {
            // 下层
            ctx.fillRect(this.width * tx, baseY - 90, 46, 90);
            ctx.fillRect(this.width * tx - 6, baseY - 97, 58, 7);
            // 上层小塔
            ctx.fillRect(this.width * tx + 8, baseY - 145, 30, 48);
            ctx.fillRect(this.width * tx + 2, baseY - 152, 42, 6);
            // 塔顶尖饰
            ctx.fillRect(this.width * tx + 21, baseY - 162, 4, 10);
        }
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

    /**
     * 珊瑚柱渲染（v2 多段摇摆：底部不动，每分支独立相位/频率，顶部摆幅最大）
     */
    _renderCoralColumn(ctx, col, colors) {
        const x = ((col.x - this._scrollOffset * 0.3) % (this.width + 200)) - 100;
        const baseY = this.height;

        ctx.save();

        if (col.type === 'coral') {
            // 珊瑚丛：每个分支独立摇摆（相位偏移 + 频率 0.3-0.8Hz，摆幅 5-15px）
            for (let i = 0; i < 5; i++) {
                const branchX = x + (i - 2) * 15;
                const branchH = col.height * (0.5 + (i % 3) * 0.15);
                const freq = 0.3 + (i % 3) * 0.25;               // 0.3-0.8Hz
                const phase = col.swayOffset + i * 0.9;           // 分支独立相位
                const swayAmp = 5 + i * 2.5;                      // 5-15px，越高分支摆越大
                const sway = Math.sin(this._time * freq * Math.PI * 2 + phase) * swayAmp;
                ctx.beginPath();
                ctx.moveTo(branchX, baseY);                       // 底部固定
                ctx.quadraticCurveTo(
                    branchX + sway * 0.4, baseY - branchH * 0.5, // 中部半摆
                    branchX + sway, baseY - branchH              // 顶部全摆
                );
                ctx.lineWidth = 8 - i;
                ctx.strokeStyle = i % 2 === 0 ? '#2D8B5E' : '#1E6B42';
                ctx.stroke();
            }
        } else {
            // 玉柱：轻微整体摆动
            const sway = Math.sin(this._time * 0.5 + col.swayOffset) * 5;
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

    /**
     * 海草渲染（v2 多级摆动：每节独立计算，底部 0 幅度、顶部最大，叠加水流方向偏移）
     */
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
            // 正弦摆动随高度放大（底部 0，顶部最大）
            const sway = Math.sin(this._time * seaweed.swaySpeed * Math.PI * 2 + i * 0.5) * seaweed.swayAmount * t;
            // 水流方向整体推动，随高度二次方增长
            const flow = this._waterDirection * 10 * t * t;
            const px = x + sway + flow;
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

    /**
     * 水流方向设置（1=向右，-1=向左）
     */
    set waterDirection(v) {
        this._waterDirection = Math.sign(v) || 1;
    }

    get waterDirection() {
        return this._waterDirection;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    get dayPhase() {
        return this._dayPhase;
    }
}
