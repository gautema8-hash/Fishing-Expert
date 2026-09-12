/* ========== 主框架：认证检查 / 导航 / 退出 ========== */
window.AdminPages = window.AdminPages || {};
const App = {
    currentPage: 'dashboard',
    inited: {},
    adminInfo: null,

    async init() {
        // 1. 认证检查
        if (!api.getToken()) { location.href = 'login.html'; return; }
        try {
            const info = await api.get('/admin/auth/info');
            this.adminInfo = info;
            const name = (info && (info.realName || info.username)) || '管理员';
            document.getElementById('adminName').textContent = '👤 ' + name;
        } catch (e) {
            toast('登录已失效，请重新登录', 'error');
            setTimeout(() => { location.href = 'login.html'; }, 800);
            return;
        }

        // 2. 导航事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.switchPage(item.dataset.page));
        });

        // 3. 退出登录
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try { await api.post('/admin/auth/logout', {}); } catch (e) {}
            api.clearToken();
            location.href = 'login.html';
        });

        // 4. 时钟
        this._tick();
        setInterval(() => this._tick(), 1000);

        // 5. 默认进入仪表盘
        this.switchPage('dashboard');
    },

    _tick() {
        const el = document.getElementById('currentTime');
        if (el) el.textContent = new Date().toLocaleString('zh-CN', { hour12: false });
    },

    switchPage(name) {
        this.currentPage = name;
        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.page === name);
        });
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById('page-' + name);
        if (pageEl) pageEl.classList.add('active');

        const mod = window.AdminPages[name];
        if (mod) {
            if (!this.inited[name] && typeof mod.init === 'function') {
                mod.init();
                this.inited[name] = true;
            }
            if (typeof mod.onShow === 'function') mod.onShow();
        }
        window.dispatchEvent(new Event('resize'));
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
