/* ========== 邮件管理页面 ========== */
(function () {
    const PAGE_ID = 'page-mail';
    const state = { page: 1, size: 15 };

    const HTML = `
        <div class="panel">
            <div class="panel-title"><span>✉️ 发送新邮件</span></div>
            <div class="form-row">
                <div class="form-group" style="width:220px;"><label>收件人玩家ID（留空=全服）</label><input type="text" id="ml-playerId" placeholder="留空发送全服"></div>
                <div class="form-group" style="flex:1;"><label>邮件标题</label><input type="text" id="ml-title" placeholder="请输入标题"></div>
            </div>
            <div class="form-group" style="margin-bottom:14px;"><label>邮件内容</label><textarea id="ml-content" rows="3" placeholder="请输入邮件内容"></textarea></div>
            <div class="form-group" style="margin-bottom:14px;"><label>附件（JSON，如 {&quot;coins&quot;:10000}）</label><textarea id="ml-attach" rows="2" placeholder='{"coins":10000,"diamonds":10}'></textarea></div>
            <button class="btn btn-gold" id="ml-send">发送邮件</button>
        </div>

        <div class="panel">
            <div class="panel-title"><span>已发送邮件</span></div>
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr><th>邮件ID</th><th>标题</th><th>收件人</th><th>发送者</th><th>发送时间</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody id="ml-tbody"><tr><td colspan="7" class="empty-tip">加载中...</td></tr></tbody>
                </table>
            </div>
            <div class="pagination">
                <span class="pagination-info" id="ml-info">共 0 条</span>
                <div class="pagination-btns">
                    <button class="btn btn-sm" id="ml-prev">上一页</button>
                    <span class="page-num" id="ml-page">1 / 1</span>
                    <button class="btn btn-sm" id="ml-next">下一页</button>
                </div>
            </div>
        </div>

        <div class="modal-mask" id="md-ml"><div class="modal">
            <div class="modal-title"><span>邮件详情</span><span class="modal-close" onclick="closeModal('md-ml')">×</span></div>
            <div id="md-ml-body"></div>
        </div></div>
    `;

    async function loadList() {
        const tbody = document.getElementById('ml-tbody');
        try {
            const data = await api.get('/admin/api/mail/list', { page: state.page, size: state.size });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('ml-info').textContent = '共 ' + total + ' 条';
            document.getElementById('ml-page').textContent = state.page + ' / ' + totalPages;
            if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-tip">暂无数据</td></tr>'; return; }
            tbody.innerHTML = list.map(m => `
                <tr>
                    <td>${escHtml(m.mailId || m.id)}</td>
                    <td class="link" onclick="AdminPages.mail.detail('${m.mailId || m.id}')">${escHtml(m.title)}</td>
                    <td>${m.playerId ? escHtml(m.playerId) : '<span class="badge badge-info">全服</span>'}</td>
                    <td>${escHtml(m.sender || m.senderName || '--')}</td>
                    <td>${fmtTime(m.sendTime || m.createdAt)}</td>
                    <td><span class="badge badge-ok">已发送</span></td>
                    <td><button class="btn btn-sm" onclick="AdminPages.mail.detail('${m.mailId || m.id}')">查看</button></td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    async function detail(id) {
        openModal('md-ml');
        document.getElementById('md-ml-body').innerHTML = '<div class="empty-tip">加载中...</div>';
        try {
            const d = await api.get('/admin/api/mail/' + id);
            const attach = safeParseJson(d.attachments);
            document.getElementById('md-ml-body').innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item" style="grid-column:1/-1;"><span class="k">标题</span><span class="v">${escHtml(d.title)}</span></div>
                    <div class="detail-item"><span class="k">收件人</span><span class="v">${d.playerId ? escHtml(d.playerId) : '全服'}</span></div>
                    <div class="detail-item"><span class="k">发送时间</span><span class="v">${fmtTime(d.sendTime || d.createdAt)}</span></div>
                </div>
                <div class="detail-section">内容</div>
                <div style="background:rgba(54,224,232,0.06);padding:12px;border-radius:8px;white-space:pre-wrap;color:#dce8f5;">${escHtml(d.content)}</div>
                <div class="detail-section">附件</div>
                <div style="color:#dce8f5;">${attach ? escHtml(JSON.stringify(attach, null, 2)) : '无'}</div>`;
        } catch (e) {
            document.getElementById('md-ml-body').innerHTML = '<div class="empty-tip">加载失败：' + escHtml(e.message) + '</div>';
        }
    }

    async function send() {
        const playerId = document.getElementById('ml-playerId').value.trim();
        const title = document.getElementById('ml-title').value.trim();
        const content = document.getElementById('ml-content').value;
        const attachStr = document.getElementById('ml-attach').value.trim();
        if (!title || !content) { toast('请填写标题和内容', 'error'); return; }
        let attachments = null;
        if (attachStr) {
            try { attachments = JSON.parse(attachStr); }
            catch (e) { toast('附件 JSON 格式错误', 'error'); return; }
        }
        try {
            await api.post('/admin/api/mail/send', { playerId: playerId || '', title, content, attachments });
            toast('邮件发送成功', 'success');
            document.getElementById('ml-title').value = '';
            document.getElementById('ml-content').value = '';
            document.getElementById('ml-attach').value = '';
            loadList();
        } catch (e) { toast(e.message, 'error'); }
    }

    window.AdminPages.mail = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.getElementById('ml-send').onclick = send;
            document.getElementById('ml-prev').onclick = () => { if (state.page > 1) { state.page--; loadList(); } };
            document.getElementById('ml-next').onclick = () => { state.page++; loadList(); };
            loadList();
        },
        onShow() {}, detail
    };
})();
