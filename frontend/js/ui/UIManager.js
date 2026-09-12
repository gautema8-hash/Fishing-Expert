/**
 * UI 管理器
 * 弹窗栈管理、Toast 提示、全局 UI 事件
 */
import { Events } from '../core/EventBus.js';
import { ShopConfig } from '../config/shopConfig.js';
import { UpgradeConfig } from '../systems/UpgradeSystem.js';

export class UIManager {
    constructor(eventBus, container) {
        this.eventBus = eventBus;
        this.container = container;
        this.popupStack = [];
        this._toastContainer = null;
        this._initToastContainer();
        this._bindEvents();
    }

    _initToastContainer() {
        this._toastContainer = document.createElement('div');
        this._toastContainer.className = 'toast-container';
        this.container.appendChild(this._toastContainer);
    }

    _bindEvents() {
        this.eventBus.on(Events.SHOW_TOAST, (message) => this.showToast(message));
        this.eventBus.on(Events.POPUP_OPEN, (type, data) => this.openPopup(type, data));
        this.eventBus.on(Events.POPUP_CLOSE, () => this.closePopup());
    }

    /**
     * 打开弹窗
     */
    openPopup(type, data = {}) {
        // 关闭当前弹窗
        if (this.popupStack.length > 0) {
            const current = this.popupStack[this.popupStack.length - 1];
            current.element.style.display = 'none';
        }

        // 创建新弹窗
        const popup = this._createPopup(type, data);
        if (popup) {
            this.popupStack.push(popup);
            popup.element.style.display = 'flex';
            this.eventBus.emit('popup:opened', type);
        }
    }

    _createPopup(type, data) {
        const element = document.createElement('div');
        element.className = `popup popup-${type}`;
        element.style.display = 'none';

        // 遮罩
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.addEventListener('click', () => this.closePopup());
        element.appendChild(overlay);

        // 面板
        const panel = document.createElement('div');
        panel.className = 'popup-panel glass-panel';

        // 标题栏
        const titleBar = document.createElement('div');
        titleBar.className = 'popup-title-bar';
        const title = document.createElement('span');
        title.className = 'popup-title';
        title.textContent = this._getTitle(type);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'popup-close-btn';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', () => this.closePopup());
        titleBar.appendChild(title);
        titleBar.appendChild(closeBtn);
        panel.appendChild(titleBar);

        // 内容
        const content = document.createElement('div');
        content.className = 'popup-content';
        this._fillPopupContent(content, type, data);
        panel.appendChild(content);

        element.appendChild(panel);
        this.container.appendChild(element);

        return { element, type, data };
    }

    _getTitle(type) {
        const titles = {
            shop: '龙宫商城',
            task: '每日任务',
            rank: '全区排行榜',
            guide: '新手引导',
            setting: '游戏设置',
            wheel: '幸运转盘',
            signin: '每日签到',
            recharge: '充值中心',
            privacy: '隐私政策',
            agreement: '用户协议'
        };
        return titles[type] || '弹窗';
    }

    _fillPopupContent(content, type, data) {
        switch (type) {
            case 'shop': this._fillShop(content); break;
            case 'task': this._fillTask(content, data); break;
            case 'rank': this._fillRank(content); break;
            case 'guide': this._fillGuide(content); break;
            case 'setting': this._fillSetting(content, data); break;
            case 'wheel': this._fillWheel(content); break;
            case 'upgrade': this._fillUpgrade(content, data); break;
            case 'pet': this._fillPet(content, data); break;
            case 'offline': this._fillOffline(content, data); break;
            case 'returning': this._fillReturning(content, data); break;
            case 'skin': this._fillSkin(content, data); break;
            case 'stats': this._fillStats(content, data); break;
            case 'achievement': this._fillAchievement(content, data); break;
            case 'mail': this._fillMail(content, data); break;
            case 'redemption': this._fillRedemption(content, data); break;
            case 'friend': this._fillFriend(content, data); break;
            case 'equipment': this._fillEquipment(content, data); break;
            case 'guild': this._fillGuild(content, data); break;
            case 'season': this._fillSeason(content, data); break;
            case 'signin': this._fillSignIn(content, data); break;
            case 'recharge': this._fillRecharge(content); break;
            case 'privacy': this._fillPrivacy(content); break;
            case 'agreement': this._fillAgreement(content); break;
        }
    }

    _fillShop(content) {
        const renderItems = (tab) => {
            let items = [];
            if (tab === 'coins') {
                items = ShopConfig.coinPackages.map(p => ({
                    name: p.name,
                    price: `¥${p.price}`,
                    desc: `${p.bonusCoins > 0 ? p.coins + '+' + p.bonusCoins : p.coins}金币${p.diamonds ? ' +' + p.diamonds + '钻石' : ''}`,
                    tag: p.tag,
                    popular: p.popular
                }));
            } else if (tab === 'subscriptions') {
                items = ShopConfig.subscriptions.map(s => ({
                    name: s.name,
                    price: `¥${s.price}`,
                    desc: `${s.durationDays}天内金币收益翻倍，每日领取${s.dailyCoins}金币`,
                    tag: '',
                    popular: false
                }));
            } else if (tab === 'items') {
                items = ShopConfig.itemPackages.map(i => ({
                    name: i.name,
                    price: `¥${i.price}`,
                    desc: Object.entries(i.items).map(([k,v]) => `${k==='lock'?'锁定':'狂暴'}×${v}`).join(' '),
                    tag: '',
                    popular: false
                }));
            } else if (tab === 'limited') {
                // 节日限定 + 限时折扣
                const festival = (ShopConfig.festivalPacks || []).map(p => ({
                    name: p.name,
                    price: `¥${p.price}`,
                    desc: `${p.coins}+${p.bonusCoins}金币 +${p.diamonds}钻`,
                    tag: p.tag,
                    popular: p.popular,
                    originalPrice: p.originalPrice
                }));
                const limited = (ShopConfig.limitedOffers || []).map(p => ({
                    name: p.name,
                    price: `¥${p.price}`,
                    desc: `${p.coins}金币 +${p.diamonds || 0}钻`,
                    tag: p.discount,
                    popular: false,
                    originalPrice: p.originalPrice
                }));
                items = [...festival, ...limited];
            }
            return items.map(item => `
                <div class="shop-item ${item.popular ? 'popular' : ''}">
                    ${item.tag ? `<span class="shop-tag">${item.tag}</span>` : ''}
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-desc">${item.desc}</div>
                    ${item.originalPrice ? `<div class="shop-original-price">原价¥${item.originalPrice}</div>` : ''}
                    <button class="shop-buy-btn" data-price="${item.price}">${item.price}</button>
                </div>
            `).join('');
        };

        content.innerHTML = `
            <div class="shop-tabs">
                <button class="shop-tab active" data-tab="coins">金币礼包</button>
                <button class="shop-tab" data-tab="subscriptions">订阅卡</button>
                <button class="shop-tab" data-tab="items">道具</button>
                <button class="shop-tab" data-tab="limited">限时</button>
            </div>
            <div class="shop-items" id="shop-items">
                ${renderItems('coins')}
            </div>
        `;

        // Tab 切换
        content.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                content.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                content.querySelector('#shop-items').innerHTML = renderItems(tab.dataset.tab);
                this._bindShopBuyButtons(content);
            });
        });

        this._bindShopBuyButtons(content);
    }

    _bindShopBuyButtons(content) {
        content.querySelectorAll('.shop-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:shop_purchase', btn.dataset.price);
                this.showToast('购买成功！金币已到账');
            });
        });
    }

    _fillTask(content, data) {
        const tasks = data.tasks || [];
        content.innerHTML = tasks.map(task => `
            <div class="task-item ${task.claimed ? 'claimed' : ''} ${task.progress >= task.target ? 'completed' : ''}">
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${Math.min(100, task.progress / task.target * 100)}%"></div>
                    </div>
                    <span class="task-progress-text">${task.progress}/${task.target}</span>
                </div>
                <div class="task-reward">
                    <span class="reward-coins">🪙 ${task.reward.coins || 0}</span>
                    ${task.reward.diamonds ? `<span class="reward-diamonds">💎 ${task.reward.diamonds}</span>` : ''}
                    <button class="task-claim-btn" data-task-id="${task.id}" ${task.claimed || task.progress < task.target ? 'disabled' : ''}>
                        ${task.claimed ? '已领取' : '领取'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    _fillRank(content) {
        const mockRanks = [
            { rank: 1, name: '龙宫至尊', coins: '9999万', avatar: '👑' },
            { rank: 2, name: '东海龙王', coins: '8888万', avatar: '🐉' },
            { rank: 3, name: '黄金猎手', coins: '6666万', avatar: '🏆' },
            { rank: 4, name: '珊瑚守护者', coins: '5555万', avatar: '🐠' },
            { rank: 5, name: '深海探险家', coins: '4444万', avatar: '🤿' },
            { rank: 6, name: '珍珠采集者', coins: '3333万', avatar: '🦪' },
            { rank: 7, name: '水母骑士', coins: '2222万', avatar: '🎐' },
            { rank: 8, name: '海龟长老', coins: '1111万', avatar: '🐢' }
        ];
        content.innerHTML = `
            <div class="rank-tabs">
                <button class="rank-tab active">金币榜</button>
                <button class="rank-tab">击杀榜</button>
                <button class="rank-tab">关卡榜</button>
            </div>
            <div class="rank-list">
                ${mockRanks.map(r => `
                    <div class="rank-item ${r.rank <= 3 ? 'top' : ''}">
                        <span class="rank-number">${r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : r.rank}</span>
                        <span class="rank-avatar">${r.avatar}</span>
                        <span class="rank-name">${r.name}</span>
                        <span class="rank-coins">${r.coins}</span>
                    </div>
                `).join('')}
            </div>
            <div class="rank-my">
                <span>我的排名：第 128 名</span>
                <span>金币：1.2万</span>
            </div>
        `;
    }

    _fillGuide(content) {
        content.innerHTML = `
            <div class="guide-steps">
                <div class="guide-step active" data-step="1">
                    <div class="guide-icon">🎯</div>
                    <h3>瞄准发射</h3>
                    <p>移动鼠标或手指瞄准鱼群，点击屏幕发射炮弹。炮弹会消耗金币，倍率越高消耗越多。</p>
                </div>
                <div class="guide-step" data-step="2">
                    <div class="guide-icon">⚡</div>
                    <h3>切换倍率</h3>
                    <p>使用底部 +/- 按钮切换炮台倍率（1-10倍）。高倍率炮弹威力更大，更容易捕获高价值鱼。</p>
                </div>
                <div class="guide-step" data-step="3">
                    <div class="guide-icon">🐟</div>
                    <h3>捕获鱼类</h3>
                    <p>炮弹命中鱼后造成伤害，血量归零即捕获成功，获得对应金币奖励。不同鱼类分值不同。</p>
                </div>
                <div class="guide-step" data-step="4">
                    <div class="guide-icon">🔥</div>
                    <h3>暴击与BOSS</h3>
                    <p>随机触发暴击炮弹，造成双倍伤害和双倍金币。东海龙王BOSS会定期出现，击杀获得大量奖励！</p>
                </div>
                <div class="guide-step" data-step="5">
                    <div class="guide-icon">🎁</div>
                    <h3>道具与福利</h3>
                    <p>使用锁定道具自动追踪鱼群，狂暴道具短时间翻倍威力。每日签到、任务、转盘领取丰厚奖励！</p>
                </div>
            </div>
            <div class="guide-nav">
                <button class="guide-prev" disabled>上一步</button>
                <span class="guide-indicator">1 / 5</span>
                <button class="guide-next">下一步</button>
            </div>
            <button class="guide-skip">跳过引导</button>
        `;
    }

    _fillSetting(content, data) {
        const settings = data.settings || {};
        content.innerHTML = `
            <div class="setting-group">
                <label>背景音乐</label>
                <div class="setting-control">
                    <input type="range" class="volume-slider" data-type="bgm" min="0" max="100" value="${(settings.bgmVolume || 0.5) * 100}">
                    <button class="toggle-btn ${settings.bgmMuted ? 'off' : 'on'}" data-type="bgm">${settings.bgmMuted ? '关' : '开'}</button>
                </div>
            </div>
            <div class="setting-group">
                <label>游戏音效</label>
                <div class="setting-control">
                    <input type="range" class="volume-slider" data-type="sfx" min="0" max="100" value="${(settings.sfxVolume || 0.8) * 100}">
                    <button class="toggle-btn ${settings.sfxMuted ? 'off' : 'on'}" data-type="sfx">${settings.sfxMuted ? '关' : '开'}</button>
                </div>
            </div>
            <div class="setting-group">
                <label>画质选择</label>
                <div class="setting-control quality-btns">
                    <button class="quality-btn ${settings.quality === 'low' ? 'active' : ''}" data-quality="low">低</button>
                    <button class="quality-btn ${settings.quality === 'medium' ? 'active' : ''}" data-quality="medium">中</button>
                    <button class="quality-btn ${settings.quality === 'high' ? 'active' : ''}" data-quality="high">高</button>
                </div>
            </div>
            <div class="setting-group">
                <label>FPS 显示</label>
                <div class="setting-control">
                    <button class="toggle-btn ${settings.showFPS ? 'on' : 'off'}" data-type="fps">${settings.showFPS ? '开' : '关'}</button>
                </div>
            </div>
            <div class="setting-group">
                <label>暂停游戏</label>
                <div class="setting-control">
                    <button class="pause-btn" id="pause-game-btn">暂停</button>
                </div>
            </div>
            <div class="setting-links">
                <a href="#" class="setting-link" data-popup="redemption">🎁 兑换码</a>
                <a href="#" class="setting-link" data-popup="privacy">隐私政策</a>
                <a href="#" class="setting-link" data-popup="agreement">用户协议</a>
            </div>
            <div class="setting-disclaimer">
                <p>⚠️ 游戏内金币/钻石为非现金虚拟道具，不可兑换现金，仅游戏内部消耗使用。</p>
            </div>
        `;
    }

    _fillWheel(content) {
        const rewards = ['1000金币', '5000金币', '锁定道具×1', '2000金币', '狂暴道具×1', '10000金币', '2钻石', '谢谢参与'];
        content.innerHTML = `
            <div class="wheel-container">
                <div class="wheel" id="lucky-wheel">
                    ${rewards.map((r, i) => `
                        <div class="wheel-segment" style="transform: rotate(${i * 45}deg)">
                            <span>${r}</span>
                        </div>
                    `).join('')}
                    <div class="wheel-center">
                        <span>抽奖</span>
                    </div>
                </div>
                <div class="wheel-pointer"></div>
            </div>
            <div class="wheel-info">
                <p>今日免费次数：<span id="wheel-free-count">1</span></p>
                <button class="wheel-spin-btn" id="wheel-spin-btn">开始抽奖</button>
                <p class="wheel-hint">抽奖概率公示：金币70%，道具15%，钻石5%，谢谢参与10%</p>
            </div>
        `;
    }

    _fillUpgrade(content, data) {
        const upgrades = data.upgrades || [];
        const totalPower = data.totalPower || 0;
        content.innerHTML = `
            <div class="upgrade-header">
                <span class="upgrade-title">炮台养成</span>
                <span class="upgrade-power">战力：${totalPower}</span>
            </div>
            <div class="upgrade-list">
                ${upgrades.map(u => `
                    <div class="upgrade-item" data-type="${u.type}">
                        <div class="upgrade-icon">${u.icon}</div>
                        <div class="upgrade-info">
                            <div class="upgrade-name">
                                <span>${u.name}</span>
                                <span class="upgrade-level">Lv.${u.level}/${u.maxLevel}</span>
                            </div>
                            <div class="upgrade-desc">${u.description}</div>
                            <div class="upgrade-effect">
                                <span>当前：${u.effect}</span>
                                ${!u.isMax ? `<span class="upgrade-next">→ 下级：${u.nextEffect}</span>` : ''}
                            </div>
                            <div class="upgrade-progress">
                                <div class="upgrade-progress-fill" style="width: ${(u.level / u.maxLevel) * 100}%"></div>
                            </div>
                        </div>
                        <button class="upgrade-btn ${u.isMax ? 'maxed' : ''}" data-type="${u.type}" ${u.isMax ? 'disabled' : ''}>
                            ${u.isMax ? '已满级' : `🪙 ${u.cost}`}
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定升级按钮
        content.querySelectorAll('.upgrade-btn:not(.maxed)').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:upgrade', btn.dataset.type);
            });
        });
    }

    _fillPet(content, data) {
        const pets = data.pets || [];
        content.innerHTML = `
            <div class="pet-header">
                <span class="pet-title">宠物图鉴</span>
                <span class="pet-hint">宠物出战后提供被动加成</span>
            </div>
            <div class="pet-list">
                ${pets.map(p => `
                    <div class="pet-card ${p.owned ? 'owned' : 'locked'} ${p.isActive ? 'active' : ''}" data-type="${p.type}">
                        <div class="pet-rarity ${p.rarity}">${p.rarity}</div>
                        <div class="pet-icon-large" style="color:${p.color}">${p.icon}</div>
                        <div class="pet-name">${p.name}</div>
                        <div class="pet-desc">${p.description}</div>
                        ${p.owned ? `
                            <div class="pet-stats">
                                <span>金币+${p.coinBonus}</span>
                                <span>暴击+${p.critBonus}</span>
                            </div>
                            <div class="pet-level">Lv.${p.level}</div>
                            <div class="pet-actions">
                                ${p.isActive 
                                    ? '<button class="pet-btn active-btn" disabled>出战中</button>' 
                                    : `<button class="pet-btn equip-btn" data-type="${p.type}">出战</button>`
                                }
                                <button class="pet-btn upgrade-pet-btn" data-type="${p.type}">升级 🪙${p.upgradeCost}</button>
                            </div>
                        ` : `
                            <button class="pet-btn unlock-btn" data-type="${p.type}">解锁 🪙${p.unlockCost}</button>
                        `}
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定按钮
        content.querySelectorAll('.equip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:pet_equip', btn.dataset.type);
            });
        });
        content.querySelectorAll('.upgrade-pet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:pet_upgrade', btn.dataset.type);
            });
        });
        content.querySelectorAll('.unlock-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:pet_unlock', btn.dataset.type);
            });
        });
    }

    _fillStats(content, data) {
        const s = data.summary || {};
        content.innerHTML = `
            <div class="stats-header">
                <span class="stats-title">玩家数据</span>
                <span class="stats-id">ID: ${data.playerId || '---'}</span>
            </div>
            <div class="stats-grid">
                <div class="stats-card">
                    <div class="stats-icon">🎮</div>
                    <div class="stats-value">${s.playCount || 0}</div>
                    <div class="stats-label">游戏次数</div>
                </div>
                <div class="stats-card">
                    <div class="stats-icon">🐟</div>
                    <div class="stats-value">${(s.totalKills || 0).toLocaleString()}</div>
                    <div class="stats-label">总击杀</div>
                </div>
                <div class="stats-card">
                    <div class="stats-icon">🐉</div>
                    <div class="stats-value">${s.totalBossKills || 0}</div>
                    <div class="stats-label">BOSS击杀</div>
                </div>
                <div class="stats-card">
                    <div class="stats-icon">💥</div>
                    <div class="stats-value">${(s.totalBullets || 0).toLocaleString()}</div>
                    <div class="stats-label">发射炮弹</div>
                </div>
                <div class="stats-card highlight">
                    <div class="stats-icon">🎯</div>
                    <div class="stats-value">${s.hitRate || '0%'}</div>
                    <div class="stats-label">命中率</div>
                </div>
                <div class="stats-card highlight">
                    <div class="stats-icon">🔥</div>
                    <div class="stats-value">${s.critRate || '0%'}</div>
                    <div class="stats-label">暴击率</div>
                </div>
                <div class="stats-card">
                    <div class="stats-icon">🪙</div>
                    <div class="stats-value">${(s.totalCoinsEarned || 0).toLocaleString()}</div>
                    <div class="stats-label">累计金币</div>
                </div>
                <div class="stats-card">
                    <div class="stats-icon">🏆</div>
                    <div class="stats-value">第${s.highestLevel || 1}关</div>
                    <div class="stats-label">最高关卡</div>
                </div>
                <div class="stats-card">
                    <div class="stats-icon">💰</div>
                    <div class="stats-value">${s.totalPurchases || 0}</div>
                    <div class="stats-label">购买次数</div>
                </div>
            </div>
            <div class="stats-footer">
                <p>平均每击杀金币：${s.avgCoinsPerKill || 0}</p>
                <p>本次游戏时长：${Math.floor((s.sessionDuration || 0) / 60)}分${(s.sessionDuration || 0) % 60}秒</p>
            </div>
        `;
    }

    _fillAchievement(content, data) {
        const achievements = data.achievements || [];
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        const claimableCount = achievements.filter(a => a.canClaim).length;

        content.innerHTML = `
            <div class="achievement-header">
                <span class="achievement-title">🏆 成就</span>
                <span class="achievement-count">${unlockedCount}/${achievements.length} 已解锁</span>
            </div>
            <div class="achievement-list">
                ${achievements.map(ach => `
                    <div class="achievement-item ${ach.unlocked ? 'unlocked' : ''} ${ach.claimed ? 'claimed' : ''}">
                        <div class="achievement-icon">${ach.icon}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${ach.name}</div>
                            <div class="achievement-desc">${ach.description}</div>
                            <div class="achievement-progress-bar">
                                <div class="achievement-progress-fill" style="width: ${ach.progressPercent}%"></div>
                            </div>
                            <div class="achievement-progress-text">${ach.progress}/${ach.condition.value}</div>
                        </div>
                        <div class="achievement-reward">
                            ${ach.reward.coins ? `<span>🪙${ach.reward.coins}</span>` : ''}
                            ${ach.reward.diamonds ? `<span>💎${ach.reward.diamonds}</span>` : ''}
                        </div>
                        ${ach.canClaim ? `<button class="achievement-claim-btn" data-id="${ach.id}">领取</button>` : ''}
                        ${ach.claimed ? '<span class="achievement-claimed">已领取</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.achievement-claim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:claim_achievement', btn.dataset.id);
            });
        });
    }

    _fillMail(content, data) {
        const mails = data.mails || [];

        content.innerHTML = `
            <div class="mail-header">
                <span class="mail-title">📬 邮件</span>
                <div class="mail-actions">
                    <button class="mail-action-btn" id="mail-claim-all">一键领取</button>
                    <button class="mail-action-btn" id="mail-read-all">全部已读</button>
                </div>
            </div>
            <div class="mail-list">
                ${mails.length === 0 ? '<div class="mail-empty">暂无邮件</div>' : ''}
                ${mails.map(mail => `
                    <div class="mail-item ${mail.read ? 'read' : 'unread'}" data-id="${mail.id}">
                        <div class="mail-icon">${mail.type === 'system' ? '📢' : mail.type === 'reward' ? '🎁' : mail.type === 'event' ? '🎉' : '💌'}</div>
                        <div class="mail-content">
                            <div class="mail-title-row">
                                <span class="mail-item-title">${mail.title}</span>
                                <span class="mail-time">${mail.timeStr}</span>
                            </div>
                            <div class="mail-sender">${mail.sender}</div>
                            <div class="mail-body">${mail.content.replace(/\n/g, '<br>')}</div>
                            ${mail.hasAttachment ? `
                                <div class="mail-attachments">
                                    ${mail.attachments.coins ? `<span class="mail-attachment">🪙 ${mail.attachments.coins}</span>` : ''}
                                    ${mail.attachments.diamonds ? `<span class="mail-attachment">💎 ${mail.attachments.diamonds}</span>` : ''}
                                    ${mail.attachments.items ? Object.entries(mail.attachments.items).map(([k,v]) => `<span class="mail-attachment">${k==='lock'?'🔒':'🔥'} ×${v}</span>`).join('') : ''}
                                </div>
                                ${!mail.claimed ? `<button class="mail-claim-btn" data-id="${mail.id}">领取附件</button>` : '<span class="mail-claimed">已领取</span>'}
                            ` : ''}
                        </div>
                        <button class="mail-delete-btn" data-id="${mail.id}" title="删除">✕</button>
                    </div>
                `).join('')}
            </div>
        `;

        // 标记已读
        content.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('mail-claim-btn') && !e.target.classList.contains('mail-delete-btn')) {
                    this.eventBus.emit('ui:mail_read', item.dataset.id);
                    item.classList.remove('unread');
                    item.classList.add('read');
                }
            });
        });

        // 领取附件
        content.querySelectorAll('.mail-claim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.eventBus.emit('ui:mail_claim', btn.dataset.id);
            });
        });

        // 删除邮件
        content.querySelectorAll('.mail-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.eventBus.emit('ui:mail_delete', btn.dataset.id);
            });
        });

        // 一键领取
        const claimAllBtn = content.querySelector('#mail-claim-all');
        if (claimAllBtn) {
            claimAllBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:mail_claim_all');
            });
        }

        // 全部已读
        const readAllBtn = content.querySelector('#mail-read-all');
        if (readAllBtn) {
            readAllBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:mail_read_all');
            });
        }
    }

    _fillRedemption(content, data) {
        content.innerHTML = `
            <div class="redemption-header">
                <span class="redemption-title">🎁 兑换码</span>
                <span class="redemption-hint">输入礼包码兑换奖励</span>
            </div>
            <div class="redemption-input-area">
                <input type="text" class="redemption-input" id="redemption-input" placeholder="请输入兑换码" maxlength="20">
                <button class="redemption-btn" id="redemption-submit">立即兑换</button>
            </div>
            <div class="redemption-result" id="redemption-result"></div>
            <div class="redemption-tips">
                <p>💡 温馨提示：</p>
                <p>• 每个兑换码只能使用一次</p>
                <p>• 兑换码区分大小写，建议复制粘贴</p>
                <p>• 关注官方活动获取更多兑换码</p>
            </div>
            <div class="redemption-codes">
                <div class="redemption-codes-title">可用兑换码（${data.availableCount || 0}/${data.totalCount || 0}）</div>
                <div class="redemption-codes-list">
                    ${(data.codes || []).map(c => `
                        <div class="redemption-code-item ${c.used ? 'used' : ''}">
                            <span class="code-text">${c.code}</span>
                            <span class="code-name">${c.name}</span>
                            ${c.used ? '<span class="code-used">已使用</span>' : '<span class="code-available">可兑换</span>'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const input = content.querySelector('#redemption-input');
        const submitBtn = content.querySelector('#redemption-submit');
        const result = content.querySelector('#redemption-result');

        const doRedeem = () => {
            const code = input.value.trim();
            if (!code) {
                result.innerHTML = '<span class="redemption-error">请输入兑换码</span>';
                return;
            }
            this.eventBus.emit('ui:redeem_code', code);
        };

        submitBtn.addEventListener('click', doRedeem);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doRedeem();
        });
    }

    /**
     * 显示兑换结果
     */
    showRedemptionResult(success, message) {
        const result = document.querySelector('#redemption-result');
        if (result) {
            result.innerHTML = `<span class="${success ? 'redemption-success' : 'redemption-error'}">${message}</span>`;
        }
    }

    _fillFriend(content, data) {
        const friends = data.friends || [];
        const recommends = data.recommends || [];
        const tab = data.tab || 'list';

        content.innerHTML = `
            <div class="friend-header">
                <span class="friend-title">👥 好友</span>
                <span class="friend-online">在线 ${data.onlineCount || 0}/${friends.length}</span>
            </div>
            <div class="friend-tabs">
                <button class="friend-tab ${tab === 'list' ? 'active' : ''}" data-tab="list">好友列表</button>
                <button class="friend-tab ${tab === 'recommend' ? 'active' : ''}" data-tab="recommend">推荐好友</button>
            </div>
            <div class="friend-list">
                ${tab === 'list' ? `
                    <div class="friend-actions">
                        <button class="friend-claim-all" id="friend-claim-all">一键领取礼物 (${data.claimableCount || 0})</button>
                    </div>
                    ${friends.length === 0 ? '<div class="friend-empty">暂无好友，去添加吧！</div>' : ''}
                    ${friends.map(f => `
                        <div class="friend-item">
                            <div class="friend-avatar">
                                <span>${f.avatar}</span>
                                ${f.online ? '<div class="friend-online-dot"></div>' : ''}
                            </div>
                            <div class="friend-info">
                                <div class="friend-name">${f.name} <span class="friend-vip">VIP${f.vip}</span></div>
                                <div class="friend-level">Lv.${f.level} · ${f.onlineStatus}</div>
                                <div class="friend-coins">🪙 ${f.coins.toLocaleString()}</div>
                            </div>
                            <div class="friend-actions-col">
                                ${f.canGift ? `<button class="friend-gift-btn" data-id="${f.id}">赠送</button>` : '<span class="friend-gifted">已赠送</span>'}
                                ${f.canClaim ? `<button class="friend-claim-btn" data-id="${f.id}">领取</button>` : ''}
                                <button class="friend-delete-btn" data-id="${f.id}" title="删除">✕</button>
                            </div>
                        </div>
                    `).join('')}
                ` : `
                    ${recommends.length === 0 ? '<div class="friend-empty">暂无推荐好友</div>' : ''}
                    ${recommends.map(r => `
                        <div class="friend-item">
                            <div class="friend-avatar">
                                <span>${r.avatar}</span>
                            </div>
                            <div class="friend-info">
                                <div class="friend-name">${r.name} <span class="friend-vip">VIP${r.vip}</span></div>
                                <div class="friend-level">Lv.${r.level}</div>
                            </div>
                            <div class="friend-actions-col">
                                <button class="friend-add-btn" data-id="${r.id}">添加</button>
                            </div>
                        </div>
                    `).join('')}
                `}
            </div>
        `;

        // Tab切换
        content.querySelectorAll('.friend-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.eventBus.emit('ui:friend_tab', tab.dataset.tab);
            });
        });

        // 赠送礼物
        content.querySelectorAll('.friend-gift-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:friend_gift', btn.dataset.id);
            });
        });

        // 领取礼物
        content.querySelectorAll('.friend-claim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:friend_claim', btn.dataset.id);
            });
        });

        // 一键领取
        const claimAllBtn = content.querySelector('#friend-claim-all');
        if (claimAllBtn) {
            claimAllBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:friend_claim_all');
            });
        }

        // 添加好友
        content.querySelectorAll('.friend-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:friend_add', btn.dataset.id);
            });
        });

        // 删除好友
        content.querySelectorAll('.friend-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:friend_delete', btn.dataset.id);
            });
        });
    }

    _fillEquipment(content, data) {
        const equipped = data.equipped || {};
        const inventory = data.inventory || [];
        const totalStats = data.totalStats || {};
        const tab = data.tab || 'equip';

        const slotNames = { weapon: '武器', armor: '护甲', accessory: '饰品', treasure: '宝物' };
        const slotIcons = { weapon: '⚔️', armor: '🛡️', accessory: '💍', treasure: '👑' };

        content.innerHTML = `
            <div class="equip-header">
                <span class="equip-title">⚔️ 装备</span>
                <div class="equip-stats">
                    <span>攻${Math.floor(totalStats.attack || 0)}</span>
                    <span>暴${Math.floor(totalStats.critRate || 0)}%</span>
                    <span>金${Math.floor(totalStats.coinBonus || 0)}%</span>
                </div>
            </div>
            <div class="equip-tabs">
                <button class="equip-tab ${tab === 'equip' ? 'active' : ''}" data-tab="equip">已装备</button>
                <button class="equip-tab ${tab === 'inventory' ? 'active' : ''}" data-tab="inventory">背包 (${inventory.length})</button>
                <button class="equip-tab ${tab === 'draw' ? 'active' : ''}" data-tab="draw">抽卡</button>
            </div>
            <div class="equip-content">
                ${tab === 'equip' ? `
                    <div class="equip-slots">
                        ${Object.entries(slotNames).map(([slot, name]) => {
                            const item = equipped[slot];
                            return `
                                <div class="equip-slot ${item ? 'filled' : ''}" data-slot="${slot}">
                                    <div class="equip-slot-icon">${item ? item.icon : slotIcons[slot]}</div>
                                    <div class="equip-slot-name">${name}</div>
                                    ${item ? `
                                        <div class="equip-slot-item-name rarity-${item.rarity}">${item.name}</div>
                                        <div class="equip-slot-level">+${item.enhanceLevel || 0}</div>
                                        <div class="equip-slot-stats">
                                            ${Object.entries(item.stats).map(([k,v]) => `<span>${k==='attack'?'攻':k==='critRate'?'暴':k==='coinBonus'?'金':'防'}${Math.floor(v * (1 + (item.enhanceLevel||0)*0.1))}</span>`).join(' ')}
                                        </div>
                                        <button class="equip-unequip-btn" data-uid="${item.uid}">卸下</button>
                                        <button class="equip-enhance-btn" data-uid="${item.uid}">强化</button>
                                    ` : '<div class="equip-slot-empty">未装备</div>'}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : tab === 'inventory' ? `
                    <div class="equip-inventory">
                        ${inventory.length === 0 ? '<div class="equip-empty">背包为空，去抽卡吧！</div>' : ''}
                        ${inventory.map(item => `
                            <div class="equip-inv-item rarity-${item.rarity}">
                                <div class="equip-inv-icon">${item.icon}</div>
                                <div class="equip-inv-info">
                                    <div class="equip-inv-name">${item.name} ${item.enhanceLevel > 0 ? `+${item.enhanceLevel}` : ''}</div>
                                    <div class="equip-inv-stats">
                                        ${Object.entries(item.stats).map(([k,v]) => `<span>${k==='attack'?'攻':k==='critRate'?'暴':k==='coinBonus'?'金':'防'}${v}</span>`).join(' ')}
                                    </div>
                                </div>
                                <div class="equip-inv-actions">
                                    <button class="equip-action-btn equip" data-uid="${item.uid}">装备</button>
                                    <button class="equip-action-btn decompose" data-uid="${item.uid}">分解</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="equip-draw">
                        <div class="equip-draw-info">
                            <p>普通60% / 稀有25% / 史诗12% / 传说3%</p>
                            <p class="equip-draw-diamond">💎 ${data.diamonds || 0}</p>
                        </div>
                        <div class="equip-draw-buttons">
                            <button class="equip-draw-btn single" id="draw-single">
                                <span class="draw-btn-title">单抽</span>
                                <span class="draw-btn-cost">💎 100</span>
                            </button>
                            <button class="equip-draw-btn ten" id="draw-ten">
                                <span class="draw-btn-title">十连抽</span>
                                <span class="draw-btn-cost">💎 900</span>
                            </button>
                        </div>
                        <div class="equip-draw-result" id="draw-result"></div>
                    </div>
                `}
            </div>
        `;

        // Tab切换
        content.querySelectorAll('.equip-tab').forEach(t => {
            t.addEventListener('click', () => {
                this.eventBus.emit('ui:equip_tab', t.dataset.tab);
            });
        });

        // 卸下
        content.querySelectorAll('.equip-unequip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.eventBus.emit('ui:equip_unequip', btn.closest('.equip-slot').dataset.slot);
            });
        });

        // 强化
        content.querySelectorAll('.equip-enhance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.eventBus.emit('ui:equip_enhance', btn.dataset.uid);
            });
        });

        // 装备
        content.querySelectorAll('.equip-action-btn.equip').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:equip_equip', btn.dataset.uid);
            });
        });

        // 分解
        content.querySelectorAll('.equip-action-btn.decompose').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:equip_decompose', btn.dataset.uid);
            });
        });

        // 抽卡
        const drawSingle = content.querySelector('#draw-single');
        if (drawSingle) {
            drawSingle.addEventListener('click', () => {
                this.eventBus.emit('ui:equip_draw_single');
            });
        }
        const drawTen = content.querySelector('#draw-ten');
        if (drawTen) {
            drawTen.addEventListener('click', () => {
                this.eventBus.emit('ui:equip_draw_ten');
            });
        }
    }

    _fillGuild(content, data) {
        const guild = data.guild || {};
        const members = data.members || [];
        const shopItems = data.shopItems || [];
        const boss = data.boss || {};
        const tab = data.tab || 'info';

        content.innerHTML = `
            <div class="guild-header">
                <div class="guild-title-row">
                    <span class="guild-name">${guild.name || '未加入公会'}</span>
                    <span class="guild-level">Lv.${guild.level || 1}</span>
                </div>
                <div class="guild-exp-bar">
                    <div class="guild-exp-fill" style="width: ${guild.expPercent || 0}%"></div>
                </div>
                <div class="guild-exp-text">经验 ${guild.exp || 0}/${guild.expMax || 0} · 成员 ${guild.memberCount || 0}/${guild.memberMax || 0}</div>
            </div>
            <div class="guild-tabs">
                <button class="guild-tab ${tab === 'info' ? 'active' : ''}" data-tab="info">公会信息</button>
                <button class="guild-tab ${tab === 'members' ? 'active' : ''}" data-tab="members">成员 (${members.length})</button>
                <button class="guild-tab ${tab === 'shop' ? 'active' : ''}" data-tab="shop">公会商店</button>
                <button class="guild-tab ${tab === 'boss' ? 'active' : ''}" data-tab="boss">公会BOSS</button>
            </div>
            <div class="guild-content">
                ${tab === 'info' ? `
                    <div class="guild-info">
                        <div class="guild-info-item">
                            <span class="guild-info-label">会长</span>
                            <span class="guild-info-value">${guild.leader || '---'}</span>
                        </div>
                        <div class="guild-info-item">
                            <span class="guild-info-label">我的贡献</span>
                            <span class="guild-info-value gold">${guild.myContribution || 0}</span>
                        </div>
                        <div class="guild-info-item">
                            <span class="guild-info-label">在线成员</span>
                            <span class="guild-info-value">${data.onlineCount || 0}人</span>
                        </div>
                        <div class="guild-info-item">
                            <span class="guild-info-label">创建时间</span>
                            <span class="guild-info-value">${guild.created || '---'}</span>
                        </div>
                        <div class="guild-desc">${guild.description || ''}</div>
                        <button class="guild-leave-btn" id="guild-leave">退出公会</button>
                    </div>
                ` : tab === 'members' ? `
                    <div class="guild-member-list">
                        ${members.map(m => `
                            <div class="guild-member ${m.isSelf ? 'self' : ''}">
                                <div class="guild-member-avatar">
                                    <span>${m.avatar}</span>
                                    ${m.online ? '<div class="guild-online-dot"></div>' : ''}
                                </div>
                                <div class="guild-member-info">
                                    <div class="guild-member-name">${m.name} ${m.isSelf ? '(我)' : ''}</div>
                                    <div class="guild-member-role">${m.role} · Lv.${m.level} · VIP${m.vip}</div>
                                </div>
                                <div class="guild-member-contribution">贡献 ${m.contribution.toLocaleString()}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : tab === 'shop' ? `
                    <div class="guild-shop-info">
                        <span>我的贡献度：</span>
                        <span class="guild-contribution-value">${guild.myContribution || 0}</span>
                    </div>
                    <div class="guild-shop-list">
                        ${shopItems.map(item => `
                            <div class="guild-shop-item">
                                <div class="guild-shop-icon">${item.icon}</div>
                                <div class="guild-shop-name">${item.name}</div>
                                <div class="guild-shop-cost">贡献 ${item.cost}</div>
                                ${item.purchased ? '<span class="guild-shop-sold">已购买</span>' :
                                  item.canAfford ? `<button class="guild-shop-buy" data-id="${item.id}">购买</button>` :
                                  '<span class="guild-shop-locked">贡献不足</span>'}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="guild-boss">
                        <div class="guild-boss-icon">${boss.icon || '🐋'}</div>
                        <div class="guild-boss-name">${boss.name || '深海魔鲸'} Lv.${boss.level || 1}</div>
                        <div class="guild-boss-hp-bar">
                            <div class="guild-boss-hp-fill" style="width: ${boss.hpPercent || 0}%"></div>
                        </div>
                        <div class="guild-boss-hp-text">${(boss.currentHp || 0).toLocaleString()} / ${(boss.maxHp || 0).toLocaleString()}</div>
                        <button class="guild-boss-attack" id="guild-boss-attack">攻击BOSS (+100伤害)</button>
                        <div class="guild-boss-reward">击杀奖励：🪙${(boss.reward?.coins || 0).toLocaleString()} 💎${boss.reward?.diamonds || 0}</div>
                        <div class="guild-boss-refresh">刷新时间：${boss.refreshTime || '每日20:00'}</div>
                        <div class="guild-boss-rank">
                            <div class="guild-boss-rank-title">伤害排行</div>
                            ${(boss.topDamage || []).map((d, i) => `
                                <div class="guild-boss-rank-item">
                                    <span class="rank-${i+1}">${i+1}</span>
                                    <span>${d.name}</span>
                                    <span>${d.damage.toLocaleString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `}
            </div>
        `;

        // Tab切换
        content.querySelectorAll('.guild-tab').forEach(t => {
            t.addEventListener('click', () => {
                this.eventBus.emit('ui:guild_tab', t.dataset.tab);
            });
        });

        // 商店购买
        content.querySelectorAll('.guild-shop-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:guild_shop_buy', btn.dataset.id);
            });
        });

        // 攻击BOSS
        const attackBtn = content.querySelector('#guild-boss-attack');
        if (attackBtn) {
            attackBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:guild_boss_attack');
            });
        }

        // 退出公会
        const leaveBtn = content.querySelector('#guild-leave');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:guild_leave');
            });
        }
    }

    _fillSeason(content, data) {
        const season = data.season || {};
        const rewards = data.rewards || [];
        const tasks = data.tasks || [];
        const tab = data.tab || 'rewards';

        content.innerHTML = `
            <div class="season-header">
                <div class="season-title-row">
                    <span class="season-name">${season.seasonName || 'S1赛季'}</span>
                    <span class="season-days">剩余 ${season.daysLeft || 0}天</span>
                </div>
                <div class="season-level-row">
                    <span class="season-level">Lv.${season.level || 1}</span>
                    <div class="season-xp-bar">
                        <div class="season-xp-fill" style="width: ${season.xpPercent || 0}%"></div>
                    </div>
                    <span class="season-xp-text">${season.xp || 0}/${season.xpPerLevel || 100}</span>
                </div>
                <div class="season-daily-xp">今日经验 ${season.dailyXp || 0}/${season.dailyXpLimit || 500}</div>
            </div>
            ${!season.premium ? `
                <div class="season-premium-banner">
                    <span>🏆 高级通行证</span>
                    <button class="season-buy-btn" id="season-buy">¥${season.premiumPrice || 68} 解锁</button>
                </div>
            ` : '<div class="season-premium-active">🏆 高级通行证已激活</div>'}
            <div class="season-tabs">
                <button class="season-tab ${tab === 'rewards' ? 'active' : ''}" data-tab="rewards">赛季奖励</button>
                <button class="season-tab ${tab === 'tasks' ? 'active' : ''}" data-tab="tasks">赛季任务</button>
            </div>
            <div class="season-content">
                ${tab === 'rewards' ? `
                    <div class="season-rewards-list">
                        ${rewards.map(r => `
                            <div class="season-reward-item">
                                <div class="season-reward-level">Lv.${r.level}</div>
                                <div class="season-reward-free">
                                    <div class="reward-label">免费</div>
                                    <div class="reward-content">${this._formatReward(r.free)}</div>
                                    ${r.freeAvailable ? `<button class="reward-claim-btn" data-level="${r.level}" data-type="free">领取</button>` :
                                      r.freeClaimed ? '<span class="reward-claimed">已领取</span>' :
                                      '<span class="reward-locked">未解锁</span>'}
                                </div>
                                <div class="season-reward-premium ${season.premium ? '' : 'locked'}">
                                    <div class="reward-label">高级</div>
                                    <div class="reward-content">${this._formatReward(r.premium)}</div>
                                    ${r.premiumAvailable ? `<button class="reward-claim-btn premium" data-level="${r.level}" data-type="premium">领取</button>` :
                                      r.premiumClaimed ? '<span class="reward-claimed">已领取</span>' :
                                      '<span class="reward-locked">未解锁</span>'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="season-tasks-list">
                        ${tasks.map(t => `
                            <div class="season-task-item">
                                <div class="season-task-info">
                                    <div class="season-task-name">${t.name}</div>
                                    <div class="season-task-type">${t.type === 'daily' ? '每日' : '每周'}</div>
                                </div>
                                <div class="season-task-xp">+${t.xp}经验</div>
                                <div class="season-task-status">
                                    ${t.claimed ? '<span class="task-done">已完成</span>' : '<span class="task-progress">进行中</span>'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        // Tab切换
        content.querySelectorAll('.season-tab').forEach(t => {
            t.addEventListener('click', () => {
                this.eventBus.emit('ui:season_tab', t.dataset.tab);
            });
        });

        // 购买高级通行证
        const buyBtn = content.querySelector('#season-buy');
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:season_buy');
            });
        }

        // 领取奖励
        content.querySelectorAll('.reward-claim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:season_claim', { level: parseInt(btn.dataset.level), type: btn.dataset.type });
            });
        });
    }

    /**
     * 格式化奖励显示
     */
    _formatReward(reward) {
        if (!reward) return '无';
        const parts = [];
        if (reward.coins) parts.push(`🪙${reward.coins}`);
        if (reward.diamonds) parts.push(`💎${reward.diamonds}`);
        if (reward.items) parts.push(Object.entries(reward.items).map(([k,v]) => `${k==='lock'?'🔒':'🔥'}×${v}`).join(' '));
        if (reward.skin) parts.push(`🎨皮肤`);
        if (reward.pet) parts.push(`🐾宠物`);
        if (reward.title) parts.push(`👑${reward.title}`);
        return parts.join(' ') || '无';
    }

    _fillOffline(content, data) {
        const duration = data.duration || '0分钟';
        const earnings = data.earnings || 0;
        const capped = data.capped || false;
        content.innerHTML = `
            <div class="offline-container">
                <div class="offline-icon">🌙</div>
                <h3 class="offline-title">离线收益</h3>
                <p class="offline-desc">您离开了 <span class="offline-duration">${duration}</span></p>
                ${capped ? '<p class="offline-capped">（已达8小时上限）</p>' : ''}
                <div class="offline-reward">
                    <span class="offline-coin-icon">🪙</span>
                    <span class="offline-coin-amount">+${earnings.toLocaleString()}</span>
                </div>
                <button class="offline-claim-btn" id="offline-claim-btn">领取收益</button>
                <p class="offline-hint">升级炮台和关卡可提升离线收益</p>
            </div>
        `;
        const btn = content.querySelector('#offline-claim-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:claim_offline', earnings);
                this.closePopup();
            });
        }
    }

    _fillReturning(content, data) {
        const daysAway = data.daysAway || 3;
        const gift = data.gift || { coins: 50000, diamonds: 20, items: {} };
        const offlineEarnings = data.offlineEarnings || 0;
        content.innerHTML = `
            <div class="returning-container">
                <div class="returning-icon">🎁</div>
                <h3 class="returning-title">欢迎回来！</h3>
                <p class="returning-desc">您已离开 <span class="returning-days">${daysAway}</span> 天</p>
                <p class="returning-subtitle">龙宫为您准备了回归大礼</p>
                <div class="returning-rewards">
                    <div class="returning-reward-item">
                        <span class="reward-icon">🪙</span>
                        <span class="reward-amount">${gift.coins.toLocaleString()}</span>
                    </div>
                    <div class="returning-reward-item">
                        <span class="reward-icon">💎</span>
                        <span class="reward-amount">${gift.diamonds}</span>
                    </div>
                    <div class="returning-reward-item">
                        <span class="reward-icon">🎯</span>
                        <span class="reward-amount">×${gift.items.lock || 0}</span>
                    </div>
                    <div class="returning-reward-item">
                        <span class="reward-icon">🔥</span>
                        <span class="reward-amount">×${gift.items.rage || 0}</span>
                    </div>
                </div>
                ${offlineEarnings > 0 ? `
                    <div class="returning-offline">
                        <span>离线收益：+${offlineEarnings.toLocaleString()} 金币</span>
                    </div>
                ` : ''}
                <button class="returning-claim-btn" id="returning-claim-btn">领取全部</button>
                <p class="returning-hint">回归后首局享受高爆率加成</p>
            </div>
        `;
        const btn = content.querySelector('#returning-claim-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:claim_returning');
                this.closePopup();
            });
        }
    }

    _fillSkin(content, data) {
        const skins = data.skins || [];
        const currentSkin = data.currentSkin || 'dragon';
        const vipLevel = data.vipLevel || 0;
        content.innerHTML = `
            <div class="skin-header">
                <span class="skin-title">炮台皮肤</span>
                <span class="skin-vip">VIP${vipLevel}</span>
            </div>
            <div class="skin-list">
                ${skins.map(s => `
                    <div class="skin-card ${s.unlocked ? 'unlocked' : 'locked'} ${s.id === currentSkin ? 'active' : ''}" data-skin="${s.id}">
                        <div class="skin-preview" style="--skin-color: ${s.color}">
                            <div class="skin-cannon-icon">
                                ${s.id === 'dragon' ? '🐉' : s.id === 'glass' ? '💎' : '👑'}
                            </div>
                        </div>
                        <div class="skin-name">${s.name}</div>
                        <div class="skin-unlock">${s.unlockDesc}</div>
                        ${s.id === currentSkin 
                            ? '<button class="skin-btn active-btn" disabled>使用中</button>'
                            : s.unlocked 
                                ? `<button class="skin-btn equip-btn" data-skin="${s.id}">装备</button>`
                                : '<button class="skin-btn locked-btn" disabled>未解锁</button>'
                        }
                    </div>
                `).join('')}
            </div>
        `;
        content.querySelectorAll('.equip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('ui:change_skin', btn.dataset.skin);
            });
        });
    }

    _fillSignIn(content, data) {
        const rewards = [1000, 2000, 3000, 4000, 5000, 6000, 10000];
        const signInDays = data.signInDays || 0;
        const canSignIn = data.canSignIn;
        content.innerHTML = `
            <div class="signin-calendar">
                ${rewards.map((r, i) => `
                    <div class="signin-day ${i < signInDays ? 'signed' : ''} ${i === signInDays && canSignIn ? 'current' : ''}">
                        <div class="day-number">第${i + 1}天</div>
                        <div class="day-reward">🪙${r >= 10000 ? r / 10000 + '万' : r}</div>
                        ${i < signInDays ? '<div class="day-check">✓</div>' : ''}
                    </div>
                `).join('')}
            </div>
            <button class="signin-btn" id="signin-btn" ${canSignIn ? '' : 'disabled'}>
                ${canSignIn ? '立即签到' : '今日已签到'}
            </button>
            <p class="signin-hint">连续签到奖励递增，第7天可获得1万金币+5钻石+锁定道具！</p>
        `;
    }

    _fillRecharge(content) {
        content.innerHTML = `
            <div class="recharge-notice">
                <p>💎 首充双倍！首次充值任意金额获得双倍金币！</p>
            </div>
            <div class="recharge-items">
                ${[6, 30, 68, 128, 328, 648].map(price => `
                    <div class="recharge-item">
                        <div class="recharge-amount">¥${price}</div>
                        <div class="recharge-coins">${price * 1000}金币</div>
                        <button class="recharge-btn">充值</button>
                    </div>
                `).join('')}
            </div>
            <div class="recharge-disclaimer">
                <p>⚠️ 本游戏为休闲娱乐游戏，游戏内虚拟道具不可兑换现金。请理性消费，未成年用户请在监护人指导下进行。</p>
            </div>
        `;
    }

    _fillPrivacy(content) {
        content.innerHTML = `
            <div class="policy-content">
                <h3>隐私政策</h3>
                <p>更新日期：2026年9月12日</p>
                <h4>一、信息收集</h4>
                <p>我们仅收集游戏运行所必需的信息，包括设备信息、游戏进度数据。不收集真实姓名、身份证号等敏感个人信息。</p>
                <h4>二、信息使用</h4>
                <p>收集的信息仅用于提供游戏服务、优化游戏体验、保障账户安全，不会用于其他商业用途。</p>
                <h4>三、信息存储</h4>
                <p>游戏数据存储在本地设备（localStorage），不上传至服务器。清除浏览器数据将同时清除游戏存档。</p>
                <h4>四、第三方服务</h4>
                <p>本游戏不接入第三方SDK、广告平台或数据分析服务。</p>
                <h4>五、您的权利</h4>
                <p>您有权随时清除游戏数据、拒绝信息收集。如有疑问，请通过游戏内反馈渠道联系我们。</p>
            </div>
        `;
    }

    _fillAgreement(content) {
        content.innerHTML = `
            <div class="policy-content">
                <h3>用户协议</h3>
                <p>更新日期：2026年9月12日</p>
                <h4>一、服务说明</h4>
                <p>《捕鱼达人·东海龙宫》是一款休闲娱乐游戏，所有游戏内容仅供娱乐，不涉及任何真实货币交易或赌博活动。</p>
                <h4>二、虚拟道具</h4>
                <p>游戏内金币、钻石等均为非现金虚拟道具，不可兑换现金、不可交易、不可转让，仅可在游戏内部消耗使用。</p>
                <h4>三、用户行为规范</h4>
                <p>用户不得利用游戏进行任何违法活动，不得使用外挂、作弊软件，不得攻击游戏服务器。违反者将被封禁账户。</p>
                <h4>四、免责声明</h4>
                <p>游戏按"现状"提供，不对游戏的不间断运行或无错误作出保证。因不可抗力导致的服务中断，我们不承担责任。</p>
                <h4>五、协议变更</h4>
                <p>我们保留随时修改本协议的权利，修改后的协议将在游戏内公示。继续使用游戏即视为同意修改后的协议。</p>
            </div>
        `;
    }

    /**
     * 关闭当前弹窗
     */
    closePopup() {
        if (this.popupStack.length === 0) return;
        const popup = this.popupStack.pop();
        popup.element.remove();

        // 恢复上一个弹窗
        if (this.popupStack.length > 0) {
            this.popupStack[this.popupStack.length - 1].element.style.display = 'flex';
        }
    }

    /**
     * 关闭所有弹窗
     */
    closeAllPopups() {
        while (this.popupStack.length > 0) {
            const popup = this.popupStack.pop();
            popup.element.remove();
        }
    }

    /**
     * 显示 Toast 提示
     */
    showToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'toast glass-panel';
        toast.textContent = message;
        this._toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * 显示新手引导
     */
    showTutorial(step, progress) {
        this.hideTutorial();

        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.id = 'tutorial-overlay';

        overlay.innerHTML = `
            <div class="tutorial-mask"></div>
            <div class="tutorial-dialog glass-panel">
                <div class="tutorial-icon">${step.icon}</div>
                <div class="tutorial-title">${step.title}</div>
                <div class="tutorial-content">${step.content}</div>
                <div class="tutorial-progress">
                    <div class="tutorial-progress-bar">
                        <div class="tutorial-progress-fill" style="width: ${progress.percent}%"></div>
                    </div>
                    <span class="tutorial-progress-text">${progress.current}/${progress.total}</span>
                </div>
                <div class="tutorial-buttons">
                    ${progress.current > 1 ? '<button class="tutorial-skip-btn" id="tutorial-skip">跳过</button>' : ''}
                    <button class="tutorial-next-btn" id="tutorial-next">${step.buttonText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#tutorial-next').addEventListener('click', () => {
            this.eventBus.emit('ui:tutorial_next');
        });

        const skipBtn = overlay.querySelector('#tutorial-skip');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:tutorial_skip');
            });
        }
    }

    /**
     * 隐藏新手引导
     */
    hideTutorial() {
        const existing = document.getElementById('tutorial-overlay');
        if (existing) existing.remove();
    }

    get currentPopup() {
        return this.popupStack.length > 0 ? this.popupStack[this.popupStack.length - 1] : null;
    }

    get hasPopup() {
        return this.popupStack.length > 0;
    }
}
