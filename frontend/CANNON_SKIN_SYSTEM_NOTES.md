# 炮台 5 级皮肤系统 修改说明

## 修改文件

1. `frontend/js/config/gameConfig.js` —— cannon 配置新增 `levelSkins`
2. `frontend/js/entities/Cannon.js` —— 重写渲染与皮肤切换逻辑

---

## 一、gameConfig.js 改动

在 `cannon` 配置块内，`skins` 之后新增 `levelSkins` 数组（半开区间 `[min, max)`）：

| 索引 | 名称 | 倍率区间 | 图片 | 颜色 | glowIntensity |
|------|------|----------|------|------|---------------|
| 0 | 普通炮 | 100 ~ 500 | cannon-lv1.png | #CD7F32（青铜） | 0.3 |
| 1 | 精良炮 | 500 ~ 2000 | cannon-lv2.png | #C0C0C0（银） | 0.5 |
| 2 | 史诗炮 | 2000 ~ 5000 | cannon-lv3.png | #FFD700（金） | 0.7 |
| 3 | 传说炮 | 5000 ~ 10000 | cannon-lv4.png | #B76BE8（紫） | 0.9 |
| 4 | 神级炮 | 10000+ | cannon-lv5.png | #FF6BFF（粉紫） | 1.2 |

边界已验证：100→Lv1、500→Lv2、2000→Lv3、5000→Lv4、10000→Lv5。

---

## 二、Cannon.js 改动

### 1. 类级共享图片缓存（性能关键）
- 新增静态字段 `Cannon._skinImages` / `_skinReady` / `_skinLoadStarted`
- `static _preloadSkinImages()` 在首次构造时触发，幂等；5 张图只加载一次，所有炮台实例共享
- 加载失败不阻塞游戏，未就绪时走原程序化 fallback 绘制
- 渲染时通过 `img.complete && img.naturalWidth > 0` 双保险判断图片可用，不会出现黑屏

### 2. 自动皮肤切换
- 新增静态方法 `Cannon.getSkinLevelByLevel(level)` 返回 0~4
- 新增实例方法 `getCurrentSkinLevel()` 返回当前皮肤等级
- 在 `update(dt)` 中每帧比对 `getSkinLevelByLevel(this.level)` 与缓存的 `this._skinLevel`，变化时：
  - 更新 `this._skinLevel`
  - 设置 `this._skinChangeEffect = 1` 触发变身动画
- 玩家升级/降级倍率时，跨越区间自动换皮，无需手动调用

### 3. 变身动画
- `_skinChangeEffect` 从 1 衰减到 0（沿用原衰减速率 `dt*2`，约 0.5 秒）
- render 中 `transformScale = 1 + sin(progress * PI) * 0.3`，progress 从 0→1，形成"先放大 30% 再恢复"的脉冲
- `_renderSkinChangeEffect()` 绘制三层特效（`globalCompositeOperation = 'lighter'`）：
  - 中心金色脉冲（半径随 e 收缩）
  - 扩散光环（半径随时间从 20 扩到 80+，透明度随 e 衰减）
  - 8 个沿圆周向外飞散的粒子光点

### 4. 呼吸光效（随等级增强）
- `_renderBreathingGlow()` 每帧绘制，公式：
  - 半径 = `50 + glowIntensity*30 + sin(time*2)*10`
  - 透明度 = `0.1 + glowIntensity*0.15 + sin(time*2)*0.05`（下限 0.05）
  - 颜色 = 当前皮肤的 `color`
- 使用 `lighter` 叠加，Lv1 微光，Lv5 强光；高等级炮台光环明显更大更亮

### 5. 渲染重构
- 图片尺寸：`size = 140 + skinLevel*5`（Lv1=140 … Lv5=160），随等级略增
- 旋转逻辑保留：`ctx.rotate(this.angle + Math.PI/2)`（图片炮管朝上）
- 炮口闪光位置保留：`(0, -75)`
- 倍率文字仍画在底座中心（金色描边 + 阴影）
- 狂暴红光效果保留，半径从 80 扩到 90 与新呼吸光协调
- 旧 `_renderBase` / `_renderBarrel` 程序化绘制保留为图片未加载时的 fallback

### 6. 多炮台支持（为联机预留）
- 构造函数签名升级为 `constructor(x, y, options = {})`，向后兼容（原 `new Cannon(x, y)` 仍可用）
- options 字段：
  - `angleLimit: {min, max}`，默认 `{min: -PI+0.2, max: -0.2}`（不朝下）
  - `isPlayer: true`
  - `playerName: ''`
  - `avatar: ''`
- 新增 `setAngleLimit(min, max)` 运行时调整
- `aim()` 改用 `this._angleLimit` 限制（多炮台可朝不同方向）
- 非玩家炮台可直接写 `cannon.targetAngle` 而不调用 `aim()`
- render 时若 `playerName` 非空，在炮台下方 50px 处绘制玩家名（白字黑描边），金币显示接口预留

### 7. 保留的公共接口（未破坏）
- `aim / fire / update / render / upgrade / downgrade / changeSkin / activateRage / getBulletCost / canFire / isRaging`
- `fire()` 中 damage 公式 **保持** `GameConfig.bullet.baseDamage * this.level / 100`（Bullet 分级代理的改动未覆盖）
- `changeSkin(skin)` 保留，仍用于 VIP 皮肤手动切换（影响 fallback 程序化绘制颜色与 fire() 返回的 skin 字段）；倍率驱动的等级皮肤仍然自动生效，二者互不冲突
- 旧 `cannon-luxury.png` 不再被 Cannon.js 引用，但文件保留未删

---

## 三、验证清单

| 验证点 | 结果 |
|--------|------|
| 倍率 100 → Lv1 普通炮（青铜） | ✅ 区间 [100,500) |
| 倍率 1000 → Lv2 精良炮（银） | ✅ 区间 [500,2000) |
| 倍率 3000 → Lv3 史诗炮（金） | ✅ 区间 [2000,5000) |
| 倍率 7000 → Lv4 传说炮（紫） | ✅ 区间 [5000,10000) |
| 倍率 15000 → Lv5 神级炮（粉紫） | ✅ 区间 [10000,∞) |
| 跨级切换有变身动画（缩放+金光+粒子） | ✅ `_skinChangeEffect=1` 触发 |
| 高等级呼吸光效更强 | ✅ glowIntensity 0.3→1.2 |
| 语法检查 `node --check` | ✅ 两文件均通过 |
| 现有功能（瞄准/发射/狂暴/倍率切换） | ✅ 公共接口未变，damage 公式未动 |
| 性能 | ✅ 图片类级共享、无 render 内 new Image、光效仅 1 个径向渐变 + 8 粒子 |

## 四、已知说明

- 旧的 `cannon-luxury.png` 仍在 `assets/cannon/` 下但不再被引用，可后续清理
- 玩家名下方金币显示接口未实现，仅预留 `playerName` 绘制；联机时由外部系统在 render 后叠加 HUD 更合适
- 非玩家炮台（AI/其它玩家）的输入屏蔽由上层调用方保证（不调用 `aim()` 即可），Cannon 本身不强制
