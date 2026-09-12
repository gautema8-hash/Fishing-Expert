/* ========== 操作日志页面 ========== */
(function () {
    const PAGE_ID = 'page-logs';
    const state = { page: 1, size: 15, adminId: '', module: '' };

    const HTML = `
        <div class="toolbar">
            <input type="text" id="lg-adminId" placeholder="管理员ID" style="width:160px;">
            <select id="lg-module">
                <option value="">全部模块</option>
                <option value="player">玩家</option>
                <option value="order">订单</option>
                <option value="mail">邮件</option>
                <option value="announcement">公告</option>
                <option value="redemption">兑换码</option>
                <option value="config">配置</option>
                <option value="auth">认证</option>
            </select>
            <button class="btn" id="lg-search">搜索</button>
        </div>

        <div class="panel">
            <div class="panel-title"><span>操作日志</span></div>
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr><th>时间</th><th>管理员</th><th>操作</th><th>模块</th><th>目标ID</th><th>IP</th><th>结果</th><th>操作</th></tr></thead>
                    <tbody id="lg-tbody"><tr><td colspan="8" class="empty-tip">加载中...</td></tr></tbody>
                </table>
            </div>
            <div class="pagination">
                <span class="pagination-info" id="lg-info">共 0 条</span>
                <div class="pagination-btns">
                    <button class="btn btn-sm" id="lg-prev">上一页</button>
                    <span class="page-num" id="lg-page">1 / 1</span>
                    <button class="btn btn-sm" id="lg-next">下一页</button>
                </div>
            </div>
        </div>

        <div class="modal-mask" id="md-lg"><div class="modal">
            <div class="modal-title"><span>日志详情</span><span class="modal-close" onclick="closeModal('md-lg')">×</span></div>
            <div id="md-lg-body"></div>
        </div></div>
    `;

    async function loadList() {
        const tbody = document.getElementById('lg-tbody');
        try {
            const data = await api.get('/admin/api/operation-logs', {
                page: state.page, size: state.size,
                adminId: state.adminId, module: state.module
            });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('lg-info').textContent = '共 ' + total + ' 条';
            document.getElementById('lg-page').textContent = state.page + ' / ' + totalPages;
            if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-tip">暂无数据</td></tr>'; return; }
            tbody.innerHTML = list.map(l => `
                <tr>
                    <td>${fmtTime(l.operateTime || l.createdAt)}</td>
                    <td>${escHtml(l.adminName || l.adminId || '--')}</td>
                    <td>${escHtml(l.action || l.operation)}</td>
                    <td><span class="badge badge-info">${escHtml(l.module)}</span></td>
                    <td>${escHtml(l.targetId || '--')}</td>
                    <td>${escHtml(l.ip || '--')}</td>
                    <td>${l.success === false || l.result === 'FAIL' ? '<span class="badge badge-err">失败</span>' : '<span class="badge badge-ok">成功</span>'}</td>
                    <td><button class="btn btn-sm" onclick="AdminPages.logs.detail('${l.id}')">详情</button></td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function detail(id) {
        openModal('md-lg');
        document.getElementById('md-lg-body').innerHTML = '<div class="empty-tip">加载中...</div>';
        try {
            const d = await api.get('/admin/api/operation-logs/' + id);
            const params = safeParseJson(d.paramsJson);
            document.getElementById('md-lg-body').innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item"><span class="k">管理员</span><span class="v">${escHtml(d.adminName || d.adminId)}</span></div>
                    <div class="detail-item"><span class="k">操作</span><span class="v">${escHtml(d.action || d.operation)}</span></div>
                    <div class="detail-item"><span class="k">模块</span><span class="v">${escHtml(d.module)}</span></div>
                    <div class="detail-item"><span class="k">目标ID</span><span class="v">${escHtml(d.targetId || '--')}</span></div>
                    <div class="detail-item"><span class="k">IP</span><span class="v">${escHtml(d.ip || '--')}</span></div>
                    <div class="detail-item"><span class="k">时间</span><span class="v">${fmtTime(d.operateTime || d.createdAt)}</span></div>
                </div>
                <div class="detail-section">请求参数</div>
                <div style="background:rgba(54,224,232,0.06);padding:12px;border-radius:8px;white-space:pre-wrap;color:#dce8f5;font-size:12px;">${params ? escHtml(JSON.stringify(params, null, 2)) : escHtml(d.paramsJson || '无')}</div>`;
        } catch (e) {
            document.getElementById('md-lg-body').innerHTML = '<div class="empty-tip">加载失败：' + escHtml(e.message) + '</div>';
        }
    }

    window.AdminPages.logs = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.getElementById('lg-search').onclick = () => {
                state.adminId = document.getElementById('lg-adminId').value.trim();
                state.module = document.getElementById('lg-module').value;
                state.page = 1; loadList();
            };
            document.getElementById('lg-prev').onclick = () => { if (state.page > 1) { state.page--; loadList(); } };
            document.getElementById('lg-next').onclick = () => { state.page++; loadList(); };
            loadList();
        },
        onShow() {}, detail
    };
})();
