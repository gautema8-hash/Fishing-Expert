/**
 * 顶部状态栏
 * 玩家头像+ID、实时金币、钻石/道具数量
 */
export class TopBar {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.element = null;
        this._coinDisplay = null;
        this._diamondDisplay = null;
        this._levelDisplay = null;
        this._create();
    }

    _create() {
        this.element = document.createElement('div');
        this.element.className = 'top-bar glass-panel';
        this.element.innerHTML = `
            <div class="top-bar-left">
                <div class="player-avatar">
                    <span>🐉</span>
                    <div class="avatar-ring"></div>
                </div>
                <div class="player-info">
                    <span class="player-name">龙宫新手</span>
                    <span class="player-vip">VIP0</span>
                </div>
                <button class="mail-btn" id="mail-btn" title="邮件">
                    <span>📬</span>
                    <span class="mail-badge" id="mail-badge" style="display:none;">0</span>
                </button>
                <button class="mail-btn" id="equipment-btn" title="装备">
                    <span>⚔️</span>
                </button>
                <button class="mail-btn" id="season-btn" title="赛季">
                    <span>🏆</span>
                </button>
            </div>
            <div class="top-bar-center">
                <div class="coin-display" id="coin-display">
                    <span class="coin-icon">🪙</span>
                    <span class="coin-value">10,000</span>
                    <button class="coin-add-btn" id="coin-add-btn">+</button>
                </div>
                <div class="energy-bar-container">
                    <div class="energy-bar-bg">
                        <div class="energy-bar-fill" id="energy-bar-fill"></div>
                    </div>
                    <span class="energy-bar-text" id="energy-bar-text">30/100</span>
                </div>
            </div>
            <div class="top-bar-right">
                <div class="diamond-display">
                    <span class="diamond-icon">💎</span>
                    <span class="diamond-value">10</span>
                </div>
                <div class="level-display">
                    <span class="level-icon">🏆</span>
                    <span class="level-value">第1关</span>
                </div>
            </div>
        `;
        this.container.appendChild(this.element);

        this._coinDisplay = this.element.querySelector('.coin-value');
        this._diamondDisplay = this.element.querySelector('.diamond-value');
        this._levelDisplay = this.element.querySelector('.level-value');
        this._energyFill = this.element.querySelector('#energy-bar-fill');
        this._energyText = this.element.querySelector('#energy-bar-text');

        // 金币加号按钮
        this.element.querySelector('#coin-add-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_shop');
        });

        this.element.querySelector('#mail-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_mail');
        });

        this.element.querySelector('#equipment-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_equipment');
        });

        this.element.querySelector('#season-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_season');
        });
    }

    /**
     * 更新邮件徽章
     */
    updateMailBadge(count) {
        const badge = this.element.querySelector('#mail-badge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'flex';
                badge.textContent = count > 99 ? '99+' : count;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * 更新金币显示
     */
    updateCoins(displayValue) {
        if (this._coinDisplay) {
            this._coinDisplay.textContent = displayValue;
            // 数字变动动画
            this._coinDisplay.classList.add('coin-bump');
            setTimeout(() => this._coinDisplay.classList.remove('coin-bump'), 300);
        }
    }

    updateDiamonds(value) {
        if (this._diamondDisplay) {
            this._diamondDisplay.textContent = value;
        }
    }

    updateLevel(level) {
        if (this._levelDisplay) {
            this._levelDisplay.textContent = `第${level}关`;
        }
    }

    updateEnergy(energy, maxEnergy) {
        if (this._energyFill) {
            const percent = Math.min(100, (energy / maxEnergy) * 100);
            this._energyFill.style.width = `${percent}%`;
        }
        if (this._energyText) {
            this._energyText.textContent = `${Math.floor(energy)}/${maxEnergy}`;
        }
    }

    updatePlayerInfo(name, vipLevel) {
        const nameEl = this.element.querySelector('.player-name');
        const vipEl = this.element.querySelector('.player-vip');
        if (nameEl) nameEl.textContent = name;
        if (vipEl) vipEl.textContent = `VIP${vipLevel}`;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

/**
 * 底部操作栏
 * 炮台倍率切换、自动发射开关、设置按钮
 */
export class BottomBar {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.element = null;
        this._levelDisplay = null;
        this._autoFireBtn = null;
        this._create();
    }

    _create() {
        this.element = document.createElement('div');
        this.element.className = 'bottom-bar glass-panel';
        this.element.innerHTML = `
            <div class="bottom-bar-left">
                <button class="cannon-btn cannon-minus" id="cannon-minus" title="降低倍率">
                    <span>−</span>
                </button>
                <div class="cannon-level" id="cannon-level">
                    <span class="level-label">倍率</span>
                    <span class="level-value">×1</span>
                </div>
                <button class="cannon-btn cannon-plus" id="cannon-plus" title="提升倍率">
                    <span>+</span>
                </button>
            </div>
            <div class="bottom-bar-center">
                <button class="auto-fire-btn" id="auto-fire-btn" title="自动发射">
                    <span class="auto-fire-icon">⚡</span>
                    <span class="auto-fire-text">自动</span>
                </button>
            </div>
            <div class="bottom-bar-right">
                <button class="action-btn" id="task-btn" title="任务">
                    <span>📋</span>
                    <span class="btn-badge" id="task-badge" style="display:none">!</span>
                </button>
                <button class="action-btn" id="signin-btn" title="签到">
                    <span>📅</span>
                </button>
                <button class="action-btn" id="upgrade-btn" title="炮台养成">
                    <span>⬆️</span>
                </button>
                <button class="action-btn" id="pet-btn" title="宠物">
                    <span>🐾</span>
                </button>
                <button class="action-btn" id="skin-btn" title="炮台皮肤">
                    <span>🎨</span>
                </button>
                <button class="action-btn" id="stats-btn" title="数据统计">
                    <span>📊</span>
                </button>
                <button class="action-btn" id="achievement-btn" title="成就">
                    <span>🏆</span>
                </button>
                <button class="action-btn" id="friend-btn" title="好友">
                    <span>👥</span>
                </button>
                <button class="action-btn" id="guild-btn" title="公会">
                    <span>🏯</span>
                </button>
                <button class="action-btn" id="rank-btn" title="排行榜">
                    <span>🏆</span>
                </button>
                <button class="action-btn" id="setting-btn" title="设置">
                    <span>⚙️</span>
                </button>
            </div>
        `;
        this.container.appendChild(this.element);

        this._levelDisplay = this.element.querySelector('#cannon-level .level-value');
        this._autoFireBtn = this.element.querySelector('#auto-fire-btn');

        // 事件绑定
        this.element.querySelector('#cannon-minus').addEventListener('click', () => {
            this.eventBus.emit('ui:cannon_downgrade');
        });
        this.element.querySelector('#cannon-plus').addEventListener('click', () => {
            this.eventBus.emit('ui:cannon_upgrade');
        });
        this._autoFireBtn.addEventListener('click', () => {
            this.eventBus.emit('ui:auto_fire_toggle');
        });
        this.element.querySelector('#task-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_task');
        });
        this.element.querySelector('#signin-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_signin');
        });
        this.element.querySelector('#upgrade-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_upgrade');
        });
        this.element.querySelector('#pet-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_pet');
        });
        this.element.querySelector('#skin-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_skin');
        });
        this.element.querySelector('#stats-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_stats');
        });
        this.element.querySelector('#achievement-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_achievement');
        });
        this.element.querySelector('#friend-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_friend');
        });
        this.element.querySelector('#guild-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_guild');
        });
        this.element.querySelector('#rank-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_rank');
        });
        this.element.querySelector('#setting-btn').addEventListener('click', () => {
            this.eventBus.emit('ui:open_setting');
        });
    }

    updateCannonLevel(level) {
        if (this._levelDisplay) {
            this._levelDisplay.textContent = `×${level}`;
        }
    }

    setAutoFire(active) {
        if (this._autoFireBtn) {
            this._autoFireBtn.classList.toggle('active', active);
        }
    }

    setTaskBadge(show) {
        const badge = this.element.querySelector('#task-badge');
        if (badge) badge.style.display = show ? 'block' : 'none';
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

/**
 * 侧边道具栏
 * 锁定道具、狂暴道具
 */
export class Sidebar {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.element = null;
        this._create();
    }

    _create() {
        this.element = document.createElement('div');
        this.element.className = 'sidebar glass-panel';
        this.element.innerHTML = `
            <button class="item-btn" id="item-lock" title="锁定道具">
                <span class="item-icon">🎯</span>
                <span class="item-count" id="lock-count">3</span>
                <span class="item-cooldown" id="lock-cooldown" style="display:none"></span>
            </button>
            <button class="item-btn" id="item-rage" title="狂暴道具">
                <span class="item-icon">🔥</span>
                <span class="item-count" id="rage-count">2</span>
                <span class="item-cooldown" id="rage-cooldown" style="display:none"></span>
            </button>
            <button class="item-btn" id="item-wheel" title="幸运转盘">
                <span class="item-icon">🎡</span>
            </button>
            <button class="item-btn" id="item-ad" title="看广告领奖励">
                <span class="item-icon">📺</span>
            </button>
            <div class="sidebar-divider"></div>
            <button class="skill-btn" id="skill-freeze" title="全屏冰冻 (50能量)">
                <span class="skill-icon">❄️</span>
                <span class="skill-cost">50</span>
            </button>
            <button class="skill-btn" id="skill-lightning" title="闪电链 (40能量)">
                <span class="skill-icon">⚡</span>
                <span class="skill-cost">40</span>
            </button>
            <button class="skill-btn" id="skill-coin_rain" title="金币雨 (60能量)">
                <span class="skill-icon">💰</span>
                <span class="skill-cost">60</span>
            </button>
        `;
        this.container.appendChild(this.element);

        this.element.querySelector('#item-lock').addEventListener('click', () => {
            this.eventBus.emit('ui:use_item', 'lock');
        });
        this.element.querySelector('#item-rage').addEventListener('click', () => {
            this.eventBus.emit('ui:use_item', 'rage');
        });
        this.element.querySelector('#item-wheel').addEventListener('click', () => {
            this.eventBus.emit('ui:open_wheel');
        });
        this.element.querySelector('#item-ad').addEventListener('click', () => {
            this.eventBus.emit('ui:watch_ad', 'coins');
        });

        // 技能按钮
        this.element.querySelector('#skill-freeze').addEventListener('click', () => {
            this.eventBus.emit('ui:use_skill', 'freeze');
        });
        this.element.querySelector('#skill-lightning').addEventListener('click', () => {
            this.eventBus.emit('ui:use_skill', 'lightning');
        });
        this.element.querySelector('#skill-coin_rain').addEventListener('click', () => {
            this.eventBus.emit('ui:use_skill', 'coin_rain');
        });
    }

    updateItemCount(type, count) {
        const el = this.element.querySelector(`#${type}-count`);
        if (el) el.textContent = count;
    }

    setItemCooldown(type, seconds) {
        const el = this.element.querySelector(`#${type}-cooldown`);
        if (el) {
            if (seconds > 0) {
                el.style.display = 'flex';
                el.textContent = seconds;
            } else {
                el.style.display = 'none';
            }
        }
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
