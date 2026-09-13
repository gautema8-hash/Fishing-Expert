# v3.1 七项升级修复说明

## 1. 豪华炮台（AI生成 + 画布最顶层）
- **AI图片**：生成豪华国风龙纹炮台（鎏金琉璃材质、翡翠镶嵌、发光符文），保存为 `frontend/assets/cannon/cannon-luxury.png`
- **渲染方式**：Cannon.js 改用 drawImage 绘制120×120炮台图片，炮管随瞄准角度旋转（angle + PI/2），保留炮口闪光、流光环绕、狂暴红光特效
- **最顶层**：炮台从 game 层（z=3）移至 ui 层（z=6），位于鱼群、炮弹、粒子特效、所有画面元素之上，不被遮挡

## 2. 单次点击发射（修复连发）
- **问题根因**：mousemove/touchmove 事件中按住鼠标时持续调用 `_fireBullet()`，导致拖动连发
- **修复**：删除 mousemove 和 touchmove 中的连续发射逻辑，只保留瞄准；mousedown/touchstart 每次只发射一发
- **防抖**：`_fireBullet()` 添加200ms最小发射间隔，防止极快双击
- **自动开火**：autoFire 功能不受影响（在 update 中独立处理）

## 3. 巨型BOSS龙（不局限于屏幕内）
- **尺寸**：dragonking size 200→350，imageScale 2.5→3.0，实际显示宽度达 **1050px**
- **边界放宽**：原严格限制在屏幕内（x≥100, x≤width-100），改为允许身体大部分出屏（halfBoss=size×1.5）
- **出场**：从屏幕外400px远处缓慢游入，压迫感更强
- **属性**：hp 5000→15000，score 10000→30000，speed 30→20（更缓慢威严）
- **碰撞盒**：getCollisionRadius 0.8→0.6（略小于视觉尺寸，避免空打感）
- **血条**：加宽至400px、加高至20px、上移至y=60，添加金色发光效果

## 4. 鱼群数量增加3倍
- **同屏上限**：35→90条（levelConfig: 30→90，每关+3）
- **对象池**：预热40→120个，池上限80→200
- **生成速率**：minInterval 0.5→0.3s，maxInterval 1.5→0.8s，单次最多生成5→8条
- **最低保障**：低于20条立即补生成→低于60条立即补生成
- **性能**：FPS自适应降级机制保留，低性能时自动降载

## 5. 倍率100起步，无上限，每次+100
- **配置**：gameConfig.js minLevel 1→100，maxLevel 10→999999
- **初始值**：Cannon.level 1→100
- **步进**：upgrade() level++ → level+=100；downgrade() level-- → level-=100
- **消耗**：炮弹消耗 = baseBulletCost(10) × level，100倍率消耗1000金币/发
- **UI**：炮台和底部栏同步显示 ×100、×200、×300...

## 6. 去掉BOSS名称文字，只留血条
- **删除**：Boss.js `_renderHealthBar()` 中的 `fillText('中国金龙')` 名称绘制
- **toast提示**：Game.js 中3处BOSS相关toast（即将降临/出现/被击杀）中的"中国金龙"改为通用"BOSS"
- **保留**：fishConfig.js 内部 name 字段（程序内部使用，不显示在画面上）

## 7. 立即签到功能测试与修复
- **发现bug**：TopBar顶部按钮和UIManager弹窗内按钮都使用 `id="signin-btn"`，导致 `getElementById` 绑定到错误的元素，弹窗内"立即签到"按钮从未绑定点击事件
- **修复**：弹窗内按钮id改为 `signin-claim-btn`，`_bindSignInButton()` 同步更新选择器
- **额外修复**：原代码第7天签到未发放锁定道具，已补充 `itemSystem.addItem('lock', 1)`
- **验证通过**：
  - 第1天：+1000金币，按钮变"今日已签到"disabled，日历显示✓
  - 重开弹窗保持已签到状态
  - 第7天：+10000金币 + 5钻石 + 1锁定道具
  - 签到状态持久化（刷新后仍显示已签到）

## 修改文件清单
| 文件 | 修改内容 |
|------|----------|
| `frontend/assets/cannon/cannon-luxury.png` | 新建 - AI豪华炮台图片 |
| `frontend/js/entities/Cannon.js` | 图片渲染+level=100+步进100+炮口位置 |
| `frontend/js/core/Game.js` | 炮台移至ui层+删除连发+200ms防抖+签到按钮修复+道具发放+toast去名称+初始倍率同步 |
| `frontend/js/config/gameConfig.js` | minLevel=100, maxLevel=999999 |
| `frontend/js/ui/UIManager.js` | 签到按钮id改为signin-claim-btn |
| `frontend/js/entities/Boss.js` | 边界放宽+碰撞盒0.6+血条优化+删除名称文字 |
| `frontend/js/entities/FishSchool.js` | 鱼数90+对象池120+生成间隔缩短+出场距离+400 |
| `frontend/js/config/fishConfig.js` | dragonking巨型化参数+spawnSystem加速 |
| `frontend/js/config/levelConfig.js` | maxFish 90+(lv-1)*3 |
| `frontend/index.html` | 内联favicon修复404 |

## Git
- Commit: `a0c2b5e` - "feat: 豪华炮台+单次发射+巨型BOSS+3倍鱼群+百倍倍率+去BOSS名+签到测试"
- 已推送至 origin/main
