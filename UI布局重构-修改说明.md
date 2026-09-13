# UI 布局重构 — 修改说明

完成日期：2026-09-13
涉及文件：
- `frontend/js/ui/TopBar.js`
- `frontend/css/style.css`
- `frontend/js/core/Game.js`

---

## 任务 1：移除绿色元素（能量条）

**现象定位**：屏幕上唯一大面积绿色/青色（`#36E0E8`）发光的 UI 元素是顶部能量条
（`#36E0E8 → #7DF9FF` 流动渐变 + 呼吸光晕）。按任务指引将其下线（能量系统仍在后台运行，
仅不再渲染能量条）。

**改动**：
- `TopBar.js` — `TopBar._create()`：删除 `.top-bar-center` 内的 `.energy-bar-container`
  整块 HTML（含 `.energy-bar-bg` / `#energy-bar-fill` / `#energy-bar-text`）。
- `TopBar.js` — 删除 `this._energyFill` / `this._energyText` 两个引用。
- `TopBar.js` — `updateEnergy()` 改为空实现（no-op），保留方法签名兼容旧调用。
- `Game.js` — 主循环中移除 `this.topBar.updateEnergy(...)` 调用（约第 1487 行）。
  `this.skillSystem.update(dt)` 保留，能量仍正常恢复/消耗。
- `style.css` — 删除 `.energy-bar-container` / `.energy-bar-bg` / `.energy-bar-fill` /
  `.energy-bar-text` 及 `@keyframes energyGlow`；同时删除文末“能量条增强”的
  `.energy-bar-fill` 覆盖样式与 `@keyframes energyFlow`。

---

## 任务 2：技能按钮移到炮台旁边

**改动**：
- `TopBar.js` — `Sidebar` 类：
  - 新增 `this.skillsElement`，创建独立容器 `<div class="cannon-skills">`，
    追加到同一游戏容器。
  - 三个技能按钮 `#skill-freeze` / `#skill-lightning` / `#skill-coin_rain`
    （id 与内部 `.skill-icon` / `.skill-cost` 结构不变）从原 `.sidebar` 移入 `.cannon-skills`。
  - 事件绑定改为挂在 `this.skillsElement` 上，emit 事件保持不变：
    `ui:use_skill`（`freeze` / `lightning` / `coin_rain`）。
  - `destroy()` 同步移除 `skillsElement`。
- `style.css` — 新增 `.cannon-skills`：
  - `position:absolute; left:50%; bottom:88px; transform:translateX(-50%)`
    横向排列在炮台/自动开火按钮正上方；
  - 按钮放大到 48px，复用现有 `.skill-btn` 玻璃拟态样式与 `.skill-btn.disabled` 置灰态。

---

## 任务 3：设置按钮移到侧边栏

**改动**：
- `TopBar.js` — `BottomBar._create()`：删除 `#setting-btn` 的 HTML 及其 click 绑定
  （底部操作栏右侧现在以“排行榜”结尾）。
- `TopBar.js` — `Sidebar._create()`：在道具栏 `.sidebar-divider` 之后新增
  `#setting-btn`（复用 `.item-btn` 圆形样式），绑定 `ui:open_setting`。

---

## 最终布局

- **顶部栏**：左（头像/名/VIP/邮件/装备/赛季）｜中（金币）｜右（钻石）。无能量条。
- **底部操作栏**：左（倍率 −/×N/+）｜中（自动）｜右（任务/签到/升级/宠物/皮肤/统计/成就/好友/公会/排行）。
- **右侧边栏**：🎯 锁定 → 🔥 狂暴 → 🎡 转盘 → 📺 广告 → 分割线 → ⚙️ 设置。
- **炮台旁技能栏**（`.cannon-skills`，底部中央横向）：❄️50 / ⚡40 / 💰60。

---

## 验证结果（浏览器实测）

1. DOM 中无 `.energy-bar-container` / `#energy-bar-fill`，截图顶部无绿色条。
2. `.cannon-skills` 存在且含 3 个技能按钮，居中位于炮台正上方（1159×703 视口下
   容器 rect 约 left=498, top=567, 164×48）。
3. `#setting-btn` 的父节点为 `.sidebar`，点击后弹出“游戏设置”弹窗。
4. 底部操作栏右侧按钮以“排行榜”结束，无设置按钮。
5. 点击 `#skill-freeze`：toast「全屏冰冻 释放！」，`skillSystem.isFreezeActive === true`，
   能量正常扣减 —— 事件 `ui:use_skill` 链路正常。
6. 控制台仅有启动 log，无 JS 报错（曾出现一次 404 为历史/资源缺失，非本次改动引入，
   刷新后不复现）。

> 备注：本地存在 service worker（`sw.js`）会缓存 JS/CSS，首次验证时曾导致旧包残留；
> 已在浏览器中注销 SW 并清空 Cache Storage 后强刷，改动生效。发布后如用户端仍见旧界面，
> 请强刷（Ctrl+Shift+R）或等待 SW 更新。
