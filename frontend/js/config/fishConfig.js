/**
 * 鱼类属性配置
 * 所有鱼种数值由配置驱动
 */
export const FishConfig = {
    // ===== 鱼类定义 =====
    types: {
        goldfish: {
            id: 'goldfish',
            name: '彩色金鱼',
            score: 10,
            hp: 1,
            speed: 120,
            size: 36,
            boneSegments: 5,
            spawnWeight: 30,
            color: '#FF8C42',
            accentColor: '#FFD700',
            finColor: '#FF6B6B',
            pathType: 'sine',              // 直线/正弦/环形/随机
            schoolFish: true,               // 是否结群
            schoolSize: [5, 12],            // 鱼群大小范围
            depth: 'near'                   // 景深层级 near/mid/far
        },
        silverfish: {
            id: 'silverfish',
            name: '小银鱼',
            score: 5,
            hp: 1,
            speed: 180,
            size: 28,
            boneSegments: 4,
            spawnWeight: 30,
            color: '#C0D8E8',
            accentColor: '#E8F4FF',
            finColor: '#A8C8E0',
            pathType: 'linear',
            schoolFish: true,
            schoolSize: [8, 20],
            depth: 'mid'
        },
        turtle: {
            id: 'turtle',
            name: '灵龟',
            score: 50,
            hp: 3,
            speed: 60,
            size: 56,
            boneSegments: 6,
            spawnWeight: 15,
            color: '#2D8B5E',
            accentColor: '#4ADE80',
            finColor: '#1E6B42',
            pathType: 'random',
            schoolFish: false,
            depth: 'near'
        },
        manta: {
            id: 'manta',
            name: '蝠鲼',
            score: 80,
            hp: 4,
            speed: 100,
            size: 72,
            boneSegments: 6,
            spawnWeight: 12,
            color: '#4A5568',
            accentColor: '#718096',
            finColor: '#2D3748',
            pathType: 'sine',
            schoolFish: false,
            depth: 'mid'
        },
        jellyfish: {
            id: 'jellyfish',
            name: '幻彩水母',
            score: 60,
            hp: 2,
            speed: 40,
            size: 48,
            boneSegments: 4,
            spawnWeight: 14,
            color: '#FF69B4',
            accentColor: '#FFB6C1',
            finColor: '#DA70D6',
            pathType: 'float',
            schoolFish: true,
            schoolSize: [2, 5],
            depth: 'mid',
            glow: true
        },
        seahorse: {
            id: 'seahorse',
            name: '珊瑚海马',
            score: 30,
            hp: 2,
            speed: 90,
            size: 32,
            boneSegments: 5,
            spawnWeight: 18,
            color: '#FF8C00',
            accentColor: '#FFD700',
            finColor: '#FF6347',
            pathType: 'erratic',
            schoolFish: true,
            schoolSize: [3, 8],
            depth: 'near'
        },
        anglerfish: {
            id: 'anglerfish',
            name: '深海灯笼鱼',
            score: 150,
            hp: 6,
            speed: 55,
            size: 64,
            boneSegments: 5,
            spawnWeight: 8,
            color: '#2C1810',
            accentColor: '#8B4513',
            finColor: '#1A0F0A',
            pathType: 'random',
            schoolFish: false,
            depth: 'far',
            glow: true,
            lureColor: '#00FF7F'
        },
        blackdragon: {
            id: 'blackdragon',
            name: '黑龙',
            score: 200,
            hp: 8,
            speed: 90,
            size: 90,
            boneSegments: 8,
            spawnWeight: 8,
            color: '#1A1A2E',
            accentColor: '#6B5B95',
            finColor: '#3D2E5C',
            pathType: 'sine',
            schoolFish: false,
            depth: 'far'
        },
        goldendragon: {
            id: 'goldendragon',
            name: '黄金龙鱼',
            score: 500,
            hp: 12,
            speed: 70,
            size: 100,
            boneSegments: 8,
            spawnWeight: 4,
            color: '#DAA520',
            accentColor: '#FFD700',
            finColor: '#B8860B',
            pathType: 'circle',
            schoolFish: false,
            depth: 'mid'
        },
        dragonking: {
            id: 'dragonking',
            name: '东海龙王',
            score: 2000,
            hp: 50,
            speed: 50,
            size: 160,
            boneSegments: 12,
            spawnWeight: 1,
            color: '#1E3A5F',
            accentColor: '#FFD700',
            finColor: '#36E0E8',
            pathType: 'boss',
            schoolFish: false,
            isBoss: true,
            depth: 'far',
            bossWarningDuration: 2,       // BOSS 出场预警时长（秒）
            bossDisperseRadius: 500         // BOSS 驱散小鱼半径
        },
        // ===== 特殊鱼类 =====
        electriceel: {
            id: 'electriceel',
            name: '雷电鳗',
            score: 120,
            hp: 3,
            speed: 100,
            size: 55,
            boneSegments: 8,
            spawnWeight: 6,
            color: '#4A0080',
            accentColor: '#00FFFF',
            finColor: '#9400D3',
            pathType: 'sine',
            schoolFish: false,
            depth: 'mid',
            special: 'electric',           // 特殊行为：电击
            glow: true,
            glowColor: '#00FFFF'
        },
        ghostfish: {
            id: 'ghostfish',
            name: '幽灵鱼',
            score: 180,
            hp: 2,
            speed: 90,
            size: 48,
            boneSegments: 6,
            spawnWeight: 5,
            color: '#E8E8FF',
            accentColor: '#B8B8FF',
            finColor: '#D0D0FF',
            pathType: 'erratic',
            schoolFish: false,
            depth: 'mid',
            special: 'invisible',          // 特殊行为：隐身
            glow: true,
            glowColor: '#E8E8FF'
        },
        splitfish: {
            id: 'splitfish',
            name: '分裂水母',
            score: 90,
            hp: 2,
            speed: 70,
            size: 50,
            boneSegments: 4,
            spawnWeight: 7,
            color: '#FF69B4',
            accentColor: '#FFB6C1',
            finColor: '#FF1493',
            pathType: 'float',
            schoolFish: false,
            depth: 'near',
            special: 'split',              // 特殊行为：分裂
            glow: true,
            glowColor: '#FF69B4'
        }
    },

    // ===== 生成权重（按关卡难度调整） =====
    getSpawnList(level = 1) {
        const list = [];
        const difficulty = Math.min(level / 20, 1); // 难度系数 0-1

        for (const [id, fish] of Object.entries(this.types)) {
            let weight = fish.spawnWeight;
            // 高关卡增加高价值鱼出现概率
            if (fish.score >= 200) {
                weight *= (1 + difficulty * 0.5);
            }
            // 低关卡减少高价值鱼
            if (fish.score >= 500 && level < 5) {
                weight *= 0.3;
            }
            list.push({ id, weight });
        }
        return list;
    },

    // ===== 鱼群配置 =====
    school: {
        spawnInterval: 3,                // 鱼群生成间隔（秒）
        maxSchools: 5,                    // 最大同时鱼群数
        separationDistance: 40,           // 分离距离
        alignmentDistance: 80,            // 对齐距离
        cohesionDistance: 120,            // 凝聚距离
        maxSpeed: 150,                    // 最大速度
        maxForce: 0.5                     // 最大转向力
    },

    // ===== AI 行为 =====
    ai: {
        dodgeRadius: 150,                 // 躲避炮弹半径
        dodgeSpeedMultiplier: 1.8,        // 躲避时速度倍率
        bossDisperseSpeed: 250,           // BOSS 驱散时小鱼速度
        wanderChangeInterval: 2,           // 随机游走方向变化间隔
        turnSpeed: 2                        // 转向速度（弧度/秒）
    },

    // ===== 骨骼动画参数 =====
    boneAnimation: {
        bodyWaveFrequency: 3,              // 身体摆动频率
        bodyWaveAmplitude: 0.15,           // 身体摆动幅度（弧度）
        tailFrequency: 6,                   // 尾鳍扇动频率
        tailAmplitude: 0.4,                 // 尾鳍扇动幅度
        finFrequency: 4,                    // 胸鳍扇动频率
        finAmplitude: 0.3,                  // 胸鳍扇动幅度
        speedInfluence: 0.5                 // 速度对动画频率的影响
    }
};
