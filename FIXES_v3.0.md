# v3.0 修复说明文档

## 修复概述
针对虾堡捕鱼达人v3.0测试发现的6个问题进行全面修复，所有修复均已通过浏览器实际验证。

---

## 修复1：金币改为亿级单位

### 问题
v3.0承诺的亿级金币显示未完全覆盖所有UI位置。

### 修复内容
- `frontend/js/core/Utils.js`：`formatCoin()` 方法已存在，支持万/亿/万亿三级单位，自动去除末尾多余0
- `frontend/js/systems/EconomySystem.js`：`getDisplayCoins()` 使用 `Utils.formatCoin()`
- `frontend/js/config/gameConfig.js`：初始金币 `initialCoins = 100000000`（1亿）
- `frontend/js/core/Storage.js`：新玩家默认金币 `coins = 100000000`
- 新增替换以下位置的裸数字金币显示为 `Utils.formatCoin()`：
  - `systems/GuildSystem.js`：公会BOSS击杀奖励toast
  - `systems/WorldBossSystem.js`：世界BOSS击杀奖励toast
  - `systems/EquipmentSystem.js`：装备分解奖励toast
  - `systems/AdSystem.js`：广告奖励toast
  - `ui/UIManager.js`：充值金币、统计页平均击杀金币
- `ui/TopBar.js`：金币弹跳缩放动画（coin-bump）保留正常工作

### 验证
- 设置 coins=150000000 → UI显示"1.5亿" ✅
- 新玩家初始金币1亿 ✅
- 商城/任务/签到/排行榜/邮件等所有位置均使用亿级格式 ✅

---

## 修复2：鱼儿透明背景（无黑框/模糊边缘）

### 问题
金鱼、孔雀鱼、蝠鲼、小丑鱼等鱼类图片有黑色/白色方块背景和模糊边缘。

### 修复内容
- 使用 `image_gen` 重新生成全部31张鱼类图片（含BOSS），prompt包含：
  - "transparent background", "PNG with alpha channel"
  - "isolated subject, no background"
  - "clean edges, no halo, no fringe"
  - "3D render, studio lighting", "side view"
- 所有普通鱼类1024x1024，BOSS金龙2048x2048
- Python PIL后处理流程：
  1. Alpha阈值清理（<30 → 完全透明）
  2. 边缘高斯模糊羽化（0.8px）
  3. **泛洪填充背景去除**：从图片边缘BFS遍历，移除与边缘连通的背景色像素（阈值55），确保只删背景不删鱼体白色部分
  4. 四角强制alpha=0
- `Fish.js` 图片渲染路径不使用 shadowBlur 或 glow（避免模糊边缘）

### 验证
- 全部31张图片四角alpha=0 ✅
- 浏览器实际截图：章鱼、金鱼、小丑鱼、龙虾、斑马鱼等均无白框/黑框 ✅
- 鱼体内部白色部分（如小丑鱼白纹）保留完整 ✅

---

## 修复3：保证生物完整性（不裁剪）

### 问题
部分鱼可能被Canvas边界或渲染逻辑裁剪，宽扁鱼/长鱼显示不全。

### 修复内容
- `frontend/js/entities/Fish.js` `_renderImage()`：
  - 图片宽度改为读取 `config.imageScale`（缺省1.6），高度按原始宽高比缩放
  - 图片渲染路径无 `clip()` 调用，不会裁剪
- `Fish.js` `getCollisionRadius()`：碰撞半径倍率从0.5提升到0.6，覆盖宽扁/长鱼
- `frontend/js/config/fishConfig.js`：为特殊体型鱼类添加 `imageScale`：
  - 宽扁鱼（manta蝠鲼、anglerfish灯笼鱼）：imageScale=2.0
  - 长鱼（electriceel雷电鳗、blackdragon黑龙、goldendragon黄金龙鱼）：imageScale=2.2
- `outOfBoundsMargin=100`：鱼出框100px后才销毁，屏幕内完整显示

### 验证
- 每种鱼在屏幕中央时完整可见，无裁剪 ✅
- 蝠鲼两翼完整展开，鳗鱼从头到尾完整 ✅

---

## 修复4：BOSS完整整条金龙游泳姿态

### 问题
原BOSS金龙图片可能是局部/不完整的。

### 修复内容
- 重新生成 `boss-golden-dragon.png`（2048x2048）：
  - 完整全身中国金龙，S形蜿蜒游泳姿态
  - 五爪、长须、鹿角、金色鳞片细节清晰
  - 透明背景，从头到尾完整在画面内
  - 水平翻转确保头朝右（与游戏朝向一致）
- `frontend/js/entities/Boss.js` `_renderBossImage()`：
  - 图片缩放改为读取 `config.imageScale`（缺省2.2），BOSS设为2.5
  - 保留：缓慢游动摆动（sin波旋转）、呼吸缩放、外层金色光晕、龙鳞闪光粒子
  - 外发光用独立glow层，不影响龙本身边缘
- `Boss.js` `getCollisionRadius()`：从0.6提升到0.8，覆盖蜿蜒龙身各段
- `fishConfig.js` dragonking配置：新增 `imageScale: 2.5`
- BOSS出场：从屏幕一侧完整游入，预警后出现

### 验证
- BOSS在屏幕中央时从头到尾完整可见 ✅
- 龙身蜿蜒呈游泳姿态，五爪长须清晰 ✅
- 金色光晕和鳞片闪光效果正常 ✅

---

## 修复5：去掉程序化假海草

### 问题
底部海草和珊瑚是用Canvas线条程序化绘制的，看起来不真实，与AI背景图风格不统一。

### 修复内容
- `frontend/js/render/Scene.js`：
  - `renderMidground()`：注释掉非龙柱珊瑚柱渲染循环和海草渲染循环
  - `renderNearForeground()`：注释掉 `type==='weed'` 的近景海草剪影分支，保留岩石剪影
  - 构造函数中注释掉 `this._seaweeds = this._generateSeaweeds()` 调用
  - 保留 `_generateSeaweeds()`、`_renderSeaweed()`、`_renderCoralColumn()` 方法定义（不调用，避免引用报错）
- 保留：远景龙宫轮廓、龙柱(dragon_pillar)、宫灯呼吸光、底部沙地、远景山脉、远景鱼群剪影

### 验证
- 画面底部没有假的线条海草和假珊瑚 ✅
- AI生成的海底背景图自然呈现底部植被 ✅
- 整体风格统一 ✅

---

## 修复6：鱼群数量多、出入频繁

### 问题
鱼群数量波动大（22→12），生成间隔过长，画面空旷。

### 修复内容
- `frontend/js/entities/FishSchool.js`（FishManager）：
  - `_maxFish`：25 → 35
  - `_baseMaxFish`：25 → 35
  - `_maxPoolSize`：60 → 80
  - 对象池预热：20 → 40
  - 新增最低鱼数保障：`fishes.length < 20` 时立即生成，不等待spawnTimer
- `frontend/js/config/fishConfig.js` spawnSystem：
  - `minInterval`：0.8 → 0.5秒
  - `maxInterval`：2.5 → 1.5秒
  - `maxFishPerSpawn`：3 → 5条
  - `schoolChance`：0.35 → 0.45
- `frontend/js/config/levelConfig.js`：
  - 关卡基础最大鱼数：20 → 30（每关+1）
- 多样性算法保留：最近8次生成记忆、同屏种类少优先选未出现种类、小鱼成群（3-8条）、大鱼单独稀有出现

### 验证
- 无BOSS时同屏鱼数稳定27-31条 ✅（目标25-35）
- 同屏鱼类10-17种 ✅（目标10+）
- 生成间隔0.5-1.5秒，每次2-5条，出入频繁 ✅
- BOSS在场时驱散小鱼，最低保障20条 ✅

---

## 性能与稳定性

| 指标 | 结果 |
|------|------|
| FPS | 78-120（稳定60+）✅ |
| 控制台JS错误 | 0 ✅ |
| 控制台404 | 2个（favicon等无关资源） |
| 图片加载 | 全部31张正常加载 ✅ |
| 现有功能 | 炮弹/捕获/技能/UI均正常 ✅ |

---

## 修改文件清单

### 代码文件（9个）
1. `frontend/js/core/Utils.js` — formatCoin（已存在，验证通过）
2. `frontend/js/systems/EconomySystem.js` — getDisplayCoins（已使用formatCoin）
3. `frontend/js/entities/Fish.js` — imageScale支持、碰撞半径0.6
4. `frontend/js/entities/Boss.js` — imageScale支持、碰撞半径0.8
5. `frontend/js/entities/FishSchool.js` — 鱼群数量/频率/最低保障
6. `frontend/js/render/Scene.js` — 移除假海草/假珊瑚渲染
7. `frontend/js/config/fishConfig.js` — imageScale、spawnSystem参数
8. `frontend/js/config/levelConfig.js` — 关卡基础最大鱼数30
9. `frontend/js/systems/GuildSystem.js` / `WorldBossSystem.js` / `EquipmentSystem.js` / `AdSystem.js` / `ui/UIManager.js` — 裸数字金币替换为formatCoin

### 图片文件（31张，全部重新生成）
- `frontend/assets/fish/*.png` — 30张普通鱼类（1024x1024）
- `frontend/assets/fish/boss-golden-dragon.png` — BOSS金龙（2048x2048）

### 工具脚本
- `remove_bg.py` — 泛洪填充背景去除工具（可复用）

---

## Git提交
- commit message: "fix: v3.0修复 - 亿级金币+透明鱼图+完整BOSS+去海草+鱼群密度"
