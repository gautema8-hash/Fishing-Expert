/* ========== 系统配置页面 ========== */
(function () {
    const PAGE_ID = 'page-config';
    let gameConfig = {};

    // 游戏配置键中文映射
    const CONFIG_KEY_NAMES = {
        'initial_coins': '初始金币',
        'initial_diamonds': '初始钻石',
        'max_bullets_per_second': '每秒最大炮弹数',
        'max_coins_per_minute': '每分钟最大金币获取',
        'crit_rate_base': '基础暴击率',
        'vip_coin_bonus_per_level': 'VIP每级金币加成',
        'vip_crit_bonus_per_level': 'VIP每级暴击加成',
        'newbie_protection_games': '新手保护局数',
        'world_boss_duration': '世界BOSS持续时间(毫秒)',
        'maintenance_mode': '维护模式',
        'register_enabled': '允许新用户注册',
        'recharge_enabled': '允许充值'
    };

    // 功能开关键中文映射
    const FEATURE_KEY_NAMES = {
        'world_boss_enabled': '世界BOSS玩法',
        'guild_enabled': '公会系统',
        'friend_enabled': '好友系统',
        'season_enabled': '赛季系统',
        'pet_enabled': '宠物系统',
        'equipment_enabled': '装备系统',
        'achievement_enabled': '成就系统',
        'vip_enabled': 'VIP系统',
        'task_enabled': '任务系统',
        'shop_enabled': '商城系统',
        'recharge_enabled': '充值功能',
        'leaderboard_enabled': '排行榜',
        'multiplayer_enabled': '多人联机(灰度)',
        'newbie_protection': '新手保护',
        'anti_cheat_enabled': '反作弊检测',
        'ad_enabled': '激励视频广告',
        'daily_sign_enabled': '每日签到',
        'offline_reward_enabled': '离线收益',
        'lucky_wheel_enabled': '幸运转盘'
    };

    // 获取配置键中文名，未映射则返回原key
    function getConfigName(key) {
        return CONFIG_KEY_NAMES[key] || key;
    }

    function getFeatureName(key) {
        return FEATURE_KEY_NAMES[key] || key;
    }

    const HTML = `
        <div class="tabs">
            <div class="tab active" data-tab="game">游戏配置</div>
            <div class="tab" data-tab="features">功能开关</div>
        </div>

        <div class="tab-pane active" id="tab-game">
            <div class="panel">
                <div class="panel-title">
                    <span>游戏参数配置</span>
                    <button class="btn btn-gold btn-sm" id="cfg-save">保存全部</button>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th style="width:35%;">配置键</th><th>配置值</th></tr></thead>
                        <tbody id="cfg-tbody"><tr><td colspan="2" class="empty-tip">加载中...</td></tr></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="tab-pane" id="tab-features">
            <div class="panel">
                <div class="panel-title"><span>功能开关</span></div>
                <div id="feat-list"><div class="empty-tip">加载中...</div></div>
            </div>
        </div>
    `;

    async function loadGameConfig() {
        const tbody = document.getElementById('cfg-tbody');
        try {
            gameConfig = await api.get('/admin/api/config/game') || {};
            const keys = Object.keys(gameConfig);
            if (!keys.length) { tbody.innerHTML = '<tr><td colspan="2" class="empty-tip">暂无配置项</td></tr>'; return; }
            tbody.innerHTML = keys.map(k => `
                <tr>
                    <td>
                        <div style="color:#fff;font-weight:500;">${escHtml(getConfigName(k))}</div>
                        <div style="font-family:monospace;color:#36E0E8;font-size:11px;margin-top:4px;opacity:0.7;">${escHtml(k)}</div>
                    </td>
                    <td><input type="text" class="cfg-input" data-key="${escHtml(k)}" value="${escHtml(gameConfig[k])}" style="width:100%;"></td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="2" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function saveGameConfig() {
        const body = {};
        document.querySelectorAll('.cfg-input').forEach(inp => {
            body[inp.dataset.key] = inp.value;
        });
        try {
            await api.put('/admin/api/config/game', body);
            toast('配置已保存', 'success');
        } catch (e) { toast(e.message, 'error'); }
    }

    async function loadFeatures() {
        const box = document.getElementById('feat-list');
        try {
            const feat = await api.get('/admin/api/config/features') || {};
            const keys = Object.keys(feat);
            if (!keys.length) { box.innerHTML = '<div class="empty-tip">暂无功能开关</div>'; return; }
            box.innerHTML = keys.map(k => {
                const on = feat[k] === true || feat[k] === 'true';
                return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(54,224,232,0.1);">
                    <div>
                        <div style="color:#fff;font-weight:500;">${escHtml(getFeatureName(k))}</div>
                        <div style="font-family:monospace;color:#36E0E8;font-size:11px;margin-top:4px;opacity:0.7;">${escHtml(k)}</div>
                        <div style="font-size:12px;color:#88aacc;margin-top:2px;">${on ? '已开启' : '已关闭'}</div>
                    </div>
                    <label class="switch">
                        <input type="checkbox" ${on ? 'checked' : ''} onchange="AdminPages.config.toggleFeature('${escHtml(k)}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>`;
            }).join('');
        } catch (e) {
            box.innerHTML = '<div class="empty-tip">加载失败：' + escHtml(e.message) + '</div>';
        }
    }

    async function toggleFeature(key, enabled) {
        try {
            await api.put('/admin/api/config/features/' + encodeURIComponent(key), { enabled });
            toast(enabled ? '已开启' : '已关闭', 'success');
            loadFeatures();
        } catch (e) { toast(e.message, 'error'); loadFeatures(); }
    }

    window.AdminPages.config = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.querySelectorAll('#' + PAGE_ID + ' .tab').forEach(t => {
                t.onclick = () => {
                    document.querySelectorAll('#' + PAGE_ID + ' .tab').forEach(x => x.classList.remove('active'));
                    document.querySelectorAll('#' + PAGE_ID + ' .tab-pane').forEach(x => x.classList.remove('active'));
                    t.classList.add('active');
                    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
                    if (t.dataset.tab === 'features') loadFeatures();
                };
            });
            document.getElementById('cfg-save').onclick = saveGameConfig;
            loadGameConfig();
        },
        onShow() {}, toggleFeature
    };
})();
