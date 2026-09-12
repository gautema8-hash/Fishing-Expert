/* ========== 系统配置页面 ========== */
(function () {
    const PAGE_ID = 'page-config';
    let gameConfig = {};

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
                    <td style="font-family:monospace;color:#36E0E8;">${escHtml(k)}</td>
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
                        <div style="color:#fff;">${escHtml(k)}</div>
                        <div style="font-size:12px;color:#88aacc;">${on ? '已开启' : '已关闭'}</div>
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
