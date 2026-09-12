# 捕鱼达人·东海龙宫 后端API接口文档

## 基础信息

| 项目 | 说明 |
|------|------|
| 服务地址 | `http://localhost:8081/api` |
| 认证方式 | JWT Bearer Token |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| API文档 | `http://localhost:8081/api/doc.html` (Knife4j) |

## 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1700000000000
}
```

### 错误码说明

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证/Token过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 1001 | 用户不存在 |
| 1002 | 密码错误 |
| 1003 | 用户已存在 |
| 1004 | 金币不足 |
| 1005 | 钻石不足 |
| 1006 | 账号已封禁 |
| 1011 | 今日已领取 |
| 1012 | 兑换码无效 |
| 1013 | 兑换码已使用 |

---

## 1. 认证模块 `/auth`

### 1.1 注册
- **POST** `/auth/register`
- **无需认证**
- 请求体：
```json
{
  "username": "player001",
  "password": "123456",
  "nickname": "龙宫玩家",
  "phone": "13800138000"
}
```
- 响应：`{ "token": "xxx", "playerId": "xxx" }`

### 1.2 登录
- **POST** `/auth/login`
- **无需认证**
- 请求体：`{ "username": "player001", "password": "123456" }`
- 响应：`{ "token": "xxx", "playerId": "xxx" }`

### 1.3 游客登录
- **POST** `/auth/guest`
- **无需认证**
- 响应：`{ "token": "xxx", "playerId": "xxx", "isGuest": true }`

---

## 2. 玩家模块 `/player`

### 2.1 获取玩家信息
- **GET** `/player/info`
- 响应：玩家完整信息（金币/钻石/等级/VIP/装备等）

### 2.2 更新玩家信息
- **PUT** `/player/update`
- 请求体：`{ "nickname": "新昵称", "avatar": "avatar_url" }`

### 2.3 获取玩家统计
- **GET** `/player/stats`
- 响应：总击杀/总发射/总暴击/总获得金币

---

## 3. 经济模块 `/economy`

### 3.1 消耗金币
- **POST** `/economy/spend`
- 请求体：`{ "amount": 100, "reason": "发射炮弹" }`
- 响应：`{ "coins": 9900, "spent": 100 }`

### 3.2 获得金币
- **POST** `/economy/add`
- 请求体：`{ "amount": 500, "isCrit": false, "reason": "击杀鱼类" }`
- 响应：`{ "coins": 10400, "added": 500, "isCrit": false }`

### 3.3 消耗钻石
- **POST** `/economy/spend-diamonds`
- 请求体：`{ "amount": 5, "reason": "购买道具" }`

### 3.4 获得钻石
- **POST** `/economy/add-diamonds`
- 请求体：`{ "amount": 10, "reason": "任务奖励" }`

### 3.5 获取经济信息
- **GET** `/economy/info`
- 响应：`{ "coins": 10000, "diamonds": 10 }`

---

## 4. 游戏记录模块 `/game`

### 4.1 提交游戏记录
- **POST** `/game/record`
- 请求体：
```json
{
  "level": 5,
  "score": 15000,
  "kills": 50,
  "bulletsFired": 200,
  "coinsEarned": 8000,
  "bossKilled": 1,
  "duration": 300
}
```

### 4.2 获取游戏历史
- **GET** `/game/history?page=1&size=10`

---

## 5. 签到模块 `/signin`

### 5.1 每日签到
- **POST** `/signin/daily`
- 响应：`{ "day": 3, "rewardCoins": 1000, "continuousDays": 7 }`

### 5.2 获取签到记录
- **GET** `/signin/records`

---

## 6. 邮件模块 `/mail`

### 6.1 获取邮件列表
- **GET** `/mail/list?page=1&size=20`

### 6.2 读取邮件
- **POST** `/mail/{id}/read`

### 6.3 领取邮件附件
- **POST** `/mail/{id}/claim`

### 6.4 删除邮件
- **DELETE** `/mail/{id}`

---

## 7. 兑换码模块 `/redemption`

### 7.1 兑换码兑换
- **POST** `/redemption/redeem`
- 请求体：`{ "code": "FISHING2024" }`
- 响应：`{ "rewards": { "coins": 5000, "diamonds": 5 } }`

---

## 8. 公会模块 `/guild`

### 8.1 创建公会
- **POST** `/guild/create`
- 请求体：`{ "guildName": "龙宫公会", "description": "欢迎加入" }`

### 8.2 获取公会列表
- **GET** `/guild/list?page=1&size=20`

### 8.3 加入公会
- **POST** `/guild/{guildId}/join`

### 8.4 退出公会
- **POST** `/guild/leave`

### 8.5 获取公会详情
- **GET** `/guild/{guildId}`

---

## 9. 好友模块 `/friend`

### 9.1 获取好友列表
- **GET** `/friend/list`

### 9.2 添加好友
- **POST** `/friend/add/{playerId}`

### 9.3 处理好友请求
- **POST** `/friend/handle/{requestId}`
- 请求体：`{ "accept": true }`

### 9.4 删除好友
- **DELETE** `/friend/{friendId}`

---

## 10. 赛季模块 `/season`

### 10.1 获取当前赛季
- **GET** `/season/current`

### 10.2 获取玩家赛季信息
- **GET** `/season/player-info`

### 10.3 领取赛季奖励
- **POST** `/season/claim/{level}`

---

## 11. 商城模块 `/shop`

### 11.1 获取商品列表
- **GET** `/shop/list`

### 11.2 创建订单
- **POST** `/shop/order`
- 请求体：`{ "productId": "coin_pack_1", "amount": 6 }`

### 11.3 支付回调（模拟）
- **POST** `/shop/pay-callback`
- 请求体：`{ "orderNo": "xxx", "status": "paid" }`

---

## 12. 排行榜模块 `/leaderboard`

### 12.1 获取排行榜
- **GET** `/leaderboard/{type}?top=10`
- type: `coins` / `kills` / `level` / `weekly_coins`

### 12.2 获取玩家排名
- **GET** `/leaderboard/rank/{type}`

### 12.3 获取全部榜单摘要
- **GET** `/leaderboard/summary`

---

## 13. 防沉迷模块 `/anti-addiction`

### 13.1 提交实名认证
- **POST** `/anti-addiction/verify`
- 请求体：`{ "realName": "张三", "idCard": "110101199001011234" }`

### 13.2 获取认证状态
- **GET** `/anti-addiction/status`

### 13.3 检查游戏权限
- **GET** `/anti-addiction/check`
- 响应：`{ "allowed": true, "remainingMinutes": 60 }`

---

## 14. 装备模块 `/equipment`

### 14.1 获取装备列表
- **GET** `/equipment/list`

### 14.2 穿戴装备
- **POST** `/equipment/{id}/equip`

### 14.3 卸下装备
- **POST** `/equipment/{id}/unequip`

### 14.4 强化装备
- **POST** `/equipment/{id}/enhance`
- 响应：`{ "success": true, "enhanceLevel": 3, "cost": 3000 }`

### 14.5 分解装备
- **POST** `/equipment/{id}/decompose`
- 响应：`{ "refundCoins": 5000, "coins": 15000 }`

---

## 15. 宠物模块 `/pet`

### 15.1 获取宠物列表
- **GET** `/pet/list`

### 15.2 激活宠物
- **POST** `/pet/{petType}/activate`

### 15.3 宠物升级
- **POST** `/pet/{petType}/upgrade`

### 15.4 宠物升星
- **POST** `/pet/{petType}/star-up`

---

## 16. 成就模块 `/achievement`

### 16.1 获取成就列表
- **GET** `/achievement/list`

### 16.2 领取成就奖励
- **POST** `/achievement/{achievementId}/claim`

### 16.3 获取成就统计
- **GET** `/achievement/stats`

---

## 17. 任务模块 `/task`

### 17.1 获取任务列表
- **GET** `/task/list`

### 17.2 领取任务奖励
- **POST** `/task/{taskId}/claim`

---

## 18. VIP模块 `/vip`

### 18.1 获取VIP信息
- **GET** `/vip/info`
- 响应：VIP等级/累计充值/下一级进度/特权列表

### 18.2 领取每日VIP礼包
- **POST** `/vip/daily-gift`

### 18.3 获取所有VIP特权
- **GET** `/vip/privileges`

---

## 19. 数据看板模块 `/dashboard`（运营后台）

### 19.1 运营总览
- **GET** `/dashboard/overview`
- 响应：总玩家/活跃玩家/今日新增/今日登录/订单数/在线人数

### 19.2 注册趋势
- **GET** `/dashboard/registration-trend`
- 响应：近7天注册数据

### 19.3 收入趋势
- **GET** `/dashboard/revenue-trend`
- 响应：近7天收入数据

### 19.4 TOP玩家
- **GET** `/dashboard/top-players`

### 19.5 系统健康
- **GET** `/dashboard/health`

---

## 20. 运营邮件模块 `/admin/mail`（后台）

### 20.1 全服群发邮件
- **POST** `/admin/mail/send-all`
- 请求体：`{ "title": "公告", "content": "内容", "attachments": "{...}" }`

### 20.2 向指定玩家发邮件
- **POST** `/admin/mail/send-to-player`

### 20.3 发送补偿邮件
- **POST** `/admin/mail/compensation`

### 20.4 发送活动公告
- **POST** `/admin/mail/announcement`

---

## 21. 反作弊模块 `/anti-cheat`

### 21.1 获取风控状态
- **GET** `/anti-cheat/stats`
- 响应：风险分/风险等级/账号状态

### 21.2 管理员解封
- **POST** `/anti-cheat/unban/{playerId}`

---

## 22. 数据埋点模块 `/analytics`

### 22.1 上报事件
- **POST** `/analytics/event`
- 请求体：
```json
{
  "eventName": "level_complete",
  "eventData": "{\"level\":5,\"score\":15000}",
  "sessionId": "xxx"
}
```

---

## 认证说明

所有需要认证的接口，请求头需携带：
```
Authorization: Bearer {token}
```

Token有效期24小时，过期后需重新登录。

## 限流说明

- 登录接口：每分钟最多5次
- 经济操作：每秒最多10次
- 游戏记录：每秒最多5次
- 超出限流返回429状态码

## 游戏内货币声明

游戏内金币、钻石均为纯游戏虚拟道具，不可兑换现金，不可交易，仅游戏内部消耗使用。
