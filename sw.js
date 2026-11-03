// Service Worker for kawandigi CREATOR TOOLS
const CACHE_NAME = 'kawandigi-cache-v13';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './modules/gemini_api.js',
    './modules/ugc_creator.js',
    './modules/drama_creator.js',
    './modules/history_manager.js',
    './modules/license_manager.js',
    './modules/video_renderer.js',
    './modules/auth_manager.js',
    './modules/catalog_manager.js',
    './modules/gamification_manager.js',
    './assets/icons/logo.png',
    './assets/icons/favicon.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => {
                console.warn('Gagal cache beberapa aset offline:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    // Jangan cache request ke external API (Google, AI providers, dll)
    const url = new URL(event.request.url);
    if (url.pathname.startsWith("/api/")) return;
    if (!url.origin.includes(self.location.origin) && !url.href.includes('cdn.tailwindcss.com') && !url.href.includes('unpkg.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => {
                    return cached || caches.match('./index.html');
                });
            })
    );
});
