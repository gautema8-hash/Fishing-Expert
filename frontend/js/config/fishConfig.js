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
            spineSegments: 8,               // 脊椎骨骼节数（升级后最小8节）
            fresnelIntensity: 0.12,         // 菲涅尔反射 F0
            scaleType: 'cycloid',            // 鳞片类型 cycloid/ctenoid/ganoid/dragon
            spawnWeight: 30,
            color: '#FF8C42',
            accentColor: '#FFD700',
            finColor: '#FF6B6B',
            pathType: 'sine',              // 直线/正弦/环形/随机
            schoolFish: true,               // 是否结群
            schoolSize: [5, 12],            // 鱼群大小范围
            depth: 'near',                  // 景深层级 near/mid/far
            imagePath: 'assets/fish/goldfish.png',  // 鱼类图片路径
            spawnDirections: ['left', 'right', 'top', 'bottom'], // 出现方向偏好
            speedRange: [80, 150]           // 生成速度范围 [min, max]
        },
        silverfish: {
            id: 'silverfish',
            name: '小银鱼',
            score: 5,
            hp: 1,
            speed: 180,
            size: 28,
            boneSegments: 4,
            spineSegments: 8,
            fresnelIntensity: 0.10,
            scaleType: 'cycloid',
            spawnWeight: 30,
            color: '#C0D8E8',
            accentColor: '#E8F4FF',
            finColor: '#A8C8E0',
            pathType: 'linear',
            schoolFish: true,
            schoolSize: [8, 20],
            depth: 'mid',
            imagePath: 'assets/fish/silverfish.png',
            spawnDirections: ['left', 'right', 'top', 'bottom'],
            speedRange: [120, 220]
        },
        turtle: {
            id: 'turtle',
            name: '灵龟',
            score: 50,
            hp: 3,
            speed: 60,
            size: 56,
            boneSegments: 6,
            spineSegments: 9,
            fresnelIntensity: 0.15,
            scaleType: 'ganoid',
            spawnWeight: 15,
            color: '#2D8B5E',
            accentColor: '#4ADE80',
            finColor: '#1E6B42',
            pathType: 'random',
            schoolFish: false,
            depth: 'near',
            imagePath: 'assets/fish/turtle.png',
            spawnDirections: ['left', 'right'],
            speedRange: [40, 80]
        },
        manta: {
            id: 'manta',
            name: '蝠鲼',
            score: 80,
            hp: 4,
            speed: 100,
            size: 72,
            boneSegments: 6,
            spineSegments: 10,
            fresnelIntensity: 0.12,
            scaleType: 'ctenoid',
            spawnWeight: 12,
            color: '#4A5568',
            accentColor: '#718096',
            finColor: '#2D3748',
            pathType: 'sine',
            schoolFish: false,
            depth: 'mid',
            imagePath: 'assets/fish/manta.png',
            spawnDirections: ['left', 'right'],
            speedRange: [70, 130]
        },
        jellyfish: {
            id: 'jellyfish',
            name: '幻彩水母',
            score: 60,
            hp: 2,
            speed: 40,
            size: 48,
            boneSegments: 4,
            spineSegments: 8,
            fresnelIntensity: 0.08,
            scaleType: 'cycloid',
            spawnWeight: 14,
            color: '#FF69B4',
            accentColor: '#FFB6C1',
            finColor: '#DA70D6',
            pathType: 'float',
            schoolFish: true,
            schoolSize: [2, 5],
            depth: 'mid',
            glow: true,
            imagePath: 'assets/fish/jellyfish.png',
            spawnDirections: ['left', 'right', 'top', 'bottom'],
            speedRange: [25, 55]
        },
        seahorse: {
            id: 'seahorse',
            name: '珊瑚海马',
            score: 30,
            hp: 2,
            speed: 90,
            size: 32,
            boneSegments: 5,
            spineSegments: 8,
            fresnelIntensity: 0.10,
            scaleType: 'ctenoid',
            spawnWeight: 18,
            color: '#FF8C00',
            accentColor: '#FFD700',
            finColor: '#FF6347',
            pathType: 'erratic',
            schoolFish: true,
            schoolSize: [3, 8],
            depth: 'near',
            imagePath: 'assets/fish/seahorse.png',
            spawnDirections: ['left', 'right', 'top', 'bottom'],
            speedRange: [60, 120]
        },
        anglerfish: {
            id: 'anglerfish',
            name: '深海灯笼鱼',
            score: 150,
            hp: 6,
            speed: 55,
            size: 64,
            boneSegments: 5,
            spineSegments: 10,
            fresnelIntensity: 0.15,
            scaleType: 'ctenoid',
            spawnWeight: 8,
            color: '#2C1810',
            accentColor: '#8B4513',
            finColor: '#1A0F0A',
            pathType: 'random',
            schoolFish: false,
            depth: 'far',
            glow: true,
            lureColor: '#00FF7F',
            imagePath: 'assets/fish/anglerfish.png',
            spawnDirections: ['left', 'right'],
            speedRange: [40, 75]
        },
        blackdragon: {
            id: 'blackdragon',
            name: '黑龙',
            score: 200,
            hp: 8,
            speed: 90,
            size: 90,
            boneSegments: 8,
            spineSegments: 11,
            fresnelIntensity: 0.20,
            scaleType: 'dragon',
            spawnWeight: 8,
            color: '#1A1A2E',
            accentColor: '#6B5B95',
            finColor: '#3D2E5C',
            pathType: 'sine',
            schoolFish: false,
            depth: 'far',
            imagePath: 'assets/fish/blackdragon.png',
            spawnDirections: ['left', 'right'],
            speedRange: [60, 120]
        },
        goldendragon: {
            id: 'goldendragon',
            name: '黄金龙鱼',
            score: 500,
            hp: 12,
            speed: 70,
            size: 100,
            boneSegments: 8,
            spineSegments: 12,
            fresnelIntensity: 0.30,        // 金龙鱼强菲涅尔 F0=0.3
            scaleType: 'dragon',
            spawnWeight: 4,
            color: '#DAA520',
            accentColor: '#FFD700',
            finColor: '#B8860B',
            pathType: 'circle',
            schoolFish: false,
            depth: 'mid',
            imagePath: 'assets/fish/goldendragon.png',
            spawnDirections: ['left', 'right'],
            speedRange: [50, 90]
        },
        dragonking: {
            id: 'dragonking',
            name: '东海龙王',
            score: 2000,
            hp: 50,
            speed: 50,
            size: 160,
            boneSegments: 12,
            spineSegments: 12,
            fresnelIntensity: 0.30,
            scaleType: 'dragon',
            spawnWeight: 1,
            color: '#1E3A5F',
            accentColor: '#FFD700',
            finColor: '#36E0E8',
            pathType: 'boss',
            schoolFish: false,
            isBoss: true,
            depth: 'far',
            bossWarningDuration: 2,       // BOSS 出场预警时长（秒）
            bossDisperseRadius: 500,      // BOSS 驱散小鱼半径
            imagePath: 'assets/fish/dragonking.png',
            spawnDirections: ['top'],
            speedRange: [40, 60]
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
            spineSegments: 10,
            fresnelIntensity: 0.12,
            scaleType: 'ctenoid',
            spawnWeight: 6,
            color: '#4A0080',
            accentColor: '#00FFFF',
            finColor: '#9400D3',
            pathType: 'sine',
            schoolFish: false,
            depth: 'mid',
            special: 'electric',           // 特殊行为：电击
            glow: true,
            glowColor: '#00FFFF',
            imagePath: 'assets/fish/electriceel.png',
            spawnDirections: ['left', 'right', 'top', 'bottom'],
            speedRange: [70, 130]
        },
        ghostfish: {
            id: 'ghostfish',
            name: '幽灵鱼',
            score: 180,
            hp: 2,
            speed: 90,
            size: 48,
            boneSegments: 6,
            spineSegments: 9,
            fresnelIntensity: 0.08,
            scaleType: 'cycloid',
            spawnWeight: 5,
            color: '#E8E8FF',
            accentColor: '#B8B8FF',
            finColor: '#D0D0FF',
            pathType: 'erratic',
            schoolFish: false,
            depth: 'mid',
            special: 'invisible',          // 特殊行为：隐身
            glow: true,
            glowColor: '#E8E8FF',
            imagePath: 'assets/fish/ghostfish.png',
            spawnDirections: ['left', 'right', 'top', 'bottom'],
            speedRange: [60, 120]
        },
        splitfish: {
            id: 'splitfish',
            name: '分裂水母',
            score: 90,
            hp: 2,
            speed: 70,
            size: 50,
            boneSegments: 4,
            spineSegments: 8,
            fresnelIntensity: 0.10,
            scaleType: 'cycloid',
            spawnWeight: 7,
            color: '#FF69B4',
            accentColor: '#FFB6C1',
            finColor: '#FF1493',
            pathType: 'float',
            schoolFish: false,
            depth: 'near',
            special: 'split',              // 特殊行为：分裂
            glow: true,
            glowColor: '#FF69B4',
            imagePath: 'assets/fish/splitfish.png',
            spawnDirections: ['left', 'right', 'top', 'bottom'],
            speedRange: [50, 90]
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
        speedInfluence: 0.5,                // 速度对动画频率的影响
        // 脊椎分段摆动幅度权重：头/躯干/尾
        headAmpScale: 0.3,                  // 头部摆动幅度系数
        tailAmpScale: 1.5                   // 尾部摆动幅度系数
    },

    // ===== 动画状态机（7 种状态）=====
    // freq/amp 为相对 boneAnimation 的倍率；bendMult 为身体弯曲度倍率
    animStates: {
        idle:   { freq: 0.5, bodyAmp: 0.6, tailFreq: 0.5, tailAmp: 0.5, finFreq: 0.4, finAmp: 0.6, bendMult: 0.7 },
        swim:   { freq: 1.0, bodyAmp: 1.0, tailFreq: 1.0, tailAmp: 1.0, finFreq: 1.0, finAmp: 1.0, bendMult: 1.0 },
        fast:   { freq: 1.5, bodyAmp: 1.2, tailFreq: 1.8, tailAmp: 1.5, finFreq: 1.4, finAmp: 1.2, bendMult: 1.5 },
        turn:   { freq: 1.0, bodyAmp: 1.3, tailFreq: 1.2, tailAmp: 1.2, finFreq: 1.6, finAmp: 1.4, bendMult: 1.4 },
        escape: { freq: 2.0, bodyAmp: 1.6, tailFreq: 2.5, tailAmp: 1.8, finFreq: 2.0, finAmp: 1.5, bendMult: 1.6 },
        hurt:   { freq: 3.0, bodyAmp: 0.3, tailFreq: 3.0, tailAmp: 0.3, finFreq: 2.0, finAmp: 0.5, bendMult: 0.5 },
        dying:  { freq: 0.3, bodyAmp: 0.2, tailFreq: 0.4, tailAmp: 0.2, finFreq: 0.3, finAmp: 0.2, bendMult: 0.5 }
    },

    // ===== 状态切换阈值 =====
    stateRules: {
        fastSpeedRatio: 1.3,                // 速度 > baseSpeed*1.3 → fast
        idleSpeedRatio: 0.5,                // 速度 < baseSpeed*0.5 → idle
        turnRadPerSec: 6.0,                 // 方向变化速率 > 此值(rad/s) → turn
        hurtDuration: 0.3                    // 受击僵直时长（秒）
    },

    // ===== 鱼鳍 Verlet 物理参数 =====
    physics: {
        damping: 0.85,                      // 阻尼（水阻力）
        iterations: 3,                      // 约束求解迭代次数
        bodyStiffness: 0.9,                 // 鱼身刚度
        finStiffness: 0.3,                  // 鱼鳍刚度（柔性）
        headMass: 1.5,                      // 鱼头质量（重）
        tailMass: 0.5,                      // 鱼尾质量（轻）
        pectoralNodes: 3,                   // 每侧胸鳍边缘节点数
        dorsalNodes: 6,                     // 背鳍边缘节点数
        tailLobeNodes: 4,                   // 尾鳍每叶边缘节点数
        waterForceX: 0.6,                   // 沿游向反向的水流阻力
        turbulenceY: 1.2                    // 垂直水流扰动幅度
    },

    // ===== 生成系统配置 =====
    spawnSystem: {
        minInterval: 0.8,                   // 最小生成间隔（秒）
        maxInterval: 2.5,                    // 最大生成间隔（秒）
        schoolChance: 0.35,                  // 结群鱼类生成鱼群的概率
        maxFishPerSpawn: 3,                 // 单次最多生成鱼数
        outOfBoundsMargin: 100,              // 出框判定边距（像素）
    },

    // ===== 炮弹反弹配置 =====
    bulletBounce: {
        maxBounces: 3,                       // 最大反弹次数
        speedDecay: 0.9,                     // 反弹后速度衰减倍率
        bounceScalePulse: 1.3,               // 反弹时缩放脉冲
        bounceParticleCount: 8               // 反弹水花粒子数
    }
};
