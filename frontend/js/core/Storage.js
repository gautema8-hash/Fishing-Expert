/**
 * 本地存储封装
 * 结构化数据存取，存档管理
 */
import { Utils } from './Utils.js';

export class Storage {
    constructor(prefix = 'fishing_dragon_') {
        this._prefix = prefix;
        this._memoryCache = {};
        this._available = this._checkAvailability();
    }

    /**
     * 检测 localStorage 可用性
     */
    _checkAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, '1');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('[Storage] localStorage not available, using memory cache');
            return false;
        }
    }

    _getKey(key) {
        return this._prefix + key;
    }

    /**
     * 保存数据
     */
    save(key, value) {
        const data = JSON.stringify(value);
        this._memoryCache[key] = value;
        if (this._available) {
            try {
                localStorage.setItem(this._getKey(key), data);
            } catch (e) {
                console.error('[Storage] Save error:', e);
            }
        }
    }

    /**
     * 读取数据
     */
    load(key, defaultValue = null) {
        // 先读内存缓存
        if (key in this._memoryCache) {
            return this._memoryCache[key];
        }
        if (this._available) {
            try {
                const data = localStorage.getItem(this._getKey(key));
                if (data !== null) {
                    const parsed = JSON.parse(data);
                    this._memoryCache[key] = parsed;
                    return parsed;
                }
            } catch (e) {
                console.error('[Storage] Load error:', e);
            }
        }
        return defaultValue;
    }

    /**
     * 删除数据
     */
    remove(key) {
        delete this._memoryCache[key];
        if (this._available) {
            localStorage.removeItem(this._getKey(key));
        }
    }

    /**
     * 检查键是否存在
     */
    has(key) {
        if (key in this._memoryCache) return true;
        if (this._available) {
            return localStorage.getItem(this._getKey(key)) !== null;
        }
        return false;
    }

    /**
     * 清空所有数据
     */
    clear() {
        this._memoryCache = {};
        if (this._available) {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this._prefix)) {
                    keys.push(key);
                }
            }
            keys.forEach(k => localStorage.removeItem(k));
        }
    }

    /**
     * 导出存档
     */
    exportSave() {
        const data = {};
        if (this._available) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this._prefix)) {
                    const shortKey = key.replace(this._prefix, '');
                    data[shortKey] = localStorage.getItem(key);
                }
            }
        }
        return JSON.stringify(data);
    }

    /**
     * 导入存档
     */
    importSave(saveData) {
        try {
            const data = JSON.parse(saveData);
            for (const [key, value] of Object.entries(data)) {
                this.save(key, JSON.parse(value));
            }
            return true;
        } catch (e) {
            console.error('[Storage] Import error:', e);
            return false;
        }
    }
}

/**
 * 存档管理器
 * 管理玩家存档的读写、版本迁移
 */
export class SaveManager {
    constructor(storage) {
        this._storage = storage;
        this._saveKey = 'game_save';
        this._currentVersion = '1.0.0';
    }

    /**
     * 默认存档数据
     */
    getDefaultSave() {
        return {
            version: this._currentVersion,
            player: {
                id: Utils.generateId(),
                name: '龙宫新手',
                avatar: 0,
                coins: 10000,
                diamonds: 10,
                vipLevel: 0,
                totalRecharge: 0,
                firstChargeDone: false
            },
            progress: {
                currentLevel: 1,
                totalKills: 0,
                totalScore: 0,
                highestLevel: 1,
                totalCrits: 0
            },
            cannon: {
                level: 1,
                skin: 'dragon',
                autoFire: false,
                upgrade: { power: 1, fireRate: 1, critRate: 1, coinBonus: 1 }
            },
            items: { lock: 3, rage: 2 },
            energy: 30,
            pets: { active: null, owned: [] },
            skills: { freeze: 0, lightning: 0, coinRain: 0, energy: 0 },
            daily: {
                lastSignInDate: null,
                signInDays: 0,
                lastWheelDate: null,
                wheelFreeCount: 1,
                tasks: {},
                lastDailyReset: null
            },
            subscriptions: { weekly: null, monthly: null },
            settings: {
                bgmVolume: 0.5,
                sfxVolume: 0.8,
                bgmMuted: false,
                sfxMuted: false,
                quality: 'high',
                showFPS: false
            },
            analytics: {
                firstPlayDate: Utils.getTodayString(),
                lastPlayDate: Utils.getTodayString(),
                lastLoginTimestamp: Date.now(),
                playCount: 1,
                totalPlayTime: 0,
                gamesPlayed: 0
            },
            newbie: {
                protectedGamesLeft: 3,
                guideCompleted: false
            }
        };
    }

    /**
     * 加载存档
     */
    load() {
        const save = this._storage.load(this._saveKey);
        if (save) {
            // 版本迁移
            return this._migrate(save);
        }
        return this.getDefaultSave();
    }

    /**
     * 保存存档
     */
    save(data) {
        data.version = this._currentVersion;
        data.analytics.lastPlayDate = Utils.getTodayString();
        this._storage.save(this._saveKey, data);
    }

    /**
     * 版本迁移
     */
    _migrate(save) {
        const defaultSave = this.getDefaultSave();
        // 深度合并，补全新字段
        return this._deepMerge(defaultSave, save);
    }

    _deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    /**
     * 重置存档
     */
    reset() {
        this._storage.remove(this._saveKey);
        return this.getDefaultSave();
    }
}
