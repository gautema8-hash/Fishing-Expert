/**
 * 好友系统
 * 好友列表、在线状态、互赠礼物、好友排行榜
 * 社交留存核心模块
 */
import { Events } from '../core/EventBus.js';

// Mock好友数据（实际运营中由后端提供）
const MockFriends = [
    { id: 'f1', name: '龙宫太子', avatar: '🐉', level: 25, vip: 6, coins: 1250000, online: true, lastLogin: Date.now() },
    { id: 'f2', name: '虾兵蟹将', avatar: '🦐', level: 18, vip: 3, coins: 580000, online: true, lastLogin: Date.now() },
    { id: 'f3', name: '美人鱼公主', avatar: '🧜‍♀️', level: 32, vip: 8, coins: 3200000, online: false, lastLogin: Date.now() - 3600000 },
    { id: 'f4', name: '海龟长老', avatar: '🐢', level: 15, vip: 2, coins: 320000, online: false, lastLogin: Date.now() - 86400000 },
    { id: 'f5', name: '章鱼博士', avatar: '🐙', level: 22, vip: 5, coins: 890000, online: true, lastLogin: Date.now() },
    { id: 'f6', name: '鲨鱼猎人', avatar: '🦈', level: 28, vip: 4, coins: 1560000, online: false, lastLogin: Date.now() - 7200000 },
    { id: 'f7', name: '珊瑚精灵', avatar: '🪸', level: 12, vip: 1, coins: 180000, online: true, lastLogin: Date.now() },
    { id: 'f8', name: '深海渔夫', avatar: '🎣', level: 20, vip: 3, coins: 650000, online: false, lastLogin: Date.now() - 172800000 }
];

// 推荐好友（可添加）
const MockRecommend = [
    { id: 'r1', name: '哪吒闹海', avatar: '🔥', level: 30, vip: 7 },
    { id: 'r2', name: '姜子牙钓鱼', avatar: '🎣', level: 16, vip: 2 },
    { id: 'r3', name: '孙悟空下海', avatar: '🐒', level: 25, vip: 5 },
    { id: 'r4', name: '八仙过海', avatar: '🌊', level: 22, vip: 4 }
];

export class FriendSystem {
    constructor(eventBus, saveData, economy) {
        this.eventBus = eventBus;
        this.saveData = saveData;
        this.economy = economy;

        // 好友列表
        this.friends = saveData.friends || MockFriends.map(f => ({ ...f }));
        this.saveData.friends = this.friends;

        // 推荐好友
        this.recommends = saveData.friendRecommends || MockRecommend.map(r => ({ ...r }));
        this.saveData.friendRecommends = this.recommends;

        // 今日已赠送/领取记录
        this.todayGifts = saveData.todayGifts || {};
        this.saveData.todayGifts = this.todayGifts;

        // 好友请求
        this.friendRequests = saveData.friendRequests || [];
        this.saveData.friendRequests = this.friendRequests;
    }

    /**
     * 获取好友列表
     */
    getFriends() {
        return this.friends.map(f => ({
            ...f,
            onlineStatus: f.online ? '在线' : this._formatLastLogin(f.lastLogin),
            canGift: !this.todayGifts[`sent_${f.id}`],
            canClaim: !this.todayGifts[`claimed_${f.id}`]
        })).sort((a, b) => {
            // 在线优先
            if (a.online !== b.online) return b.online - a.online;
            return b.coins - a.coins;
        });
    }

    /**
     * 获取推荐好友
     */
    getRecommends() {
        return this.recommends;
    }

    /**
     * 添加好友
     */
    addFriend(recommendId) {
        const index = this.recommends.findIndex(r => r.id === recommendId);
        if (index === -1) return false;

        const recommend = this.recommends[index];
        const newFriend = {
            ...recommend,
            coins: Math.floor(Math.random() * 500000) + 100000,
            online: Math.random() > 0.5,
            lastLogin: Date.now()
        };

        this.friends.push(newFriend);
        this.recommends.splice(index, 1);
        this.eventBus.emit(Events.SHOW_TOAST, `已添加好友：${newFriend.name}`);
        return true;
    }

    /**
     * 删除好友
     */
    removeFriend(friendId) {
        const index = this.friends.findIndex(f => f.id === friendId);
        if (index === -1) return false;
        const friend = this.friends[index];
        this.friends.splice(index, 1);
        this.eventBus.emit(Events.SHOW_TOAST, `已删除好友：${friend.name}`);
        return true;
    }

    /**
     * 赠送礼物给好友
     */
    sendGift(friendId) {
        if (this.todayGifts[`sent_${friendId}`]) {
            return { success: false, message: '今日已赠送过该好友' };
        }

        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return { success: false, message: '好友不存在' };

        // 赠送消耗100金币，好友获得50金币（模拟）
        if (this.economy.getCoins() < 100) {
            return { success: false, message: '金币不足，无法赠送' };
        }

        this.economy.spendCoins(100, 'friend_gift');
        this.todayGifts[`sent_${friendId}`] = true;
        this.eventBus.emit(Events.SHOW_TOAST, `已向 ${friend.name} 赠送礼物！`);
        return { success: true, message: '赠送成功' };
    }

    /**
     * 领取好友赠送的礼物
     */
    claimGift(friendId) {
        if (this.todayGifts[`claimed_${friendId}`]) {
            return { success: false, message: '今日已领取过该好友的礼物' };
        }

        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return { success: false, message: '好友不存在' };

        // 领取获得200金币
        this.economy.addCoins(200, 'friend_gift');
        this.todayGifts[`claimed_${friendId}`] = true;
        this.eventBus.emit(Events.SHOW_TOAST, `领取 ${friend.name} 的礼物：+200金币！`);
        return { success: true, message: '领取成功' };
    }

    /**
     * 一键领取所有好友礼物
     */
    claimAllGifts() {
        let claimed = 0;
        this.friends.forEach(f => {
            if (!this.todayGifts[`claimed_${f.id}`]) {
                this.economy.addCoins(200, 'friend_gift');
                this.todayGifts[`claimed_${f.id}`] = true;
                claimed++;
            }
        });
        if (claimed > 0) {
            this.eventBus.emit(Events.SHOW_TOAST, `一键领取 ${claimed} 份好友礼物！`);
        }
        return claimed;
    }

    /**
     * 获取好友排行榜
     */
    getLeaderboard() {
        return [...this.friends]
            .sort((a, b) => b.coins - a.coins)
            .map((f, i) => ({
                rank: i + 1,
                name: f.name,
                avatar: f.avatar,
                level: f.level,
                vip: f.vip,
                coins: f.coins,
                isSelf: false
            }));
    }

    /**
     * 获取在线好友数
     */
    getOnlineCount() {
        return this.friends.filter(f => f.online).length;
    }

    /**
     * 获取可领取礼物数
     */
    getClaimableCount() {
        return this.friends.filter(f => !this.todayGifts[`claimed_${f.id}`]).length;
    }

    _formatLastLogin(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚在线';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        return `${days}天前`;
    }
}
