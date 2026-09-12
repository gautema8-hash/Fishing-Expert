/* ========== 玩家管理页面 ========== */
(function () {
    const PAGE_ID = 'page-players';
    const state = { page: 1, size: 15, keyword: '', status: '', currentId: null };

    const HTML = `
        <div class="toolbar">
            <input type="text" id="pl-keyword" placeholder="玩家ID / 昵称 / 手机号" style="width:240px;">
            <select id="pl-status">
                <option value="">全部状态</option>
                <option value="1">正常</option>
                <option value="2">封禁</option>
                <option value="0">注销</option>
            </select>
            <button class="btn" id="pl-search">搜索</button>
            <button class="btn btn-gold" id="pl-export">导出 Excel</button>
        </div>

        <div class="panel">
            <div class="panel-title"><span>玩家列表</span></div>
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr>
                        <th>玩家ID</th><th>昵称</th><th>等级</th><th>金币</th><th>钻石</th>
                        <th>VIP</th><th>状态</th><th>注册时间</th><th>操作</th>
                    </tr></thead>
                    <tbody id="pl-tbody"><tr><td colspan="9" class="empty-tip">加载中...</td></tr></tbody>
                </table>
            </div>
            <div class="pagination">
                <span class="pagination-info" id="pl-info">共 0 条</span>
                <div class="pagination-btns">
                    <button class="btn btn-sm" id="pl-prev">上一页</button>
                    <span class="page-num" id="pl-page">1 / 1</span>
                    <button class="btn btn-sm" id="pl-next">下一页</button>
                </div>
            </div>
        </div>

        <!-- 详情弹窗 -->
        <div class="modal-mask" id="md-detail"><div class="modal modal-lg">
            <div class="modal-title"><span>玩家详情</span><span class="modal-close" onclick="closeModal('md-detail')">×</span></div>
            <div id="md-detail-body"></div>
        </div></div>

        <!-- 封禁弹窗 -->
        <div class="modal-mask" id="md-ban"><div class="modal">
            <div class="modal-title"><span>封禁玩家</span><span class="modal-close" onclick="closeModal('md-ban')">×</span></div>
            <div class="form-group"><label>封禁时长（小时，0=永久）</label><input type="number" id="ban-hours" value="24"></div>
            <div class="form-group"><label>封禁原因</label><textarea id="ban-reason" rows="3" placeholder="请输入封禁原因"></textarea></div>
            <div class="modal-actions"><button class="btn" onclick="closeModal('md-ban')">取消</button><button class="btn btn-danger" id="ban-confirm">确认封禁</button></div>
        </div></div>

        <!-- 调整资源弹窗 -->
        <div class="modal-mask" id="md-adjust"><div class="modal">
            <div class="modal-title" id="md-adjust-title"><span>调整资源</span><span class="modal-close" onclick="closeModal('md-adjust')">×</span></div>
            <div class="form-group"><label>调整数量（正=增加，负=扣除）</label><input type="number" id="adj-amount"></div>
            <div class="form-group"><label>操作原因</label><textarea id="adj-reason" rows="3" placeholder="请填写操作原因，将记录到日志"></textarea></div>
            <div class="modal-actions"><button class="btn" onclick="closeModal('md-adjust')">取消</button><button class="btn btn-gold" id="adj-confirm">确认</button></div>
        </div></div>

        <!-- 发邮件弹窗 -->
        <div class="modal-mask" id="md-mail"><div class="modal">
            <div class="modal-title"><span>发送邮件</span><span class="modal-close" onclick="closeModal('md-mail')">×</span></div>
            <div class="form-group"><label>邮件标题</label><input type="text" id="mail-title"></div>
            <div class="form-group"><label>邮件内容</label><textarea id="mail-content" rows="4"></textarea></div>
            <div class="form-group"><label>附件（JSON，如 {&quot;coins&quot;:10000}）</label><textarea id="mail-attach" rows="2" placeholder='{"coins":10000,"diamonds":10}'></textarea></div>
            <div class="modal-actions"><button class="btn" onclick="closeModal('md-mail')">取消</button><button class="btn btn-gold" id="mail-confirm">发送</button></div>
        </div></div>
    `;

    function statusBadge(s) {
        if (s === 1 || s === '1') return '<span class="badge badge-ok">正常</span>';
        if (s === 2 || s === '2') return '<span class="badge badge-err">封禁</span>';
        if (s === 0 || s === '0') return '<span class="badge badge-info">注销</span>';
        return '<span class="badge badge-warn">' + escHtml(s) + '</span>';
    }

    async function loadList() {
        const tbody = document.getElementById('pl-tbody');
        try {
            const data = await api.get('/admin/api/players', {
                page: state.page, size: state.size,
                keyword: state.keyword, status: state.status
            });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('pl-info').textContent = '共 ' + total + ' 条';
            document.getElementById('pl-page').textContent = state.page + ' / ' + totalPages;

            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-tip">暂无数据</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(p => `
                <tr>
                    <td class="link" onclick="AdminPages.players.detail('${p.playerId}')">${escHtml(p.playerId)}</td>
                    <td>${escHtml(p.nickname || '--')}</td>
                    <td>${fmtNum(p.level)}</td>
                    <td>${fmtNum(p.coins)}</td>
                    <td>${fmtNum(p.diamonds)}</td>
                    <td>VIP${fmtNum(p.vipLevel)}</td>
                    <td>${statusBadge(p.status)}</td>
                    <td>${fmtTime(p.registerTime || p.createdAt)}</td>
                    <td><div class="act-group">
                        <button class="btn btn-sm" onclick="AdminPages.players.detail('${p.playerId}')">详情</button>
                        <button class="btn btn-sm btn-gold" onclick="AdminPages.players.openAdjust('${p.playerId}','coins')">调金币</button>
                        <button class="btn btn-sm btn-gold" onclick="AdminPages.players.openAdjust('${p.playerId}','diamonds')">调钻石</button>
                        <button class="btn btn-sm" onclick="AdminPages.players.openMail('${p.playerId}')">发邮件</button>
                        ${(p.status === 2 || p.status === '2')
                            ? `<button class="btn btn-sm" onclick="AdminPages.players.unban('${p.playerId}')">解封</button>`
                            : `<button class="btn btn-sm btn-danger" onclick="AdminPages.players.openBan('${p.playerId}')">封禁</button>`}
                    </div></td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function detail(id) {
        openModal('md-detail');
        document.getElementById('md-detail-body').innerHTML = '<div class="empty-tip">加载中...</div>';
        try {
            const d = await api.get('/admin/api/players/' + id);
            const base = d.basicInfo || d;
            const game = d.gameData || {};
            const recharge = d.rechargeRecords || [];
            const logs = d.loginRecords || [];
            document.getElementById('md-detail-body').innerHTML = `
                <div class="detail-section">基本信息</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="k">玩家ID</span><span class="v">${escHtml(base.playerId || id)}</span></div>
                    <div class="detail-item"><span class="k">昵称</span><span class="v">${escHtml(base.nickname || '--')}</span></div>
                    <div class="detail-item"><span class="k">等级</span><span class="v">${fmtNum(base.level)}</span></div>
                    <div class="detail-item"><span class="k">金币</span><span class="v">${fmtNum(base.coins)}</span></div>
                    <div class="detail-item"><span class="k">钻石</span><span class="v">${fmtNum(base.diamonds)}</span></div>
                    <div class="detail-item"><span class="k">VIP</span><span class="v">VIP${fmtNum(base.vipLevel)}</span></div>
                    <div class="detail-item"><span class="k">状态</span><span class="v">${statusBadge(base.status)}</span></div>
                    <div class="detail-item"><span class="k">注册时间</span><span class="v">${fmtTime(base.registerTime || base.createdAt)}</span></div>
                </div>
                <div class="detail-section">游戏数据</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="k">总击杀</span><span class="v">${fmtNum(game.totalKills)}</span></div>
                    <div class="detail-item"><span class="k">总发射</span><span class="v">${fmtNum(game.totalBullets)}</span></div>
                    <div class="detail-item"><span class="k">命中率</span><span class="v">${game.avgHitRate != null ? (game.avgHitRate * 100).toFixed(1) + '%' : '--'}</span></div>
                    <div class="detail-item"><span class="k">暴击率</span><span class="v">${game.avgCritRate != null ? (game.avgCritRate * 100).toFixed(1) + '%' : '--'}</span></div>
                </div>
                <div class="detail-section">充值记录（最近）</div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>订单号</th><th>商品</th><th>金额</th><th>时间</th></tr></thead><tbody>
                    ${recharge.length ? recharge.map(r => `<tr><td>${escHtml(r.orderId)}</td><td>${escHtml(r.productName)}</td><td>${fmtMoney(r.amount)}</td><td>${fmtTime(r.payTime)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-tip">无充值记录</td></tr>'}
                </tbody></table></div>
                <div class="detail-section">最近登录</div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>IP</th><th>设备</th><th>时间</th></tr></thead><tbody>
                    ${logs.length ? logs.map(l => `<tr><td>${escHtml(l.ip)}</td><td>${escHtml(l.device)}</td><td>${fmtTime(l.loginTime)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty-tip">无登录记录</td></tr>'}
                </tbody></table>`;
        } catch (e) {
            document.getElementById('md-detail-body').innerHTML = '<div class="empty-tip">加载失败：' + escHtml(e.message) + '</div>';
        }
    }

    /* ---- 操作 ---- */
    function openBan(id) { state.currentId = id; openModal('md-ban'); }
    async function confirmBan() {
        try {
            await api.post('/admin/api/players/' + state.currentId + '/ban', {
                reason: document.getElementById('ban-reason').value,
                durationHours: Number(document.getElementById('ban-hours').value) || 0
            });
            toast('已封禁', 'success'); closeModal('md-ban'); loadList();
        } catch (e) { toast(e.message, 'error'); }
    }
    async function unban(id) {
        if (!confirm('确认解封该玩家？')) return;
        try { await api.post('/admin/api/players/' + id + '/unban', {}); toast('已解封', 'success'); loadList(); }
        catch (e) { toast(e.message, 'error'); }
    }
    let adjType = 'coins';
    function openAdjust(id, type) {
        state.currentId = id; adjType = type;
        document.getElementById('md-adjust-title').firstChild.textContent = type === 'coins' ? '调整金币' : '调整钻石';
        openModal('md-adjust');
    }
    async function confirmAdjust() {
        const amount = Number(document.getElementById('adj-amount').value);
        const reason = document.getElementById('adj-reason').value;
        if (!amount) { toast('请输入调整数量', 'error'); return; }
        try {
            await api.post('/admin/api/players/' + state.currentId + '/adjust-' + adjType, { amount, reason });
            toast('调整成功', 'success'); closeModal('md-adjust'); loadList();
        } catch (e) { toast(e.message, 'error'); }
    }
    function openMail(id) { state.currentId = id; openModal('md-mail'); }
    async function confirmMail() {
        const title = document.getElementById('mail-title').value.trim();
        const content = document.getElementById('mail-content').value;
        const attachStr = document.getElementById('mail-attach').value.trim();
        if (!title || !content) { toast('请填写标题和内容', 'error'); return; }
        let attachments = null;
        if (attachStr) {
            try { attachments = JSON.parse(attachStr); }
            catch (e) { toast('附件 JSON 格式错误', 'error'); return; }
        }
        try {
            await api.post('/admin/api/players/' + state.currentId + '/send-mail', { title, content, attachments });
            toast('邮件已发送', 'success'); closeModal('md-mail');
        } catch (e) { toast(e.message, 'error'); }
    }

    async function exportPlayers() {
        try {
            const blob = await api.get('/admin/api/export/players');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'players.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { toast('导出失败：' + e.message, 'error'); }
    }

    window.AdminPages.players = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.getElementById('pl-search').onclick = () => {
                state.keyword = document.getElementById('pl-keyword').value.trim();
                state.status = document.getElementById('pl-status').value;
                state.page = 1; loadList();
            };
            document.getElementById('pl-prev').onclick = () => { if (state.page > 1) { state.page--; loadList(); } };
            document.getElementById('pl-next').onclick = () => { state.page++; loadList(); };
            document.getElementById('pl-export').onclick = exportPlayers;
            document.getElementById('ban-confirm').onclick = confirmBan;
            document.getElementById('adj-confirm').onclick = confirmAdjust;
            document.getElementById('mail-confirm').onclick = confirmMail;
            loadList();
        },
        onShow() {},
        detail, openBan, unban, openAdjust, openMail
    };
})();
