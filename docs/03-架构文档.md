# 虾堡捕鱼达人H5 游戏 — 技术架构文档

> 版本：v1.0.0  
> 日期：2026-09-12  
> 文档类型：技术架构设计

---

## 一、架构总览

### 1.1 设计原则
1. **模块化**：渲染层 / 逻辑层 / 数据层 / 网络层 / UI 层完全分离
2. **配置驱动**：所有数值、鱼种、关卡、礼包、概率由 JSON 配置驱动
3. **高性能**：对象池复用、多 Canvas 分层渲染、脏矩形优化
4. **可扩展**：预留联机、服务器校验、数据埋点接口
5. **零依赖**：原生 JavaScript ES6+，无构建工具，开箱即用

### 1.2 架构分层图

```
┌─────────────────────────────────────────────────────────┐
│                      UI 层 (UI Layer)                     │
│  TopBar / BottomBar / PopupManager / Sidebar / Guide     │
├─────────────────────────────────────────────────────────┤
│                    系统层 (System Layer)                   │
│  Economy / Level / Audio / Item / VIP / SignIn / Task    │
│  CannonUpgrade / Pet / Skill / Analytics / AntiCheat      │
├─────────────────────────────────────────────────────────┤
│                    实体层 (Entity Layer)                   │
│  Fish / Boss / Cannon / Bullet / Coin / Particle          │
├─────────────────────────────────────────────────────────┤
│                    渲染层 (Render Layer)                   │
│  Renderer / Scene / ParallaxLayer / Effects / Camera      │
├─────────────────────────────────────────────────────────┤
│                    核心层 (Core Layer)                     │
│  Game / EventBus / ObjectPool / ResourceManager / Utils   │
├─────────────────────────────────────────────────────────┤
│                    数据层 (Data Layer)                     │
│  ConfigCenter / Storage / SaveManager / Network (预留)    │
└─────────────────────────────────────────────────────────┘
```

### 1.3 目录结构

```
Fishing-Expert-doubao/
├── index.html                  # 入口 HTML
├── manifest.json               # PWA 配置
├── sw.js                       # Service Worker（PWA 离线缓存）
├── README.md                   # 项目说明
├── css/
│   └── style.css               # 全局样式 + UI 主题
├── js/
│   ├── main.js                 # 入口脚本，初始化游戏
│   ├── config/
│   │   ├── gameConfig.js       # 全局游戏配置
│   │   ├── fishConfig.js       # 鱼类属性配置
│   │   ├── levelConfig.js      # 关卡参数配置
│   │   ├── shopConfig.js       # 商城礼包配置
│   │   └── vipConfig.js        # VIP 等级配置
│   ├── core/
│   │   ├── Game.js             # 游戏主类，主循环
│   │   ├── EventBus.js         # 事件总线（发布订阅）
│   │   ├── ObjectPool.js       # 通用对象池
│   │   ├── ResourceManager.js  # 资源管理器（懒加载+预加载）
│   │   ├── Storage.js          # 本地存储封装
│   │   └── Utils.js            # 工具库（数学/碰撞/随机/颜色）
│   ├── render/
│   │   ├── Renderer.js         # 渲染器（多 Canvas 管理）
│   │   ├── Scene.js            # 场景管理器
│   │   ├── ParallaxLayer.js    # 视差图层
│   │   ├── Camera.js           # 摄像机（震动/视差偏移）
│   │   ├── ParticleSystem.js   # 粒子系统
│   │   ├── WaterRipple.js      # 水波纹特效
│   │   ├── Caustics.js         # 水面焦散光影
│   │   └── VolumetricFog.js    # 体积雾效果
│   ├── entities/
│   │   ├── Fish.js             # 鱼类基类（骨骼动画）
│   │   ├── Boss.js             # BOSS 东海龙王
│   │   ├── FishSchool.js       # 鱼群管理器
│   │   ├── Cannon.js           # 炮台类
│   │   ├── Bullet.js           # 炮弹类
│   │   ├── Coin.js             # 金币类（物理吸附）
│   │   └── Particle.js         # 粒子类
│   ├── systems/
│   │   ├── EconomySystem.js    # 经济系统（金币/钻石）
│   │   ├── LevelSystem.js      # 关卡系统
│   │   ├── AudioSystem.js      # 音效系统（Web Audio）
│   │   ├── ItemSystem.js       # 道具系统
│   │   ├── VIPSystem.js        # VIP 系统
│   │   ├── SignInSystem.js     # 签到系统
│   │   ├── TaskSystem.js       # 任务系统
│   │   ├── CannonUpgrade.js    # 炮台养成
│   │   ├── PetSystem.js        # 宠物系统
│   │   ├── SkillSystem.js      # 技能系统
│   │   └── Analytics.js        # 数据埋点
│   ├── ui/
│   │   ├── UIManager.js        # UI 管理器（弹窗栈）
│   │   ├── TopBar.js           # 顶部状态栏
│   │   ├── BottomBar.js        # 底部操作栏
│   │   ├── Sidebar.js          # 侧边道具栏
│   │   ├── Popup.js            # 弹窗基类
│   │   ├── ShopPopup.js        # 充值商城
│   │   ├── TaskPopup.js        # 任务面板
│   │   ├── RankPopup.js        # 排行榜
│   │   ├── GuidePopup.js       # 新手引导
│   │   ├── SettingPopup.js     # 设置
│   │   ├── WheelPopup.js       # 幸运转盘
│   │   └── SignInPopup.js      # 签到
│   └── ai/
│       ├── FishAI.js           # 鱼类 AI（结群/躲避/巡游）
│       └── AdaptiveDifficulty.js # 自适应难度
├── assets/
│   ├── images/                 # 图片资源（WebP）
│   └── audio/                  # 音频资源
└── docs/
    ├── 01-execution-plan.md
    ├── 02-requirements.md
    ├── 03-architecture.md
    ├── 04-environment.md
    └── 05-market-research.md
```

---

## 二、核心层设计

### 2.1 Game 主类

```
职责：
- 游戏生命周期管理（init/start/pause/resume/stop）
- 主循环驱动（requestAnimationFrame + 固定时间步长）
- 各子系统初始化与协调
- 全局状态管理

核心属性：
- renderer: Renderer        渲染器
- scene: Scene              场景
- economy: EconomySystem    经济系统
- level: LevelSystem        关卡系统
- audio: AudioSystem        音效系统
- ui: UIManager             UI 管理器
- eventBus: EventBus        事件总线
- objectPool: ObjectPool    对象池
- config: ConfigCenter      配置中心
- state: GameState          游戏状态（IDLE/PLAYING/PAUSED/GAMEOVER）
- fpsMonitor: FPSMonitor    FPS 监控

核心方法：
- init()                    初始化所有子系统
- start()                   启动主循环
- pause()                   暂停游戏
- resume()                  恢复游戏
- gameLoop(timestamp)       主循环
- update(dt)                逻辑更新
- render()                  渲染
- resize()                  窗口大小变化
```

### 2.2 主循环设计

```javascript
// 固定时间步长 + 插值渲染
const FIXED_DT = 1000 / 60;  // 固定 60fps 逻辑步长
let accumulator = 0;
let lastTime = 0;

gameLoop(timestamp) {
    const frameTime = Math.min(timestamp - lastTime, 250); // 防止跳帧
    lastTime = timestamp;
    accumulator += frameTime;

    // 固定步长逻辑更新
    while (accumulator >= FIXED_DT) {
        this.update(FIXED_DT / 1000);
        accumulator -= FIXED_DT;
    }

    // 插值渲染（alpha = accumulator / FIXED_DT）
    const alpha = accumulator / FIXED_DT;
    this.render(alpha);

    requestAnimationFrame((t) => this.gameLoop(t));
}
```

### 2.3 事件总线（EventBus）

```
设计模式：发布订阅（Publish-Subscribe）

核心事件列表：
- 'coin:change'           金币变化
- 'coin:insufficient'     金币不足
- 'cannon:fire'           炮台发射
- 'cannon:upgrade'        炮台升级
- 'bullet:hit'            炮弹命中
- 'fish:kill'             鱼类击杀
- 'fish:spawn'            鱼类生成
- 'boss:appear'           BOSS 出场
- 'boss:kill'             BOSS 击杀
- 'crit:trigger'          暴击触发
- 'level:up'              关卡升级
- 'level:complete'        关卡完成
- 'item:use'              道具使用
- 'popup:open'            弹窗打开
- 'popup:close'           弹窗关闭
- 'game:pause'            游戏暂停
- 'game:resume'           游戏恢复
- 'audio:toggle'          音频开关
- 'analytics:event'       埋点事件
```

### 2.4 对象池（ObjectPool）

```
设计模式：对象池模式（Object Pool）

通用池化对象：
- Fish          鱼类（按类型分池）
- Bullet        炮弹
- Coin          金币
- Particle      粒子
- WaterRipple   水波纹

核心方法：
- acquire(type)         从池中获取对象
- release(obj, type)    将对象放回池中
- prewarm(type, count)  预创建对象
- clear()               清空池

池化策略：
- 初始预创建一定数量对象
- 池空时自动创建新对象
- 池上限保护（超过上限直接销毁）
- 对象复用前调用 reset() 重置状态
```

### 2.5 资源管理器（ResourceManager）

```
双机制加载：
1. 首屏最小化加载：只加载启动必需资源（UI 图标、基础音效）
2. 后台预加载：进入游戏后异步加载后续资源（鱼类素材、特效素材）

资源类型：
- 图片（Image）
- 音频（AudioBuffer）
- 配置（JSON）

核心方法：
- load(url, type)           加载单个资源
- loadBatch(urls)           批量加载
- preload(urls)             后台预加载
- get(url)                  获取已加载资源
- getProgress()             获取加载进度
- onProgress(callback)      加载进度回调
```

---

## 三、渲染层设计

### 3.1 多 Canvas 分层渲染

```
Canvas 层级（从下到上）：
1. bgCanvas        背景层（龙宫远景、体积雾）— 视差最慢
2. midCanvas       中层（珊瑚海草、中景鱼群）— 视差中等
3. gameCanvas      游戏层（鱼群、炮弹、爆炸）— 无视差
4. fxCanvas        特效层（粒子、水波纹、焦散）— 无视差
5. uiCanvas        UI 层（Canvas 绘制的 UI 元素）— 无视差

DOM UI 层（HTML/CSS）：
- 顶部状态栏、底部操作栏、弹窗、侧边栏

分层优势：
- 静态层（背景）低频率重绘
- 动态层（游戏层）每帧重绘
- 特效层独立管理，便于性能降级
- UI 层用 DOM 实现，交互更便捷
```

### 3.2 视差滚动系统

```
5 层视差（从远到近）：
1. 远景龙宫层     speed = 0.1  （最慢，营造深远感）
2. 体积雾层       speed = 0.2
3. 中景珊瑚层     speed = 0.4
4. 近景海草层     speed = 0.7
5. 游戏层         speed = 1.0  （不视差，固定坐标系）

实现方式：
- 每层维护独立的偏移量 offsetX
- 摄像机移动时，各层按 speed 系数偏移
- 每层绘制时使用 ctx.translate(offsetX, 0)
- 无缝循环：图层宽度 ≥ 2 × 屏幕宽度，超出部分回绕
```

### 3.3 摄像机（Camera）

```
职责：
- 视口管理
- 屏幕震动
- 视差偏移计算

核心属性：
- x, y              摄像机位置
- shakeX, shakeY    震动偏移
- shakeIntensity    震动强度
- shakeDuration     震动持续时间

核心方法：
- shake(intensity, duration)  触发屏幕震动
- update(dt)                   更新震动衰减
- getLayerOffset(layerSpeed)   获取指定层视差偏移
```

### 3.4 粒子系统（ParticleSystem）

```
粒子类型：
1. 水墨爆炸粒子     黑色墨滴，向外扩散，逐渐变淡
2. 金粉粒子         金色光点，爆炸四散，重力下落
3. 金珠粒子         较大金色圆珠，抛物线飞行
4. 流光拖尾粒子     青金色，跟随移动对象，逐渐消散
5. 珍珠气泡粒子     半透明白色，缓慢上升，左右摇摆
6. 暴击烈焰粒子     红金色，向上飘散，热浪扭曲

粒子属性：
- x, y, vx, vy      位置与速度
- life, maxLife      生命周期
- size, sizeSpeed    大小与变化速度
- color, alpha       颜色与透明度
- gravity             重力系数
- friction            摩擦力
- blendMode           混合模式（lighter/normal）

发射器（Emitter）：
- burst(x, y, config)    爆发式发射
- trail(x, y, config)    拖尾式发射
- continuous(x, y, config) 持续发射
```

### 3.5 水波纹特效（WaterRipple）

```
实现原理：
- 环形渐变（radialGradient）模拟波纹
- 多环叠加，每环半径递增、透明度递减
- 波纹随时间扩张，达到最大半径后消散
- 叠加水体扭曲（局部像素位移，可选高性能模式）

属性：
- x, y              波纹中心
- radius            当前半径
- maxRadius         最大半径
- ringCount         波纹环数
- speed             扩张速度
- alpha             透明度
- intensity         强度（影响扭曲程度）

触发场景：
- 炮弹入水（普通强度）
- 炮弹命中鱼体（高强度）
- 击杀大鱼/BOSS（超强度，多环）
```

### 3.6 水面焦散光影（Caustics）

```
实现原理：
- 预生成焦散纹理（程序化噪声 + 正弦波叠加）
- 每帧偏移纹理坐标，模拟水流晃动
- 使用 'lighter' 混合模式叠加到场景
- 透明度随昼夜变化

参数：
- scale             纹理缩放
- speed             流动速度
- intensity         光强
- color             光斑颜色
- tileX, tileY      平铺数量

性能优化：
- 离屏 Canvas 预渲染焦散纹理
- 低端机关闭焦散效果
```

### 3.7 体积雾（VolumetricFog）

```
实现原理：
- 多层半透明渐变叠加
- 每层不同密度、不同移动速度
- 远处雾浓，近处雾淡（垂直渐变）
- 丁达尔光束：从顶部光源向下的渐变光柱，随时间轻微摆动

参数：
- fogColor          雾颜色
- fogDensity        雾密度
- layerCount        雾层数
- lightCount        光束数量
- lightIntensity    光束强度
```

---

## 四、实体层设计

### 4.1 鱼类基类（Fish）

```
骨骼动画系统：
- 脊椎分段：5-12 段（按鱼类型）
- 每段维护角度、长度、宽度
- 头部段跟随目标方向，后续段逐段滞后（正弦波叠加）
- 胸鳍、背鳍、尾鳍为独立骨骼，扇动频率与游速正相关

骨骼更新算法：
1. 头部段角度 = 鱼运动方向 + 头部摆动偏移（sin(time * freq) * amp）
2. 第 i 段角度 = 第 i-1 段角度 + 弯曲偏移（sin(time * freq - i * phase) * amp）
3. 尾鳍扇动角度 = sin(time * tailFreq) * tailAmp
4. 胸鳍扇动角度 = sin(time * finFreq) * finAmp

属性：
- type              鱼类型
- hp, maxHp         血量
- score             分值
- speed             游速
- x, y, angle       位置与朝向
- targetX, targetY  目标点
- pathType          路径类型（直线/S型/环形/随机）
- bones[]           骨骼段数组
- fins{}            鱼鳍骨骼
- scale             缩放（景深）
- alpha             透明度（景深）
- state             状态（ALIVE/DYING/DEAD）

核心方法：
- update(dt)        更新位置、骨骼动画、AI
- render(ctx)       绘制鱼体（骨骼分段渲染 + 菲涅尔光影）
- hit(damage)       受击
- die()             死亡（触发爆炸特效）
- reset()           重置状态（对象池复用）
```

### 4.2 菲涅尔光影伪 3D

```
实现原理：
- 鱼体绘制时，根据鱼身各段与光源方向的夹角计算反光强度
- 反光强度 = pow(1 - abs(dot(normal, lightDir)), fresnelPower)
- 鱼身边缘（法线与光源垂直）反光最强，中心最弱
- 叠加青金色高光，模拟水体透光折射

鱼体俯仰姿态：
- 鱼游动时根据速度变化施加轻微 pitch 旋转
- 加速时头部上扬，减速时头部下沉
- 转弯时身体侧倾（roll）
```

### 4.3 BOSS 东海龙王（Boss）

```
继承 Fish 基类，扩展：
- 骨骼段数：12 段（龙身波浪扭动）
- 龙须：2 条独立骨骼，随游动摆动
- 龙角：头部装饰
- 龙鳞：分段绘制鳞片纹理
- 出场动画：从屏幕一侧游入，伴随金光预警
- 技能：周期性召唤小鱼、加速冲撞
- 血量条：顶部显示 BOSS 名称 + 血量

出场流程：
1. 全屏金光闪烁预警（2 秒）
2. 云雾体积雾涌动
3. 屏幕震动
4. 所有小鱼四散逃离
5. BOSS 从右侧游入
6. 显示 BOSS 名称 + 血量条
```

### 4.4 炮台（Cannon）

```
属性：
- x, y              位置（屏幕底部中心）
- angle             朝向角度（跟随鼠标/手指）
- level             倍率等级（1-10）
- skin              皮肤类型（dragon/glass/gold）
- fireRate          射速（发/秒）
- lastFireTime      上次发射时间
- autoFire          自动发射开关
- flowAngle         流光环绕角度

核心方法：
- aim(targetX, targetY)  瞄准目标
- fire()                  发射炮弹
- upgrade()               提升倍率
- downgrade()             降低倍率
- changeSkin(skin)        切换皮肤
- update(dt)              更新流光、自动发射
- render(ctx)             绘制炮台（底座 + 炮管 + 皮肤特效）

炮台皮肤渲染：
- 龙纹炮：深色金属底座 + 龙纹浮雕 + 青色炮口光
- 琉璃炮：半透明琉璃质感 + 青金流光环绕 + 琉璃折射
- 鎏金炮：金色金属底座 + 金色流光持续环绕 + 鎏金发光
```

### 4.5 炮弹（Bullet）

```
属性：
- x, y, vx, vy      位置与速度
- level             炮台倍率
- damage            伤害
- isCrit            是否暴击
- targetFish        锁定目标（锁定道具）
- trailParticles[]  拖尾粒子
- state             状态（FLYING/EXPLODING/DEAD）

核心方法：
- update(dt)        更新位置、拖尾、追踪
- render(ctx)       绘制炮弹（核心光球 + 电光拖尾）
- hit(fish)         命中鱼
- explode()         爆炸（水波纹 + 粒子）
- reset()           重置（对象池）

暴击炮弹视觉：
- 核心变为红金烈焰色
- 拖尾变为红金色火焰
- 爆炸范围 ×2
- 爆炸粒子变为金色龙焰
```

### 4.6 金币（Coin）

```
物理吸附逻辑：
1. 击杀时从鱼位置生成多个金币
2. 初始速度：向外爆炸（随机方向 + 随机速度）
3. 重力作用：缓慢下落
4. 延迟吸附：0.3 秒后开始向金币 UI 位置飞行
5. 磁吸飞行：加速度指向目标，带弧线惯性
6. 到达目标：缩放消散 + 粒子特效 + 金币增加

属性：
- x, y, vx, vy      位置与速度
- value             金币面值
- state             状态（EXPLODE/ATTRACT/COLLECTED）
- attractDelay      吸附延迟
- targetX, targetY  目标位置（金币 UI）

核心方法：
- update(dt)        更新物理、吸附
- render(ctx)       绘制金币（旋转 + 发光 + 金粉拖尾）
```

---

## 五、系统层设计

### 5.1 经济系统（EconomySystem）

```
职责：
- 金币、钻石的增减管理
- 动态计数动画
- 金币不足检测
- 存档读写

核心属性：
- coins             金币数
- diamonds          钻石数
- displayCoins      显示金币数（动画过渡中）
- coinAnimation     滚动计数动画

核心方法：
- addCoins(amount, source)   增加金币
- spendCoins(amount)         消耗金币（返回是否成功）
- addDiamonds(amount)        增加钻石
- spendDiamonds(amount)      消耗钻石
- canAfford(amount)          检查是否足够
- update(dt)                  更新计数动画
- save()                      存档
- load()                      读档

事件：
- 'coin:change'        金币变化（参数：当前值、变化量、来源）
- 'coin:insufficient'  金币不足
```

### 5.2 关卡系统（LevelSystem）

```
职责：
- 关卡进度管理
- 难度递增
- 鱼群生成控制
- BOSS 出现控制
- 结算评分

属性：
- currentLevel      当前关卡
- killCount         当前关卡击杀数
- killTarget        通关目标击杀数
- score             积分
- stars             星级
- difficulty        难度系数

关卡难度递增：
- 鱼群密度：每关 +10%
- 鱼价值：每关 +5%
- BOSS 血量：每关 +20%
- BOSS 分值：每关 +15%
- 高价值鱼出现概率：每关 +2%

结算评分：
- 1 星：通关
- 2 星：通关 + 击杀数 ≥ 目标 ×1.2
- 3 星：通关 + 击杀数 ≥ 目标 ×1.5 + 暴击次数 ≥ 5
```

### 5.3 音效系统（AudioSystem）

```
技术方案：Web Audio API
- 音效：AudioBuffer + AudioBufferSourceNode（短音效，可重叠播放）
- 背景音乐：MediaElementAudioSourceNode（循环播放）
- 音量控制：GainNode
- 静音：全局 GainNode 设为 0

音效列表（程序化生成 + 资源文件双模式）：
- fire        发射
- hit         命中
- kill        击杀
- crit        暴击
- boss        BOSS 出场
- coin        金币
- button      按钮
- item        道具
- bgm         背景音乐

核心方法：
- play(name)              播放音效
- playBGM()               播放背景音乐
- stopBGM()               停止背景音乐
- setVolume(type, value)  设置音量
- toggleMute(type)        切换静音
- setQuality(level)       设置音质（影响采样率）
```

### 5.4 道具系统（ItemSystem）

```
道具类型：
1. 锁定道具（lock）
   - 锁定一条鱼
   - 炮弹自动追踪
   - 持续 10 秒
   - 数量管理

2. 狂暴道具（rage）
   - 炮弹威力翻倍
   - 持续 15 秒
   - 炮台变红金烈焰状态

核心方法：
- useItem(type)          使用道具
- addItem(type, count)   增加道具
- getItemCount(type)     获取道具数量
- getActiveEffect()      获取当前激活效果
- update(dt)             更新持续时间
```

### 5.5 VIP 系统（VIPSystem）

```
属性：
- vipLevel          VIP 等级
- totalRecharge     累计充值
- privileges{}      已解锁特权

特权效果：
- coinBonus         金币加成（百分比）
- critBonus         暴击率加成
- unlockedSkins[]   已解锁炮台皮肤
- dailyGift         每日礼包

核心方法：
- addRecharge(amount)   增加累计充值
- getPrivilege(name)    获取特权值
- canClaimDaily()       是否可领取每日礼包
- claimDaily()          领取每日礼包
```

### 5.6 签到系统（SignInSystem）

```
7 天签到周期：
- 第 1 天：1000 金币
- 第 2 天：2000 金币
- 第 3 天：3000 金币 + 1 钻石
- 第 4 天：4000 金币
- 第 5 天：5000 金币 + 2 钻石
- 第 6 天：6000 金币
- 第 7 天：10000 金币 + 5 钻石 + 1 锁定道具

核心方法：
- canSignIn()           今日是否可签到
- signIn()              签到
- getSignInDays()       已签到天数
- getReward(day)        获取指定天奖励
```

---

## 六、UI 层设计

### 6.1 UI 管理器（UIManager）

```
职责：
- 弹窗栈管理（后进先出）
- 弹窗打开/关闭动画
- UI 层级管理
- 全局 UI 事件

弹窗栈：
- 同一时间只显示一个弹窗（新弹窗覆盖旧弹窗）
- 关闭当前弹窗后恢复上一个弹窗
- 弹窗打开时游戏暂停（可配置）

核心方法：
- openPopup(type, data)    打开弹窗
- closePopup()             关闭当前弹窗
- closeAllPopups()         关闭所有弹窗
- getCurrentPopup()        获取当前弹窗
- showToast(message)       显示提示消息
```

### 6.2 顶部状态栏（TopBar）

```
布局：
- 左侧：玩家头像（圆形，鎏金边框）+ 玩家 ID
- 中间：金币图标 + 金币数字（滚动计数动画）+ 加号按钮（打开商城）
- 右侧：钻石图标 + 钻石数量 + 道具图标 + 道具数量

样式：
- 半透磨砂琉璃背景
- 鎏金发光边框
- 青金渐变发光文字
- 安全区适配（padding-top: env(safe-area-inset-top)）
```

### 6.3 底部操作栏（BottomBar）

```
布局（从左到右）：
- 倍率减按钮（-）
- 当前倍率显示（×N）
- 倍率加按钮（+）
- 自动发射开关（AUTO）
- 设置按钮（⚙）

样式：
- 半透磨砂琉璃
- 鎏金发光边框
- 按钮表面浅龙纹雕刻
- 点击缩放 + 金粉粒子
- 安全区适配（padding-bottom: env(safe-area-inset-bottom)）
```

### 6.4 弹窗基类（Popup）

```
通用结构：
- 遮罩层（半透明黑色，点击关闭）
- 弹窗面板（琉璃磨砂玻璃 + 鎏金边框）
- 标题栏（标题文字 + 关闭按钮）
- 内容区
- 底部按钮区（可选）

动画：
- 打开：缩放 0.8→1 + 透明度 0→1 + 金边闪光
- 关闭：缩放 1→0.9 + 透明度 1→0

样式变量（CSS 自定义属性）：
--bg-color: rgba(6, 34, 58, 0.85)
--border-color: linear-gradient(135deg, #FFD700, #36E0E8)
--text-color: #F0F8FF
--accent-color: #36E0E8
--gold-color: #FFD700
```

---

## 七、数据层设计

### 7.1 配置中心（ConfigCenter）

```
所有数值由 JSON 配置驱动，策划无需改代码即可调参。

配置文件：
- gameConfig.js     全局配置（初始金币、FPS、粒子上限等）
- fishConfig.js     鱼类配置（7 种鱼的属性、骨骼、AI 参数）
- levelConfig.js    关卡配置（每关参数、难度曲线）
- shopConfig.js     商城配置（礼包列表、价格、内容）
- vipConfig.js      VIP 配置（等级、充值门槛、特权）

配置热更新（预留）：
- 支持从服务器拉取最新配置
- 本地配置作为兜底
- 版本号管理
```

### 7.2 本地存储（Storage）

```
封装 localStorage，提供结构化数据存取。

存档数据结构：
{
  "version": "1.0.0",
  "player": {
    "id": "player_001",
    "name": "龙宫新手",
    "avatar": 0,
    "coins": 10000,
    "diamonds": 10,
    "vipLevel": 0,
    "totalRecharge": 0
  },
  "progress": {
    "currentLevel": 1,
    "totalKills": 0,
    "totalScore": 0,
    "highestLevel": 1
  },
  "cannon": {
    "level": 1,
    "skin": "dragon",
    "upgrade": {
      "power": 1,
      "fireRate": 1,
      "critRate": 1,
      "coinBonus": 1
    }
  },
  "items": {
    "lock": 3,
    "rage": 2
  },
  "daily": {
    "lastSignInDate": null,
    "signInDays": 0,
    "lastWheelDate": null,
    "wheelFreeCount": 1,
    "tasks": {}
  },
  "settings": {
    "bgmVolume": 0.5,
    "sfxVolume": 0.8,
    "bgmMuted": false,
    "sfxMuted": false,
    "quality": "high",
    "showFPS": false
  },
  "analytics": {
    "firstPlayDate": "2026-09-12",
    "lastPlayDate": "2026-09-12",
    "playCount": 1,
    "totalPlayTime": 0
  }
}

核心方法：
- save(key, value)      保存数据
- load(key, defaultValue)  读取数据
- remove(key)            删除数据
- clear()                清空所有数据
- exportSave()           导出存档
- importSave(data)       导入存档
```

---

## 八、性能优化策略

### 8.1 渲染优化

| 优化项 | 策略 |
|--------|------|
| 对象池 | 鱼、炮弹、粒子、金币全部池化，避免频繁 GC |
| 多 Canvas 分层 | 静态层低频重绘，动态层每帧重绘 |
| 离屏渲染 | 焦散纹理、背景元素预渲染到离屏 Canvas |
| 脏矩形 | 仅重绘变化区域（可选优化） |
| 粒子上限 | 全局粒子数量上限，超出不生成新粒子 |
| 远景降级 | 远景鱼简化骨骼段数、降低帧率 |

### 8.2 性能自适应降级

```
设备性能检测：
- 检测设备内存（navigator.deviceMemory）
- 检测 CPU 核心数（navigator.hardwareConcurrency）
- 检测 GPU（WebGL 渲染器信息）
- 运行时 FPS 监控（连续 3 秒 < 30fps 触发降级）

降级等级：
- 高画质（默认）：全特效、满粒子、焦散、体积雾
- 中画质：粒子减半、关闭体积雾、保留焦散
- 低画质：粒子最小化、关闭焦散、鱼数量减半、简化骨骼
- 极简模式：关闭所有粒子、仅保留核心游戏逻辑

降级触发：
- 启动时根据设备性能设定初始画质
- 运行时 FPS 持续过低自动降级
- 用户可在设置中手动选择
```

### 8.3 FPS 监控

```
- 实时计算 FPS（每秒帧数）
- 显示在屏幕左上角（可开关）
- 记录 FPS 历史，用于性能分析
- FPS 过低时触发性能告警 + 自动降级
- 内存占用监控（performance.memory）
```

---

## 九、网络层设计（预留）

### 9.1 接口规范

```
预留服务器接口：
- POST /api/auth/login          登录
- POST /api/auth/register       注册
- GET  /api/player/profile      获取玩家信息
- POST /api/player/coins        金币变更（服务器校验）
- POST /api/player/kill         击杀上报（服务器校验）
- GET  /api/shop/list           获取商城列表
- POST /api/shop/purchase       购买
- GET  /api/rank/list           获取排行榜
- GET  /api/config/latest       获取最新配置
- POST /api/analytics/event     埋点上报

通信协议：HTTPS + JSON
鉴权：Token（JWT）
```

### 9.2 WebSocket 联机（预留）

```
联机协议：
- 房间管理：create/join/leave
- 状态同步：playerState（位置、炮台、倍率）
- 动作同步：fire/hit/kill
- 聊天：chat message
- 房间事件：playerJoin/playerLeave

同步策略：
- 客户端预测 + 服务器纠正
- 状态同步频率：10Hz
- 关键动作即时同步
```

---

## 十、安全设计

### 10.1 客户端防篡改

```
- 关键数值（金币、钻石）变更走事件总线，统一记录
- 数值变更前后校验（变化量是否在合理范围）
- 异常检测：短时间内金币大量增加 → 标记异常
- 存档加密：localStorage 数据 Base64 + 简单混淆
- 存档校验：存档数据包含校验和，篡改则重置
```

### 10.2 服务器校验（预留）

```
- 金币增减：客户端上报 → 服务器校验 → 服务器确认
- 捕获判定：客户端上报命中 → 服务器校验概率 → 服务器确认
- 付费：走第三方支付 → 服务器回调 → 发放道具
- 排行榜：服务器计算，客户端仅展示
```

---

## 十一、PWA 设计

### 11.1 manifest.json

```json
{
  "name": "捕鱼达人·东海龙宫",
  "short_name": "捕鱼达人",
  "description": "国风东海龙宫主题休闲捕鱼游戏",
  "start_url": "/index.html",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#06223A",
  "theme_color": "#06223A",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 11.2 Service Worker

```
缓存策略：
- 静态资源（HTML/CSS/JS）：Cache First，后台更新
- 图片资源：Cache First，长期缓存
- 音频资源：Cache First，长期缓存
- API 请求：Network First，离线回退缓存

离线体验：
- 已缓存资源可离线访问
- 断网时显示离线提示
- 联网后自动同步数据
```

---

## 十二、代码规范

### 12.1 命名规范

```
- 类名：PascalCase（Fish, Cannon, Game）
- 方法名：camelCase（update, render, fire）
- 变量名：camelCase（currentLevel, killCount）
- 常量：UPPER_SNAKE_CASE（MAX_FISH, FIXED_DT）
- 私有属性：_前缀（_pool, _eventBus）
- 配置项：UPPER_SNAKE_CASE（INITIAL_COINS）
- 事件名：'domain:action'（'coin:change', 'fish:kill'）
```

### 12.2 注释规范

```
- 每个类开头有 JSDoc 注释（描述、作者、日期）
- 每个公共方法有 JSDoc 注释（参数、返回值、描述）
- 复杂逻辑有行内注释
- TODO/FIXME 标记
- 配置文件有字段说明
```

### 12.3 模块规范

```
- 每个文件一个类（或一组紧密相关的工具函数）
- 使用 ES6 Module（import/export）
- 无循环依赖
- 模块间通过事件总线通信，不直接引用
- 核心层不依赖业务层
```

---

*文档结束 — 架构设计将随项目推进持续优化*
