/* ========== 仪表盘页面 ========== */
(function () {
    const PAGE_ID = 'page-dashboard';
    const charts = {};
    let overviewTimer = null, onlineTimer = null;

    const HTML = `
        <div class="overview-grid">
            <div class="stat-card"><div class="stat-label">总玩家数</div><div class="stat-value" id="ov-totalPlayers">--</div><div class="stat-sub" id="ov-todayNewPlayers">今日新增 --</div></div>
            <div class="stat-card"><div class="stat-label">在线玩家</div><div class="stat-value" id="ov-onlinePlayers">--</div><div class="stat-sub">实时更新</div></div>
            <div class="stat-card"><div class="stat-label">总充值金额</div><div class="stat-value" id="ov-totalRecharge">--</div><div class="stat-sub" id="ov-rechargeCount">--</div></div>
            <div class="stat-card"><div class="stat-label">今日充值</div><div class="stat-value" id="ov-todayRecharge">--</div><div class="stat-sub" id="ov-todayRechargeCount">今日 -- 笔</div></div>
            <div class="stat-card"><div class="stat-label">今日游戏局数</div><div class="stat-value" id="ov-todayGames">--</div><div class="stat-sub">实时统计</div></div>
            <div class="stat-card"><div class="stat-label">总击杀数</div><div class="stat-value" id="ov-totalKills">--</div><div class="stat-sub">累计统计</div></div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title"><span>📈 近7日活跃玩家趋势</span><span class="refresh-btn btn btn-sm" onclick="AdminPages.dashboard.refreshAll()">刷新</span></div>
                <div class="chart-container" id="ch-active"></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><span>💰 充值金额分布</span></div>
                <div class="chart-container" id="ch-recharge"></div>
            </div>
        </div>

        <div class="charts-grid-3">
            <div class="chart-card"><div class="chart-title"><span>🎮 游戏数据统计</span></div><div class="chart-container" id="ch-game"></div></div>
            <div class="chart-card"><div class="chart-title"><span>🪙 金币收支</span></div><div class="chart-container" id="ch-coin"></div></div>
            <div class="chart-card"><div class="chart-title"><span>🏆 玩家等级分布</span></div><div class="chart-container" id="ch-level"></div></div>
        </div>

        <div class="panel">
            <div class="realtime-title">实时在线玩家 (<span id="onlineCount">0</span>人)</div>
            <div class="online-list" id="onlineList"><div class="empty-tip">正在获取在线玩家数据...</div></div>
        </div>

        <div class="panel">
            <div class="realtime-title" style="color:#36E0E8;">系统状态监控</div>
            <div class="system-status">
                <div class="status-item"><div class="status-icon ok">🗄️</div><div><div class="status-name">PostgreSQL</div><div class="status-value ok" id="ss-db">检查中...</div></div></div>
                <div class="status-item"><div class="status-icon ok">⚡</div><div><div class="status-name">Redis</div><div class="status-value ok" id="ss-redis">检查中...</div></div></div>
                <div class="status-item"><div class="status-icon ok">💾</div><div><div class="status-name">JVM 内存</div><div class="status-value ok" id="ss-jvm">检查中...</div></div></div>
                <div class="status-item"><div class="status-icon ok">🕐</div><div><div class="status-name">服务器时间</div><div class="status-value ok" id="ss-time">--</div></div></div>
            </div>
        </div>
    `;

    const axisStyle = {
        axisLine: { lineStyle: { color: '#36E0E8' } },
        axisLabel: { color: '#88aacc' }
    };
    const splitLine = { lineStyle: { color: 'rgba(54,224,232,0.1)' } };

    function ensureChart(key, domId) {
        if (!charts[key]) {
            charts[key] = echarts.init(document.getElementById(domId));
        }
        return charts[key];
    }

    async function loadOverview() {
        try {
            const d = await api.get('/admin/api/stats/overview');
            document.getElementById('ov-totalPlayers').textContent = fmtNum(d.totalPlayers);
            document.getElementById('ov-todayNewPlayers').textContent = '今日新增 +' + fmtNum(d.todayNewPlayers);
            document.getElementById('ov-onlinePlayers').textContent = fmtNum(d.onlinePlayers);
            document.getElementById('ov-totalRecharge').textContent = fmtMoney(d.totalRecharge);
            document.getElementById('ov-rechargeCount').textContent = '累计充值';
            document.getElementById('ov-todayRecharge').textContent = fmtMoney(d.todayRecharge);
            document.getElementById('ov-todayRechargeCount').textContent = '今日 ' + fmtNum(d.todayRechargeCount) + ' 笔';
            document.getElementById('ov-todayGames').textContent = fmtNum(d.todayGames);
            document.getElementById('ov-totalKills').textContent = fmtNum(d.totalKills);
        } catch (e) { /* 静默 */ }
    }

    async function loadActiveTrend() {
        const list = await api.get('/admin/api/stats/active-trend', { days: 7 });
        const dates = list.map(x => fmtTime(x.date).slice(5, 10) || x.date);
        ensureChart('active', 'ch-active').setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['活跃玩家', '新增玩家'], textStyle: { color: '#88aacc' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: dates, ...axisStyle },
            yAxis: { type: 'value', axisLine: { lineStyle: { color: '#36E0E8' } }, axisLabel: { color: '#88aacc' }, splitLine },
            series: [
                { name: '活跃玩家', type: 'line', smooth: true, data: list.map(x => x.dau),
                  itemStyle: { color: '#36E0E8' },
                  areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(54,224,232,0.4)'},{offset:1,color:'rgba(54,224,232,0)'}]) } },
                { name: '新增玩家', type: 'line', smooth: true, data: list.map(x => x.newPlayers),
                  itemStyle: { color: '#FFD700' },
                  areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(255,215,0,0.4)'},{offset:1,color:'rgba(255,215,0,0)'}]) } }
            ]
        });
    }

    async function loadRechargeDist() {
        const list = await api.get('/admin/api/stats/recharge-distribution');
        const palette = ['#36E0E8', '#5cb85c', '#f0ad4e', '#FFD700', '#d9534f', '#9b59b6'];
        ensureChart('recharge', 'ch-recharge').setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c} (笔) {d}%' },
            legend: { bottom: 0, textStyle: { color: '#88aacc', fontSize: 11 } },
            series: [{
                type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
                itemStyle: { borderRadius: 8, borderColor: '#06223A', borderWidth: 2 },
                label: { show: false },
                data: list.map((x, i) => ({
                    value: x.count, name: x.productName || ('商品' + x.productId),
                    itemStyle: { color: palette[i % palette.length] }
                }))
            }]
        });
    }

    async function loadGameData() {
        const d = await api.get('/admin/api/stats/game-data');
        ensureChart('game', 'ch-game').setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: ['发射子弹', '击杀', '暴击'], ...axisStyle, axisLabel: { color: '#88aacc', fontSize: 11 } },
            yAxis: { type: 'value', axisLine: { lineStyle: { color: '#36E0E8' } }, axisLabel: { color: '#88aacc' }, splitLine },
            series: [{
                type: 'bar', barWidth: '50%',
                data: [
                    { value: d.totalBullets, itemStyle: { color: '#36E0E8' } },
                    { value: d.totalKills, itemStyle: { color: '#FFD700' } },
                    { value: d.totalCrits, itemStyle: { color: '#d9534f' } }
                ],
                itemStyle: { borderRadius: [4, 4, 0, 0] }
            }]
        });
    }

    async function loadCoinFlow() {
        const list = await api.get('/admin/api/stats/coin-flow', { days: 7 });
        const dates = list.map(x => fmtTime(x.date).slice(5, 10) || x.date);
        ensureChart('coin', 'ch-coin').setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['获得', '消耗'], textStyle: { color: '#88aacc' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: dates, ...axisStyle, axisLabel: { color: '#88aacc', fontSize: 10 } },
            yAxis: { type: 'value', axisLine: { lineStyle: { color: '#36E0E8' } }, axisLabel: { color: '#88aacc' }, splitLine },
            series: [
                { name: '获得', type: 'bar', data: list.map(x => x.earned), itemStyle: { color: '#5cb85c' } },
                { name: '消耗', type: 'bar', data: list.map(x => x.spent), itemStyle: { color: '#d9534f' } }
            ]
        });
    }

    async function loadLevelDist() {
        const list = await api.get('/admin/api/stats/level-distribution');
        const palette = ['#36E0E8', '#5cb85c', '#f0ad4e', '#FFD700', '#d9534f', '#9b59b6'];
        ensureChart('level', 'ch-level').setOption({
            tooltip: { trigger: 'item' },
            series: [{
                type: 'pie', radius: '65%', center: ['50%', '50%'],
                itemStyle: { borderRadius: 6, borderColor: '#06223A', borderWidth: 2 },
                label: { color: '#88aacc', fontSize: 11 },
                data: list.map((x, i) => ({
                    value: x.count, name: x.range,
                    itemStyle: { color: palette[i % palette.length] }
                }))
            }]
        });
    }

    async function loadOnline() {
        const list = await api.get('/admin/api/stats/realtime-online');
        document.getElementById('onlineCount').textContent = list.length;
        const box = document.getElementById('onlineList');
        if (!list.length) {
            box.innerHTML = '<div class="empty-tip">当前暂无在线玩家</div>';
            return;
        }
        box.innerHTML = list.map(p => `
            <div class="online-item">
                <div class="online-avatar">${escHtml((p.nickname || '?').charAt(0))}</div>
                <div class="online-info">
                    <div class="online-name">${escHtml(p.nickname || p.playerId)}</div>
                    <div class="online-level">Lv.${fmtNum(p.level)} | ${fmtNum(p.coins)} 金币</div>
                </div>
            </div>`).join('');
    }

    async function loadSystemStatus() {
        const d = await api.get('/admin/api/stats/system-status');
        document.getElementById('ss-db').textContent = d.postgreSQL === 'UP' || d.postgreSQL === true || d.postgreSQL === '正常' ? '正常运行' : (String(d.postgreSQL || '未知'));
        document.getElementById('ss-redis').textContent = d.redis === 'UP' || d.redis === true || d.redis === '正常' ? '正常运行' : (String(d.redis || '未知'));
        if (d.jvm) {
            const used = d.jvm.used || 0, max = d.jvm.max || 0;
            document.getElementById('ss-jvm').textContent =
                (used / 1024 / 1024).toFixed(0) + 'MB / ' + (max / 1024 / 1024).toFixed(0) + 'MB';
        }
        document.getElementById('ss-time').textContent = fmtTime(d.serverTime);
    }

    async function refreshAll() {
        await Promise.allSettled([
            loadOverview(), loadActiveTrend(), loadRechargeDist(),
            loadGameData(), loadCoinFlow(), loadLevelDist(),
            loadOnline(), loadSystemStatus()
        ]);
    }

    window.AdminPages.dashboard = {
        init() {
            document.getElementById(PAGE_ID).innerHTML = HTML;
            this.refreshAll();
            overviewTimer = setInterval(loadOverview, 30000);
            onlineTimer = setInterval(loadOnline, 10000);
            window.addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));
        },
        onShow() {
            Object.values(charts).forEach(c => c.resize());
        },
        refreshAll
    };
})();
