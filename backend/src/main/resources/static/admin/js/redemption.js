/* ========== 兑换码管理页面 ========== */
(function () {
    const PAGE_ID = 'page-redemption';
    const state = { tab: 'list', page: 1, size: 15, recPage: 1, keyword: '' };

    const HTML = `
        <div class="tabs">
            <div class="tab active" data-tab="list">兑换码列表</div>
            <div class="tab" data-tab="records">兑换记录</div>
        </div>

        <!-- 列表 Tab -->
        <div class="tab-pane active" id="tab-list">
            <div class="panel">
                <div class="panel-title"><span>批量生成兑换码</span></div>
                <div class="form-row">
                    <div class="form-group"><label>前缀</label><input type="text" id="rc-prefix" placeholder="如 SUMMER"></div>
                    <div class="form-group"><label>生成数量</label><input type="number" id="rc-count" value="10" min="1" max="1000"></div>
                    <div class="form-group"><label>最大使用次数</label><input type="number" id="rc-maxUses" value="1" min="1"></div>
                    <div class="form-group"><label>过期时间</label><input type="datetime-local" id="rc-expired"></div>
                </div>
                <div class="form-group" style="margin-bottom:14px;"><label>奖励 JSON</label><textarea id="rc-reward" rows="2" placeholder='{"coins":10000,"diamonds":10}'></textarea></div>
                <button class="btn btn-gold" id="rc-gen">生成兑换码</button>
            </div>

            <div class="panel">
                <div class="toolbar" style="margin-bottom:15px;">
                    <input type="text" id="rc-keyword" placeholder="搜索兑换码" style="width:220px;">
                    <button class="btn" id="rc-search">搜索</button>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>兑换码</th><th>奖励</th><th>已用/上限</th><th>过期时间</th><th>状态</th><th>操作</th></tr></thead>
                        <tbody id="rc-tbody"><tr><td colspan="6" class="empty-tip">加载中...</td></tr></tbody>
                    </table>
                </div>
                <div class="pagination">
                    <span class="pagination-info" id="rc-info">共 0 条</span>
                    <div class="pagination-btns">
                        <button class="btn btn-sm" id="rc-prev">上一页</button>
                        <span class="page-num" id="rc-page">1 / 1</span>
                        <button class="btn btn-sm" id="rc-next">下一页</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 记录 Tab -->
        <div class="tab-pane" id="tab-records">
            <div class="panel">
                <div class="panel-title"><span>兑换记录</span></div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>记录ID</th><th>玩家ID</th><th>兑换码</th><th>奖励</th><th>兑换时间</th></tr></thead>
                        <tbody id="rc-rec-tbody"><tr><td colspan="5" class="empty-tip">加载中...</td></tr></tbody>
                    </table>
                </div>
                <div class="pagination">
                    <span class="pagination-info" id="rc-rec-info">共 0 条</span>
                    <div class="pagination-btns">
                        <button class="btn btn-sm" id="rc-rec-prev">上一页</button>
                        <span class="page-num" id="rc-rec-page">1 / 1</span>
                        <button class="btn btn-sm" id="rc-rec-next">下一页</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    async function loadList() {
        const tbody = document.getElementById('rc-tbody');
        try {
            const data = await api.get('/admin/api/redemption-codes', { page: state.page, size: state.size, keyword: state.keyword });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('rc-info').textContent = '共 ' + total + ' 条';
            document.getElementById('rc-page').textContent = state.page + ' / ' + totalPages;
            if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-tip">暂无数据</td></tr>'; return; }
            tbody.innerHTML = list.map(c => {
                const used = c.usedCount || 0, max = c.maxUses || 0;
                const usedUp = max > 0 && used >= max;
                const expired = c.expiredAt && new Date(c.expiredAt) < new Date();
                const disabled = usedUp || expired;
                return `
                <tr>
                    <td style="font-family:monospace;">${escHtml(c.code)}</td>
                    <td style="font-size:12px;">${escHtml(typeof c.rewardJson === 'object' ? JSON.stringify(c.rewardJson) : (c.rewardJson || '--'))}</td>
                    <td>${used} / ${max || '∞'}</td>
                    <td>${fmtTime(c.expiredAt)}</td>
                    <td>${disabled ? '<span class="badge badge-info">已失效</span>' : '<span class="badge badge-ok">可用</span>'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="AdminPages.redemption.remove('${c.code}')">作废</button></td>
                </tr>`;
            }).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function loadRecords() {
        const tbody = document.getElementById('rc-rec-tbody');
        try {
            const data = await api.get('/admin/api/redemption-codes/records', { page: state.recPage, size: state.size });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('rc-rec-info').textContent = '共 ' + total + ' 条';
            document.getElementById('rc-rec-page').textContent = state.recPage + ' / ' + totalPages;
            if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-tip">暂无数据</td></tr>'; return; }
            tbody.innerHTML = list.map(r => `
                <tr>
                    <td>${escHtml(r.id)}</td>
                    <td>${escHtml(r.playerId)}</td>
                    <td style="font-family:monospace;">${escHtml(r.code)}</td>
                    <td style="font-size:12px;">${escHtml(typeof r.reward === 'object' ? JSON.stringify(r.reward) : (r.reward || '--'))}</td>
                    <td>${fmtTime(r.redeemTime || r.createdAt)}</td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function generate() {
        const prefix = document.getElementById('rc-prefix').value.trim();
        const count = Number(document.getElementById('rc-count').value) || 10;
        const maxUses = Number(document.getElementById('rc-maxUses').value) || 1;
        const expiredAt = document.getElementById('rc-expired').value;
        const rewardStr = document.getElementById('rc-reward').value.trim();
        if (!prefix) { toast('请填写前缀', 'error'); return; }
        if (!rewardStr) { toast('请填写奖励 JSON', 'error'); return; }
        let rewardJson;
        try { rewardJson = JSON.parse(rewardStr); }
        catch (e) { toast('奖励 JSON 格式错误', 'error'); return; }
        try {
            await api.post('/admin/api/redemption-codes', {
                codePrefix: prefix, count, rewardJson, expiredAt, maxUses
            });
            toast('已生成 ' + count + ' 个兑换码', 'success');
            loadList();
        } catch (e) { toast(e.message, 'error'); }
    }

    async function remove(code) {
        if (!confirm('确认作废兑换码 ' + code + ' ？')) return;
        try { await api.del('/admin/api/redemption-codes/' + encodeURIComponent(code)); toast('已作废', 'success'); loadList(); }
        catch (e) { toast(e.message, 'error'); }
    }

    window.AdminPages.redemption = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.querySelectorAll('#' + PAGE_ID + ' .tab').forEach(t => {
                t.onclick = () => {
                    document.querySelectorAll('#' + PAGE_ID + ' .tab').forEach(x => x.classList.remove('active'));
                    document.querySelectorAll('#' + PAGE_ID + ' .tab-pane').forEach(x => x.classList.remove('active'));
                    t.classList.add('active');
                    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
                    if (t.dataset.tab === 'records') loadRecords();
                };
            });
            document.getElementById('rc-gen').onclick = generate;
            document.getElementById('rc-search').onclick = () => {
                state.keyword = document.getElementById('rc-keyword').value.trim();
                state.page = 1; loadList();
            };
            document.getElementById('rc-prev').onclick = () => { if (state.page > 1) { state.page--; loadList(); } };
            document.getElementById('rc-next').onclick = () => { state.page++; loadList(); };
            document.getElementById('rc-rec-prev').onclick = () => { if (state.recPage > 1) { state.recPage--; loadRecords(); } };
            document.getElementById('rc-rec-next').onclick = () => { state.recPage++; loadRecords(); };
            loadList();
        },
        onShow() {}, remove
    };
})();
