# 虾堡捕鱼达人H5 游戏 — 本机环境文档

> 版本：v1.0.0  
> 日期：2026-09-12  
> 文档类型：开发环境配置

---

## 一、开发机环境信息

### 1.1 硬件配置
| 项目 | 规格 |
|------|------|
| 操作系统 | Windows（具体版本以实际为准） |
| 处理器 | 以实际设备为准 |
| 内存 | 以实际设备为准 |
| 硬盘 | 以实际设备为准 |
| 显卡 | 以实际设备为准 |

### 1.2 软件环境
| 软件 | 版本 | 用途 |
|------|------|------|
| Node.js | v22.23.2 | JavaScript 运行时（本地服务器、构建工具） |
| npm | 10.9.8 | 包管理器 |
| 项目目录 | D:\sofa\aiproject\Fishing-Expert-doubao | 项目根目录 |

### 1.3 浏览器环境（开发测试）
| 浏览器 | 版本 | 用途 |
|--------|------|------|
| Chrome | 最新版 | 主力开发调试（DevTools 性能分析） |
| Edge | 最新版 | 兼容性测试 |
| Firefox | 最新版 | 兼容性测试 |
| Safari | 最新版 | 兼容性测试（需 macOS 或 iOS） |

---

## 二、项目运行方式

### 2.1 零依赖直接运行（推荐）

本项目采用原生 JavaScript ES6+，**无需安装任何依赖、无需构建**，开箱即用。

#### 方式一：直接打开 HTML
```
双击 index.html 即可在浏览器中运行
```
> 注意：直接打开 file:// 协议时，部分浏览器可能限制 ES6 Module 的加载。建议使用本地 HTTP 服务器。

#### 方式二：Node.js 内置 HTTP 服务器
```powershell
# 进入项目目录
cd D:\sofa\aiproject\Fishing-Expert-doubao

# 启动 Node.js 内置 HTTP 服务器（端口 8080）
npx serve . -l 8080
# 或
npx http-server . -p 8080
```

#### 方式三：Python HTTP 服务器（如已安装 Python）
```powershell
cd D:\sofa\aiproject\Fishing-Expert-doubao
python -m http.server 8080
```

#### 方式四：VS Code Live Server 插件
```
1. 安装 VS Code "Live Server" 插件
2. 右键 index.html → "Open with Live Server"
3. 自动打开 http://127.0.0.1:5500
```

启动后访问：**http://localhost:8080**

### 2.2 移动端测试

#### 方式一：局域网访问
```powershell
# 查看本机 IP
ipconfig

# 启动服务器（绑定 0.0.0.0）
npx serve . -l 8080 -L

# 手机浏览器访问 http://<本机IP>:8080
```
> 手机和电脑需连接同一 Wi-Fi 网络。

#### 方式二：Chrome DevTools 设备模拟
```
1. Chrome 打开游戏页面
2. F12 打开 DevTools
3. 点击设备切换按钮（Ctrl+Shift+M）
4. 选择 iPhone / Android 设备型号
5. 可模拟触屏、屏幕尺寸、网络速度
```

#### 方式三：真机 USB 调试（Android）
```
1. 手机开启 USB 调试
2. USB 连接电脑
3. Chrome 地址栏输入 chrome://inspect
4. 发现设备后点击 inspect
5. 在手机浏览器中打开游戏页面
```

---

## 三、目录结构说明

```
D:\sofa\aiproject\Fishing-Expert-doubao\
├── index.html              # 游戏入口页面
├── manifest.json           # PWA 应用清单
├── sw.js                   # Service Worker（离线缓存）
├── README.md               # 项目说明文档
├── css/
│   └── style.css           # 全局样式 + UI 主题
├── js/
│   ├── main.js             # 入口脚本
│   ├── config/             # 配置中心（JSON 驱动）
│   ├── core/               # 核心引擎
│   ├── render/             # 渲染层
│   ├── entities/           # 实体层
│   ├── systems/            # 系统层
│   ├── ui/                 # UI 层
│   └── ai/                 # AI 层
├── assets/
│   ├── images/             # 图片资源
│   └── audio/              # 音频资源
└── docs/                   # 项目文档
    ├── 01-execution-plan.md
    ├── 02-requirements.md
    ├── 03-architecture.md
    ├── 04-environment.md
    └── 05-market-research.md
```

---

## 四、开发工具推荐

### 4.1 代码编辑器
| 工具 | 推荐插件 | 用途 |
|------|----------|------|
| VS Code | ESLint, Prettier, Live Server, JavaScript and TypeScript | 主力编辑器 |
| WebStorm | 内置 | 商业级 IDE |

### 4.2 浏览器调试工具
| 工具 | 用途 |
|------|------|
| Chrome DevTools - Elements | DOM/CSS 调试 |
| Chrome DevTools - Console | 日志输出、错误排查 |
| Chrome DevTools - Sources | 断点调试、代码格式化 |
| Chrome DevTools - Network | 资源加载分析、性能优化 |
| Chrome DevTools - Performance | 帧率分析、CPU 占用、渲染性能 |
| Chrome DevTools - Memory | 内存泄漏排查、堆快照 |
| Chrome DevTools - Lighthouse | PWA 审计、性能评分、可访问性 |

### 4.3 性能分析
```javascript
// 游戏内置 FPS 监控（设置中开启）
// 显示实时 FPS、帧时间、粒子数量、鱼数量

// Chrome Performance 面板操作步骤：
1. F12 打开 DevTools
2. 切换到 Performance 标签
3. 点击录制按钮（或 Ctrl+E）
4. 操作游戏 5-10 秒
5. 停止录制
6. 分析帧率、脚本执行、渲染耗时
```

### 4.4 图片资源处理
| 工具 | 用途 |
|------|------|
| Squoosh (squoosh.app) | 图片压缩、WebP 转换（在线免费） |
| TinyPNG | PNG/JPG 压缩 |
| ImageMagick | 批量图片处理 |

### 4.5 音频资源处理
| 工具 | 用途 |
|------|------|
| Audacity | 音频编辑、格式转换（免费开源） |
| FFmpeg | 音频压缩、格式转换 |
| sfxr / jsfxr | 程序化音效生成（8-bit 风格，可参考） |

---

## 五、浏览器兼容性矩阵

### 5.1 支持的浏览器

| 浏览器 | 最低版本 | 支持程度 | 备注 |
|--------|----------|----------|------|
| Chrome (PC) | 80+ | 完全支持 | 主力测试浏览器 |
| Edge (PC) | 80+ | 完全支持 | Chromium 内核 |
| Firefox (PC) | 75+ | 完全支持 | 需测试 backdrop-filter |
| Safari (PC/Mac) | 14+ | 基本支持 | 需测试 Web Audio、CSS 特性 |
| Chrome (Android) | 80+ | 完全支持 | 移动端主力 |
| Safari (iOS) | 14+ | 基本支持 | 需测试触屏、安全区 |
| 微信内置浏览器 | 7.0+ | 基本支持 | 国内主流，需重点测试 |
| QQ 浏览器 | 10+ | 基本支持 | 国内主流 |
| UC 浏览器 | 13+ | 部分支持 | 可能需降级特效 |

### 5.2 特性检测与降级

```javascript
// 关键特性检测
const features = {
    canvas2D: !!document.createElement('canvas').getContext('2d'),
    webgl: (() => {
        try {
            const c = document.createElement('canvas');
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (e) { return false; }
    })(),
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    localStorage: (() => {
        try {
            localStorage.setItem('test', '1');
            localStorage.removeItem('test');
            return true;
        } catch (e) { return false; }
    })(),
    backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
    serviceWorker: 'serviceWorker' in navigator,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
};

// 降级策略
if (!features.webgl) {
    // 使用 Canvas2D 渲染
}
if (!features.webAudio) {
    // 使用 HTML5 Audio 或静音
}
if (!features.backdropFilter) {
    // 使用半透明背景代替磨砂玻璃
}
```

---

## 六、移动端适配配置

### 6.1 Viewport 设置
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

### 6.2 安全区适配
```css
/* 刘海屏 / 全面屏安全区 */
:root {
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
}

.top-bar {
    padding-top: calc(12px + var(--safe-top));
}

.bottom-bar {
    padding-bottom: calc(12px + var(--safe-bottom));
}
```

### 6.3 横竖屏处理
```css
/* 强制横屏（游戏推荐横屏） */
@media screen and (orientation: portrait) {
    .rotate-hint {
        display: flex; /* 显示旋转提示 */
    }
}

@media screen and (orientation: landscape) {
    .rotate-hint {
        display: none;
    }
}
```

### 6.4 多分辨率适配
```javascript
// 基于设计分辨率的缩放
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function calculateScale() {
    const scaleX = window.innerWidth / DESIGN_WIDTH;
    const scaleY = window.innerHeight / DESIGN_HEIGHT;
    return Math.min(scaleX, scaleY); // 等比缩放，保持比例
}

// rem 基准
document.documentElement.style.fontSize = 
    (window.innerWidth / 100) + 'px';
```

---

## 七、PWA 配置

### 7.1 注册 Service Worker
```javascript
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}
```

### 7.2 添加到桌面
- iOS：Safari 分享按钮 → "添加到主屏幕"
- Android：Chrome 菜单 → "添加到主屏幕"
- 添加后以全屏模式启动，隐藏浏览器地址栏

---

## 八、常见问题排查

### 8.1 ES6 Module 加载失败
**现象**：控制台报 "CORS policy" 或 "Failed to fetch module"  
**原因**：直接用 file:// 协议打开 HTML，浏览器限制 Module 加载  
**解决**：使用本地 HTTP 服务器运行（见 2.1 节）

### 8.2 移动端音效不播放
**现象**：移动端浏览器打开游戏没有声音  
**原因**：移动端浏览器要求音频必须在用户交互后才能播放  
**解决**：在首次点击/触摸时初始化并播放音频（AudioSystem 已处理）

### 8.3 游戏卡顿
**排查步骤**：
1. 开启 FPS 监控（设置中），观察 FPS
2. Chrome DevTools → Performance 录制分析
3. 检查是否粒子数量过多
4. 检查是否鱼群数量过多
5. 降低画质设置，观察是否改善

### 8.4 localStorage 被禁用
**现象**：存档不生效，刷新后数据丢失  
**原因**：浏览器隐私模式或用户禁用了 localStorage  
**解决**：使用内存存储作为兜底，提示用户开启存储权限

### 8.5 触屏点击不灵敏
**排查**：
1. 检查是否有 CSS `touch-action: none` 阻止默认行为
2. 检查按钮尺寸是否 ≥ 44×44px
3. 检查是否有 300ms 点击延迟（使用 `touchstart` 事件）

---

## 九、部署上线

### 9.1 静态资源部署
本项目为纯静态 H5 应用，可部署到任意静态资源服务器：

| 平台 | 方式 |
|------|------|
| Nginx | 将项目目录放到 nginx/html 下 |
| Apache | 放到 htdocs 目录 |
| 阿里云 OSS | 开启静态网站托管 |
| 腾讯云 COS | 开启静态网站托管 |
| GitHub Pages | 推送到 GitHub 仓库，开启 Pages |
| Vercel / Netlify | 连接 Git 仓库自动部署 |

### 9.2 Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/fishing-game;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_min_length 1024;

    # 缓存策略
    location ~* \.(js|css|png|jpg|webp|mp3|ogg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 9.3 HTTPS 配置
- PWA Service Worker 要求 HTTPS 环境（localhost 除外）
- 推荐使用 Let's Encrypt 免费 SSL 证书
- 配置 HTTP 强制跳转 HTTPS

---

## 十、版本管理

### 10.1 Git 初始化（推荐）
```powershell
cd D:\sofa\aiproject\Fishing-Expert-doubao
git init
git add .
git commit -m "Initial commit: 捕鱼达人·东海龙宫 v1.0.0"
```

### 10.2 .gitignore
```
node_modules/
.DS_Store
*.log
.vscode/
.idea/
dist/
```

---

*文档结束 — 环境配置如有变更请及时更新本文档*
