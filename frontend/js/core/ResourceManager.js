/**
 * 资源管理器
 * 懒加载 + 预加载双机制，首屏资源最小化
 */
export class ResourceManager {
    constructor() {
        this._cache = new Map();
        this._loading = new Map();
        this._progressCallbacks = [];
        this._totalToLoad = 0;
        this._loadedCount = 0;
    }

    /**
     * 加载单个资源
     */
    load(url, type = 'image') {
        // 已缓存
        if (this._cache.has(url)) {
            return Promise.resolve(this._cache.get(url));
        }
        // 加载中
        if (this._loading.has(url)) {
            return this._loading.get(url);
        }

        let promise;
        switch (type) {
            case 'image':
                promise = this._loadImage(url);
                break;
            case 'audio':
                promise = this._loadAudio(url);
                break;
            case 'json':
                promise = this._loadJSON(url);
                break;
            default:
                promise = this._loadImage(url);
        }

        this._loading.set(url, promise);
        promise.then(resource => {
            this._cache.set(url, resource);
            this._loading.delete(url);
            this._loadedCount++;
            this._notifyProgress();
        }).catch(err => {
            this._loading.delete(url);
            console.error(`[ResourceManager] Failed to load ${url}:`, err);
        });

        return promise;
    }

    /**
     * 批量加载
     */
    loadBatch(resources) {
        this._totalToLoad = resources.length;
        this._loadedCount = 0;
        const promises = resources.map(r => this.load(r.url, r.type));
        return Promise.all(promises);
    }

    /**
     * 后台预加载
     */
    preload(resources) {
        resources.forEach(r => {
            if (!this._cache.has(r.url) && !this._loading.has(r.url)) {
                this.load(r.url, r.type).catch(() => {});
            }
        });
    }

    /**
     * 获取已加载资源
     */
    get(url) {
        return this._cache.get(url) || null;
    }

    /**
     * 加载进度回调
     */
    onProgress(callback) {
        this._progressCallbacks.push(callback);
    }

    _notifyProgress() {
        const progress = this._totalToLoad > 0 ? this._loadedCount / this._totalToLoad : 1;
        this._progressCallbacks.forEach(cb => cb(progress, this._loadedCount, this._totalToLoad));
    }

    getProgress() {
        return this._totalToLoad > 0 ? this._loadedCount / this._totalToLoad : 1;
    }

    // ===== 具体加载器 =====
    _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    _loadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = reject;
            audio.src = url;
        });
    }

    _loadJSON(url) {
        return fetch(url).then(res => res.json());
    }

    /**
     * 清空缓存
     */
    clear() {
        this._cache.clear();
    }
}
