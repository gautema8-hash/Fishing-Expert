/**
 * VIP 等级配置
 * VIP 特权由配置驱动
 */
export const VIPConfig = {
    // ===== VIP 等级定义 =====
    levels: [
        {
            level: 0,
            name: '普通玩家',
            totalRecharge: 0,
            privileges: {
                coinBonus: 0,           // 金币加成百分比
                critBonus: 0,            // 暴击率加成
                fireRateBonus: 0,        // 射速加成
                unlockedSkins: ['dragon'],
                dailyGift: null,
                exclusiveService: false
            }
        },
        {
            level: 1,
            name: 'VIP1',
            totalRecharge: 6,
            privileges: {
                coinBonus: 5,
                critBonus: 0,
                fireRateBonus: 0,
                unlockedSkins: ['dragon'],
                dailyGift: { coins: 1000 },
                exclusiveService: false
            }
        },
        {
            level: 2,
            name: 'VIP2',
            totalRecharge: 30,
            privileges: {
                coinBonus: 10,
                critBonus: 1,
                fireRateBonus: 5,
                unlockedSkins: ['dragon'],
                dailyGift: { coins: 2000, diamonds: 1 },
                exclusiveService: false
            }
        },
        {
            level: 3,
            name: 'VIP3',
            totalRecharge: 100,
            privileges: {
                coinBonus: 15,
                critBonus: 2,
                fireRateBonus: 10,
                unlockedSkins: ['dragon', 'glass'],
                dailyGift: { coins: 3000, diamonds: 2 },
                exclusiveService: false
            }
        },
        {
            level: 4,
            name: 'VIP4',
            totalRecharge: 300,
            privileges: {
                coinBonus: 20,
                critBonus: 3,
                fireRateBonus: 15,
                unlockedSkins: ['dragon', 'glass'],
                dailyGift: { coins: 5000, diamonds: 3 },
                exclusiveService: true
            }
        },
        {
            level: 5,
            name: 'VIP5',
            totalRecharge: 1000,
            privileges: {
                coinBonus: 30,
                critBonus: 5,
                fireRateBonus: 20,
                unlockedSkins: ['dragon', 'glass', 'gold'],
                dailyGift: { coins: 10000, diamonds: 5 },
                exclusiveService: true
            }
        }
    ],

    // ===== 根据累计充值获取 VIP 等级 =====
    getLevelByRecharge(totalRecharge) {
        let currentLevel = 0;
        for (const vip of this.levels) {
            if (totalRecharge >= vip.totalRecharge) {
                currentLevel = vip.level;
            }
        }
        return currentLevel;
    },

    // ===== 获取 VIP 信息 =====
    getVIPInfo(level) {
        return this.levels[level] || this.levels[0];
    },

    // ===== 获取特权值 =====
    getPrivilege(level, privilegeName) {
        const vip = this.getVIPInfo(level);
        return vip.privileges[privilegeName];
    },

    // ===== 下一级需要的充值 =====
    getNextLevelRecharge(level) {
        const next = this.levels[level + 1];
        return next ? next.totalRecharge : null;
    }
};
