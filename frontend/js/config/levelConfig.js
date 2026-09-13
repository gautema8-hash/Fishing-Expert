/**
 * 关卡配置
 * 关卡参数由配置驱动
 */
export const LevelConfig = {
    // ===== 关卡基础参数 =====
    base: {
        killTarget: 20,                   // 基础通关击杀数
        killTargetGrowth: 5,               // 每关增加击杀数
        fishValueGrowth: 0.05,             // 每关鱼价值增长率
        bossHpGrowth: 0.2,                 // 每关 BOSS 血量增长率
        bossScoreGrowth: 0.15,             // 每关 BOSS 分值增长率
        highValueFishGrowth: 0.02,         // 每关高价值鱼概率增长
        fishDensityGrowth: 0.1,            // 每关鱼群密度增长
        maxFishGrowth: 1,                   // 每关最大鱼数增长
        bossSpawnInterval: 60,              // BOSS 出现间隔（秒）
        bossSpawnMinLevel: 3                // BOSS 最低出现关卡
    },

    // ===== 星级评分 =====
    starRating: {
        oneStar: { killRatio: 1.0 },                          // 1 星：通关
        twoStar: { killRatio: 1.2, critCount: 0 },            // 2 星：击杀数 ≥ 目标×1.2
        threeStar: { killRatio: 1.5, critCount: 5 }           // 3 星：击杀数 ≥ 目标×1.5 + 暴击≥5
    },

    // ===== 关卡奖励 =====
    rewards: {
        baseCoins: 500,                  // 基础通关金币
        coinsPerLevel: 200,               // 每关增加金币
        starBonus: { 1: 0, 2: 500, 3: 1500 }, // 星级额外奖励
        diamondChance: 0.1,               // 钻石掉落概率
        diamondAmount: 2                   // 钻石数量
    },

    // ===== 获取指定关卡参数 =====
    getLevelParams(level) {
        const b = this.base;
        return {
            level: level,
            killTarget: Math.floor(b.killTarget + (level - 1) * b.killTargetGrowth),
            fishValueMultiplier: 1 + (level - 1) * b.fishValueGrowth,
            bossHpMultiplier: 1 + (level - 1) * b.bossHpGrowth,
            bossScoreMultiplier: 1 + (level - 1) * b.bossScoreGrowth,
            highValueFishBonus: (level - 1) * b.highValueFishGrowth,
            fishDensityMultiplier: 1 + (level - 1) * b.fishDensityGrowth,
            maxFish: 30 + (level - 1) * b.maxFishGrowth,
            bossSpawnInterval: b.bossSpawnInterval,
            bossEnabled: level >= b.bossSpawnMinLevel
        };
    },

    // ===== 计算星级 =====
    calculateStars(killCount, killTarget, critCount) {
        const ratio = killCount / killTarget;
        const s = this.starRating;
        if (ratio >= s.threeStar.killRatio && critCount >= s.threeStar.critCount) return 3;
        if (ratio >= s.twoStar.killRatio) return 2;
        if (ratio >= s.oneStar.killRatio) return 1;
        return 0;
    },

    // ===== 计算关卡奖励 =====
    calculateReward(level, stars) {
        const r = this.rewards;
        let coins = r.baseCoins + (level - 1) * r.coinsPerLevel;
        coins += r.starBonus[stars] || 0;
        const diamonds = Math.random() < r.diamondChance ? r.diamondAmount : 0;
        return { coins, diamonds };
    }
};
