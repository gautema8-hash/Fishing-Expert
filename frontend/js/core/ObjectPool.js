/**
 * 通用对象池
 * 鱼、炮弹、粒子、金币等高频创建销毁对象的池化复用
 */
export class ObjectPool {
    /**
     * @param {Function} factory - 对象创建工厂函数
     * @param {number} initialSize - 初始预创建数量
     * @param {number} maxSize - 池最大容量
     */
    constructor(factory, initialSize = 10, maxSize = 200) {
        this._factory = factory;
        this._maxSize = maxSize;
        this._pool = [];
        this._activeCount = 0;
        this._totalCreated = 0;

        // 预创建
        for (let i = 0; i < initialSize; i++) {
            this._pool.push(this._create());
        }
    }

    /**
     * 创建新对象
     */
    _create() {
        const obj = this._factory();
        obj._pooled = true;
        this._totalCreated++;
        return obj;
    }

    /**
     * 从池中获取对象
     * @returns {*} 池化对象
     */
    acquire() {
        let obj;
        if (this._pool.length > 0) {
            obj = this._pool.pop();
        } else {
            obj = this._create();
        }
        obj._active = true;
        this._activeCount++;
        return obj;
    }

    /**
     * 将对象放回池中
     * @param {*} obj - 要释放的对象
     */
    release(obj) {
        if (!obj || !obj._active) return;

        // 调用对象的 reset 方法（如果有）
        if (typeof obj.reset === 'function') {
            obj.reset();
        }

        obj._active = false;
        this._activeCount--;

        // 池未满则回收，否则丢弃
        if (this._pool.length < this._maxSize) {
            this._pool.push(obj);
        }
    }

    /**
     * 预创建一定数量对象
     */
    prewarm(count) {
        for (let i = 0; i < count && this._pool.length < this._maxSize; i++) {
            this._pool.push(this._create());
        }
    }

    /**
     * 清空池
     */
    clear() {
        this._pool = [];
        this._activeCount = 0;
    }

    /**
     * 获取池状态
     */
    getStats() {
        return {
            pooled: this._pool.length,
            active: this._activeCount,
            totalCreated: this._totalCreated,
            maxSize: this._maxSize
        };
    }

    get activeCount() { return this._activeCount; }
    get pooledCount() { return this._pool.length; }
}

/**
 * 多类型对象池管理器
 * 管理不同类型对象的独立对象池
 */
export class PoolManager {
    constructor() {
        this._pools = new Map();
    }

    /**
     * 注册对象池
     */
    register(type, factory, initialSize = 10, maxSize = 200) {
        if (!this._pools.has(type)) {
            this._pools.set(type, new ObjectPool(factory, initialSize, maxSize));
        }
        return this._pools.get(type);
    }

    /**
     * 获取指定类型的对象池
     */
    getPool(type) {
        return this._pools.get(type);
    }

    /**
     * 从指定池获取对象
     */
    acquire(type) {
        const pool = this._pools.get(type);
        if (!pool) {
            console.warn(`[PoolManager] Pool not registered: ${type}`);
            return null;
        }
        return pool.acquire();
    }

    /**
     * 释放对象到指定池
     */
    release(type, obj) {
        const pool = this._pools.get(type);
        if (pool) {
            pool.release(obj);
        }
    }

    /**
     * 获取所有池状态
     */
    getAllStats() {
        const stats = {};
        for (const [type, pool] of this._pools) {
            stats[type] = pool.getStats();
        }
        return stats;
    }

    /**
     * 清空所有池
     */
    clearAll() {
        for (const pool of this._pools.values()) {
            pool.clear();
        }
    }
}
