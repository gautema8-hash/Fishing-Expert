/* ========== API 封装 + 通用工具 ========== */
const API_BASE = '/api';
const TOKEN_KEY = 'admin_token';

const api = {
    getToken() { return localStorage.getItem(TOKEN_KEY) || ''; },
    setToken(t) { localStorage.setItem(TOKEN_KEY, t); },
    clearToken() { localStorage.removeItem(TOKEN_KEY); },

    _headers(includeBody) {
        const h = { 'Authorization': 'Bearer ' + this.getToken() };
        if (includeBody) h['Content-Type'] = 'application/json';
        return h;
    },

    async _request(method, url, data) {
        const fullUrl = url.startsWith('http') ? url : API_BASE + url;
        const opts = { method, headers: this._headers(data !== undefined) };
        if (data !== undefined) opts.body = JSON.stringify(data);

        let resp;
        try {
            resp = await fetch(fullUrl, opts);
        } catch (e) {
            throw new Error('网络请求失败，请检查后端服务');
        }

        if (resp.status === 401) {
            this.clearToken();
            location.href = 'login.html';
            throw new Error('登录已失效，请重新登录');
        }

        // 导出类接口（文件下载）
        if (resp.headers.get('content-type') && resp.headers.get('content-type').indexOf('application/json') === -1
            && method === 'GET' && /\/export\//.test(url)) {
            return resp.blob();
        }

        let json;
        try { json = await resp.json(); } catch (e) {
            throw new Error('响应解析失败');
        }

        // Result<T>: { code, message, data }
        if (json.code === 0 || json.code === 200 || resp.ok) {
            return json.data !== undefined ? json.data : json;
        }
        if (resp.status === 401) {
            this.clearToken();
            location.href = 'login.html';
        }
        throw new Error(json.message || '请求失败 (code:' + json.code + ')');
    },

    get(url, params) {
        if (params) {
            const qs = new URLSearchParams();
            Object.keys(params).forEach(k => {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') qs.append(k, params[k]);
            });
            const s = qs.toString();
            if (s) url += (url.indexOf('?') >= 0 ? '&' : '?') + s;
        }
        return this._request('GET', url);
    },
    post(url, data) { return this._request('POST', url, data || {}); },
    put(url, data) { return this._request('PUT', url, data || {}); },
    del(url) { return this._request('DELETE', url); }
};

/* ========== Toast 提示 ========== */
function toast(msg, type = 'info', duration = 2200) {
    let el = document.getElementById('toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'show ' + type;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = ''; }, duration);
}

/* ========== 通用工具函数 ========== */
function fmtNum(n) {
    if (n === null || n === undefined) return '--';
    return Number(n).toLocaleString();
}
function fmtMoney(n) {
    if (n === null || n === undefined) return '--';
    return '¥' + Number(n).toLocaleString();
}
function fmtTime(s) {
    if (!s) return '--';
    if (typeof s === 'number') {
        const d = new Date(s);
        return isNaN(d) ? s : d.toLocaleString('zh-CN', { hour12: false });
    }
    // 后端可能返回 "2026-09-12 10:00:00"
    return String(s).replace('T', ' ').replace(/\.\d+$/, '');
}
function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
/* JSON 安全解析 */
function safeParseJson(s) {
    if (!s) return null;
    if (typeof s === 'object') return s;
    try { return JSON.parse(s); } catch (e) { return s; }
}
/* 打开/关闭弹窗 */
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
/* 点击遮罩关闭 */
document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal-mask')) {
        e.target.classList.remove('show');
    }
});
