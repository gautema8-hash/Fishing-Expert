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
        this._failedImages = new Set();   // 记录加载失败的图片路径
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
     * 批量预加载鱼类图片
     * @param {Array<Object>} fishTypes - 鱼类配置对象数组，每个需含 imagePath 字段
     * @returns {Promise<{loaded: string[], failed: string[]}>}
     */
    preloadFishImages(fishTypes) {
        const loaded = [];
        const failed = [];
        const tasks = [];
        for (const fish of fishTypes) {
            const path = fish && fish.imagePath;
            if (!path) continue;
            if (this._failedImages.has(path)) {
                failed.push(path);
                continue;
            }
            if (this._cache.has(path)) {
                loaded.push(path);
                continue;
            }
            tasks.push(
                this.load(path, 'image')
                    .then(() => loaded.push(path))
                    .catch(() => {
                        this._failedImages.add(path);
                        failed.push(path);
                    })
            );
        }
        return Promise.all(tasks).then(() => ({ loaded, failed }));
    }

    /**
     * 获取已加载的鱼类图片
     * @param {string} imagePath
     * @returns {HTMLImageElement|null}
     */
    getFishImage(imagePath) {
        if (!imagePath || this._failedImages.has(imagePath)) return null;
        return this._cache.get(imagePath) || null;
    }

    /**
     * 检查鱼类图片是否加载成功
     * @param {string} imagePath
     * @returns {boolean}
     */
    isFishImageLoaded(imagePath) {
        if (!imagePath || this._failedImages.has(imagePath)) return false;
        return this._cache.has(imagePath);
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
