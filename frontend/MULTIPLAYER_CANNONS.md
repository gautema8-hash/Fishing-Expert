# 多人联机炮台系统 — 修改说明

## 概述
在前端单机环境下模拟 4 人联机炮台玩法：屏幕四周布置 4 个炮台位置，底部为玩家自己，其余 3 个位置初始为"等待加入"空位，由 AI 机器人随机加入 / 瞄准 / 发射 / 离开。

**仅修改了一个文件：`frontend/js/core/Game.js`**（Cannon.js / Bullet.js / style.css 均无需改动，空位与 AI 炮台全部用 canvas 绘制，避免 HTML 元素的 resize 定位问题）。

---

## 改动点（全部在 Game.js 内）

| 位置 | 改动 |
|------|------|
| `constructor` | 新增 `this.multiplayer = { cannons:[], botJoinTimer:0, _time:0, namePool:[...] }` |
| `init()` 实体创建后 | 调用 `this._initMultiplayerCannons()` |
| 新增方法 | `_initMultiplayerCannons / _updateMultiplayer / _aiJoin / _aiLeave / _renderMultiplayer / _renderEmptySlot / _renderSlotCoins` |
| `update(dt)` | 在 `this.cannon.update(dt)` 后调用 `this._updateMultiplayer(dt)` |
| `render()` | 在 ui 层先 `_renderMultiplayer(uiCtx)` 再渲染玩家炮台 |
| `_onResize()` | 同步左/顶/右 3 个 AI 炮台位置 |

## 4 个炮台位置布局

| 位置 | 坐标 | 朝向 | 角度限位 |
|------|------|------|----------|
| 0 玩家 | `(width/2, height-80)` | 朝上 | 沿用 Cannon 默认 `[-PI+0.2, -0.2]`（未改动） |
| 1 左侧 | `(80, height/2)` | **朝右** | `[-PI/2+0.35, PI/2-0.35]` |
| 2 顶部 | `(width/2, 80)` | 朝下 | `[0.35, PI-0.35]` |
| 3 右侧 | `(width-80, height/2)` | 朝左 | `[PI-0.35, PI+0.35]` |

> **对任务规格的一处修正（重要）**：任务原文给左侧炮台的角度限位是 `[-PI/2±0.3]`（居中于 `-PI/2`=朝上），与"朝右"自相矛盾，且会让左侧炮台朝屏幕上方开火、打不到鱼群。参照其余三个位置（底=上、顶=下、右=左，全部朝向屏幕中央），将左侧改为居中于 `0`（朝右），保证所有炮台都向屏内鱼群开火。已在浏览器实测，AI 炮弹正常飞入屏内并参与碰撞。

## 数据结构
每个 slot：
```js
{ cannon, isPlayer, occupied, playerName, coins, isAI,
  baseAngle, aiFireTimer, aiLeaveTimer, aiAimTimer }
```
- slot 0 的 `cannon` 直接引用现有 `this.cannon`（玩家炮台功能完全不变）。
- slot 1/2/3 初始 `occupied=false`，AI 加入时复用同一个 Cannon 实例。

## AI 行为参数（在 `_updateMultiplayer` 中）
- **加入**：每 20~40 秒检查一次，有空位时 50% 概率让一个 AI 随机加入；随机名字（8 人名字池）、随机倍率 100~5000（按 100 取整，皮肤随倍率自动切换 5 级）。
- **瞄准**：每个 AI 每 1.5~4 秒在角度限位内随机选一个目标角（模拟找鱼）。
- **发射**：每个 AI 每 3~8 秒随机发射一发；**不消耗玩家金币**；伤害 ×0.6（模拟其他玩家）；走同一个 `bulletManager.fire()`，因此自动参与现有碰撞检测、命中粒子、金币结算。
- **离开**：每个 AI 加入后每 30~60 秒有 30% 概率离开，回到"等待加入"。
- 加入 / 离开均有 toast 提示（如 `🎣 海王 加入了游戏`）。

## 渲染
- **空位**（`_renderEmptySlot`）：青色 `lighter` 呼吸光晕（半径随 `sin(time*2)` 脉动）+ 灰色半透明圆形炮台轮廓 + 白色大号"+" + 下方半透明"等待加入"文字。全部用 uiCtx 绘制，每帧仅 1 个径向渐变，轻量。
- **已占用 AI 炮台**：直接复用 `Cannon.render`（含 5 级皮肤、倍率文字、玩家名），下方再用 `_renderSlotCoins` 画一行金色金币数。
- **玩家炮台**：最后渲染，保持最顶层，瞄准/发射/倍率/自动开火/狂暴均未改动。

## 性能
- AI 发射频率低（3~8 秒一发），炮弹走对象池，无额外 GC 压力。
- 空位渲染无临时对象累积（除 1 个径向渐变）。
- 实测 FPS 120（远高于 55 要求）。

---

## 验证结果（已在浏览器实测）
- ✅ 语法 `node --check` 通过；开发服务器已提供新代码。
- ✅ 控制台 0 错误（仅 BackendSync / Game init / Main 三条正常日志；既有的闪电技能 `fish.takeDamage` 报错与本次无关，为改动前已存在）。
- ✅ 4 个位置就位：底=玩家 ×100，左/顶/右=空位（青色光晕 + "+"）。
- ✅ 约 20 秒后 AI 自动加入（实测"渔场主"自动加入；强制加入测试"海王"×2300）。
- ✅ AI 炮台金龙皮肤 + 玩家名 + 金币数正常渲染；AI 炮弹正常飞出并参与碰撞。
- ✅ AI 自动离开后空位恢复"+"（实测右侧从"海王"→"小哪吒"动态换人）。
- ✅ 玩家炮台（底）瞄准/发射/倍率切换不受影响；鱼群、BOSS、技能、UI 未破坏。
- ✅ FPS 120。

> 备注：验证时测试窗口为竖屏，游戏会显示"请横屏"提示层，但游戏逻辑与 ui 层绘制均正常运行（已导出 ui canvas 像素确认）；在用户的横屏环境下会完整显示。
