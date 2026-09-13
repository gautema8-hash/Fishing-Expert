/**
 * Bone.js - 骨骼基类（性能优化版）
 * 轻量级2D骨骼，支持父子层级、世界坐标计算
 *
 * 性能优化：
 *  - computeWorld() 直接写入 wx/wy/wAngle 公共字段，无对象分配
 *  - Skeleton 按根→叶顺序迭代调用，避免递归
 *  - getWorldTransform() 保留为兼容接口（带缓存）
 *
 * 坐标系：骨骼局部 +x 指向下一节骨骼（沿身体轴向）
 */
export class Bone {
    constructor({ x = 0, y = 0, angle = 0, length = 10, width = 10, parent = null, name = '' } = {}) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.length = length;
        this.width = width;
        this.parent = parent;
        this.children = [];

        // 世界坐标（由 computeWorld() 写入，渲染器直接读取）
        this.wx = 0;
        this.wy = 0;
        this.wAngle = 0;

        if (parent) parent.children.push(this);
    }

    setAngle(a) {
        this.angle = a;
    }

    /**
     * 快速计算世界坐标，直接写入 wx/wy/wAngle（无对象分配）
     * 调用前必须确保父骨骼已计算完成（按根→叶顺序）
     */
    computeWorld() {
        if (this.parent) {
            const p = this.parent;
            const cos = Math.cos(p.wAngle);
            const sin = Math.sin(p.wAngle);
            this.wx = p.wx + this.x * cos - this.y * sin;
            this.wy = p.wy + this.x * sin + this.y * cos;
            this.wAngle = p.wAngle + this.angle;
        } else {
            this.wx = this.x;
            this.wy = this.y;
            this.wAngle = this.angle;
        }
    }

    /**
     * 兼容接口：返回世界坐标对象（带缓存，非热路径使用）
     */
    getWorldTransform() {
        return { x: this.wx, y: this.wy, angle: this.wAngle };
    }
}
