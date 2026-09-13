/**
 * FishSkeleton.js - 鱼类专用骨骼
 * 脊椎链（头→尾 S 形波动）+ 胸鳍/背鳍/尾鳍骨骼
 * 驱动图片切片变形，实现真实鱼身弯曲摆动
 *
 * 脊椎计算：沿身体主轴 N 节骨骼，每节角度叠加正弦波，
 * 头部摆幅小（0.3x），尾部摆幅大（1.5x），形成自然 S 形。
 * 速度影响频率，转向影响整体弯曲度。
 */
import { Skeleton } from './Skeleton.js';
import { Utils } from '../core/Utils.js';

export class FishSkeleton extends Skeleton {
    constructor(config, size) {
        super(config, size);
        this.numSegments = FishSkeleton.optimalSegments(config, size);
        this.bodyLength = size * (config.imageScale || 1.6);
        this.segmentLength = this.bodyLength / this.numSegments;

        // 动画参数（来自 fishConfig.boneAnimation）
        this.animParams = null;
        this.stateParams = null;
    }

    /**
     * 根据鱼的尺寸计算最优脊椎节数（性能优化：小鱼少切片）
     */
    static optimalSegments(config, size) {
        const configured = config.spineSegments || 8;
        if (size < 28) return Math.min(6, configured);       // 极小鱼：6节
        if (size < 40) return Math.min(7, configured);       // 小鱼：7节
        if (size < 70) return Math.min(8, configured);       // 中等鱼：8节
        return configured;                                    // 大鱼：配置值
    }

    /**
     * 重新配置骨骼（对象池复用时调用，避免重复new）
     * 如果节数变化则重建骨骼，否则仅更新参数
     */
    configure(config, size) {
        this.config = config;
        this.size = size;
        const newSegments = FishSkeleton.optimalSegments(config, size);
        const newBodyLength = size * (config.imageScale || 1.6);

        if (newSegments !== this.numSegments ||
            Math.abs(newBodyLength - this.bodyLength) > 0.5) {
            this.numSegments = newSegments;
            this.bodyLength = newBodyLength;
            this.segmentLength = this.bodyLength / this.numSegments;
            // 节数变化，需要重建骨骼
            this.bones = {};
            this.boneList = [];
            this.spine = [];
            this._built = false;
        } else {
            this.bodyLength = newBodyLength;
            this.segmentLength = this.bodyLength / this.numSegments;
            // 更新已有骨骼的长度和宽度
            for (let i = 0; i < this.spine.length; i++) {
                const t = i / (this.spine.length - 1);
                this.spine[i].length = this.segmentLength;
                this.spine[i].width = this.size * 0.4 * (1 - t * 0.55);
                if (i > 0) this.spine[i].x = -this.segmentLength;
            }
        }
    }

    setAnimParams(boneAnim, animStates) {
        this.animParams = boneAnim;
        this.animStates = animStates;
    }

    _buildBones() {
        // 构建脊椎链：head at +bodyLength/2, tail at -bodyLength/2
        // 第一节为头骨骼，后续逐节向 -x 延伸
        let prev = null;
        for (let i = 0; i < this.numSegments; i++) {
            const t = i / (this.numSegments - 1);
            const width = this.size * 0.4 * (1 - t * 0.55); // 头宽尾窄
            const bone = this._addBone(`spine_${i}`, {
                x: prev ? -this.segmentLength : this.bodyLength / 2,
                y: 0,
                angle: 0,
                length: this.segmentLength,
                width,
                parent: prev
            });
            this.spine.push(bone);
            prev = bone;
        }

        // 胸鳍锚点（挂在第2节脊椎上）
        if (this.numSegments >= 2) {
            this._addBone('fin_pec_L', {
                x: -this.segmentLength * 0.3, y: this.size * 0.18,
                length: this.size * 0.25, width: this.size * 0.08,
                parent: this.spine[1], name: 'fin_pec_L'
            });
            this._addBone('fin_pec_R', {
                x: -this.segmentLength * 0.3, y: -this.size * 0.18,
                length: this.size * 0.25, width: this.size * 0.08,
                parent: this.spine[1], name: 'fin_pec_R'
            });
        }
    }

    _updatePose(dt) {
        if (!this.animParams) return;
        const ap = this.animParams;
        const st = (this.animStates && this.animStates[this.state]) || { freq: 1, bodyAmp: 1, tailFreq: 1, tailAmp: 1, finFreq: 1, finAmp: 1, bendMult: 1 };

        const speedInfluence = 1 + (this._speedRatio - 1) * ap.speedInfluence;
        const baseFreq = ap.bodyWaveFrequency * speedInfluence * st.freq;
        const baseAmp = ap.bodyWaveAmplitude * st.bodyAmp * st.bendMult;
        const headAmp = ap.headAmpScale;
        const tailAmp = ap.tailAmpScale;

        // 转向时身体整体弯曲（朝转向方向）
        const turnBend = Utils.clamp(this._turnRate * 0.02, -0.15, 0.15) * st.bendMult;

        // 逐节设置局部角度：每节独立的正弦波 + 转向弯曲
        // 注意：Bone 类会自动通过父骨骼层级累积世界角度（worldAngle = parent.worldAngle + localAngle）
        // 因此这里只需设置每节的局部角度，不可传入累积值，否则角度会翻倍
        for (let i = 0; i < this.spine.length; i++) {
            const t = i / (this.spine.length - 1);
            const ampRamp = Utils.lerp(headAmp, tailAmp, t);
            // 波从头部向尾部传播（相位随 i 递减）
            const wave = Math.sin(this._time * baseFreq - i * 0.6) * baseAmp * ampRamp;
            const localAngle = wave + turnBend * t;
            this.spine[i].setAngle(localAngle);
        }

        // 胸鳍独立扇动
        const finSwing = Math.sin(this._time * ap.finFrequency * st.finFreq) * ap.finAmplitude * st.finAmp;
        const finL = this.getBone('fin_pec_L');
        const finR = this.getBone('fin_pec_R');
        if (finL) finL.setAngle(Math.PI / 4 + finSwing);
        if (finR) finR.setAngle(-Math.PI / 4 - finSwing);
    }

    /**
     * 获取尾鳍摆动角度（用于尾鳍额外动画）
     */
    getTailSwing() {
        if (!this.animParams) return 0;
        const st = (this.animStates && this.animStates[this.state]) || { tailFreq: 1, tailAmp: 1 };
        const ap = this.animParams;
        return Math.sin(this._time * ap.tailFrequency * st.tailFreq) * ap.tailAmplitude * st.tailAmp;
    }

    /**
     * 获取胸鳍摆动角度
     */
    getFinSwing() {
        if (!this.animParams) return 0;
        const st = (this.animStates && this.animStates[this.state]) || { finFreq: 1, finAmp: 1 };
        const ap = this.animParams;
        return Math.sin(this._time * ap.finFrequency * st.finFreq) * ap.finAmplitude * st.finAmp;
    }
}
