# 炮弹倍率分级系统 修改说明

## 概述
本次改造让炮弹（Bullet）在发射时根据炮台倍率（level，单位 100）自动分级：伤害线性增长，炮弹随倍率变大，视觉特效按 5 级逐步叠加，从普通青金色逐步升级到神级彩虹光效。

## 修改文件清单
1. `frontend/js/config/gameConfig.js` — 在 `bullet` 配置中新增 tiers 表与尺寸/暴击相关参数
2. `frontend/js/entities/Bullet.js` — 新增 tier 解析、尺寸公式、分级渲染、爆炸半径放大、拖尾粒子分级
3. `frontend/js/entities/Cannon.js` — `fire()` 伤害公式改为 `baseDamage * level / 100`
4. `frontend/js/core/Game.js` — 暴击率计算加入倍率加成（封顶 15%）

---

## 1. 伤害系统
- 公式：`damage = baseDamage × level / 100`（在 `Cannon.fire()` 中计算）
  - level=100  → 伤害 1
  - level=1000 → 伤害 10
  - level=10000 → 伤害 100
- 沿用原有链路：`Cannon.fire()` 返回 damage → `Game._fireBullet()` 再乘 `upgradeSystem.powerMultiplier` → 命中时若暴击再 ×2。
- 暴击率随倍率提升：`critRate += min(0.10, (level/10000) * 0.02)`，总暴击率硬上限 15%。

## 2. 炮弹尺寸
- 公式：`size = min(80, 6 + level/200)`
  - level=100  → 6.5
  - level=1000 → 11
  - level=5000 → 31
  - level=10000 → 56
- 上限 80（约 level=14800 达到）。

## 3. 五级分级表（`GameConfig.bullet.tiers`）

| level 范围  | tier | 名称 | 主色 | trailLength | particleSize | 附加特效 |
|------------|------|------|------|-------------|--------------|----------|
| 100–500    | 1 普通 | 青金 | #36E0E8 | 2 | 0.6 | 基础发光 + 拖尾 |
| 500–2000   | 2 强化 | 鎏金 | #FFD700 | 3 | 0.8 | + 电光粒子（随机小电弧） |
| 2000–5000  | 3 烈焰 | 红金 | #FF6B35 | 4 | 1.0 | + 火焰粒子（橙红光点） |
| 5000–10000 | 4 传说 | 紫金 | #B76BE8 | 5 | 1.2 | + 双向旋转环绕光环 |
| ≥10000     | 5 神级 | 彩虹 | rainbow | 6 | 1.5 | + 彩虹核心渐变 + 三重彩虹光环 |

> 半开区间 `[min, max)`；边界值（如 500、2000、10000）归入更高一级。

## 4. 渲染（Bullet.render）
- 主色由 tier 决定，覆盖原来的 isCrit/isRage 主色逻辑；但：
  - `isCrit` 仍保留环绕火球叠加（橙红色小球绕炮弹转）。
  - `isRage` 叠加一层半透明红光晕（`rgba(255,80,40,0.35)`）。
- 外发光半径 = `size × (2.0 + tierIndex×0.4)`，随 tier 增大。
- 拖尾长度 = `size × tier.trailLength`，宽度 = `size × (0.35 + tierIndex×0.08)`。
- tier≥2：2~4 条随机白色小电弧。
- tier≥3：4~6 个橙红色随机光点（火焰）。
- tier≥4：双向旋转双光环。
- tier≥5：核心用 `createLinearGradient` 多色 HSL 彩虹渐变 + 3 重彩虹旋转光环。

## 5. 爆炸范围
- 基础半径 = `size × (1 + progress×4)`
- 倍率：tier≥3 ×1.5，tier≥4 ×2，tier≥5 ×3
- 爆炸渐变颜色使用当前 tier 主色（神级为动态彩虹）。

## 6. 拖尾粒子（getTrailParticle）
- 颜色：tier 主色（神级用动态 HSL 彩虹）。
- 大小：`size × tier.particleSize`。
- 类型：tier≥3 返回 `type='fire'`，否则 `'trail'`。
- 频率：tier≥4（传说及以上）拖尾间隔减半（0.02 → 0.01s），即生成频率翻倍。
- 附带修复：原 `update()` 在 `_trailTimer<=0` 时立即重置为正值，导致 `getTrailParticle()` 每帧都看到正值而返回 null（拖尾粒子实际不生成）。现改为：`update()` 只递减计时，由 `getTrailParticle()` 在生成粒子时重置间隔，拖尾粒子才真正生效。

## 7. 保持不变
- Bullet 对象池机制、BulletManager 接口、`init(config)` 参数签名全部保留；新增字段均有默认值。
- 边界反弹、锁定追踪、暴击伤害 ×2、狂暴红光、炮口闪光、金币经济逻辑未改动。
- 同屏炮弹上限仍为 50。

## 性能说明
- 所有新增绘制分支只在对应 tier 才执行；最高 tier（神级）每帧额外约 3 个弧 + 6 个火焰点 + 5 段弧线，同屏 50 发时新增路径数远低于每帧 200，配合 `lighter` 混合应能维持 55+ FPS。
- 未在 render 中创建任何除 CanvasGradient 外的长期对象；颜色字符串按需生成。

## 验证要点
- 倍率 100 vs 1000：颜色（青 vs 金）、尺寸（6.5 vs 11）、拖尾长度明显不同。
- 倍率 5000：紫色传说炮弹 + 环绕光环。
- 倍率 10000+：彩虹色核心 + 三重彩虹光环。
- 伤害线性：100→1，1000→10，10000→100。
- 控制台无报错；反弹、锁定、暴击、狂暴视觉正常。
