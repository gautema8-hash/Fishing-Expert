/**
 * Service Worker - PWA 离线缓存
 * 捕鱼达人·东海龙宫
 */
const CACHE_NAME = 'fishing-dragon-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/core/Game.js',
    './js/core/Utils.js',
    './js/core/EventBus.js',
    './js/core/ObjectPool.js',
    './js/core/Storage.js',
    './js/core/ResourceManager.js',
    './js/config/gameConfig.js',
    './js/config/fishConfig.js',
    './js/config/levelConfig.js',
    './js/config/shopConfig.js',
    './js/config/vipConfig.js',
    './js/render/Renderer.js',
    './js/render/Scene.js',
    './js/render/Camera.js',
    './js/render/ParticleSystem.js',
    './js/render/WaterRipple.js',
    './js/render/Caustics.js',
    './js/entities/Fish.js',
    './js/entities/Boss.js',
    './js/entities/FishSchool.js',
    './js/entities/Cannon.js',
    './js/entities/Bullet.js',
    './js/entities/Coin.js',
    './js/systems/EconomySystem.js',
    './js/systems/LevelSystem.js',
    './js/systems/AudioSystem.js',
    './js/systems/ItemSystem.js',
    './js/systems/VIPSystem.js',
    './js/systems/TaskSystem.js',
    './js/ui/UIManager.js',
    './js/ui/TopBar.js',
    './manifest.json'
];

// 安装：缓存核心资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE).catch(() => {
                    // 部分资源缓存失败不影响安装
                    return Promise.resolve();
                });
            })
            .then(() => self.skipWaiting())
    );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// 请求拦截：Cache First 策略
self.addEventListener('fetch', (event) => {
    // 只缓存 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // 后台更新缓存
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            // 网络请求
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // 离线回退
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});
