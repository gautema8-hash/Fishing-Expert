# 虾堡捕鱼达人 v3.1 升级修复说明

## 升级日期
2026-09-13

## 本次升级4项内容

---

### 1. 自动开火 + 充值逻辑修复

#### 1.1 自动开火金币耗尽检测
**文件**: `frontend/js/core/Game.js`

- 在 `_fireBullet()` 方法中，当 `economy.spendCoins(cost)` 返回 false（金币不足）时：
  - 若 `cannon.autoFire` 为 true：立即设置 `autoFire = false`，同步底部自动开火按钮状态为未激活
  - 充值弹窗与"金币不足，请充值"提示由已有的 `COIN_INSUFFICIENT` 事件统一触发（`EconomySystem.spendCoins` 失败时 emit）
  - 手动点击发射时保持原有冷却防抖行为
- 充值弹窗关闭后自动开火保持关闭，需玩家手动重新开启

**验证**: 开启自动开火 → 金币耗尽 → 自动弹出"充值中心"弹窗 → 自动开火按钮变为未激活状态

#### 1.2 充值金额单位改为"亿"
**文件**: `frontend/js/config/shopConfig.js`、`frontend/js/ui/UIManager.js`、`frontend/js/systems/VIPSystem.js`

所有金币数值统一乘以 100,000（10万倍），使显示单位从"万"升级为"亿"：

| 礼包 | 原价 | 调整后 |
|------|------|--------|
| 小虾礼包 ¥6 | 6,000金币 | **6亿金币** |
| 锦鲤礼包 ¥30 | 35,000+5,000 | **35亿+5亿金币** |
| 龙鱼礼包 ¥68 | 80,000+20,000 | **80亿+20亿金币** |
| 龙王礼包 ¥128 | 180,000+60,000 | **180亿+60亿金币** |
| 龙宫宝藏 ¥328 | 500,000+200,000 | **500亿+200亿金币** |
| 东海宝库 ¥648 | 1,200,000+600,000 | **1200亿+600亿金币** |

- 充值中心弹窗：`price * 1000` → `price * 100000000`（¥6=6亿）
- 订阅卡每日领取：5,000→5亿、8,000→8亿
- 限时礼包、节日礼包、广告奖励、回归礼包金币同步×10万
- 签到7天奖励：第7天 1万→10亿
- 所有价格（¥6/¥30等）保持不变

#### 1.3 离线收益改为固定1亿
**文件**: `frontend/js/systems/OfflineSystem.js`

- `checkOfflineStatus()`：离线超过1分钟时，收益固定为 **1亿金币**（100,000,000）
- 删除原有的按分钟数×基础收益×关卡加成的复杂计算
- 离线时长显示保留，收益固定1亿

---

### 2. 炮台优化

#### 2.1 去除边框
**文件**: `frontend/js/entities/Cannon.js`、`frontend/assets/cannon/cannon-luxury.png`

- **代码层**：注释掉 `_renderFlowEffect()` 流光环绕效果调用（原高倍炮台时的旋转光圈+粒子轨迹）
- **图片层**：重新生成炮台图片，去除原图片中的圆形发光底座/平台（带符文的金色圆盘），只保留炮台主体（翡翠炮管+金龙纹饰+金色轮子+炮架）
- 保留：倍率文字（×100）、狂暴红光、炮口闪光、皮肤切换特效

#### 2.2 炮台增大
**文件**: `frontend/js/entities/Cannon.js`

- 图片渲染尺寸：`size` 120px → **150px**（增大25%）
- 炮口闪光位置：`(0, -60)` → `(0, -75)` 匹配新尺寸
- 炮弹发射点 muzzleX/Y：偏移系数 60 → 75

---

### 3. BOSS优化 + 去除闯关关卡

#### 3.1 BOSS龙角优化
**文件**: `frontend/assets/fish/boss-golden-dragon.png`

- 重新生成 2048×2048 中国金龙BOSS图
- 重点强化：鹿角式分叉龙角，清晰锐利、细节丰富
- 五爪、长龙须、金色鳞片、侧面游泳姿态、全身完整不裁切
- 泛洪填充去背景，四角全透明

#### 3.2 去除模糊无用部分
**文件**: `frontend/js/entities/Boss.js`

- `_renderBossImage()`：外层金色光晕透明度从 0.35 降至 **0.10**（避免龙身边缘被光晕糊化）
- 删除内层椭圆描边发光叠加层（原代码在 drawImage 后又用 globalAlpha=0.25 重复绘制一遍，导致图片模糊）
- `drawImage` 仅绘制一次，龙身干净清晰
- 保留：血条 shadowBlur（功能性UI）、龙鳞闪光粒子、龙须龙爪程序化元素

#### 3.3 去除闯关关卡UI
**文件**: `frontend/js/ui/TopBar.js`、`frontend/js/core/Game.js`、`frontend/js/ui/UIManager.js`

- **TopBar**：删除顶部状态栏的 `.level-display`（奖杯图标+"第X关"文字）、`_levelDisplay` 字段、`updateLevel()` 方法
- **Game.js**：`LEVEL_UP` 事件中移除 `topBar.updateLevel()` 调用和"进入第X关"toast；`LEVEL_COMPLETE` 事件中移除通关toast
- **UIManager**：排行榜移除"关卡榜"tab
- 关卡系统内部逻辑（难度递增、击杀统计、发奖）全部保留，仅移除玩家可见的UI显示

---

### 4. 鱼类种类新增2倍

**文件**: `frontend/js/config/fishConfig.js`、`frontend/assets/fish/*.png`

- 原有鱼类：**30种** → 新增 **30种** → 总计 **60种**
- 新增30种鱼全部生成 1024×1024 透明背景PNG图片

#### 新增鱼类清单

| 分类 | 鱼种 |
|------|------|
| 热带/淡水 | 神仙鱼(angelfish)、斗鱼(betta)、锦鲤(koi)、射水鱼(archerfish) |
| 海水鱼 | 蝴蝶鱼(butterflyfish)、狮子鱼(lionfish)、鹦鹉鱼(parrotfish)、蓝吊鱼(tang)、飞鱼(flying_fish)、墨鱼(cuttlefish) |
| 珍稀观赏 | 红龙鱼(red_arowana)、罗汉鱼(luohan) |
| 深海发光 | 毒蛇鱼(viperfish)、吞噬鳗(gulper_eel)、斧头鱼(hatchetfish)、管眼鱼(barreleye) |
| 深海生物 | 巨型等足虫(giant_isopod)、玻璃鱿鱼(glass_squid)、小飞象章鱼(dumbo_octopus) |
| 奇特生物 | 海龙(seadragon)、叶海龙(leafy_seadragon)、海兔(sea_rabbit)、海胆(sea_urchin)、海参(sea_cucumber)、海蛇(sea_snake)、海鳗(moray_eel)、鹦鹉螺(nautilus) |
| 大型 | 黄貂鱼(stingray)、海牛(manatee)、皇带鱼(oarfish) |

- 每种鱼配置完整属性：score/hp/speed/size/spawnWeight/pathType/schoolFish/depth/imagePath 等
- 深海发光鱼设置 `glow: true`，宽扁鱼设置 `imageScale: 2.0`
- 生成池通过 `FishConfig.getSpawnList()` 自动遍历所有 types，新鱼自动纳入随机生成
- 预加载通过 `Object.values(FishConfig.types).filter(t => t.imagePath)` 自动包含新鱼

---

## 验证结果（全部通过）

| # | 检查项 | 结果 |
|---|--------|------|
| 1 | 自动开火金币耗尽后弹出充值弹窗，自动开火关闭 | ✅ 通过 |
| 2 | 商城礼包金额显示"亿"单位 | ✅ 通过（6亿/35亿/80亿...） |
| 3 | 离线收益显示1亿 | ✅ 通过 |
| 4 | 炮台无边框（无流光+无圆形底座），尺寸更大 | ✅ 通过（150px） |
| 5 | BOSS龙角清晰，无模糊无用部分 | ✅ 通过 |
| 6 | 游戏中无关卡相关UI显示 | ✅ 通过 |
| 7 | 鱼类总种类60种，同屏15+种 | ✅ 通过（同屏实测36种） |
| 8 | FPS稳定55+ | ✅ 通过（实测75 FPS） |
| 9 | 控制台0错误 | ✅ 通过 |

## 修改文件清单

### 代码文件（9个）
1. `frontend/js/core/Game.js` — 自动开火金币耗尽处理 + 关卡UI事件移除
2. `frontend/js/config/shopConfig.js` — 所有金币数值×10万
3. `frontend/js/ui/UIManager.js` — 充值计算公式 + 签到文字 + 关卡榜移除
4. `frontend/js/systems/VIPSystem.js` — 签到奖励金币×10万
5. `frontend/js/systems/OfflineSystem.js` — 离线收益固定1亿
6. `frontend/js/entities/Cannon.js` — 去流光 + 尺寸150 + 炮口位置
7. `frontend/js/entities/Boss.js` — 光晕减弱 + 删除重复绘制
8. `frontend/js/ui/TopBar.js` — 删除关卡显示
9. `frontend/js/config/fishConfig.js` — 新增30种鱼配置

### 图片文件（32个）
1. `frontend/assets/cannon/cannon-luxury.png` — 新炮台（无底座）
2. `frontend/assets/fish/boss-golden-dragon.png` — 新BOSS金龙
3. `frontend/assets/fish/` 下30张新增鱼类PNG
