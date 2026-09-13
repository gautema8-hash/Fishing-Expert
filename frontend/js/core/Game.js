/**
 * 游戏主类
 * 核心 orchestrator，整合所有子系统，运行主循环
 */
import { Utils } from './Utils.js';
import { EventBus, Events } from './EventBus.js';
import { Storage, SaveManager } from './Storage.js';
import { ResourceManager } from './ResourceManager.js';
import { Renderer } from '../render/Renderer.js';
import { Scene } from '../render/Scene.js';
import { ParticleSystem } from '../render/ParticleSystem.js';
import { WaterRippleManager } from '../render/WaterRipple.js';
import { Caustics, VolumetricFog } from '../render/Caustics.js';
import { FishManager } from '../entities/FishSchool.js';
import { Cannon } from '../entities/Cannon.js';
import { BulletManager } from '../entities/Bullet.js';
import { CoinManager } from '../entities/Coin.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { VIPSystem, SignInSystem } from '../systems/VIPSystem.js';
import { TaskSystem } from '../systems/TaskSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { PetSystem } from '../systems/PetSystem.js';
import { OfflineSystem } from '../systems/OfflineSystem.js';
import { AIBotManager } from '../systems/AIBotSystem.js';
import { AnalyticsSystem, AnalyticsEvents } from '../systems/AnalyticsSystem.js';
import { WorldBossSystem } from '../systems/WorldBossSystem.js';
import { AdSystem } from '../systems/AdSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { DailyResetSystem } from '../systems/DailyResetSystem.js';
import { MailSystem } from '../systems/MailSystem.js';
import { RedemptionSystem } from '../systems/RedemptionSystem.js';
import { RedemptionCodes } from '../systems/RedemptionSystem.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { FriendSystem } from '../systems/FriendSystem.js';
import { EquipmentSystem } from '../systems/EquipmentSystem.js';
import { RarityConfig } from '../systems/EquipmentSystem.js';
import { GuildSystem } from '../systems/GuildSystem.js';
import { SeasonSystem } from '../systems/SeasonSystem.js';
import { BackendSyncService } from '../api/BackendSyncService.js';
import { UIManager } from '../ui/UIManager.js';
import { TopBar, BottomBar, Sidebar } from '../ui/TopBar.js';
import { GameConfig } from '../config/gameConfig.js';
import { FishConfig } from '../config/fishConfig.js';

export class Game {
    constructor(container) {
        this.container = container;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // 核心
        this.eventBus = new EventBus();
        this.storage = new Storage();
        this.saveManager = new SaveManager(this.storage);
        this.resourceManager = new ResourceManager();

        // 存档
        this.saveData = this.saveManager.load();

        // 状态
        this.state = 'idle'; // idle / playing / paused / gameover
        this._lastTime = 0;
        this._accumulator = 0;
        this._fixedDt = 1000 / 60;
        this._fps = 60;
        this._fpsTimer = 0;
        this._frameCount = 0;
        this._paused = false;

        // 技能全屏特效状态
        this._skillEffects = {
            freeze: { active: false, timer: 0, duration: 5 },
            lightning: { active: false, timer: 0, duration: 0.5 },
            coinRain: { active: false, timer: 0, duration: 2 }
        };

        // BOSS预警特效
        this._bossWarning = { active: false, timer: 0 };

        // 性能
        this._quality = this.saveData.settings.quality || 'high';
        this._showFPS = this.saveData.settings.showFPS || false;

        // 多人联机炮台系统（前端单机模拟：4个位置，空位显示"等待加入"，AI机器人随机加入/离开/发射）
        this.multiplayer = {
            cannons: [],        // 4个炮台位置 slot（下标0=玩家自己，引用 this.cannon）
            botJoinTimer: 0,    // AI加入倒计时
            _time: 0,           // 空位呼吸光效计时
            namePool: ['龙宫高手', '捕鱼达人', '海王', '金龙战士', '深海猎人', '渔场主', '老船长', '小哪吒']
        };
    }

    /**
     * 初始化游戏
     */
    async init() {
        // 创建渲染器
        this.renderer = new Renderer(this.container);
        this.renderer.setQuality(this._quality);

        // 场景
        this.scene = new Scene(this.width, this.height);
        // 性能优化：粒子上限按画质分级 300/200/100（原为 800/400/150）
        this.particleSystem = new ParticleSystem(
            this._quality === 'high' ? 300 : this._quality === 'medium' ? 200 : 100
        );
        this.waterRipple = new WaterRippleManager();
        this.caustics = new Caustics(this.width, this.height);
        this.volumetricFog = new VolumetricFog(this.width, this.height);

        if (this._quality === 'low') {
            this.caustics.setEnabled(false);
            this.volumetricFog.setEnabled(false);
        }

        // 实体
        this.fishManager = new FishManager(this.eventBus);
        this.cannon = new Cannon(this.width / 2, this.height - 80);
        this.bulletManager = new BulletManager(this.eventBus);
        this.coinManager = new CoinManager(this.eventBus);

        // 初始化多人炮台系统（4个位置：底=玩家，左/顶/右=空位，等待AI加入）
        this._initMultiplayerCannons();

        // 系统
        this.economy = new EconomySystem(this.eventBus, this.saveData);
        this.levelSystem = new LevelSystem(this.eventBus, this.saveData);
        this.audio = new AudioSystem(this.eventBus, this.saveData);
        this.itemSystem = new ItemSystem(this.eventBus, this.saveData);
        this.vipSystem = new VIPSystem(this.eventBus, this.saveData);
        this.signInSystem = new SignInSystem(this.eventBus, this.saveData);
        this.taskSystem = new TaskSystem(this.eventBus, this.saveData);
        this.skillSystem = new SkillSystem(this.eventBus, this.saveData);
        this.upgradeSystem = new UpgradeSystem(this.eventBus, this.saveData, this.economy);
        this.petSystem = new PetSystem(this.eventBus, this.saveData, this.economy);
        this.offlineSystem = new OfflineSystem(this.eventBus, this.saveData, this.economy);
        this.aiBotManager = new AIBotManager(this.eventBus);
        this.analytics = new AnalyticsSystem(this.saveData);
        this.worldBossSystem = new WorldBossSystem(this.eventBus, this.saveData);
        this.adSystem = new AdSystem(this.eventBus, this.saveData, this.economy, this.itemSystem);

        // 成就系统
        this.achievementSystem = new AchievementSystem(this.eventBus, this.saveData, this.economy, this.itemSystem);

        // 每日重置系统（在所有系统初始化后执行）
        this.dailyResetSystem = new DailyResetSystem(this.saveData);

        // 邮件系统
        this.mailSystem = new MailSystem(this.eventBus, this.saveData, this.economy, this.itemSystem);

        // 兑换码系统
        this.redemptionSystem = new RedemptionSystem(this.eventBus, this.saveData, this.economy, this.itemSystem);

        // 新手引导系统
        this.tutorialSystem = new TutorialSystem(this.eventBus, this.saveData);

        // 好友系统
        this.friendSystem = new FriendSystem(this.eventBus, this.saveData, this.economy);

        // 装备系统
        this.equipmentSystem = new EquipmentSystem(this.eventBus, this.saveData, this.economy);

        // 公会系统
        this.guildSystem = new GuildSystem(this.eventBus, this.saveData, this.economy, this.itemSystem);

        // 赛季系统
        this.seasonSystem = new SeasonSystem(this.eventBus, this.saveData, this.economy, this.itemSystem);

        // 后端同步服务（可选，默认本地模式）
        this.backendSync = new BackendSyncService(this);
        const useBackend = localStorage.getItem('fishing_use_backend') === 'true';
        this.backendSync.init({ useBackend, autoSync: useBackend });

        // VIP 金币加成
        this.economy.setVIPCoinBonus(this.vipSystem.coinBonus);

        // UI
        this.uiManager = new UIManager(this.eventBus, this.container);
        this.topBar = new TopBar(this.container, this.eventBus);
        this.bottomBar = new BottomBar(this.container, this.eventBus);
        this.sidebar = new Sidebar(this.container, this.eventBus);

        // FPS 显示
        if (this._showFPS) {
            this._createFPSDisplay();
        }

        // 设置关卡参数
        this.fishManager.setLevelParams(this.levelSystem.params);

        // 后台非阻塞预加载鱼类图片（加载失败自动降级为程序化绘制）
        try {
            const fishTypes = Object.values(FishConfig.types).filter(t => t.imagePath);
            this.resourceManager.preloadFishImages(fishTypes).then(({ failed }) => {
                if (failed && failed.length) {
                    console.warn('[Game] 部分鱼类图片未加载，将使用程序化绘制:', failed);
                }
            });
        } catch (e) {
            console.warn('[Game] 鱼类图片预加载失败，使用程序化绘制:', e);
        }

        // 金币目标位置
        this.coinManager.setTarget(this.width * 0.5, 50);

        // 绑定事件
        this._bindEvents();

        // 绑定输入
        this._bindInput();

        // 窗口大小变化
        window.addEventListener('resize', () => this._onResize());

        // 性能优化：标签页不可见时自动暂停，可见时恢复
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._paused = true;
            } else if (this.state === 'playing') {
                this._paused = false;
                this._lastTime = performance.now();
            }
        });

        this.state = 'playing';
        this._lastTime = performance.now();

        // 初始化AI机器人陪玩
        this.aiBotManager.init(this.width);

        // 首次显示隐私政策（新用户）
        if (!this.saveData.analytics.privacyAccepted) {
            setTimeout(() => {
                this.uiManager.openPopup('privacy');
                this.saveData.analytics.privacyAccepted = true;
                this.saveManager.save(this.saveData);
            }, 1000);
        }

        // 新手引导
        if (!this.saveData.newbie.guideCompleted) {
            setTimeout(() => {
                this.uiManager.openPopup('guide');
            }, 2000);
        }

        // 离线收益检查
        const offlineStatus = this.offlineSystem.checkOfflineStatus();
        if (offlineStatus.isReturning) {
            // 回归玩家：显示回归礼包
            setTimeout(() => {
                this.uiManager.openPopup('returning', {
                    daysAway: offlineStatus.daysAway,
                    gift: this.offlineSystem.returningGift,
                    offlineEarnings: offlineStatus.offlineEarnings
                });
            }, 1500);
        } else if (offlineStatus.offlineEarnings > 0) {
            // 普通离线收益
            setTimeout(() => {
                this.uiManager.openPopup('offline', {
                    duration: this.offlineSystem.formatOfflineDuration(offlineStatus.offlineMinutes),
                    earnings: offlineStatus.offlineEarnings,
                    capped: offlineStatus.capped
                });
            }, 1500);
        }

        console.log('[Game] 初始化完成 - 捕鱼达人·东海龙宫');
    }

    _bindEvents() {
        // 金币变化
        this.eventBus.on(Events.COIN_CHANGE, (coins) => {
            this.topBar.updateCoins(Utils.formatCoin(Math.floor(coins)));
        });

        // 金币不足
        this.eventBus.on(Events.COIN_INSUFFICIENT, () => {
            this.uiManager.showToast('金币不足，请充值');
            this.uiManager.openPopup('recharge');
            this.audio.play('button');
        });

        // 关卡升级（内部难度调节保留，不向玩家显示关卡UI）
        this.eventBus.on(Events.LEVEL_UP, (level) => {
            this.fishManager.setLevelParams(this.levelSystem.params);
            this.audio.play('levelup');
            this.analytics.track(AnalyticsEvents.LEVEL_UP, { level });
            // 成就统计
            this.achievementSystem.setStat('highestLevel', level);
        });

        // 关卡完成（内部逻辑保留用于难度调节，不显示通关提示）
        this.eventBus.on(Events.LEVEL_COMPLETE, (data) => {
            this.economy.addCoins(data.reward.coins, 'level_reward');
            if (data.reward.diamonds) {
                this.economy.addDiamonds(data.reward.diamonds);
            }
            setTimeout(() => this.levelSystem.nextLevel(), 2000);
        });

        // BOSS 出场
        this.eventBus.on(Events.BOSS_WARNING, () => {
            this.uiManager.showToast('⚠️ 巨型BOSS即将降临！');
            this.audio.play('boss');
            this.renderer.camera.shake(10, 0.5);
            // 触发全屏预警特效
            this._bossWarning.active = true;
            this._bossWarning.timer = 2;
        });

        this.eventBus.on(Events.BOSS_APPEAR, () => {
            this.uiManager.showToast('🐉 BOSS出现了！');
            this._bossWarning.active = false;
        });

        // UI 事件
        this.eventBus.on('ui:cannon_upgrade', () => {
            if (this.cannon.upgrade()) {
                this.bottomBar.updateCannonLevel(this.cannon.level);
                this.audio.play('button');
                this.achievementSystem.setStat('maxCannonLevel', this.cannon.level);
            }
        });

        this.eventBus.on('ui:cannon_downgrade', () => {
            if (this.cannon.downgrade()) {
                this.bottomBar.updateCannonLevel(this.cannon.level);
                this.audio.play('button');
            }
        });

        this.eventBus.on('ui:auto_fire_toggle', () => {
            this.cannon.autoFire = !this.cannon.autoFire;
            this.bottomBar.setAutoFire(this.cannon.autoFire);
            this.audio.play('button');
        });

        this.eventBus.on('ui:use_item', (type) => {
            this.itemSystem.useItem(type, this.fishManager);
            this.sidebar.updateItemCount(type, this.itemSystem.getItemCount(type));
        });

        // 技能使用
        this.eventBus.on('ui:use_skill', (type) => {
            const context = {
                fishManager: this.fishManager,
                particleSystem: this.particleSystem,
                camera: this.camera,
                audio: this.audio,
                economy: this.economy,
                width: this.width
            };
            const success = this.skillSystem.useSkill(type, context);
            if (success) {
                // 播放对应技能音效
                if (type === 'freeze') this.audio.play('freeze');
                else if (type === 'lightning') this.audio.play('lightning');
                else this.audio.play('coin');
                const names = { freeze: '全屏冰冻', lightning: '闪电链', coin_rain: '金币雨' };
                this.uiManager.showToast(`${names[type] || '技能'} 释放！`);
                // 触发全屏视觉特效
                this._triggerSkillEffect(type);
                // 成就统计
                this.achievementSystem.addStat('skillUses', 1);
                // 赛季经验
                this.seasonSystem.addXp(10);
                this.seasonSystem.updateTask('st5', 1);
            }
        });

        this.eventBus.on(Events.RAGE_START, (duration) => {
            this.cannon.activateRage(duration);
            this.uiManager.showToast('🔥 狂暴模式激活！');
            this.audio.play('item');
        });

        this.eventBus.on(Events.LOCK_TARGET, (fish) => {
            this.uiManager.showToast('🎯 已锁定目标！');
            this.audio.play('item');
        });

        // 弹窗打开
        this.eventBus.on('ui:open_shop', () => this.uiManager.openPopup('shop'));
        this.eventBus.on('ui:open_task', () => {
            this.uiManager.openPopup('task', { tasks: this.taskSystem.getTasks() });
        });
        this.eventBus.on('ui:open_signin', () => {
            this.uiManager.openPopup('signin', {
                signInDays: this.signInSystem.getSignInDays(),
                canSignIn: this.signInSystem.canSignIn()
            });
        });
        this.eventBus.on('ui:open_rank', () => this.uiManager.openPopup('rank'));
        this.eventBus.on('ui:open_setting', () => {
            this.uiManager.openPopup('setting', { settings: this.saveData.settings });
        });
        this.eventBus.on('ui:open_wheel', () => this.uiManager.openPopup('wheel'));

        // 炮台养成
        this.eventBus.on('ui:open_upgrade', () => {
            this.uiManager.openPopup('upgrade', {
                upgrades: this.upgradeSystem.getAllUpgradeInfo(),
                totalPower: this.upgradeSystem.getTotalPower()
            });
        });
        this.eventBus.on('ui:upgrade', (type) => {
            const success = this.upgradeSystem.upgrade(type);
            if (success) {
                this.audio.play('upgrade');
                // 刷新弹窗内容
                setTimeout(() => {
                    this.uiManager.openPopup('upgrade', {
                        upgrades: this.upgradeSystem.getAllUpgradeInfo(),
                        totalPower: this.upgradeSystem.getTotalPower()
                    });
                }, 300);
            }
        });

        // 宠物系统
        this.eventBus.on('ui:open_pet', () => {
            this.uiManager.openPopup('pet', {
                pets: this.petSystem.getAllPetInfo()
            });
        });
        this.eventBus.on('ui:pet_unlock', (type) => {
            if (this.petSystem.unlockPet(type)) {
                this.audio.play('pet');
                // 成就统计：统计已解锁宠物数
                const unlockedCount = this.petSystem.getAllPetInfo().filter(p => p.unlocked).length;
                this.achievementSystem.setStat('petsUnlocked', unlockedCount);
                setTimeout(() => {
                    this.uiManager.openPopup('pet', { pets: this.petSystem.getAllPetInfo() });
                }, 300);
            }
        });
        this.eventBus.on('ui:pet_equip', (type) => {
            if (this.petSystem.setActivePet(type)) {
                this.audio.play('pet');
                setTimeout(() => {
                    this.uiManager.openPopup('pet', { pets: this.petSystem.getAllPetInfo() });
                }, 300);
            }
        });
        this.eventBus.on('ui:pet_upgrade', (type) => {
            if (this.petSystem.upgradePet(type)) {
                this.audio.play('upgrade');
                setTimeout(() => {
                    this.uiManager.openPopup('pet', { pets: this.petSystem.getAllPetInfo() });
                }, 300);
            }
        });

        // 离线收益领取
        this.eventBus.on('ui:claim_offline', (amount) => {
            this.offlineSystem.claimOfflineEarnings(amount);
            this.audio.play('coin');
        });

        // 回归礼包领取
        this.eventBus.on('ui:claim_returning', () => {
            this.offlineSystem.claimReturningGift();
            this.sidebar.updateItemCount('lock', this.itemSystem.getItemCount('lock'));
            this.sidebar.updateItemCount('rage', this.itemSystem.getItemCount('rage'));
            this.audio.play('coin');
        });

        // BOSS 冲撞技能
        this.eventBus.on('boss:charge_start', (pos) => {
            this.renderer.camera.shake(12, 0.4);
            this.particleSystem.burst(pos.x, pos.y, {
                count: 20,
                type: 'flame',
                color: '#FF6B35',
                speedMin: 80,
                speedMax: 200,
                lifeMin: 0.4,
                lifeMax: 0.8,
                sizeMin: 4,
                sizeMax: 8
            });
            this.waterRipple.bigKill(pos.x, pos.y, false);
            this.audio.play('hit');
        });
        this.eventBus.on('boss:charge_trail', (pos) => {
            this.particleSystem.burst(pos.x, pos.y, {
                count: 3,
                type: 'flame',
                color: '#FFD700',
                speedMin: 20,
                speedMax: 60,
                lifeMin: 0.3,
                lifeMax: 0.6,
                sizeMin: 3,
                sizeMax: 6
            });
        });

        // 炮台皮肤
        this.eventBus.on('ui:open_skin', () => {
            this.uiManager.openPopup('skin', {
                skins: this._getSkinInfo(),
                currentSkin: this.cannon.skin,
                vipLevel: this.vipSystem.vipLevel
            });
        });
        this.eventBus.on('ui:change_skin', (skin) => {
            if (this.cannon.changeSkin(skin)) {
                this.saveData.cannon.skin = skin;
                this.uiManager.showToast(`已切换为 ${GameConfig.cannon.skins[skin].name}`);
                this.audio.play('skin');
                setTimeout(() => {
                    this.uiManager.openPopup('skin', {
                        skins: this._getSkinInfo(),
                        currentSkin: this.cannon.skin,
                        vipLevel: this.vipSystem.vipLevel
                    });
                }, 300);
            }
        });

        // 世界BOSS活动
        this.eventBus.on('worldboss:start', (data) => {
            this.uiManager.showToast(`🌍 世界BOSS ${data.name} 降临！`);
            this.renderer.camera.shake(15, 0.5);
            // 实际生成世界BOSS
            this.fishManager.spawnWorldBoss(this.width, this.height, data.config);
            this.audio.play('hit');
        });
        this.eventBus.on('worldboss:end', (data) => {
            if (data.killed && data.reward) {
                this.economy.addCoins(data.reward, 'worldboss');
            }
        });

        // 激励视频广告
        this.eventBus.on('ui:watch_ad', (type) => {
            this.adSystem.watchAd(type);
        });

        // 数据统计
        this.eventBus.on('ui:open_stats', () => {
            this.uiManager.openPopup('stats', {
                summary: this.analytics.getSummary(),
                playerId: this.saveData.player?.id
            });
        });

        // 成就
        this.eventBus.on('ui:open_achievement', () => {
            this.uiManager.openPopup('achievement', {
                achievements: this.achievementSystem.getAllAchievements()
            });
        });

        this.eventBus.on('ui:claim_achievement', (id) => {
            if (this.achievementSystem.claimReward(id)) {
                this.audio.play('coin');
                setTimeout(() => {
                    this.uiManager.openPopup('achievement', {
                        achievements: this.achievementSystem.getAllAchievements()
                    });
                }, 300);
            }
        });

        // 邮件系统
        this.eventBus.on('ui:open_mail', () => {
            this.uiManager.openPopup('mail', { mails: this.mailSystem.getAllMails() });
        });

        this.eventBus.on('ui:mail_read', (id) => {
            this.mailSystem.markRead(id);
            this._updateMailBadge();
        });

        this.eventBus.on('ui:mail_read_all', () => {
            this.mailSystem.markAllRead();
            this._updateMailBadge();
            this.uiManager.openPopup('mail', { mails: this.mailSystem.getAllMails() });
        });

        this.eventBus.on('ui:mail_claim', (id) => {
            if (this.mailSystem.claimAttachment(id)) {
                this.audio.play('coin');
                this._updateMailBadge();
                setTimeout(() => {
                    this.uiManager.openPopup('mail', { mails: this.mailSystem.getAllMails() });
                }, 300);
            }
        });

        this.eventBus.on('ui:mail_claim_all', () => {
            const claimed = this.mailSystem.claimAll();
            if (claimed > 0) {
                this.audio.play('coin');
                this._updateMailBadge();
                setTimeout(() => {
                    this.uiManager.openPopup('mail', { mails: this.mailSystem.getAllMails() });
                }, 300);
            }
        });

        this.eventBus.on('ui:mail_delete', (id) => {
            this.mailSystem.deleteMail(id);
            this._updateMailBadge();
            this.uiManager.openPopup('mail', { mails: this.mailSystem.getAllMails() });
        });

        // 兑换码系统
        this.eventBus.on('ui:open_redemption', () => {
            const codes = Object.entries(RedemptionCodes).map(([code, data]) => ({
                code,
                name: data.name,
                used: this.redemptionSystem.usedCodes.includes(code)
            }));
            this.uiManager.openPopup('redemption', {
                codes,
                availableCount: this.redemptionSystem.getAvailableCount(),
                totalCount: codes.length
            });
        });

        this.eventBus.on('ui:redeem_code', (code) => {
            const result = this.redemptionSystem.redeem(code);
            this.uiManager.showRedemptionResult(result.success, result.message);
            if (result.success) {
                this.audio.play('coin');
                // 刷新弹窗
                setTimeout(() => {
                    const codes = Object.entries(RedemptionCodes).map(([c, data]) => ({
                        code: c,
                        name: data.name,
                        used: this.redemptionSystem.usedCodes.includes(c)
                    }));
                    this.uiManager.openPopup('redemption', {
                        codes,
                        availableCount: this.redemptionSystem.getAvailableCount(),
                        totalCount: codes.length
                    });
                }, 1000);
            }
        });

        // 新手引导
        this.eventBus.on('tutorial:show', (step) => {
            this.uiManager.showTutorial(step, this.tutorialSystem.getProgress());
        });

        this.eventBus.on('tutorial:complete', () => {
            this.uiManager.hideTutorial();
            // 新手引导完成奖励
            this.economy.addCoins(5000, 'tutorial_reward');
        });

        this.eventBus.on('ui:tutorial_next', () => {
            this.tutorialSystem.next();
        });

        this.eventBus.on('ui:tutorial_skip', () => {
            this.tutorialSystem.skip();
        });

        this.eventBus.on('ui:tutorial_restart', () => {
            this.tutorialSystem.forceStart();
        });

        // 好友系统
        this.eventBus.on('ui:open_friend', () => {
            this._openFriendPopup('list');
        });

        this.eventBus.on('ui:friend_tab', (tab) => {
            this._openFriendPopup(tab);
        });

        this.eventBus.on('ui:friend_add', (id) => {
            if (this.friendSystem.addFriend(id)) {
                this.audio.play('button');
                this._openFriendPopup('recommend');
            }
        });

        this.eventBus.on('ui:friend_delete', (id) => {
            if (this.friendSystem.removeFriend(id)) {
                this._openFriendPopup('list');
            }
        });

        this.eventBus.on('ui:friend_gift', (id) => {
            const result = this.friendSystem.sendGift(id);
            if (result.success) {
                this.audio.play('coin');
                this._openFriendPopup('list');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:friend_claim', (id) => {
            const result = this.friendSystem.claimGift(id);
            if (result.success) {
                this.audio.play('coin');
                this._openFriendPopup('list');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:friend_claim_all', () => {
            const claimed = this.friendSystem.claimAllGifts();
            if (claimed > 0) {
                this.audio.play('coin');
                this._openFriendPopup('list');
            }
        });

        // 装备系统
        this.eventBus.on('ui:open_equipment', () => {
            this._openEquipmentPopup('equip');
        });

        this.eventBus.on('ui:equip_tab', (tab) => {
            this._openEquipmentPopup(tab);
        });

        this.eventBus.on('ui:equip_equip', (uid) => {
            if (this.equipmentSystem.equip(uid)) {
                this.audio.play('upgrade');
                this._openEquipmentPopup('equip');
            }
        });

        this.eventBus.on('ui:equip_unequip', (slot) => {
            this.equipmentSystem.unequip(slot);
            this._openEquipmentPopup('equip');
        });

        this.eventBus.on('ui:equip_enhance', (uid) => {
            const result = this.equipmentSystem.enhance(uid);
            if (result.success) {
                this.audio.play('upgrade');
                this._openEquipmentPopup('equip');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:equip_decompose', (uid) => {
            if (this.equipmentSystem.decompose(uid)) {
                this.audio.play('coin');
                this._openEquipmentPopup('inventory');
            }
        });

        this.eventBus.on('ui:equip_draw_single', () => {
            const result = this.equipmentSystem.drawSingle();
            if (result.success) {
                this.audio.play('crit');
                this.uiManager.showToast(`获得：${result.item.name}（${RarityConfig[result.item.rarity].name}）`);
                this._openEquipmentPopup('draw');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:equip_draw_ten', () => {
            const result = this.equipmentSystem.drawTen();
            if (result.success) {
                this.audio.play('crit');
                const best = result.items.reduce((a, b) =>
                    RarityConfig[a.rarity].weight < RarityConfig[b.rarity].weight ? a : b
                );
                this.uiManager.showToast(`十连抽获得最佳：${best.name}（${RarityConfig[best.rarity].name}）`);
                this._openEquipmentPopup('draw');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        // 公会系统
        this.eventBus.on('ui:open_guild', () => {
            this._openGuildPopup('info');
        });

        this.eventBus.on('ui:guild_tab', (tab) => {
            this._openGuildPopup(tab);
        });

        this.eventBus.on('ui:guild_shop_buy', (itemId) => {
            const result = this.guildSystem.purchaseItem(itemId);
            if (result.success) {
                this.audio.play('coin');
                this._openGuildPopup('shop');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:guild_boss_attack', () => {
            const result = this.guildSystem.attackBoss(100);
            if (result.success) {
                this.audio.play('hit');
                if (result.killed) {
                    this.audio.play('crit');
                }
                this._openGuildPopup('boss');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:guild_leave', () => {
            this.guildSystem.leaveGuild();
            this.uiManager.closePopup();
        });

        // 赛季系统
        this.eventBus.on('ui:open_season', () => {
            this._openSeasonPopup('rewards');
        });

        this.eventBus.on('ui:season_tab', (tab) => {
            this._openSeasonPopup(tab);
        });

        this.eventBus.on('ui:season_buy', () => {
            const result = this.seasonSystem.buyPremium();
            if (result.success) {
                this.audio.play('upgrade');
                this._openSeasonPopup('rewards');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        this.eventBus.on('ui:season_claim', ({ level, type }) => {
            let result;
            if (type === 'free') {
                result = this.seasonSystem.claimFreeReward(level);
            } else {
                result = this.seasonSystem.claimPremiumReward(level);
            }
            if (result.success) {
                this.audio.play('coin');
                this._openSeasonPopup('rewards');
            } else {
                this.uiManager.showToast(result.message);
            }
        });

        // 商城购买（首充双倍）
        this.eventBus.on('ui:shop_purchase', (price) => {
            const priceNum = parseInt(String(price).replace(/[^0-9]/g, '')) || 6;
            let coinReward = priceNum * 1000;
            const isFirstCharge = this.offlineSystem.isFirstCharge();
            // 首充双倍
            coinReward = this.offlineSystem.processFirstCharge(coinReward);
            this.economy.addCoins(coinReward, 'purchase');
            this.vipSystem.addRecharge(priceNum);
            this.economy.setVIPCoinBonus(this.vipSystem.coinBonus);
            this.topBar.updatePlayerInfo(this.saveData.player.name, this.vipSystem.vipLevel);
            this.audio.play('coin');
            // 埋点
            this.analytics.track(AnalyticsEvents.PURCHASE, { amount: priceNum, coins: coinReward });
            if (isFirstCharge) this.analytics.track(AnalyticsEvents.FIRST_CHARGE, {});
        });

        // 任务领取
        this.eventBus.on('popup:opened', (type) => {
            if (type === 'task') {
                setTimeout(() => this._bindTaskButtons(), 100);
            }
            if (type === 'signin') {
                setTimeout(() => this._bindSignInButton(), 100);
            }
            if (type === 'setting') {
                setTimeout(() => this._bindSettingButtons(), 100);
            }
            if (type === 'wheel') {
                setTimeout(() => this._bindWheelButton(), 100);
            }
        });
    }

    _bindWheelButton() {
        const btn = document.getElementById('wheel-spin-btn');
        const wheel = document.getElementById('lucky-wheel');
        if (!btn || !wheel || btn._bound) return;
        btn._bound = true;

        const rewards = [
            { coins: 1000, weight: 30 },
            { coins: 5000, weight: 20 },
            { items: { lock: 1 }, weight: 10 },
            { coins: 2000, weight: 20 },
            { items: { rage: 1 }, weight: 10 },
            { coins: 10000, weight: 5 },
            { diamonds: 2, weight: 3 },
            { coins: 0, weight: 2 }
        ];

        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            btn.disabled = true;
            btn.textContent = '抽奖中...';

            // 加权随机
            const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
            let rand = Math.random() * totalWeight;
            let selectedIndex = 0;
            for (let i = 0; i < rewards.length; i++) {
                rand -= rewards[i].weight;
                if (rand <= 0) { selectedIndex = i; break; }
            }

            // 旋转动画：目标角度 + 多圈
            const segmentAngle = 360 / rewards.length;
            const targetRotation = 360 * 5 + (360 - selectedIndex * segmentAngle - segmentAngle / 2);
            wheel.style.transform = `rotate(${targetRotation}deg)`;

            setTimeout(() => {
                const reward = rewards[selectedIndex];
                if (reward.coins) {
                    this.economy.addCoins(reward.coins, 'wheel');
                    this.uiManager.showToast(`获得 ${Utils.formatCoin(reward.coins)} 金币！`);
                } else if (reward.diamonds) {
                    this.economy.addDiamonds(reward.diamonds);
                    this.uiManager.showToast(`获得 ${reward.diamonds} 钻石！`);
                } else if (reward.items) {
                    for (const [item, count] of Object.entries(reward.items)) {
                        this.itemSystem.addItem(item, count);
                        this.sidebar.updateItemCount(item, this.itemSystem.getItemCount(item));
                    }
                    this.uiManager.showToast('获得道具！');
                } else {
                    this.uiManager.showToast('谢谢参与，下次好运！');
                }
                this.audio.play('coin');
                btn.disabled = false;
                btn.textContent = '开始抽奖';
            }, 4200);
        });
    }

    _bindTaskButtons() {
        document.querySelectorAll('.task-claim-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.dataset.taskId;
                const reward = this.taskSystem.claimReward(taskId);
                if (reward) {
                    this.economy.addCoins(reward.coins || 0, 'task');
                    if (reward.diamonds) this.economy.addDiamonds(reward.diamonds);
                    this.uiManager.showToast('任务奖励已领取！');
                    this.audio.play('coin');
                    btn.disabled = true;
                    btn.textContent = '已领取';
                    btn.closest('.task-item').classList.add('claimed');
                }
            });
        });
    }

    _bindSignInButton() {
        const btn = document.getElementById('signin-claim-btn');
        if (btn && !btn.disabled) {
            btn.addEventListener('click', () => {
                const result = this.signInSystem.signIn();
                if (result) {
                    this.economy.addCoins(result.reward.coins || 0, 'signin');
                    if (result.reward.diamonds) this.economy.addDiamonds(result.reward.diamonds);
                    // 发放签到道具奖励（如第7天锁定道具）
                    if (result.reward.items) {
                        for (const [itemType, count] of Object.entries(result.reward.items)) {
                            this.itemSystem.addItem(itemType, count);
                            this.sidebar.updateItemCount(itemType, this.itemSystem.getItemCount(itemType));
                        }
                    }
                    this.uiManager.showToast(`签到成功！第${result.day}天奖励已领取`);
                    this.audio.play('coin');
                    btn.disabled = true;
                    btn.textContent = '今日已签到';
                }
            });
        }
    }

    _bindSettingButtons() {
        // BGM 开关
        document.querySelectorAll('.toggle-btn[data-type="bgm"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audio.toggleBGM();
                btn.textContent = this.audio.bgmMuted ? '关' : '开';
                btn.classList.toggle('off', this.audio.bgmMuted);
                btn.classList.toggle('on', !this.audio.bgmMuted);
            });
        });
        // SFX 开关
        document.querySelectorAll('.toggle-btn[data-type="sfx"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audio.toggleSFX();
                btn.textContent = this.audio.sfxMuted ? '关' : '开';
                btn.classList.toggle('off', this.audio.sfxMuted);
                btn.classList.toggle('on', !this.audio.sfxMuted);
            });
        });
        // 音量滑块
        document.querySelectorAll('.volume-slider[data-type="bgm"]').forEach(slider => {
            slider.addEventListener('input', () => {
                this.audio.setBGMVolume(slider.value / 100);
            });
        });
        document.querySelectorAll('.volume-slider[data-type="sfx"]').forEach(slider => {
            slider.addEventListener('input', () => {
                this.audio.setSFXVolume(slider.value / 100);
            });
        });
        // 画质
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._setQuality(btn.dataset.quality);
            });
        });
        // FPS
        document.querySelectorAll('.toggle-btn[data-type="fps"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this._showFPS = !this._showFPS;
                this.saveData.settings.showFPS = this._showFPS;
                btn.textContent = this._showFPS ? '开' : '关';
                btn.classList.toggle('off', !this._showFPS);
                btn.classList.toggle('on', this._showFPS);
                if (this._showFPS) this._createFPSDisplay();
                else if (this._fpsDisplay) this._fpsDisplay.remove();
            });
        });
        // 暂停
        const pauseBtn = document.getElementById('pause-game-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.togglePause();
                pauseBtn.textContent = this._paused ? '继续' : '暂停';
            });
        }
        // 隐私/协议链接
        document.querySelectorAll('.setting-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.uiManager.openPopup(link.dataset.popup);
            });
        });
    }

    /**
     * 获取炮台皮肤信息（含解锁状态）
     */
    _getSkinInfo() {
        const vipLevel = this.vipSystem.vipLevel;
        const skins = [];
        for (const [id, config] of Object.entries(GameConfig.cannon.skins)) {
            let unlocked = false;
            let unlockDesc = '';
            if (config.unlock === 'default') {
                unlocked = true;
                unlockDesc = '默认解锁';
            } else if (config.unlock.startsWith('vip')) {
                const requiredVip = parseInt(config.unlock.replace('vip', ''));
                unlocked = vipLevel >= requiredVip;
                unlockDesc = unlocked ? '已解锁' : `VIP${requiredVip}解锁`;
            }
            skins.push({
                id,
                name: config.name,
                color: config.color,
                unlocked,
                unlockDesc
            });
        }
        return skins;
    }

    /**
     * 触发技能全屏特效
     */
    _triggerSkillEffect(type) {
        if (this._skillEffects[type]) {
            this._skillEffects[type].active = true;
            this._skillEffects[type].timer = this._skillEffects[type].duration;
        }

        // 闪电：屏幕强闪+震动
        if (type === 'lightning') {
            this.renderer.camera.shake(10, 0.3);
        }
        // 金币雨：屏幕震动
        if (type === 'coin_rain') {
            this.renderer.camera.shake(5, 0.2);
        }
    }

    /**
     * 更新技能特效
     */
    _updateSkillEffects(dt) {
        for (const key in this._skillEffects) {
            const effect = this._skillEffects[key];
            if (effect.active) {
                effect.timer -= dt;
                if (effect.timer <= 0) {
                    effect.active = false;
                }
            }
        }
    }

    /**
     * 打开赛季弹窗
     */
    _openSeasonPopup(tab = 'rewards') {
        this.uiManager.openPopup('season', {
            season: this.seasonSystem.getSeasonInfo(),
            rewards: this.seasonSystem.getRewardsList(),
            tasks: this.seasonSystem.getTasksList(),
            tab
        });
    }

    /**
     * 打开公会弹窗
     */
    _openGuildPopup(tab = 'info') {
        this.uiManager.openPopup('guild', {
            guild: this.guildSystem.getGuildInfo(),
            members: this.guildSystem.getMembers(),
            shopItems: this.guildSystem.getShopItems(),
            boss: this.guildSystem.getBossInfo(),
            onlineCount: this.guildSystem.getOnlineCount(),
            tab
        });
    }

    /**
     * 打开装备弹窗
     */
    _openEquipmentPopup(tab = 'equip') {
        this.uiManager.openPopup('equipment', {
            equipped: this.equipmentSystem.getEquippedInfo(),
            inventory: this.equipmentSystem.getInventoryInfo(),
            totalStats: this.equipmentSystem.getTotalStats(),
            diamonds: this.economy.getDiamonds(),
            tab
        });
    }

    /**
     * 打开好友弹窗
     */
    _openFriendPopup(tab = 'list') {
        this.uiManager.openPopup('friend', {
            friends: this.friendSystem.getFriends(),
            recommends: this.friendSystem.getRecommends(),
            onlineCount: this.friendSystem.getOnlineCount(),
            claimableCount: this.friendSystem.getClaimableCount(),
            tab
        });
    }

    /**
     * 更新邮件徽章
     */
    _updateMailBadge() {
        if (this.topBar && this.mailSystem) {
            this.topBar.updateMailBadge(this.mailSystem.getUnreadCount());
        }
    }

    _setQuality(quality) {
        this._quality = quality;
        this.saveData.settings.quality = quality;
        this.renderer.setQuality(quality);
        // 性能优化：粒子上限 300/200/100
        const maxParticles = quality === 'high' ? 300 : quality === 'medium' ? 200 : 100;
        this.particleSystem.setMaxParticles(maxParticles);
        this.caustics.setEnabled(quality !== 'low');
        this.volumetricFog.setEnabled(quality !== 'low');
        this.uiManager.showToast(`画质已切换为${quality === 'high' ? '高' : quality === 'medium' ? '中' : '低'}`);
    }

    _bindInput() {
        const gameCanvas = this.renderer.getCtx('game').canvas;
        this._isMouseDown = false;
        this._isTouchDown = false;
        this._insufficientCooldown = 0;
        this._lastFireTime = 0;

        // 鼠标/触摸瞄准
        const onAim = (clientX, clientY) => {
            const rect = gameCanvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            this.cannon.aim(x, y);
        };

        const onFireStart = (clientX, clientY) => {
            // 初始化音频（用户交互后）
            this.audio.init();
            if (!this.audio._bgmPlaying) this.audio.playBGM();
            onAim(clientX, clientY);
            this._fireBullet();
        };

        // 鼠标
        gameCanvas.addEventListener('mousemove', (e) => {
            onAim(e.clientX, e.clientY);
        });
        gameCanvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this._isMouseDown = true;
                onFireStart(e.clientX, e.clientY);
            }
        });
        window.addEventListener('mouseup', () => { this._isMouseDown = false; });

        // 触摸
        gameCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._isTouchDown = true;
            const touch = e.touches[0];
            onFireStart(touch.clientX, touch.clientY);
        }, { passive: false });

        gameCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            onAim(touch.clientX, touch.clientY);
        }, { passive: false });

        gameCanvas.addEventListener('touchend', () => { this._isTouchDown = false; });
        gameCanvas.addEventListener('touchcancel', () => { this._isTouchDown = false; });

        // 键盘
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') {
                this.eventBus.emit('ui:cannon_upgrade');
            } else if (e.key === 'ArrowDown' || e.key === 's') {
                this.eventBus.emit('ui:cannon_downgrade');
            } else if (e.key === ' ') {
                e.preventDefault();
                this._fireBullet();
            } else if (e.key === 'Escape') {
                this.uiManager.closePopup();
            } else if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
        });
    }

    // ===== 多人联机炮台系统（前端单机模拟）=====

    /**
     * 初始化4个炮台位置
     *  slot0 底部中央 = 玩家自己（复用 this.cannon）
     *  slot1 左侧中央 = 朝右，空
     *  slot2 顶部中央 = 朝下，空
     *  slot3 右侧中央 = 朝左，空
     */
    _initMultiplayerCannons() {
        const mp = this.multiplayer;
        const W = this.width, H = this.height;
        const AI_MARGIN = 0.35; // AI炮台角度限位（距正前方的弧度余量）

        // slot0：玩家自己（底部中央，朝上半圆，保持现有默认角度限位）
        mp.cannons[0] = {
            cannon: this.cannon,
            isPlayer: true,
            occupied: true,
            playerName: '',
            coins: 0,
            isAI: false,
            baseAngle: -Math.PI / 2,
            aiFireTimer: 0,
            aiLeaveTimer: 0,
            aiAimTimer: 0
        };

        // 构造一个空 slot 的辅助函数
        const makeSlot = (x, y, baseAngle, angleLimit) => {
            const c = new Cannon(x, y, { angleLimit, isPlayer: false, playerName: '' });
            c.angle = baseAngle;
            c.targetAngle = baseAngle;
            return {
                cannon: c,
                isPlayer: false,
                occupied: false,
                playerName: '',
                coins: 0,
                isAI: false,
                baseAngle,
                aiFireTimer: 0,
                aiLeaveTimer: 0,
                aiAimTimer: 0
            };
        };

        // slot1：左侧中央，朝右（瞄准角居中于0，向上下张开）
        mp.cannons[1] = makeSlot(80, H / 2, 0, {
            min: -Math.PI / 2 + AI_MARGIN,
            max: Math.PI / 2 - AI_MARGIN
        });

        // slot2：顶部中央，朝下（瞄准角居中于 PI/2）
        mp.cannons[2] = makeSlot(W / 2, 80, Math.PI / 2, {
            min: AI_MARGIN,
            max: Math.PI - AI_MARGIN
        });

        // slot3：右侧中央，朝左（瞄准角居中于 PI）
        mp.cannons[3] = makeSlot(W - 80, H / 2, Math.PI, {
            min: Math.PI - AI_MARGIN,
            max: Math.PI + AI_MARGIN
        });

        // AI首次加入倒计时：20~40秒后开始检查
        mp.botJoinTimer = 20 + Math.random() * 20;
    }

    /**
     * 每帧更新多人炮台：AI加入/离开调度、AI瞄准、AI发射
     */
    _updateMultiplayer(dt) {
        const mp = this.multiplayer;
        mp._time += dt;

        // AI加入调度：每20~40秒检查一次，有空位时50%概率让AI加入
        mp.botJoinTimer -= dt;
        if (mp.botJoinTimer <= 0) {
            mp.botJoinTimer = 20 + Math.random() * 20;
            const emptySlots = mp.cannons.filter(s => !s.occupied);
            if (emptySlots.length > 0 && Math.random() < 0.5) {
                this._aiJoin(emptySlots);
            }
        }

        // 逐AI slot更新
        for (let i = 1; i < mp.cannons.length; i++) {
            const slot = mp.cannons[i];
            if (!slot.occupied || !slot.isAI) continue;
            const c = slot.cannon;

            // 炮台自身动画（平滑旋转、流光、皮肤切换）
            c.update(dt);

            // 缓慢随机瞄准（在角度限位内随机选目标角）
            slot.aiAimTimer -= dt;
            if (slot.aiAimTimer <= 0) {
                slot.aiAimTimer = 1.5 + Math.random() * 3;
                const lim = c._angleLimit;
                c.targetAngle = lim.min + Math.random() * (lim.max - lim.min);
            }

            // AI发射：每3~8秒一发，不消耗玩家金币
            slot.aiFireTimer -= dt;
            if (slot.aiFireTimer <= 0) {
                if (c.canFire()) {
                    slot.aiFireTimer = 3 + Math.random() * 5;
                    const cfg = c.fire();
                    if (cfg) {
                        cfg.damage *= 0.6; // AI伤害略低，模拟其他玩家
                        this.bulletManager.fire(cfg);
                        this.waterRipple.bulletSplash(cfg.x, cfg.y, cfg.level);
                    }
                } else {
                    slot.aiFireTimer = 0.4; // 冷却中，稍后重试
                }
            }

            // AI离开：每30~60秒有30%概率离开
            slot.aiLeaveTimer -= dt;
            if (slot.aiLeaveTimer <= 0) {
                if (Math.random() < 0.3) {
                    this._aiLeave(slot);
                } else {
                    slot.aiLeaveTimer = 30 + Math.random() * 30;
                }
            }
        }
    }

    /**
     * AI加入一个空位
     */
    _aiJoin(emptySlots) {
        const mp = this.multiplayer;
        const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        const name = mp.namePool[Math.floor(Math.random() * mp.namePool.length)];
        // 随机倍率 100~5000（按100取整），皮肤等级随倍率自动切换
        const level = Math.max(100, Math.min(5000, Math.round((100 + Math.random() * 4900) / 100) * 100));

        const c = slot.cannon;
        c.level = level;
        c.playerName = name;
        c.targetAngle = slot.baseAngle;

        slot.occupied = true;
        slot.isAI = true;
        slot.playerName = name;
        slot.coins = 10000 + Math.floor(Math.random() * 50000);
        slot.aiFireTimer = 2 + Math.random() * 3;
        slot.aiLeaveTimer = 30 + Math.random() * 30;
        slot.aiAimTimer = Math.random() * 2;

        if (this.uiManager) this.uiManager.showToast(`🎣 ${name} 加入了游戏`);
    }

    /**
     * AI离开一个位置，回到"等待加入"
     */
    _aiLeave(slot) {
        const name = slot.playerName;
        slot.occupied = false;
        slot.isAI = false;
        slot.playerName = '';
        slot.cannon.playerName = '';
        if (this.uiManager) this.uiManager.showToast(`👋 ${name} 离开了游戏`);
    }

    /**
     * 渲染多人炮台（空位 + 已占用AI炮台）
     */
    _renderMultiplayer(uiCtx) {
        const mp = this.multiplayer;
        const t = mp._time;
        for (let i = 1; i < mp.cannons.length; i++) {
            const slot = mp.cannons[i];
            if (slot.occupied) {
                slot.cannon.render(uiCtx);
                this._renderSlotCoins(uiCtx, slot);
            } else {
                this._renderEmptySlot(uiCtx, slot, t);
            }
        }
    }

    /**
     * 空位"等待加入"渲染：青色呼吸光晕 + 灰色圆形炮台轮廓 + 白色"+" + "等待加入"文字
     */
    _renderEmptySlot(ctx, slot, time) {
        const x = slot.cannon.x;
        const y = slot.cannon.y;
        const pulse = (Math.sin(time * 2) + 1) / 2; // 0..1

        ctx.save();

        // 青色呼吸光晕（lighter叠加，轻量）
        ctx.globalCompositeOperation = 'lighter';
        const haloR = 45 + pulse * 15;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, `rgba(90, 220, 235, ${0.18 + pulse * 0.15})`);
        halo.addColorStop(1, 'rgba(90, 220, 235, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // 灰色圆形炮台轮廓（半透明）
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = 'rgba(130, 150, 170, 0.25)';
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#C2CEDD';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 白色"+"图标
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x, y + 12);
        ctx.stroke();

        // "等待加入"文字
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText('等待加入', x, y + 50);

        ctx.restore();
    }

    /**
     * AI炮台下方金币数（金色，带深色描边）
     */
    _renderSlotCoins(ctx, slot) {
        const x = slot.cannon.x;
        const y = slot.cannon.y + 72; // 玩家名画在 y+50，金币在其下
        ctx.save();
        ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 20, 40, 0.9)';
        const text = `🪙 ${Utils.formatCoin(slot.coins)}`;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = '#FFD700';
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    /**
     * 发射炮弹
     */
    _fireBullet() {
        if (this._paused || this.state !== 'playing') return;
        // 200ms 最小发射间隔防抖（防止极快双击连发）
        const now = performance.now();
        if (this._lastFireTime && now - this._lastFireTime < 200) return;
        this._lastFireTime = now;
        if (!this.cannon.canFire()) return;

        const cost = this.cannon.getBulletCost();
        if (!this.economy.spendCoins(cost)) {
            // 金币不足时设置冷却，防止自动发射/按住连发时重复弹窗
            this.cannon._fireTimer = 1.0;
            if (this.cannon.autoFire) {
                // 自动开火：立即关闭自动开火并同步UI按钮状态
                // （充值弹窗与"金币不足，请充值"toast 由 COIN_INSUFFICIENT 事件统一处理）
                this.cannon.autoFire = false;
                if (this.bottomBar && typeof this.bottomBar.setAutoFire === 'function') {
                    this.bottomBar.setAutoFire(false);
                }
            }
            // 手动点击：保持现有行为（冷却已设置，由 COIN_INSUFFICIENT 事件提示）
            return;
        }

        // 暴击判定（基础+VIP+升级+宠物加成 + 倍率加成）
        // 倍率加成：(level/10000)*2%，加成上限 10%，总暴击率硬上限 15%
        const bulletCfg = GameConfig.bullet;
        const levelCritBonus = Math.min(
            bulletCfg.critBonusMax ?? 0.10,
            (this.cannon.level / 10000) * (bulletCfg.critBonusPer10k ?? 0.02)
        );
        let critRate = GameConfig.cannon.critBaseRate + this.vipSystem.critBonus / 100
            + this.upgradeSystem.critRateBonus + this.petSystem.getCritBonus() + levelCritBonus;
        const critRateCap = bulletCfg.critRateCap ?? 0.15;
        if (critRate > critRateCap) critRate = critRateCap;
        const isCrit = Math.random() < critRate;

        // 锁定目标
        const targetFish = this.itemSystem.lockedFish;

        // 应用射速加成
        this.cannon.fireRateMultiplier = this.upgradeSystem.fireRateMultiplier;

        const bulletConfig = this.cannon.fire();
        if (!bulletConfig) return;

        // 应用火力加成
        bulletConfig.damage *= this.upgradeSystem.powerMultiplier;

        bulletConfig.isCrit = isCrit;
        bulletConfig.targetFish = targetFish;

        this.bulletManager.fire(bulletConfig);
        this.audio.play('fire');
        this.taskSystem.updateProgress('fire', 1);
        this.analytics.track(AnalyticsEvents.BULLET_FIRE, { level: this.cannon.level, crit: isCrit });
        if (isCrit) this.analytics.track(AnalyticsEvents.CRIT_TRIGGER, {});

        // 炮弹入水波纹
        this.waterRipple.bulletSplash(bulletConfig.x, bulletConfig.y, this.cannon.level);

        // 炮口粒子
        this.particleSystem.burst(bulletConfig.x, bulletConfig.y, {
            count: 5,
            type: 'spark',
            color: isCrit ? '#FF6B35' : '#36E0E8',
            speedMin: 30,
            speedMax: 100,
            lifeMin: 0.2,
            lifeMax: 0.4,
            sizeMin: 2,
            sizeMax: 4
        });
    }

    /**
     * 主循环
     */
    gameLoop(timestamp) {
        if (this.state !== 'playing' && this.state !== 'paused') {
            requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }

        // FPS 计算
        this._frameCount++;
        this._fpsTimer += timestamp - this._lastTime;
        if (this._fpsTimer >= 1000) {
            this._fps = Math.round(this._frameCount * 1000 / this._fpsTimer);
            this._frameCount = 0;
            this._fpsTimer = 0;
            if (this._fpsDisplay) {
                this._fpsDisplay.textContent = `FPS: ${this._fps} | 鱼: ${this.fishManager.fishCount} | 弹: ${this.bulletManager.count} | 粒: ${this.particleSystem.count}`;
            }
            // 性能自适应降级
            this._checkPerformance();
        }

        const frameTime = Math.min(timestamp - this._lastTime, 250);
        this._lastTime = timestamp;

        if (!this._paused) {
            this._accumulator += frameTime;
            // 性能优化：限制最大累积帧数（最多5帧），防止标签页切回后一次性追赶大量update
            const maxAccumulated = this._fixedDt * 5;
            if (this._accumulator > maxAccumulated) {
                this._accumulator = maxAccumulated;
            }
            while (this._accumulator >= this._fixedDt) {
                this.update(this._fixedDt / 1000);
                this._accumulator -= this._fixedDt;
            }
        }

        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    _checkPerformance() {
        // 画质自适应降级
        if (this._quality === 'high' && this._fps < 25) {
            this._setQuality('medium');
        } else if (this._quality === 'medium' && this._fps < 18) {
            this._setQuality('low');
        }

        // 性能优化：根据 FPS 动态调整鱼数量上限
        if (this._fps > 55) {
            this.fishManager.setDynamicFishMultiplier(1.0);
        } else if (this._fps < 30) {
            this.fishManager.setDynamicFishMultiplier(0.6);
        } else if (this._fps < 45) {
            this.fishManager.setDynamicFishMultiplier(0.8);
        }
    }

    /**
     * 逻辑更新
     */
    update(dt) {
        // 摄像机
        this.renderer.camera.update(dt);

        // 场景
        this.scene.update(dt);

        // 炮台
        this.cannon.update(dt);

        // 多人炮台（AI加入/离开/瞄准/发射，AI炮弹走同一套bulletManager与碰撞检测）
        this._updateMultiplayer(dt);

        // 宠物跟随
        this.petSystem.update(dt, this.cannon.x, this.cannon.y);

        // AI机器人陪玩
        const allFishes = this.fishManager.getAllAliveFish();
        this.aiBotManager.update(dt, allFishes, this.width, this.height);

        // 世界BOSS活动
        this.worldBossSystem.update(dt, this.fishManager, this.width, this.height);

        // 广告系统（双倍金币buff）
        this.adSystem.update(dt);

        // 技能全屏特效
        this._updateSkillEffects(dt);

        // BOSS预警特效
        if (this._bossWarning.active) {
            this._bossWarning.timer -= dt;
            if (this._bossWarning.timer <= 0) {
                this._bossWarning.active = false;
            }
        }

        // 自动发射
        if (this.cannon.autoFire && !this._paused) {
            this.cannon._fireTimer -= dt;
            if (this.cannon._fireTimer <= 0) {
                this._fireBullet();
            }
        }

        // 炮弹
        const activeBullets = this.bulletManager.getActiveBullets();
        this.bulletManager.update(dt, this.width, this.height);

        // 炮弹拖尾粒子
        for (const bullet of activeBullets) {
            const trail = bullet.getTrailParticle();
            if (trail) {
                this.particleSystem.trail(trail.x, trail.y, {
                    color: trail.color,
                    size: trail.size,
                    type: 'trail',
                    life: 0.3
                });
            }
        }

        // 碰撞检测
        for (const bullet of activeBullets) {
            if (bullet.state !== 'flying') continue;
            const hitFish = this.fishManager.checkBulletCollision(bullet);
            if (hitFish) {
                this._onBulletHit(bullet, hitFish);
            }
        }

        // 鱼类
        this.fishManager.update(dt, this.width, this.height, activeBullets);

        // 金币
        const collectedCoins = this.coinManager.update(dt);
        if (collectedCoins > 0) {
            this.economy.addCoins(collectedCoins, 'kill');
            this.audio.play('coin');
        }

        // 粒子
        this.particleSystem.update(dt, this.width, this.height);

        // 水波纹
        this.waterRipple.update(dt);

        // 焦散
        this.caustics.update(dt);

        // 体积雾
        this.volumetricFog.update(dt);

        // 经济
        this.economy.update(dt);

        // 道具
        this.itemSystem.update(dt);
        this.sidebar.setItemCooldown('lock', this.itemSystem.lockRemaining);
        this.sidebar.setItemCooldown('rage', this.itemSystem.rageRemaining);

        // 技能
        this.skillSystem.update(dt);
        // 能量条 UI 已下线，能量系统仍在后台运行（不再调用 topBar.updateEnergy）

        // 冰冻效果：鱼群停止移动
        if (this.skillSystem.isFreezeActive) {
            this.fishManager.setFrozen(true);
        } else {
            this.fishManager.setFrozen(false);
        }

        // 鱼鳃气泡（v2新增：随机鱼呼吸吐出小气泡）
        this._gillBubbleTimer = (this._gillBubbleTimer || 0) + dt;
        if (this._gillBubbleTimer > 0.6) {
            this._gillBubbleTimer = 0;
            const aliveFishes = this.fishManager.getAllAliveFish();
            if (aliveFishes.length > 0) {
                const fish = aliveFishes[Math.floor(Math.random() * aliveFishes.length)];
                this.particleSystem.emitGillBubble(fish.x, fish.y);
            }
        }

        // 任务徽章
        this.bottomBar.setTaskBadge(this.taskSystem.getClaimableCount() > 0);
    }

    _onBulletHit(bullet, fish) {
        bullet.hit(fish);

        // 伤害计算
        let damage = bullet.damage;
        if (bullet.isCrit) damage *= 2;
        if (bullet.isRage || this.cannon.isRaging) damage *= 2;

        const wasAlive = fish.isAlive;
        const isKilled = fish.hit(damage);

        // 命中特效
        this.audio.play('hit');
        this.waterRipple.fishHit(bullet.x, bullet.y, fish.size);

        // 命中粒子
        this.particleSystem.burst(bullet.x, bullet.y, {
            count: bullet.isCrit ? 15 : 8,
            type: 'spark',
            color: bullet.isCrit ? '#FF6B35' : '#FFD700',
            speedMin: 50,
            speedMax: 200,
            lifeMin: 0.2,
            lifeMax: 0.5,
            sizeMin: 2,
            sizeMax: 5
        });

        // 受击白闪（v2新增粒子类型）
        this.particleSystem.emitHitFlash(bullet.x, bullet.y);

        // 屏幕震动
        const shakeConfig = GameConfig.screenShake;
        if (bullet.isCrit) {
            this.renderer.camera.shake(shakeConfig.critIntensity, shakeConfig.critDuration);
        } else {
            this.renderer.camera.shake(shakeConfig.hitIntensity, shakeConfig.hitDuration);
        }

        this.taskSystem.updateProgress('hit', 1);

        if (isKilled && wasAlive) {
            this._onFishKilled(fish, bullet.isCrit);
        }
    }

    _onFishKilled(fish, isCrit) {
        // 能量奖励
        this.skillSystem.onFishKilled(fish.score);

        // 金币奖励（基础+暴击+关卡+升级+宠物+广告双倍）
        let coinReward = fish.score;
        if (isCrit) coinReward *= GameConfig.cannon.critCoinMultiplier;
        coinReward = Math.floor(coinReward * this.levelSystem.params.fishValueMultiplier * this.upgradeSystem.coinBonusMultiplier * (1 + this.petSystem.getCoinBonus()) * this.adSystem.getCoinMultiplier());

        // 埋点
        this.analytics.track(AnalyticsEvents.FISH_KILL, { fish: fish.config?.name, coins: coinReward, crit: isCrit });
        if (fish.isBoss) this.analytics.track(AnalyticsEvents.BOSS_KILL, { boss: fish.config?.name });

        // 成就统计
        this.achievementSystem.addStat('totalKills', 1);
        if (fish.isBoss) this.achievementSystem.addStat('bossKills', 1);
        if (isCrit) this.achievementSystem.addStat('totalCrits', 1);
        this.achievementSystem.addStat('totalCoins', coinReward);

        // 赛季经验
        this.seasonSystem.addXp(fish.isBoss ? 15 : 5);
        this.seasonSystem.updateTask('st2', 1);
        if (fish.isBoss) this.seasonSystem.updateTask('st3', 1);

        // 世界BOSS伤害统计
        if (this.worldBossSystem.active && fish.isBoss) {
            this.worldBossSystem.addPlayerDamage(fish.maxHp);
        }

        // 生成金币
        this.coinManager.spawnCoins(fish.x, fish.y, coinReward);

        // 击杀特效
        this.audio.play(isCrit ? 'crit' : 'kill');
        if (fish.isBoss) {
            this.particleSystem.critExplosion(fish.x, fish.y);
            this.waterRipple.bigKill(fish.x, fish.y, true);
            this.renderer.camera.shake(GameConfig.screenShake.bossAppearIntensity, GameConfig.screenShake.bossAppearDuration);
            this.taskSystem.updateProgress('boss', 1);
            this.eventBus.emit(Events.BOSS_KILL, fish);
            this.uiManager.showToast('🐉 BOSS被击杀！获得大量金币！');
        } else {
            this.particleSystem.inkExplosion(fish.x, fish.y, fish.size > 50 ? 1.5 : 1);
            if (fish.size > 50) {
                this.waterRipple.bigKill(fish.x, fish.y, false);
                this.renderer.camera.shake(GameConfig.screenShake.killBigIntensity, GameConfig.screenShake.killBigDuration);
            } else {
                this.renderer.camera.shake(GameConfig.screenShake.killSmallIntensity, GameConfig.screenShake.killSmallDuration);
            }
        }

        if (isCrit) {
            this.taskSystem.updateProgress('crit', 1);
            // 暴击红光闪烁
            this._flashScreen('rgba(255, 107, 53, 0.2)');
        }

        // 分裂鱼：击杀时分裂成2-3条小鱼
        if (fish.config?.special === 'split') {
            this._spawnSplitFish(fish);
        }

        // 关卡进度
        this.levelSystem.recordKill(fish.score, isCrit);
        this.taskSystem.updateProgress('kill', 1);

        this.eventBus.emit(Events.FISH_KILL, fish, coinReward);
    }

    /**
     * 分裂鱼：生成小鱼
     */
    _spawnSplitFish(parentFish) {
        const count = 2 + Math.floor(Math.random() * 2); // 2-3条
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const smallFish = this.fishManager.spawnFish('goldfish', {
                x: parentFish.x + Math.cos(angle) * 30,
                y: parentFish.y + Math.sin(angle) * 30,
                angle: angle,
                size: parentFish.size * 0.5,
                score: Math.floor(parentFish.score * 0.3)
            });
            if (smallFish) {
                smallFish._splitChild = true;
                // 分裂粒子
                this.particleSystem.burst(parentFish.x, parentFish.y, {
                    type: 'spark',
                    color: '#FF69B4',
                    count: 8,
                    speed: 100,
                    life: 0.5
                });
            }
        }
    }

    _flashScreen(color) {
        const flash = document.createElement('div');
        flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:${color};pointer-events:none;z-index:9999;transition:opacity 0.3s;`;
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        }, 50);
    }

    /**
     * 渲染
     */
    render() {
        this.renderer.beginFrame();

        const dayPhase = this.scene.dayPhase;

        // ===== 5层视差渲染 =====

        // 第1层：远景层（最远，视差0.05）+ 背景层（视差0.15）
        const bgCtx = this.renderer.getCtx('bg');
        this.scene.renderFarBackground(bgCtx, this.renderer.camera);
        this.scene.renderBackground(bgCtx, this.renderer.camera);
        this.volumetricFog.render(bgCtx, dayPhase);

        // 第2层：中景层（视差0.35）
        const midCtx = this.renderer.getCtx('mid');
        this.scene.renderMidground(midCtx, this.renderer.camera);
        this.scene.renderLights(midCtx, this.renderer.camera);

        // 第3层：游戏层（视差1.0）
        const gameCtx = this.renderer.getCtx('game');
        this.renderer.camera.applyTransform(gameCtx, 1);
        // 前景装饰（视差0.6，在鱼后面）
        this.scene.renderForeground(gameCtx, this.renderer.camera);
        this.fishManager.render(gameCtx);
        this.bulletManager.render(gameCtx);
        this.coinManager.render(gameCtx);
        this.petSystem.render(gameCtx);
        this.aiBotManager.render(gameCtx);

        // 第4层：发光采集层（Bloom后处理用）
        const glowCtx = this.renderer.getCtx('glow');
        if (glowCtx) {
            this.renderer.camera.applyTransform(glowCtx, 1);
            this._renderGlowLayer(glowCtx);
        }

        // 第5层：特效层
        const fxCtx = this.renderer.getCtx('fx');
        this.renderer.camera.applyTransform(fxCtx, 1);
        this.particleSystem.render(fxCtx);
        this.waterRipple.render(fxCtx);
        this.caustics.render(fxCtx, dayPhase);
        this.scene.renderBreathingMask(fxCtx);

        // 技能全屏特效（重置变换，全屏覆盖）
        fxCtx.save();
        fxCtx.setTransform(1, 0, 0, 1, 0, 0);
        this._renderSkillEffects(fxCtx);
        fxCtx.restore();

        // 近景层（最近，视差0.9，在最前面）
        this.scene.renderNearForeground(gameCtx, this.renderer.camera);

        // 炮台置于最顶层（ui层 z=6），确保炮台在鱼群、炮弹、粒子特效、近景之上
        const uiCtx = this.renderer.getCtx('ui');
        if (uiCtx) {
            uiCtx.clearRect(0, 0, this.renderer.width, this.renderer.height);
            // 多人炮台：空位"等待加入" + AI炮台（先画，让玩家炮台在最顶层）
            this._renderMultiplayer(uiCtx);
            this.cannon.render(uiCtx);
        }

        this.renderer.endFrame();
    }

    /**
     * 渲染发光采集层（供Bloom后处理使用）
     * 发光鱼、金币、炮弹等自发光物体用纯色绘制到此层
     */
    _renderGlowLayer(ctx) {
        // 发光鱼
        const fishes = this.fishManager.getAllAliveFish();
        for (const fish of fishes) {
            if (fish.config && fish.config.glow) {
                const glowColor = fish.config.glowColor || fish.config.lureColor || fish.config.accentColor || '#FFFFFF';
                ctx.fillStyle = glowColor;
                ctx.beginPath();
                ctx.arc(fish.x, fish.y, fish.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 金币发光
        for (const coin of this.coinManager.coins || []) {
            if (coin._active) {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(coin.x, coin.y, (coin._size || 8) * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * 渲染技能全屏特效
     */
    _renderSkillEffects(ctx) {
        const w = this.width;
        const h = this.height;

        // 冰冻特效：蓝色滤镜 + 冰霜边缘
        if (this._skillEffects.freeze.active) {
            const progress = this._skillEffects.freeze.timer / this._skillEffects.freeze.duration;
            const alpha = progress > 0.8 ? (1 - progress) * 5 : progress < 0.2 ? progress * 5 : 1;
            ctx.fillStyle = `rgba(100, 200, 255, ${0.15 * alpha})`;
            ctx.fillRect(0, 0, w, h);

            // 冰霜边缘
            const edgeGrad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.7);
            edgeGrad.addColorStop(0, 'transparent');
            edgeGrad.addColorStop(1, `rgba(150, 220, 255, ${0.3 * alpha})`);
            ctx.fillStyle = edgeGrad;
            ctx.fillRect(0, 0, w, h);

            // 冰晶粒子（随机闪烁）
            for (let i = 0; i < 20; i++) {
                const x = (i * 137.5) % w;
                const y = (i * 89.3 + this._lastTime * 0.02) % h;
                const size = 2 + Math.sin(this._lastTime * 0.005 + i) * 1.5;
                ctx.fillStyle = `rgba(200, 240, 255, ${0.5 * alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 闪电特效：屏幕白黄闪烁
        if (this._skillEffects.lightning.active) {
            const progress = 1 - this._skillEffects.lightning.timer / this._skillEffects.lightning.duration;
            const flashAlpha = Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.4;
            if (flashAlpha > 0) {
                ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha})`;
                ctx.fillRect(0, 0, w, h);
            }

            // 闪电链线条
            ctx.strokeStyle = `rgba(150, 230, 255, ${(1 - progress) * 0.8})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                let x = Math.random() * w;
                let y = 0;
                ctx.moveTo(x, y);
                while (y < h) {
                    x += (Math.random() - 0.5) * 60;
                    y += 20 + Math.random() * 30;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }

        // 金币雨特效：顶部金色光晕
        if (this._skillEffects.coinRain.active) {
            const progress = 1 - this._skillEffects.coinRain.timer / this._skillEffects.coinRain.duration;
            const glowGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
            glowGrad.addColorStop(0, `rgba(255, 215, 0, ${0.3 * (1 - progress * 0.5)})`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, w, h * 0.5);
        }

        // BOSS预警：全屏红光脉冲
        if (this._bossWarning.active) {
            const pulse = Math.sin(this._lastTime * 0.01) * 0.5 + 0.5;
            const warnGrad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.2, w/2, h/2, Math.max(w,h)*0.7);
            warnGrad.addColorStop(0, 'transparent');
            warnGrad.addColorStop(1, `rgba(255, 60, 60, ${0.3 + pulse * 0.2})`);
            ctx.fillStyle = warnGrad;
            ctx.fillRect(0, 0, w, h);

            // 预警文字
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255, 80, 80, ${0.7 + pulse * 0.3})`;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText('⚠ BOSS 来袭 ⚠', w/2, h * 0.3);
            ctx.fillText('⚠ BOSS 来袭 ⚠', w/2, h * 0.3);
        }
    }

    _createFPSDisplay() {
        this._fpsDisplay = document.createElement('div');
        this._fpsDisplay.className = 'fps-display';
        this._fpsDisplay.textContent = 'FPS: 60';
        this.container.appendChild(this._fpsDisplay);
    }

    _onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.renderer.resize(this.width, this.height);
        this.scene.resize(this.width, this.height);
        this.caustics.resize(this.width, this.height);
        this.volumetricFog.resize(this.width, this.height);
        this.cannon.x = this.width / 2;
        this.cannon.y = this.height - 80;
        // 同步多人炮台位置（左/顶/右）
        if (this.multiplayer && this.multiplayer.cannons.length >= 4) {
            this.multiplayer.cannons[1].cannon.x = 80;
            this.multiplayer.cannons[1].cannon.y = this.height / 2;
            this.multiplayer.cannons[2].cannon.x = this.width / 2;
            this.multiplayer.cannons[2].cannon.y = 80;
            this.multiplayer.cannons[3].cannon.x = this.width - 80;
            this.multiplayer.cannons[3].cannon.y = this.height / 2;
        }
        this.coinManager.setTarget(this.width * 0.5, 50);
    }

    /**
     * 暂停/继续
     */
    togglePause() {
        this._paused = !this._paused;
        if (this._paused) {
            this.state = 'paused';
            this.uiManager.showToast('游戏已暂停');
        } else {
            this.state = 'playing';
            this._lastTime = performance.now();
            this.uiManager.showToast('游戏继续');
        }
        this.eventBus.emit(this._paused ? Events.GAME_PAUSE : Events.GAME_RESUME);
    }

    /**
     * 启动游戏
     */
    start() {
        this.state = 'playing';
        this._lastTime = performance.now();
        // 初始推送金币/钻石显示（大单位格式化）
        this.topBar.updateCoins(Utils.formatCoin(Math.floor(this.economy.coins)));
        // 同步初始炮台倍率到底部栏
        this.bottomBar.updateCannonLevel(this.cannon.level);
        this._updateMailBadge();
        // 新玩家自动开始新手引导
        if (!this.tutorialSystem.isCompleted()) {
            setTimeout(() => this.tutorialSystem.start(), 1000);
        }
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * 保存并销毁
     */
    destroy() {
        this.skillSystem.save();
        this.saveManager.save(this.saveData);
        this.renderer.destroy();
        this.topBar.destroy();
        this.bottomBar.destroy();
        this.sidebar.destroy();
        this.uiManager.closeAllPopups();
    }
}
