/**
 * 后端API客户端
 * 负责与Spring Boot后端服务通信，支持JWT认证
 *
 * @module ApiClient
 */
class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:8081/api';
        this.token = localStorage.getItem('fishing_token') || '';
        this.playerId = localStorage.getItem('fishing_player_id') || '';
        this.useBackend = false; // 默认使用本地存储，可切换为后端模式
    }

    /**
     * 初始化API客户端
     */
    init(config = {}) {
        if (config.baseURL) this.baseURL = config.baseURL;
        if (config.useBackend !== undefined) this.useBackend = config.useBackend;
    }

    /**
     * 设置Token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('fishing_token', token);
    }

    /**
     * 设置玩家ID
     */
    setPlayerId(playerId) {
        this.playerId = playerId;
        localStorage.setItem('fishing_player_id', playerId);
    }

    /**
     * 清除认证信息
     */
    clearAuth() {
        this.token = '';
        this.playerId = '';
        localStorage.removeItem('fishing_token');
        localStorage.removeItem('fishing_player_id');
    }

    /**
     * 通用请求方法
     */
    async request(method, path, data = null) {
        if (!this.useBackend) {
            return { code: 200, message: '本地模式', data: null };
        }

        const url = `${this.baseURL}${path}`;
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options = {
            method,
            headers,
        };
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            if (result.code === 401) {
                this.clearAuth();
                throw new Error('登录已过期，请重新登录');
            }
            return result;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // ===== 认证接口 =====

    /**
     * 玩家注册
     */
    async register(phone, password, nickname) {
        return this.request('POST', '/auth/register', { phone, password, nickname });
    }

    /**
     * 玩家登录
     */
    async login(phone, password) {
        const result = await this.request('POST', '/auth/login', { phone, password });
        if (result.code === 200 && result.data) {
            this.setToken(result.data.token);
            this.setPlayerId(result.data.playerId);
        }
        return result;
    }

    /**
     * 游客登录
     */
    async guestLogin() {
        const result = await this.request('POST', '/auth/guest');
        if (result.code === 200 && result.data) {
            this.setToken(result.data.token);
            this.setPlayerId(result.data.playerId);
        }
        return result;
    }

    // ===== 玩家接口 =====

    /**
     * 获取玩家信息
     */
    async getPlayerInfo() {
        return this.request('GET', '/player/info');
    }

    /**
     * 更新玩家资料
     */
    async updateProfile(nickname, avatar) {
        return this.request('PUT', '/player/update', { nickname, avatar });
    }

    // ===== 经济接口 =====

    /**
     * 获取经济信息
     */
    async getEconomyInfo() {
        return this.request('GET', '/economy/info');
    }

    /**
     * 消耗金币
     */
    async spendCoins(amount) {
        return this.request('POST', '/economy/spend', { amount });
    }

    /**
     * 增加金币
     */
    async addCoins(amount, isCrit = false) {
        return this.request('POST', '/economy/add', { amount, isCrit });
    }

    /**
     * 增加钻石
     */
    async addDiamonds(amount) {
        return this.request('POST', '/economy/add-diamonds', { amount });
    }

    /**
     * 消耗钻石
     */
    async spendDiamonds(amount) {
        return this.request('POST', '/economy/spend-diamonds', { amount });
    }

    // ===== 游戏记录接口 =====

    /**
     * 保存游戏记录
     */
    async saveGameRecord(record) {
        return this.request('POST', '/game/record', record);
    }

    // ===== 签到接口 =====

    /**
     * 每日签到
     */
    async signIn() {
        return this.request('POST', '/signin/daily');
    }

    /**
     * 获取签到记录
     */
    async getSignInStatus() {
        return this.request('GET', '/signin/records');
    }

    // ===== 邮件接口 =====

    /**
     * 获取邮件列表
     */
    async getMailList() {
        return this.request('GET', '/mail/list');
    }

    /**
     * 读取邮件
     */
    async readMail(mailId) {
        return this.request('PUT', `/mail/${mailId}/read`);
    }

    /**
     * 领取邮件附件
     */
    async claimMailAttachment(mailId) {
        return this.request('POST', `/mail/${mailId}/claim`);
    }

    /**
     * 获取未读邮件数量
     */
    async getUnreadMailCount() {
        return this.request('GET', '/mail/unread-count');
    }

    // ===== 兑换码接口 =====

    /**
     * 使用兑换码
     */
    async redeemCode(code) {
        return this.request('POST', '/redemption/redeem', { code });
    }

    // ===== 公会接口 =====

    /**
     * 创建公会
     */
    async createGuild(guildName, description) {
        return this.request('POST', '/guild/create', { guildName, description });
    }

    /**
     * 加入公会
     */
    async joinGuild(guildId) {
        return this.request('POST', `/guild/${guildId}/join`);
    }

    /**
     * 退出公会
     */
    async leaveGuild() {
        return this.request('POST', '/guild/leave');
    }

    /**
     * 获取公会信息
     */
    async getGuildInfo(guildId) {
        return this.request('GET', `/guild/${guildId}`);
    }

    /**
     * 获取公会列表
     */
    async searchGuild(keyword) {
        return this.request('GET', '/guild/list?page=1&size=20');
    }

    // ===== 好友接口 =====

    /**
     * 添加好友
     */
    async addFriend(friendId) {
        return this.request('POST', `/friend/add/${friendId}`);
    }

    /**
     * 删除好友
     */
    async deleteFriend(friendId) {
        return this.request('DELETE', `/friend/${friendId}`);
    }

    /**
     * 获取好友列表
     */
    async getFriendList() {
        return this.request('GET', '/friend/list');
    }

    /**
     * 搜索玩家（使用好友列表接口替代）
     */
    async searchPlayers(keyword) {
        return this.request('GET', '/friend/list');
    }

    // ===== 赛季接口 =====

    /**
     * 获取玩家赛季信息
     */
    async getCurrentSeason() {
        return this.request('GET', '/season/player-info');
    }

    /**
     * 增加赛季经验（通过游戏记录接口）
     */
    async addSeasonXp(xp) {
        return this.request('POST', '/game/record', { seasonXp: xp });
    }

    /**
     * 领取赛季奖励
     */
    async claimSeasonReward(level) {
        return this.request('POST', `/season/claim/${level}`);
    }

    /**
     * 购买高级通行证（通过商城接口）
     */
    async buyPremium() {
        return this.request('POST', '/shop/order', { productId: 'season_premium', amount: 30 });
    }

    // ===== 商城接口 =====

    /**
     * 创建订单
     */
    async createOrder(productId, productName, amount) {
        return this.request('POST', '/shop/order', { productId, productName, amount });
    }

    /**
     * 支付回调（模拟）
     */
    async payCallback(orderNo, payType, transactionId) {
        return this.request('POST', '/shop/pay-callback', { orderNo, payType, transactionId });
    }

    /**
     * 获取商品列表
     */
    async getOrderList() {
        return this.request('GET', '/shop/list');
    }

    // ===== 埋点接口 =====

    /**
     * 上报埋点事件
     */
    async trackEvent(eventType, eventName, eventData) {
        return this.request('POST', '/analytics/event', {
            eventType,
            eventName,
            eventData: JSON.stringify(eventData || {}),
            deviceInfo: navigator.userAgent
        });
    }

    // ===== 装备接口 =====

    /**
     * 获取装备列表
     */
    async getEquipmentList() {
        return this.request('GET', '/equipment/list');
    }

    /**
     * 穿戴装备
     */
    async equipItem(equipId) {
        return this.request('POST', `/equipment/${equipId}/equip`);
    }

    /**
     * 强化装备
     */
    async enhanceEquipment(equipId) {
        return this.request('POST', `/equipment/${equipId}/enhance`);
    }

    /**
     * 分解装备
     */
    async decomposeEquipment(equipId) {
        return this.request('POST', `/equipment/${equipId}/decompose`);
    }

    // ===== 宠物接口 =====

    /**
     * 获取宠物列表
     */
    async getPetList() {
        return this.request('GET', '/pet/list');
    }

    /**
     * 激活宠物
     */
    async activatePet(petType) {
        return this.request('POST', `/pet/${petType}/activate`);
    }

    /**
     * 宠物升级
     */
    async upgradePet(petType) {
        return this.request('POST', `/pet/${petType}/upgrade`);
    }

    // ===== 成就接口 =====

    /**
     * 获取成就列表
     */
    async getAchievementList() {
        return this.request('GET', '/achievement/list');
    }

    /**
     * 领取成就奖励
     */
    async claimAchievement(achievementId) {
        return this.request('POST', `/achievement/${achievementId}/claim`);
    }

    // ===== 任务接口 =====

    /**
     * 获取任务列表
     */
    async getTaskList() {
        return this.request('GET', '/task/list');
    }

    /**
     * 领取任务奖励
     */
    async claimTask(taskId) {
        return this.request('POST', `/task/${taskId}/claim`);
    }

    // ===== VIP接口 =====

    /**
     * 获取VIP信息
     */
    async getVIPInfo() {
        return this.request('GET', '/vip/info');
    }

    /**
     * 领取VIP每日礼包
     */
    async claimVIPGift() {
        return this.request('POST', '/vip/daily-gift');
    }

    // ===== 排行榜接口 =====

    /**
     * 获取排行榜
     */
    async getLeaderboard(type = 'coins', top = 10) {
        return this.request('GET', `/leaderboard/${type}?top=${top}`);
    }

    /**
     * 获取玩家排名
     */
    async getMyRank(type = 'coins') {
        return this.request('GET', `/leaderboard/rank/${type}`);
    }

    // ===== 防沉迷接口 =====

    /**
     * 提交实名认证
     */
    async verifyIdentity(realName, idCard) {
        return this.request('POST', '/anti-addiction/verify', { realName, idCard });
    }

    /**
     * 检查游戏权限
     */
    async checkGamePermission() {
        return this.request('GET', '/anti-addiction/check');
    }

    // ===== 支付充值接口 =====

    /**
     * 获取充值商品列表
     */
    async getRechargeProducts() {
        return this.request('GET', '/payment/products');
    }

    /**
     * 创建充值订单
     */
    async createRechargeOrder(productId, payMethod = 'wechat') {
        return this.request('POST', '/payment/create-order', { productId, payMethod });
    }

    /**
     * 支付回调（模拟）
     */
    async rechargePayCallback(orderNo, transactionId) {
        return this.request('POST', '/payment/callback', { orderNo, transactionId });
    }

    /**
     * 获取我的充值订单
     */
    async getMyRechargeOrders(page = 1, size = 20) {
        return this.request('GET', `/payment/my-orders?page=${page}&size=${size}`);
    }

    // ===== 世界BOSS接口 =====

    /**
     * 获取世界BOSS状态
     */
    async getWorldBossStatus() {
        return this.request('GET', '/world-boss/status');
    }

    /**
     * 对世界BOSS造成伤害
     */
    async dealBossDamage(damage, nickname) {
        return this.request('POST', '/world-boss/damage', { damage, nickname });
    }

    /**
     * 获取世界BOSS伤害排名
     */
    async getBossRanking(top = 10) {
        return this.request('GET', `/world-boss/ranking?top=${top}`);
    }

    // ===== 功能开关接口 =====

    /**
     * 获取所有功能开关
     */
    async getAllFeatureFlags() {
        return this.request('GET', '/feature-flags/all');
    }

    /**
     * 检查功能是否启用
     */
    async isFeatureEnabled(featureName) {
        return this.request('GET', `/feature-flags/${featureName}`);
    }

    // ===== 通知推送接口 =====

    /**
     * 获取当前系统公告
     */
    async getAnnouncement() {
        return this.request('GET', '/notification/announcement');
    }

    /**
     * 获取滚动消息
     */
    async getScrollMessages() {
        return this.request('GET', '/notification/scroll');
    }

    /**
     * 获取活动列表
     */
    async getActivities() {
        return this.request('GET', '/notification/activities');
    }

    // ===== 系统配置接口 =====

    /**
     * 获取所有系统配置
     */
    async getAllSystemConfig() {
        return this.request('GET', '/system-config/all');
    }

    /**
     * 获取单个系统配置
     */
    async getSystemConfig(key) {
        return this.request('GET', `/system-config/${key}`);
    }

    // ===== 反作弊接口 =====

    /**
     * 获取玩家风控状态
     */
    async getAntiCheatStatus() {
        return this.request('GET', '/anti-cheat/status');
    }

    /**
     * 上报可疑行为
     */
    async reportSuspiciousBehavior(behaviorType, details) {
        return this.request('POST', '/anti-cheat/report', { behaviorType, details });
    }

    // ===== 数据看板接口 =====

    /**
     * 获取玩家数据看板
     */
    async getPlayerDashboard() {
        return this.request('GET', '/dashboard/player');
    }

    /**
     * 获取游戏统计
     */
    async getGameStats() {
        return this.request('GET', '/dashboard/game-stats');
    }
}

// 导出
export { ApiClient };
