/**
 * 工具库
 * 数学、碰撞、随机、颜色等通用工具函数
 */

export const Utils = {
    // ===== 数学工具 =====
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // 角度插值（处理 360 度环绕）
    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    },

    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // 角度转弧度
    degToRad(deg) {
        return deg * Math.PI / 180;
    },

    // 弧度转角度
    radToDeg(rad) {
        return rad * 180 / Math.PI;
    },

    // ===== 随机工具 =====
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // 加权随机选择
    weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        for (const item of items) {
            random -= item.weight;
            if (random <= 0) return item;
        }
        return items[items.length - 1];
    },

    // 随机选择数组元素
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    // 正态分布随机（Box-Muller）
    randomNormal(mean = 0, stdDev = 1) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * stdDev;
    },

    // ===== 碰撞检测 =====
    // 圆形碰撞
    circleCollision(x1, y1, r1, x2, y2, r2) {
        return this.distanceSq(x1, y1, x2, y2) < (r1 + r2) * (r1 + r2);
    },

    // 点在圆内
    pointInCircle(px, py, cx, cy, r) {
        return this.distanceSq(px, py, cx, cy) < r * r;
    },

    // 矩形碰撞
    rectCollision(r1, r2) {
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    },

    // ===== 颜色工具 =====
    // 十六进制转 RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    // RGB 转十六进制
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // 颜色插值
    lerpColor(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        return this.rgbToHex(
            this.lerp(c1.r, c2.r, t),
            this.lerp(c1.g, c2.g, t),
            this.lerp(c1.b, c2.b, t)
        );
    },

    // 带透明度的颜色字符串
    rgba(hex, alpha) {
        const c = this.hexToRgb(hex);
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
    },

    // ===== 字符串工具 =====
    // 数字格式化（10000 -> 1万）
    formatNumber(num) {
        if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
        if (num >= 10000) return (num / 10000).toFixed(1) + '万';
        return Math.floor(num).toString();
    },

    /**
     * 金币大数字格式化（万/亿/万亿单位）
     * - 小于10000：直接显示千分位数字（如 9,999）
     * - 1万~1亿：显示 "X.XX万"（如 1.23万）
     * - 1亿~1万亿：显示 "X.XX亿"（如 12.34亿）
     * - 超过1万亿：显示 "X.XX万亿"（如 1.23万亿）
     * 保留2位小数并去除末尾多余的0（1.20亿 -> 1.2亿）
     * @param {number} amount 金币数量
     * @returns {string} 格式化后的字符串
     */
    formatCoin(amount) {
        const num = Number(amount) || 0;
        const abs = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        // 小于1万：千分位整数显示
        if (abs < 10000) {
            return sign + Math.floor(abs).toLocaleString('en-US');
        }
        // 1万亿及以上：X.XX万亿
        if (abs >= 1e12) {
            return sign + this._trimZeros(abs / 1e12) + '万亿';
        }
        // 1亿 ~ 1万亿：X.XX亿
        if (abs >= 1e8) {
            return sign + this._trimZeros(abs / 1e8) + '亿';
        }
        // 1万 ~ 1亿：X.XX万
        return sign + this._trimZeros(abs / 1e4) + '万';
    },

    /**
     * 保留2位小数并去除末尾多余的0与小数点
     * 1.20 -> 1.2；1.00 -> 1；12.34 -> 12.34
     */
    _trimZeros(value) {
        return value.toFixed(2).replace(/\.?0+$/, '');
    },

    // 生成唯一 ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // ===== 时间工具 =====
    // 获取今天日期字符串 YYYY-MM-DD
    getTodayString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    // 计算两个日期相差天数
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },

    // ===== 设备检测 =====
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    },

    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    // 检测 WebGL 支持
    supportsWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    },

    // 检测 backdrop-filter 支持
    supportsBackdropFilter() {
        return CSS.supports('backdrop-filter', 'blur(10px)') ||
               CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
    },

    // ===== 缓动函数 =====
    easeOutQuad(t) { return t * (2 - t); },
    easeInQuad(t) { return t * t; },
    easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    easeOutCubic(t) { return (--t) * t * t + 1; },
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeOutBounce(t) {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
};
