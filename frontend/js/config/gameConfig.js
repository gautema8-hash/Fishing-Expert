/**
 * 全局游戏配置
 * 所有数值由配置驱动，策划无需改代码即可调参
 */
export const GameConfig = {
    // ===== 基础设置 =====
    version: '1.0.0',
    gameName: '捕鱼达人·东海龙宫',
    designWidth: 1920,
    designHeight: 1080,
    targetFPS: 60,
    minFPS: 20,

    // ===== 玩家初始数据 =====
    player: {
        initialCoins: 100000000,
        initialDiamonds: 10,
        initialName: '龙宫新手',
        initialAvatar: 0,
        initialCannonLevel: 1,
        initialCannonSkin: 'dragon',
        initialItems: { lock: 3, rage: 2 }
    },

    // ===== 金币经济 =====
    economy: {
        baseBulletCost: 10,           // 基础炮弹消耗 = 倍率 × baseBulletCost
        coinFlyDuration: 1.0,          // 金币飞行时长（秒）
        coinAttractDelay: 0.3,         // 金币吸附延迟（秒）
        coinPerKillMin: 1,              // 每次击杀最少金币数
        coinPerKillMax: 8,              // 每次击杀最多金币数
        insufficientThreshold: 0,       // 金币不足阈值
        offlineRewardPerMinute: 50,     // 离线收益（金币/分钟）
        offlineRewardMaxHours: 8        // 离线收益最大时长（小时）
    },

    // ===== 炮台 =====
    cannon: {
        minLevel: 100,
        maxLevel: 999999,
        baseFireRate: 3,                // 基础射速（发/秒）
        autoFireInterval: 0.3,          // 自动发射间隔（秒）
        critBaseRate: 0.05,             // 基础暴击率 5%
        critDamageMultiplier: 2,        // 暴击伤害倍率
        critCoinMultiplier: 2,          // 暴击金币倍率
        flowRotationSpeed: 1.5,         // 流光环绕速度
        skins: {
            dragon: { name: '龙纹炮', unlock: 'default', color: '#36E0E8' },
            glass:  { name: '琉璃炮', unlock: 'vip3',    color: '#7DF9FF' },
            gold:   { name: '鎏金炮', unlock: 'vip5',    color: '#FFD700' }
        }
    },

    // ===== 炮弹 =====
    bullet: {
        baseSpeed: 800,                 // 基础速度（像素/秒）
        baseDamage: 1,                  // 基础伤害
        trailParticleCount: 3,          // 拖尾粒子数
        trailParticleInterval: 0.02,    // 拖尾粒子生成间隔
        critColor: '#FF6B35',           // 暴击炮弹颜色
        normalColor: '#36E0E8',         // 普通炮弹颜色
        maxBullets: 50,                 // 同屏最大炮弹数
        maxBounces: 3,                  // 最大边界反弹次数
        bounceSpeedDecay: 0.9           // 反弹后速度衰减倍率
    },

    // ===== 粒子系统 =====
    particles: {
        maxParticles: 800,              // 全局最大粒子数
        bubbleSpawnInterval: 0.5,       // 气泡生成间隔
        bubbleMaxCount: 40,             // 最大气泡数
        explosionParticleCount: 20,     // 爆炸粒子数
        critExplosionParticleCount: 40, // 暴击爆炸粒子数
        coinTrailParticleCount: 2       // 金币拖尾粒子数
    },

    // ===== 水波纹 =====
    waterRipple: {
        baseMaxRadius: 80,               // 基础最大半径
        baseExpandSpeed: 200,            // 基础扩张速度
        baseRingCount: 3,                // 基础环数
        hitMultiplier: 1.5,              // 命中鱼体强度倍率
        bigFishMultiplier: 2.0,          // 大鱼强度倍率
        bossMultiplier: 3.0,             // BOSS 强度倍率
        critMultiplier: 2.5              // 暴击强度倍率
    },

    // ===== 屏幕震动 =====
    screenShake: {
        hitIntensity: 2,
        hitDuration: 0.1,
        killSmallIntensity: 3,
        killSmallDuration: 0.15,
        killBigIntensity: 6,
        killBigDuration: 0.25,
        bossAppearIntensity: 10,
        bossAppearDuration: 0.5,
        critIntensity: 8,
        critDuration: 0.3
    },

    // ===== 场景 =====
    scene: {
        parallaxLayers: 5,
        bgScrollSpeed: 5,                // 背景滚动速度
        fogDensity: 0.3,                 // 体积雾密度
        causticsIntensity: 0.4,          // 焦散光强
        dayNightCycleDuration: 300,      // 昼夜切换周期（秒）
        breathingSpeed: 0.5,              // 光影呼吸速度
        breathingIntensity: 0.05          // 光影呼吸强度
    },

    // ===== 性能自适应 =====
    performance: {
        highQualityMaxParticles: 800,
        mediumQualityMaxParticles: 400,
        lowQualityMaxParticles: 150,
        highMaxFish: 30,
        mediumMaxFish: 20,
        lowMaxFish: 12,
        fpsCheckInterval: 3,              // FPS 检测间隔（秒）
        fpsThresholdMedium: 30,           // 中画质 FPS 阈值
        fpsThresholdLow: 20               // 低画质 FPS 阈值
    },

    // ===== 新手保护 =====
    newbieProtection: {
        enabled: true,
        protectedGames: 3,                // 前 3 局保护
        guaranteedHitRate: 0.8            // 保护期命中率
    },

    // ===== 流失召回 =====
    recall: {
        inactiveDays: 3,                  // 连续未登录天数
        recallGiftCoins: 5000,
        recallGiftDiamonds: 5,
        firstGameCritBoost: 0.3           // 回流首局暴击率提升
    },

    // ===== 颜色主题 =====
    colors: {
        primary: '#06223A',
        accent: '#36E0E8',
        gold: '#FFD700',
        text: '#F0F8FF',
        danger: '#FF6B35',
        success: '#4ADE80',
        bgGradientStart: '#03101F',
        bgGradientEnd: '#0A2A4A'
    }
};
