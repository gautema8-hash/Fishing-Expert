/**
 * Skeleton.js - 骨架基类
 * 管理骨骼层级、动画状态机、每帧骨骼姿态计算
 * 所有生物骨架（Fish/Turtle/Octopus/Jellyfish/Dragon）继承此类
 *
 * 子类需实现：
 *   _buildBones()   - 构建骨骼层级
 *   _updatePose(dt) - 根据时间/状态计算各骨骼角度
 *   getSpine()      - 返回沿身体主轴的骨骼数组（用于图片切片映射）
 */
import { Bone } from './Bone.js';

export class Skeleton {
    /**
     * @param {Object} config - 生物配置（来自 fishConfig）
     * @param {number} size - 生物尺寸（像素）
     */
    constructor(config, size) {
        this.config = config;
        this.size = size;
        this.bones = {};        // name -> Bone
        this.boneList = [];     // 有序数组（构建顺序）
        this.spine = [];        // 沿身体主轴的骨骼（头→尾）
        this.state = 'swim';    // 动画状态
        this._time = 0;
        this._speedRatio = 1;   // 当前速度/基础速度（影响动画频率）
        this._turnRate = 0;     // 转向速率（影响身体弯曲）
        this._built = false;
    }

    /**
     * 构建骨骼（子类重写）
     */
    _buildBones() {
        // 子类实现
    }

    /**
     * 每帧更新骨骼姿态（子类重写）
     * @param {number} dt - 帧间隔（秒）
     */
    _updatePose(dt) {
        // 子类实现
    }

    /**
     * 公开更新接口
     * @param {number} dt
     * @param {Object} opts - { state, speedRatio, turnRate, time }
     */
    update(dt, opts = {}) {
        if (!this._built) {
            this._buildBones();
            this._built = true;
        }
        if (opts.state) this.state = opts.state;
        if (opts.speedRatio != null) this._speedRatio = opts.speedRatio;
        if (opts.turnRate != null) this._turnRate = opts.turnRate;
        if (opts.time != null) this._time = opts.time;
        else this._time += dt;

        this._updatePose(dt);

        // 迭代计算所有骨骼世界坐标（根→叶顺序，无递归无对象分配）
        for (let i = 0; i < this.boneList.length; i++) {
            this.boneList[i].computeWorld();
        }
    }

    /**
     * 添加骨骼并注册
     */
    _addBone(name, opts) {
        const bone = new Bone({ name, ...opts });
        this.bones[name] = bone;
        this.boneList.push(bone);
        return bone;
    }

    /**
     * 获取骨骼
     */
    getBone(name) {
        return this.bones[name] || null;
    }

    /**
     * 获取主轴骨骼数组（头→尾）
     */
    getSpine() {
        return this.spine;
    }

    /**
     * 获取主轴骨骼的世界坐标数组（使用预计算的 wx/wy/wAngle）
     */
    getSpineWorld() {
        return this.spine.map(b => ({ x: b.wx, y: b.wy, angle: b.wAngle, width: b.width }));
    }

    /**
     * 重置（对象池复用时调用）
     */
    reset() {
        this.bones = {};
        this.boneList = [];
        this.spine = [];
        this._built = false;
        this.state = 'swim';
        this._time = 0;
    }
}
