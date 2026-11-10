// Service Worker for kawandigi CREATOR TOOLS
const CACHE_NAME = 'kawandigi-cache-v53';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './modules/gemini_api.js',
    './modules/ugc_creator.js',
    './modules/trend_scout.js',
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
    './assets/icons/icon-512.png',
    './assets/products/the_originote_gluta_bright.jpg',
    './assets/products/glad2glow_blueberry.jpg',
    './assets/products/tnw_k9_mic.jpg',
    './assets/products/tnw_l16_tripod.jpg',
    './assets/products/samono_sw_c150.jpg',
    './assets/products/advance_c18_pot.jpg',
    './assets/products/baso_aci_bapper.jpg',
    './assets/products/evernext_orion_bag.jpg',
    './assets/products/skintific_5x_toner.jpg',
    './assets/products/baseus_wm02_tws.jpg',
    './assets/products/deerma_dx700_vacuum.jpg',
    './assets/products/somethinc_serum.jpg'
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
