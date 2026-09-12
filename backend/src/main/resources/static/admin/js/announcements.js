/* ========== 公告管理页面 ========== */
(function () {
    const PAGE_ID = 'page-announcements';
    const state = { page: 1, size: 15, editingId: null };

    const TYPE_MAP = { notice: '通知', activity: '活动', maintenance: '维护' };
    function typeBadge(t) {
        const cls = { notice: 'badge-info', activity: 'badge-ok', maintenance: 'badge-warn' };
        return '<span class="badge ' + (cls[t] || 'badge-info') + '">' + (TYPE_MAP[t] || escHtml(t)) + '</span>';
    }

    const HTML = `
        <div class="panel">
            <div class="panel-title">
                <span>公告列表</span>
                <button class="btn btn-gold btn-sm" id="an-create">+ 新建公告</button>
            </div>
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr><th>ID</th><th>标题</th><th>类型</th><th>优先级</th><th>状态</th><th>时间范围</th><th>操作</th></tr></thead>
                    <tbody id="an-tbody"><tr><td colspan="7" class="empty-tip">加载中...</td></tr></tbody>
                </table>
            </div>
            <div class="pagination">
                <span class="pagination-info" id="an-info">共 0 条</span>
                <div class="pagination-btns">
                    <button class="btn btn-sm" id="an-prev">上一页</button>
                    <span class="page-num" id="an-page">1 / 1</span>
                    <button class="btn btn-sm" id="an-next">下一页</button>
                </div>
            </div>
        </div>

        <div class="modal-mask" id="md-an"><div class="modal">
            <div class="modal-title"><span id="md-an-title">新建公告</span><span class="modal-close" onclick="closeModal('md-an')">×</span></div>
            <div class="form-group"><label>标题</label><input type="text" id="anf-title"></div>
            <div class="form-group"><label>内容</label><textarea id="anf-content" rows="4"></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>类型</label>
                    <select id="anf-type"><option value="notice">通知</option><option value="activity">活动</option><option value="maintenance">维护</option></select>
                </div>
                <div class="form-group"><label>优先级</label>
                    <select id="anf-priority"><option value="1">低</option><option value="2">中</option><option value="3">高</option></select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>开始时间</label><input type="datetime-local" id="anf-start"></div>
                <div class="form-group"><label>结束时间</label><input type="datetime-local" id="anf-end"></div>
            </div>
            <div class="modal-actions"><button class="btn" onclick="closeModal('md-an')">取消</button><button class="btn btn-gold" id="anf-save">保存</button></div>
        </div></div>
    `;

    async function loadList() {
        const tbody = document.getElementById('an-tbody');
        try {
            const data = await api.get('/admin/api/announcements', { page: state.page, size: state.size });
            const list = data.list || [];
            const total = data.total || 0;
            const totalPages = Math.max(1, Math.ceil(total / state.size));
            document.getElementById('an-info').textContent = '共 ' + total + ' 条';
            document.getElementById('an-page').textContent = state.page + ' / ' + totalPages;
            if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-tip">暂无数据</td></tr>'; return; }
            tbody.innerHTML = list.map(a => {
                const online = a.status === 1 || a.status === '1' || a.online === true;
                return `
                <tr>
                    <td>${escHtml(a.id)}</td>
                    <td>${escHtml(a.title)}</td>
                    <td>${typeBadge(a.type)}</td>
                    <td>${fmtNum(a.priority)}</td>
                    <td>${online ? '<span class="badge badge-ok">上架</span>' : '<span class="badge badge-info">下架</span>'}</td>
                    <td style="font-size:12px;">${fmtTime(a.startTime)}<br>~ ${fmtTime(a.endTime)}</td>
                    <td><div class="act-group">
                        <button class="btn btn-sm" onclick="AdminPages.announcements.openEdit('${a.id}')">编辑</button>
                        <button class="btn btn-sm btn-gold" onclick="AdminPages.announcements.toggle('${a.id}')">${online ? '下架' : '上架'}</button>
                        <button class="btn btn-sm btn-danger" onclick="AdminPages.announcements.remove('${a.id}')">删除</button>
                    </div></td>
                </tr>`;
            }).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-tip">加载失败：' + escHtml(e.message) + '</td></tr>';
        }
    }

    function openCreate() {
        state.editingId = null;
        document.getElementById('md-an-title').textContent = '新建公告';
        document.getElementById('anf-title').value = '';
        document.getElementById('anf-content').value = '';
        document.getElementById('anf-type').value = 'notice';
        document.getElementById('anf-priority').value = '2';
        document.getElementById('anf-start').value = '';
        document.getElementById('anf-end').value = '';
        openModal('md-an');
    }

    async function openEdit(id) {
        try {
            const list = (await api.get('/admin/api/announcements', { page: 1, size: 100 })).list || [];
            const a = list.find(x => String(x.id) === String(id));
            if (!a) { toast('未找到公告', 'error'); return; }
            state.editingId = id;
            document.getElementById('md-an-title').textContent = '编辑公告';
            document.getElementById('anf-title').value = a.title || '';
            document.getElementById('anf-content').value = a.content || '';
            document.getElementById('anf-type').value = a.type || 'notice';
            document.getElementById('anf-priority').value = String(a.priority || 2);
            document.getElementById('anf-start').value = toLocalInput(a.startTime);
            document.getElementById('anf-end').value = toLocalInput(a.endTime);
            openModal('md-an');
        } catch (e) { toast(e.message, 'error'); }
    }

    function toLocalInput(s) {
        if (!s) return '';
        const d = new Date(typeof s === 'string' ? s.replace(' ', 'T') : s);
        if (isNaN(d)) return '';
        const pad = n => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' +
               pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    async function save() {
        const body = {
            title: document.getElementById('anf-title').value.trim(),
            content: document.getElementById('anf-content').value,
            type: document.getElementById('anf-type').value,
            priority: Number(document.getElementById('anf-priority').value),
            startTime: document.getElementById('anf-start').value,
            endTime: document.getElementById('anf-end').value
        };
        if (!body.title || !body.content) { toast('请填写标题和内容', 'error'); return; }
        try {
            if (state.editingId) {
                await api.put('/admin/api/announcements/' + state.editingId, body);
            } else {
                await api.post('/admin/api/announcements', body);
            }
            toast('保存成功', 'success'); closeModal('md-an'); loadList();
        } catch (e) { toast(e.message, 'error'); }
    }

    async function toggle(id) {
        try { await api.post('/admin/api/announcements/' + id + '/toggle', {}); toast('状态已切换', 'success'); loadList(); }
        catch (e) { toast(e.message, 'error'); }
    }
    async function remove(id) {
        if (!confirm('确认删除该公告？此操作不可恢复。')) return;
        try { await api.del('/admin/api/announcements/' + id); toast('已删除', 'success'); loadList(); }
        catch (e) { toast(e.message, 'error'); }
    }

    window.AdminPages.announcements = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            document.getElementById('an-create').onclick = openCreate;
            document.getElementById('anf-save').onclick = save;
            document.getElementById('an-prev').onclick = () => { if (state.page > 1) { state.page--; loadList(); } };
            document.getElementById('an-next').onclick = () => { state.page++; loadList(); };
            loadList();
        },
        onShow() {}, openEdit, toggle, remove
    };
})();
