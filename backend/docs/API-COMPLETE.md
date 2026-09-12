# 捕鱼达人·东海龙宫 - 后端API完整文档

## 基本信息

- **基础URL**: `http://localhost:8081/api`
- **认证方式**: JWT Bearer Token（Header: `Authorization: Bearer {token}`）
- **响应格式**: 统一JSON `{ code, message, data, timestamp }`
- **API文档**: `http://localhost:8081/api/doc.html`（Knife4j）
- **健康检查**: `http://localhost:8081/api/actuator/health`

## 响应状态码

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证/Token过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 一、认证模块（3个接口）

### 1.1 玩家注册
- **POST** `/auth/register`
- **请求**: `{ phone, password, nickname }`
- **响应**: `{ token, playerId }`

### 1.2 玩家登录
- **POST** `/auth/login`
- **请求**: `{ phone, password }`
- **响应**: `{ token, playerId }`

### 1.3 游客登录
- **POST** `/auth/guest`
- **响应**: `{ token, playerId }`

---

## 二、玩家模块（4个接口）

### 2.1 获取玩家信息
- **GET** `/player/info`
- **响应**: 玩家完整信息（金币/钻石/等级/VIP/装备/宠物等）

### 2.2 更新玩家资料
- **PUT** `/player/update`
- **请求**: `{ nickname, avatar }`

### 2.3 获取玩家背包
- **GET** `/player/inventory`

### 2.4 获取玩家统计
- **GET** `/player/stats`

---

## 三、经济模块（6个接口）

### 3.1 获取经济信息
- **GET** `/economy/info`

### 3.2 消耗金币
- **POST** `/economy/spend`
- **请求**: `{ amount, reason }`

### 3.3 增加金币
- **POST** `/economy/add`
- **请求**: `{ amount, isCrit }`

### 3.4 增加钻石
- **POST** `/economy/add-diamonds`
- **请求**: `{ amount }`

### 3.5 消耗钻石
- **POST** `/economy/spend-diamonds`
- **请求**: `{ amount }`

### 3.6 获取金币流水
- **GET** `/economy/transactions?page=1&size=20`

---

## 四、游戏记录模块（3个接口）

### 4.1 保存游戏记录
- **POST** `/game/record`
- **请求**: `{ level, score, kills, bulletsFired, coinsEarned, bossKilled, duration }`

### 4.2 获取游戏记录
- **GET** `/game/records?page=1&size=20`

### 4.3 获取最佳记录
- **GET** `/game/best`

---

## 五、签到模块（3个接口）

### 5.1 每日签到
- **POST** `/signin/daily`

### 5.2 获取签到记录
- **GET** `/signin/records`

### 5.3 获取签到状态
- **GET** `/signin/status`

---

## 六、邮件模块（5个接口）

### 6.1 获取邮件列表
- **GET** `/mail/list?page=1&size=20`

### 6.2 读取邮件
- **PUT** `/mail/{mailId}/read`

### 6.3 领取邮件附件
- **POST** `/mail/{mailId}/claim`

### 6.4 获取未读邮件数量
- **GET** `/mail/unread-count`

### 6.5 一键领取所有附件
- **POST** `/mail/claim-all`

---

## 七、兑换码模块（2个接口）

### 7.1 使用兑换码
- **POST** `/redemption/redeem`
- **请求**: `{ code }`

### 7.2 获取兑换记录
- **GET** `/redemption/records`

---

## 八、公会模块（6个接口）

### 8.1 创建公会
- **POST** `/guild/create`
- **请求**: `{ guildName, description }`

### 8.2 加入公会
- **POST** `/guild/{guildId}/join`

### 8.3 退出公会
- **POST** `/guild/leave`

### 8.4 获取公会信息
- **GET** `/guild/{guildId}`

### 8.5 获取公会列表
- **GET** `/guild/list?page=1&size=20`

### 8.6 公会捐献
- **POST** `/guild/donate`
- **请求**: `{ amount }`

---

## 九、好友模块（5个接口）

### 9.1 添加好友
- **POST** `/friend/add/{friendId}`

### 9.2 删除好友
- **DELETE** `/friend/{friendId}`

### 9.3 获取好友列表
- **GET** `/friend/list`

### 9.4 搜索玩家
- **GET** `/friend/search?keyword=xxx`

### 9.5 获取好友请求
- **GET** `/friend/requests`

---

## 十、赛季模块（4个接口）

### 10.1 获取当前赛季
- **GET** `/season/current`

### 10.2 获取玩家赛季信息
- **GET** `/season/player-info`

### 10.3 领取赛季奖励
- **POST** `/season/claim/{level}`

### 10.4 购买高级通行证
- **POST** `/season/buy-premium`

---

## 十一、商城模块（4个接口）

### 11.1 获取商品列表
- **GET** `/shop/products`

### 11.2 创建订单
- **POST** `/shop/order`
- **请求**: `{ productId, productName, amount }`

### 11.3 支付回调
- **POST** `/shop/pay-callback`
- **请求**: `{ orderNo, payType, transactionId }`

### 11.4 获取订单列表
- **GET** `/shop/orders`

---

## 十二、支付充值模块（4个接口）

### 12.1 获取充值商品列表
- **GET** `/payment/products`
- **响应**: 6档商品（6/30/68/128/328/648元）

### 12.2 创建充值订单
- **POST** `/payment/create-order`
- **请求**: `{ productId, payMethod }`
- **响应**: `{ orderNo, payParams, amount, coins, diamonds }`

### 12.3 支付回调（模拟）
- **POST** `/payment/callback`
- **请求**: `{ orderNo, transactionId }`

### 12.4 获取我的充值订单
- **GET** `/payment/my-orders?page=1&size=20`

---

## 十三、排行榜模块（4个接口）

### 13.1 获取排行榜
- **GET** `/leaderboard/{type}?top=10`
- **type**: coins/kills/level/weekly_coins

### 13.2 获取玩家排名
- **GET** `/leaderboard/rank/{type}`

### 13.3 刷新排行榜
- **POST** `/leaderboard/refresh`

### 13.4 获取周榜
- **GET** `/leaderboard/weekly`

---

## 十四、防沉迷模块（3个接口）

### 14.1 提交实名认证
- **POST** `/anti-addiction/verify`
- **请求**: `{ realName, idCard }`

### 14.2 检查游戏权限
- **GET** `/anti-addiction/check`
- **响应**: `{ allowed, reason, remainingTime }`

### 14.3 获取实名认证状态
- **GET** `/anti-addiction/status`

---

## 十五、反作弊模块（3个接口）

### 15.1 获取玩家风控状态
- **GET** `/anti-cheat/status`

### 15.2 上报可疑行为
- **POST** `/anti-cheat/report`
- **请求**: `{ behaviorType, details }`

### 15.3 获取封禁列表
- **GET** `/anti-cheat/banned-list`

---

## 十六、装备模块（4个接口）

### 16.1 获取装备列表
- **GET** `/equipment/list`

### 16.2 穿戴装备
- **POST** `/equipment/{equipId}/equip`

### 16.3 强化装备
- **POST** `/equipment/{equipId}/enhance`

### 16.4 分解装备
- **POST** `/equipment/{equipId}/decompose`

---

## 十七、宠物模块（4个接口）

### 17.1 获取宠物列表
- **GET** `/pet/list`

### 17.2 激活宠物
- **POST** `/pet/{petType}/activate`

### 17.3 宠物升级
- **POST** `/pet/{petType}/upgrade`

### 17.4 设置出战宠物
- **POST** `/pet/{petType}/set-active`

---

## 十八、成就模块（3个接口）

### 18.1 获取成就列表
- **GET** `/achievement/list`

### 18.2 领取成就奖励
- **POST** `/achievement/{achievementId}/claim`

### 18.3 获取成就进度
- **GET** `/achievement/progress`

---

## 十九、任务模块（3个接口）

### 19.1 获取任务列表
- **GET** `/task/list`

### 19.2 领取任务奖励
- **POST** `/task/{taskId}/claim`

### 19.3 更新任务进度
- **POST** `/task/update-progress`

---

## 二十、VIP模块（3个接口）

### 20.1 获取VIP信息
- **GET** `/vip/info`

### 20.2 领取VIP每日礼包
- **POST** `/vip/daily-gift`

### 20.3 获取VIP特权列表
- **GET** `/vip/privileges`

---

## 二十一、世界BOSS模块（4个接口）

### 21.1 获取BOSS状态
- **GET** `/world-boss/status`

### 21.2 对BOSS造成伤害
- **POST** `/world-boss/damage`
- **请求**: `{ damage, nickname }`

### 21.3 获取伤害排名
- **GET** `/world-boss/ranking?top=10`

### 21.4 运营召唤BOSS
- **POST** `/world-boss/summon?bossLevel=1`

---

## 二十二、功能开关模块（3个接口）

### 22.1 获取所有功能开关
- **GET** `/feature-flags/all`

### 22.2 检查功能是否启用
- **GET** `/feature-flags/{featureName}`

### 22.3 切换功能状态
- **POST** `/feature-flags/{featureName}/toggle`

---

## 二十三、通知推送模块（4个接口）

### 23.1 获取当前系统公告
- **GET** `/notification/announcement`

### 23.2 获取滚动消息
- **GET** `/notification/scroll`

### 23.3 获取活动列表
- **GET** `/notification/activities`

### 23.4 发送全服邮件（运营）
- **POST** `/notification/global-mail`
- **请求**: `{ title, content, coins, diamonds, expireDays }`

---

## 二十四、系统配置模块（3个接口）

### 24.1 获取所有配置
- **GET** `/system-config/all`

### 24.2 获取单个配置
- **GET** `/system-config/{key}`

### 24.3 更新配置
- **POST** `/system-config/update`
- **请求**: `{ key, value }`

---

## 二十五、数据看板模块（4个接口）

### 25.1 获取玩家数据看板
- **GET** `/dashboard/player`

### 25.2 获取游戏统计
- **GET** `/dashboard/game-stats`

### 25.3 获取经济统计
- **GET** `/dashboard/economy`

### 25.4 获取实时在线
- **GET** `/dashboard/online`

---

## 二十六、数据导出模块（2个接口）

### 26.1 导出玩家列表Excel
- **GET** `/export/players`
- **响应**: Excel文件下载

### 26.2 导出游戏记录Excel
- **GET** `/export/game-records?playerId=xxx`
- **响应**: Excel文件下载

---

## 二十七、运营管理模块（14个接口）

### 操作日志
- **GET** `/admin/logs/player/{playerId}?page=1&size=20`
- **GET** `/admin/logs/type/{opType}?page=1&size=20`
- **GET** `/admin/logs/failed?page=1&size=20`
- **POST** `/admin/logs/clean?keepDays=30`

### IP封禁
- **GET** `/admin/ip/check?ip=xxx`
- **POST** `/admin/ip/ban-permanent` - `{ ip, reason, operator }`
- **POST** `/admin/ip/ban-temporary` - `{ ip, reason, hours, operator }`
- **POST** `/admin/ip/unban?ip=xxx`
- **GET** `/admin/ip/list?page=1&size=20`

### 数据统计
- **GET** `/admin/stats/overview`
- **GET** `/admin/stats/daily?startDate=2024-01-01&endDate=2024-01-31`
- **GET** `/admin/stats/recent?days=7`
- **POST** `/admin/stats/aggregate?date=2024-01-01`

---

## 二十八、埋点分析模块（2个接口）

### 28.1 上报埋点事件
- **POST** `/analytics/event`
- **请求**: `{ eventType, eventName, eventData, deviceInfo }`

### 28.2 获取埋点统计
- **GET** `/analytics/stats`

---

## 二十九、批量操作模块（4个接口）

### 29.1 批量发放金币
- **POST** `/admin/batch/grant-coins`
- **请求**: `{ playerIds: [], amount, reason }`

### 29.2 批量封禁玩家
- **POST** `/admin/batch/ban`
- **请求**: `{ playerIds: [], reason }`

### 29.3 批量解封玩家
- **POST** `/admin/batch/unban`
- **请求**: `{ playerIds: [] }`

### 29.4 按条件批量查询玩家
- **GET** `/admin/batch/query?status=1&minVipLevel=1&minCoins=1000&limit=100`

---

## 接口统计

| 模块 | 接口数 |
|------|--------|
| 认证 | 3 |
| 玩家 | 4 |
| 经济 | 6 |
| 游戏记录 | 3 |
| 签到 | 3 |
| 邮件 | 5 |
| 兑换码 | 2 |
| 公会 | 6 |
| 好友 | 5 |
| 赛季 | 4 |
| 商城 | 4 |
| 支付充值 | 4 |
| 排行榜 | 4 |
| 防沉迷 | 3 |
| 反作弊 | 3 |
| 装备 | 4 |
| 宠物 | 4 |
| 成就 | 3 |
| 任务 | 3 |
| VIP | 3 |
| 世界BOSS | 4 |
| 功能开关 | 3 |
| 通知推送 | 4 |
| 系统配置 | 3 |
| 数据看板 | 4 |
| 数据导出 | 2 |
| 运营管理 | 14 |
| 埋点分析 | 2 |
| 批量操作 | 4 |
| **合计** | **130+** |

---

## WebSocket接口

- **连接地址**: `ws://localhost:8081/api/ws/game?roomId=xxx&token=xxx`
- **消息类型**: join/leave/fire/hit/kill/chat/sync/system
- **房间容量**: 最多4人同屏捕鱼

---

## 注意事项

1. 所有需要认证的接口必须在Header中携带JWT Token
2. 游戏内金币为纯游戏虚拟道具，不可兑换现金，仅游戏内部消耗使用
3. 敏感操作（金币增减、捕获判定、付费）走服务端校验
4. 接口限流：默认每分钟60次，经济接口每分钟20次
5. 未成年人仅周五/六/日及法定节假日20:00-21:00可游戏
