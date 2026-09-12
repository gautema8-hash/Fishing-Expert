/**
 * Verlet 物理模拟模块
 * 用于鱼鳍 / 龙须等柔性组织的飘动模拟
 *
 * 核心：Verlet 积分  x(t+Δt) = x + (x - xPrev) * damping + force * dt²
 * - 约束求解（默认 3 次迭代）保持骨骼段距离
 * - 阻尼系数 0.85（模拟水阻力）
 * - 全局水流力场 waterForce 可设置（洋流 + 局部扰动）
 *
 * 纯 Canvas2D 项目内部使用，不依赖任何渲染上下文。
 */

export class VerletSystem {
    /**
     * @param {object} [opts]
     * @param {number} [opts.damping=0.85]        速度阻尼（水阻力）
     * @param {number} [opts.iterations=3]        约束求解迭代次数（≤3，性能优先）
     * @param {object} [opts.waterForce]          全局水流力 {x, y}
     */
    constructor(opts = {}) {
        this.damping = opts.damping != null ? opts.damping : 0.85;
        this.iterations = opts.iterations != null ? opts.iterations : 3;
        this.waterForce = { x: opts.waterForce?.x || 0, y: opts.waterForce?.y || 0 };
        /** @type {{x:number,y:number,ox:number,oy:number,pinned:boolean,mass:number,invMass:number}[]} */
        this.nodes = [];
        /** @type {{a:number,b:number,rest:number,stiffness:number}[]} */
        this.constraints = [];
    }

    /**
     * 添加一个节点
     * @param {number} x
     * @param {number} y
     * @param {object} [opts] { pinned, mass }
     * @returns {number} 节点索引
     */
    addNode(x, y, opts = {}) {
        const mass = opts.mass != null ? opts.mass : 1;
        const node = {
            x, y,
            ox: x, oy: y,
            pinned: !!opts.pinned,
            mass,
            invMass: opts.pinned ? 0 : 1 / mass
        };
        this.nodes.push(node);
        return this.nodes.length - 1;
    }

    /**
     * 添加距离约束
     * @param {number} a 节点A索引
     * @param {number} b 节点B索引
     * @param {number} [stiffness=0.9] 刚度（鱼身0.9，鱼鳍0.3）
     */
    addConstraint(a, b, stiffness = 0.9) {
        const A = this.nodes[a];
        const B = this.nodes[b];
        const rest = Math.hypot(B.x - A.x, B.y - A.y) || 0.0001;
        this.constraints.push({ a, b, rest, stiffness });
    }

    /**
     * 直接设置节点位置（同时清零速度，用于固定锚点）
     */
    setNode(i, x, y) {
        const n = this.nodes[i];
        if (!n) return;
        n.x = x; n.y = y;
        n.ox = x; n.oy = y;
    }

    /**
     * 对非固定节点施加瞬时冲量
     */
    applyImpulse(i, ix, iy) {
        const n = this.nodes[i];
        if (!n || n.pinned) return;
        n.ox -= ix;
        n.oy -= iy;
    }

    /**
     * 设置全局水流力
     */
    setWaterForce(x, y) {
        this.waterForce.x = x;
        this.waterForce.y = y;
    }

    /**
     * 推进模拟
     * @param {number} dt 帧间隔（秒）
     */
    update(dt) {
        const d = this.damping;
        const wf = this.waterForce;
        // dt 平方项（Verlet 显式积分）
        const dt2 = dt * dt;

        // 1) Verlet 积分
        for (const n of this.nodes) {
            if (n.pinned) {
                // 固定锚点：位置不漂移
                n.ox = n.x;
                n.oy = n.y;
                continue;
            }
            const vx = (n.x - n.ox) * d;
            const vy = (n.y - n.oy) * d;
            n.ox = n.x;
            n.oy = n.y;
            n.x += vx + wf.x * dt2;
            n.y += vy + wf.y * dt2;
        }

        // 2) 约束求解（多次迭代保持骨骼距离）
        for (let it = 0; it < this.iterations; it++) {
            for (const c of this.constraints) {
                const A = this.nodes[c.a];
                const B = this.nodes[c.b];
                let dx = B.x - A.x;
                let dy = B.y - A.y;
                let dist = Math.hypot(dx, dy);
                if (dist < 0.0001) dist = 0.0001;
                const diff = (dist - c.rest) / dist * c.stiffness;

                const iA = A.invMass;
                const iB = B.invMass;
                const sum = iA + iB;
                if (sum === 0) continue;

                const ka = iA / sum;
                const kb = iB / sum;
                A.x += dx * diff * ka;
                A.y += dy * diff * ka;
                B.x -= dx * diff * kb;
                B.y -= dy * diff * kb;
            }
        }
    }

    /**
     * 清空所有节点与约束（对象池复用时调用）
     */
    clear() {
        this.nodes.length = 0;
        this.constraints.length = 0;
    }
}
