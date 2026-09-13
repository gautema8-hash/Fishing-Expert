/**
 * 商城礼包配置
 * 付费产品由配置驱动
 */
export const ShopConfig = {
    // ===== 金币礼包 =====
    coinPackages: [
        {
            id: 'coin_1',
            name: '小虾礼包',
            price: 6,
            coins: 600000000,
            bonusCoins: 0,
            diamonds: 0,
            tag: '',
            popular: false
        },
        {
            id: 'coin_2',
            name: '锦鲤礼包',
            price: 30,
            coins: 3500000000,
            bonusCoins: 500000000,
            diamonds: 2,
            tag: '热门',
            popular: true
        },
        {
            id: 'coin_3',
            name: '龙鱼礼包',
            price: 68,
            coins: 8000000000,
            bonusCoins: 2000000000,
            diamonds: 5,
            tag: '超值',
            popular: false
        },
        {
            id: 'coin_4',
            name: '龙王礼包',
            price: 128,
            coins: 18000000000,
            bonusCoins: 6000000000,
            diamonds: 12,
            tag: '豪华',
            popular: false
        },
        {
            id: 'coin_5',
            name: '龙宫宝藏',
            price: 328,
            coins: 50000000000,
            bonusCoins: 20000000000,
            diamonds: 30,
            tag: '至尊',
            popular: false
        },
        {
            id: 'coin_6',
            name: '东海宝库',
            price: 648,
            coins: 120000000000,
            bonusCoins: 60000000000,
            diamonds: 80,
            tag: '传说',
            popular: false
        }
    ],

    // ===== 订阅卡 =====
    subscriptions: [
        {
            id: 'weekly',
            name: '双倍金币周卡',
            price: 18,
            durationDays: 7,
            dailyCoins: 500000000,
            coinMultiplier: 2,
            description: '一周内金币收益翻倍，每日领取5亿金币'
        },
        {
            id: 'monthly',
            name: '双倍金币月卡',
            price: 50,
            durationDays: 30,
            dailyCoins: 800000000,
            coinMultiplier: 2,
            description: '一月内金币收益翻倍，每日领取8亿金币'
        }
    ],

    // ===== 限时折扣礼包 =====
    limitedOffers: [
        {
            id: 'limited_newbie',
            name: '新手特惠',
            originalPrice: 30,
            price: 6,
            discount: '2折',
            coins: 3000000000,
            diamonds: 5,
            items: { lock: 2, rage: 1 },
            condition: 'newbie',
            durationHours: 24
        },
        {
            id: 'limited_lowcoin',
            name: '救急礼包',
            originalPrice: 18,
            price: 6,
            discount: '3.3折',
            coins: 2000000000,
            diamonds: 2,
            condition: 'low_coins',
            durationHours: 1
        },
        {
            id: 'limited_return',
            name: '回归礼包',
            originalPrice: 68,
            price: 18,
            discount: '2.6折',
            coins: 8000000000,
            diamonds: 10,
            items: { lock: 3, rage: 2 },
            condition: 'returning',
            durationHours: 48
        }
    ],

    // ===== 首充双倍 =====
    firstCharge: {
        enabled: true,
        bonusMultiplier: 2,
        minAmount: 6,
        description: '首次充值任意金额，获得双倍金币！'
    },

    // ===== 道具购买 =====
    itemPackages: [
        { id: 'lock_5', name: '锁定道具×5', price: 12, items: { lock: 5 } },
        { id: 'lock_15', name: '锁定道具×15', price: 30, items: { lock: 15 } },
        { id: 'rage_5', name: '狂暴道具×5', price: 18, items: { rage: 5 } },
        { id: 'rage_15', name: '狂暴道具×15', price: 45, items: { rage: 15 } },
        { id: 'combo_1', name: '道具组合包', price: 30, items: { lock: 5, rage: 5 } }
    ],

    // ===== 激励视频广告奖励 =====
    adRewards: {
        coins: 200000000,
        diamonds: 0,
        items: {},
        dailyLimit: 10,
        cooldownSeconds: 30
    },

    // ===== 节日限定礼包 =====
    festivalPacks: [
        {
            id: 'festival_spring',
            name: '新春龙王礼包',
            price: 68,
            originalPrice: 128,
            coins: 20000000000,
            bonusCoins: 10000000000,
            diamonds: 20,
            items: { lock: 5, rage: 5 },
            tag: '新春限定',
            festival: 'spring',
            popular: true
        },
        {
            id: 'festival_midautumn',
            name: '中秋月宫礼包',
            price: 30,
            originalPrice: 68,
            coins: 8800000000,
            bonusCoins: 3000000000,
            diamonds: 8,
            items: { lock: 3, rage: 2 },
            tag: '中秋限定',
            festival: 'midautumn',
            popular: false
        },
        {
            id: 'festival_dragonboat',
            name: '端午龙舟礼包',
            price: 18,
            originalPrice: 36,
            coins: 5000000000,
            bonusCoins: 1500000000,
            diamonds: 5,
            items: { lock: 2, rage: 2 },
            tag: '端午限定',
            festival: 'dragonboat',
            popular: false
        },
        {
            id: 'festival_halloween',
            name: '万圣深海礼包',
            price: 12,
            originalPrice: 30,
            coins: 3500000000,
            bonusCoins: 1000000000,
            diamonds: 3,
            items: { lock: 2, rage: 1 },
            tag: '万圣限定',
            festival: 'halloween',
            popular: false
        }
    ]
};
