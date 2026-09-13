# 性能优化说明文档

## 概述
针对"玩一会就卡"的问题，对前端进行了 10 项深度性能优化。核心思路：**减少 GC 压力（对象池）、减少 Canvas 绘制开销（精灵缓存/静态层缓存）、减少每帧计算（缓存/分组）**。

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `frontend/js/entities/Fish.js` | VerletSystem 复用 |
| `frontend/js/entities/FishSchool.js` | Fish 对象池 + 景深分组 + 存活鱼缓存 + 动态鱼数 |
| `frontend/js/render/ParticleSystem.js` | Particle 对象池 + 精灵预渲染 + 粒子上限 |
| `frontend/js/entities/Bullet.js` | Bullet 对象池 |
| `frontend/js/render/Scene.js` | 静态背景离屏缓存 |
| `frontend/js/core/Game.js` | visibility 暂停 + accumulator 保护 + 动态鱼数 + 粒子上限 |

## 详细优化项

### 1. Fish 对象池（最关键）
- **问题**：每次 `new Fish()` 都创建新对象，鱼出框/死亡后直接丢弃，导致频繁 GC
- **修复**：在 FishManager 中实现对象池，预分配 20 个 Fish 对象
  - `_acquireFish()`：从池栈弹出，池空则新建
  - `_releaseFish()`：调用 `reset()` 清理状态后回收
  - 池最大容量 60，超出则丢弃
- **影响**：消除了鱼生成/销毁时的内存分配和 GC 暂停

### 2. Particle 对象池
- **问题**：每次 `burst/trail/spawnBubble` 等都 `new Particle()`，每秒可创建数百个
- **修复**：预分配 300 个 Particle 对象到池中，acquire/release 复用
- **粒子上限调整**：300（high）/ 200（medium）/ 100（low），原为 800/400/150
- **影响**：消除了粒子系统的 GC 压力，同时控制了最大渲染负载

### 3. VerletSystem 复用
- **问题**：`Fish._setupFinPhysics()` 每次 init 都 `new VerletSystem()`，创建节点和约束
- **修复**：复用已有的 VerletSystem，调用 `clear()` 清空节点后重建链
  - 首次 init 创建，后续 init 直接 clear + rebuild
  - `reset()` 不再将 `_finSys` 置 null
- **影响**：每条鱼复用物理系统，减少对象创建

### 4. Bullet 对象池
- **问题**：`BulletManager.fire()` 每次都 `new Bullet()`
- **修复**：在 BulletManager 中添加对象池，预分配复用
  - 池最大容量 80
  - 死亡/超限时释放回池而非丢弃
- **影响**：消除炮弹发射/销毁时的 GC

### 5. Scene 静态背景缓存
- **问题**：每帧全量重绘背景渐变、远山轮廓、龙宫建筑（含 createLinearGradient + 路径构建）
- **修复**：
  - `_farRidgeCanvas`：远景山脉预渲染到离屏画布
  - `_bgStaticCanvas`：深海渐变 + 龙宫轮廓预渲染
  - 颜色变化时自动重建（通过 color key 检测）
  - resize 时自动重建
  - 动态元素（海草、宫灯、鱼群、雾气）仍每帧重绘
- **影响**：每帧减少 2 次 createLinearGradient + 大量路径填充操作

### 6. 粒子渲染优化（消除 createRadialGradient）
- **问题**：每个粒子每帧 render 都调用 `createRadialGradient`，数百个粒子 = 数百次渐变创建
- **修复**：在 ParticleSystem 构造时预渲染 8 种软粒子精灵到 OffscreenCanvas：
  - default（白色软圆）、gold（金色）、bubble（气泡+高光）、flame（火焰）
  - scaleSpark（鱼鳞闪光）、waterFlow（水流）、gillBubble（鱼鳃气泡）、hitFlash（白闪）
  - trail（长条流光）
  - ink 和 spark 保持矢量绘制（数量少，有动画）
- **渲染时**：`drawImage(sprite, x, y, w, h)` + `globalAlpha` + `globalCompositeOperation`
- **影响**：每帧减少数百次 createRadialGradient 调用（Canvas2D 最昂贵的操作之一）

### 7. 游戏循环优化
- **visibilitychange**：标签页不可见时自动暂停，可见时恢复（重置时间戳）
- **accumulator 保护**：固定时间步累积器最多累积 5 帧（166ms），防止切回标签页时一次性追赶大量 update
- **暂停时仍 render**：保持暂停画面显示
- **影响**：避免后台标签页浪费 CPU/GPU，防止切回时的卡顿爆发

### 8. 减少每帧数组装箱
- **问题**：`getAllAliveFish()` 每帧被调用多次（aiBotManager、worldBossSystem、gillBubble），每次创建新数组
- **修复**：在 FishManager 中维护 `_aliveFishCache` 数组
  - `update()` 结束时标记 dirty
  - `getAllAliveFish()` 只在 dirty 时重建，返回缓存数组
  - 重建时复用同一数组（`length = 0` 后 push，不分配新数组）
- **影响**：每帧减少 2-3 次数组分配

### 9. Fish 渲染排序优化
- **问题**：`render()` 中 `[...this.fishes].sort()` 每帧创建新数组并排序
- **修复**：按 depth 维护三个数组（`_farFish` / `_midFish` / `_nearFish`）
  - 鱼生成时自动归入对应组
  - 鱼死亡时自动从组中移除
  - render 时依次遍历三个数组，无需排序
- **影响**：消除每帧数组拷贝 + 排序开销

### 10. 鱼数量动态调整
- **问题**：低性能设备上鱼数量过多导致卡顿
- **修复**：在 `_checkPerformance()` 中根据 FPS 自动调整：
  - FPS > 55：保持 100% 鱼数
  - FPS < 45：降低到 80%
  - FPS < 30：降低到 60%
  - 通过 `setDynamicFishMultiplier()` 实时调整
- **影响**：性能差时自动降载，性能好时恢复满负载

## 预期性能提升

| 优化项 | 预期 FPS 提升 | 说明 |
|--------|-------------|------|
| Fish 对象池 | +5~10 FPS | 消除高频 GC 暂停 |
| Particle 对象池 + 精灵缓存 | +10~20 FPS | 消除 createRadialGradient 瓶颈 |
| Scene 静态缓存 | +3~5 FPS | 减少背景渐变/路径重绘 |
| 存活鱼缓存 | +1~2 FPS | 减少数组分配 |
| 景深分组渲染 | +1~2 FPS | 消除每帧 sort |
| 动态鱼数调整 | 自适应 | 低帧率时自动减负 |

**综合预期**：在中端设备上从"玩一会就卡"（20~30 FPS）提升到稳定 45~55 FPS。

## 注意事项
- 所有修改保持现有功能不变（碰撞、反弹、技能、BOSS）
- 对象池 acquire 时调用 init/reset 清理状态，release 时再次 reset
- 控制台应 0 错误
- 粒子精灵在 `document` 可用时初始化（浏览器环境，无 SSR 问题）
