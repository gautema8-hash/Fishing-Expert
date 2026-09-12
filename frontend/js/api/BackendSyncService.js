/**
 * 后端同步服务
 * 负责游戏数据与后端的双向同步，支持本地/后端双模式切换
 *
 * @module BackendSyncService
 */
import { ApiClient } from './ApiClient.js';

class BackendSyncService {
    constructor(game) {
        this.game = game;
        this.apiClient = new ApiClient();
        this.syncInterval = null;
        this.autoSync = false;
        this.lastSyncTime = 0;
        this.pendingEvents = [];
    }

    /**
     * 初始化后端同步
     */
    init(config = {}) {
        this.apiClient.init({
            baseURL: config.baseURL || 'http://localhost:8081/api',
            useBackend: config.useBackend || false
        });
        this.autoSync = config.autoSync || false;

        if (this.autoSync && this.apiClient.useBackend) {
            this.startAutoSync();
        }

        console.log('[BackendSync] 初始化完成, 后端模式:', this.apiClient.useBackend);
    }

    /**
     * 启用后端模式
     */
    enableBackend(baseURL) {
        this.apiClient.init({ baseURL, useBackend: true });
        this.apiClient.useBackend = true;
        localStorage.setItem('fishing_use_backend', 'true');
        console.log('[BackendSync] 已切换到后端模式');
    }

    /**
     * 禁用后端模式（使用本地存储）
     */
    disableBackend() {
        this.apiClient.useBackend = false;
        localStorage.setItem('fishing_use_backend', 'false');
        this.stopAutoSync();
        console.log('[BackendSync] 已切换到本地模式');
    }

    /**
     * 是否使用后端
     */
    isBackendEnabled() {
        return this.apiClient.useBackend;
    }

    /**
     * 玩家登录
     */
    async login(phone, password) {
        try {
            const result = await this.apiClient.login(phone, password);
            if (result.code === 200) {
                await this.syncFromBackend();
                return { success: true, data: result.data };
            }
            return { success: false, message: result.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * 玩家注册
     */
    async register(phone, password, nickname) {
        try {
            const result = await this.apiClient.register(phone, password, nickname);
            if (result.code === 200) {
                this.apiClient.setToken(result.data.token);
                this.apiClient.setPlayerId(result.data.playerId);
                await this.syncFromBackend();
                return { success: true, data: result.data };
            }
            return { success: false, message: result.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * 游客登录
     */
    async guestLogin() {
        try {
            const result = await this.apiClient.guestLogin();
            if (result.code === 200) {
                await this.syncFromBackend();
                return { success: true, data: result.data };
            }
            return { success: false, message: result.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * 从后端同步玩家数据到本地
     */
    async syncFromBackend() {
        if (!this.apiClient.useBackend) return;

        try {
            const result = await this.apiClient.getPlayerInfo();
            if (result.code === 200 && result.data) {
                const player = result.data;
                const saveData = this.game.storage.getSaveData();

                // 同步核心数据
                saveData.coins = player.coins || saveData.coins;
                saveData.diamonds = player.diamonds || saveData.diamonds;
                saveData.energy = player.energy || saveData.energy;
                saveData.cannonLevel = player.cannonLevel || saveData.cannonLevel;
                saveData.cannonSkin = player.cannonSkin || saveData.cannonSkin;
                saveData.vipLevel = player.vipLevel || saveData.vipLevel;
                saveData.level = player.level || saveData.level;
                saveData.totalKills = player.totalKills || saveData.totalKills;
                saveData.totalBullets = player.totalBullets || saveData.totalBullets;
                saveData.highestLevel = player.highestLevel || saveData.highestLevel;

                this.game.storage.saveGame(saveData);
                this.lastSyncTime = Date.now();
                console.log('[BackendSync] 从后端同步完成');
            }
        } catch (error) {
            console.error('[BackendSync] 从后端同步失败:', error);
        }
    }

    /**
     * 同步金币变更到后端
     */
    async syncCoinsChange(amount, type) {
        if (!this.apiClient.useBackend) return;

        try {
            if (type === 'spend') {
                await this.apiClient.spendCoins(amount);
            } else if (type === 'add') {
                await this.apiClient.addCoins(amount, false);
            }
        } catch (error) {
            console.error('[BackendSync] 金币同步失败:', error);
            this.pendingEvents.push({ type: 'coins', amount, action: type, time: Date.now() });
        }
    }

    /**
     * 同步游戏记录到后端
     */
    async syncGameRecord(record) {
        if (!this.apiClient.useBackend) return;

        try {
            await this.apiClient.saveGameRecord(record);
        } catch (error) {
            console.error('[BackendSync] 游戏记录同步失败:', error);
            this.pendingEvents.push({ type: 'gameRecord', record, time: Date.now() });
        }
    }

    /**
     * 上报埋点事件
     */
    async trackEvent(eventType, eventName, eventData) {
        if (!this.apiClient.useBackend) return;

        try {
            await this.apiClient.trackEvent(eventType, eventName, eventData);
        } catch (error) {
            // 埋点失败不影响游戏
        }
    }

    /**
     * 启动自动同步
     */
    startAutoSync() {
        if (this.syncInterval) return;
        this.syncInterval = setInterval(() => {
            this.flushPendingEvents();
        }, 30000); // 每30秒同步一次
        console.log('[BackendSync] 自动同步已启动');
    }

    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[BackendSync] 自动同步已停止');
        }
    }

    /**
     * 刷新待同步事件
     */
    async flushPendingEvents() {
        if (this.pendingEvents.length === 0) return;

        const events = [...this.pendingEvents];
        this.pendingEvents = [];

        for (const event of events) {
            try {
                if (event.type === 'coins') {
                    await this.syncCoinsChange(event.amount, event.action);
                } else if (event.type === 'gameRecord') {
                    await this.syncGameRecord(event.record);
                }
            } catch (error) {
                // 重新加入队列
                this.pendingEvents.push(event);
            }
        }
    }

    /**
     * 获取API客户端
     */
    getApiClient() {
        return this.apiClient;
    }

    /**
     * 登出
     */
    logout() {
        this.apiClient.clearAuth();
        this.stopAutoSync();
        this.pendingEvents = [];
    }
}

// 导出
export { BackendSyncService };
