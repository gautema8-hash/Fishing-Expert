/* ========== 订单管理页面 ========== */
(function () {
    const PAGE_ID = 'page-orders';
    const state = { page: 1, size: 15, status: '', playerId: '', currentId: null };

    const STATUS_MAP = {
        1: ['待支付', 'badge-warn'],
        2: ['已支付', 'badge-ok'],
        3: ['已发货', 'badge-info'],
        4: ['已取消', 'badge-info'],
        5: ['已退款', 'badge-err']
    };
    function statusBadge(s) {
        const m = STATUS_MAP[s] || STATUS_MAP[String(s)];
        if (!m) return '<span class="badge badge-info">' + escHtml(s) + '</span>';
        return '<span class="badge ' + m[1] + '">' + m[0] + '</span>';
    }

    const HTML = `
        <div class="toolbar">
            <input type="text" id="od-playerId" placeholder="玩家ID" style="width:180px;">
            <select id="od-status">
                <option value="">全部状态</option>
                <option value="1">待支付</option>
                <option value="2">已支付</option>
                <option value="3">已发货</option>
                <option value="4">已取消</option>
                <option value="5">已退款</option>
            </select>
            <button class="btn" id="od-search">搜索</button>
            <button class="btn btn-gold" id="od-export">导出 Excel</button>
        </div>

        <div class="panel">
            <div class="panel-title"><span>订单列表</span></div>
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr>
                        <th>订单号</th><th>玩家ID</th><th>商品名称</th><th>金额</th>
                        <th>支付方式</th><th>状态</th><th>支付时间</th><th>操作</th>
                    </tr></thead>
                    <tbody id="od-tbody"><tr><td colspan="8" class="empty-tip">加载中...</td></tr></tbody>
                </table>
            </div>
            <div class="pagination">
                <span class="pagination-info" id="od-info">共 0 条</span>
                <div class="pagination-btns">
                    <button class="btn btn-sm" id="od-prev">上一页</button>
                    <span class="page-num" id="od-page">1 / 1</span>
                    <button class="btn btn-sm" id="od-next">下一页</button>
                </div>
            </div>
        </div>

        <div class="modal-mask" id="md-od-detail"><div class="modal modal-lg">
            <div class="modal-title"><span>订单详情</span><span class="modal-close" onclick="closeModal('md-od-detail')">×</span></div>
            <div id="md-od-body"></div>
        </div></div>

        <div class="modal-mask" id="md-refund"><div class="modal">
            <div class="modal-title"><span>订单退款</span><span class="modal-close" onclick="closeModal('md-refund')">×</span></div>
            <div class="form-group"><label>退款原因</label><textarea id="refund-reason" rows="3" placeholder="请输入退款原因"></textarea></div>
            <div class="modal-actions"><button class="btn" onclick="closeModal('md-refund')">取消</button><button class="btn btn-danger" id="refund-confirm">确认退款</button></div>
        </div></div>
    `;

    async function loadList() {
        const tbody = document.getElementById('od-tbody');
        try {
            const data = await api.get('/admin/api/orders', {
                page: state.page, size: state.size,
                status: state.status, playerId: state.playerId
            });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('od-info').textContent = '共 ' + total + ' 条';
            document.getElementById('od-page').textContent = state.page + ' / ' + totalPages;
            if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-tip">暂无数据</td></tr>'; return; }
            tbody.innerHTML = list.map(o => `
                <tr>
                    <td class="link" onclick="AdminPages.orders.detail('${o.orderId}')">${escHtml(o.orderId)}</td>
                    <td>${escHtml(o.playerId)}</td>
                    <td>${escHtml(o.productName || '--')}</td>
                    <td>${fmtMoney(o.amount)}</td>
                    <td>${escHtml(o.payChannel || o.payMethod || '--')}</td>
                    <td>${statusBadge(o.status)}</td>
                    <td>${fmtTime(o.payTime || o.createdAt)}</td>
                    <td><div class="act-group">
                        <button class="btn btn-sm" onclick="AdminPages.orders.detail('${o.orderId}')">详情</button>
                        ${(o.status === 2 || o.status === '2') ? `<button class="btn btn-sm btn-danger" onclick="AdminPages.orders.openRefund('${o.orderId}')">退款</button>` : ''}
                    </div></td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function detail(id) {
        openModal('md-od-detail');
        document.getElementById('md-od-body').innerHTML = '<div class="empty-tip">加载中...</div>';
        try {
            const d = await api.get('/admin/api/orders/' + id);
            document.getElementById('md-od-body').innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item"><span class="k">订单号</span><span class="v">${escHtml(d.orderId || id)}</span></div>
                    <div class="detail-item"><span class="k">玩家ID</span><span class="v">${escHtml(d.playerId)}</span></div>
                    <div class="detail-item"><span class="k">商品</span><span class="v">${escHtml(d.productName)}</span></div>
                    <div class="detail-item"><span class="k">金额</span><span class="v">${fmtMoney(d.amount)}</span></div>
                    <div class="detail-item"><span class="k">支付方式</span><span class="v">${escHtml(d.payChannel || d.payMethod || '--')}</span></div>
                    <div class="detail-item"><span class="k">状态</span><span class="v">${statusBadge(d.status)}</span></div>
                    <div class="detail-item"><span class="k">创建时间</span><span class="v">${fmtTime(d.createdAt)}</span></div>
                    <div class="detail-item"><span class="k">支付时间</span><span class="v">${fmtTime(d.payTime)}</span></div>
                </div>`;
        } catch (e) {
            document.getElementById('md-od-body').innerHTML = '<div class="empty-tip">加载失败：' + escHtml(e.message) + '</div>';
        }
    }

    function openRefund(id) { state.currentId = id; openModal('md-refund'); }
    async function confirmRefund() {
        const reason = document.getElementById('refund-reason').value;
        if (!reason) { toast('请填写退款原因', 'error'); return; }
        try {
            await api.post('/admin/api/orders/' + state.currentId + '/refund', { reason });
            toast('退款已提交', 'success'); closeModal('md-refund'); loadList();
        } catch (e) { toast(e.message, 'error'); }
    }

    async function exportOrders() {
        try {
            const blob = await api.get('/admin/api/export/orders');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'orders.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { toast('导出失败：' + e.message, 'error'); }
    }

    window.AdminPages.orders = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.getElementById('od-search').onclick = () => {
                state.playerId = document.getElementById('od-playerId').value.trim();
                state.status = document.getElementById('od-status').value;
                state.page = 1; loadList();
            };
            document.getElementById('od-prev').onclick = () => { if (state.page > 1) { state.page--; loadList(); } };
            document.getElementById('od-next').onclick = () => { state.page++; loadList(); };
            document.getElementById('od-export').onclick = exportOrders;
            document.getElementById('refund-confirm').onclick = confirmRefund;
            loadList();
        },
        onShow() {}, detail, openRefund
    };
})();
