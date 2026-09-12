/**
 * 游戏入口
 * 初始化游戏，启动主循环
 */
import { Game } from './core/Game.js';

// roundRect 兼容性 polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'number') radius = [radius, radius, radius, radius];
        else if (Array.isArray(radius) && radius.length === 1) radius = [radius[0], radius[0], radius[0], radius[0]];
        const [tl, tr, br, bl] = radius;
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + width - tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + tr);
        this.lineTo(x + width, y + height - br);
        this.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
        this.lineTo(x + bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) {
        console.error('[Main] 找不到游戏容器 #game-container');
        return;
    }

    // 创建游戏实例
    const game = new Game(container);

    // 初始化
    game.init().then(() => {
        console.log('[Main] 游戏启动成功');
        // 启动主循环
        game.start();

        // 暴露到全局（调试用）
        window.__game = game;
    }).catch((err) => {
        console.error('[Main] 游戏初始化失败:', err);
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.innerHTML = '<div class="loading-error">游戏加载失败，请刷新页面重试</div>';
        }
    });

    // 页面隐藏时暂停
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === 'playing') {
            game.togglePause();
        }
    });

    // 页面卸载前保存
    window.addEventListener('beforeunload', () => {
        if (game.saveManager) {
            game.saveManager.save(game.saveData);
        }
    });
});
