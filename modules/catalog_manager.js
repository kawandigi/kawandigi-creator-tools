/**
 * KawanDigi Creator Tools - Catalog, Feature Flags & Digital Store Manager
 * Gives admin complete control over tool accessibility, digital product sales, and video tutorials
 */

const STORAGE_FLAGS_KEY = 'kawandigi_feature_flags';
const STORAGE_PRODUCTS_KEY = 'kawandigi_digital_products';
const STORAGE_TUTORIALS_KEY = 'kawandigi_tutorial_videos';

// Default initial feature flags
export const DEFAULT_FEATURE_FLAGS = [
    {
        id: 'ugc',
        name: 'AI UGC Affiliate Video Creator',
        icon: 'sparkles',
        badge: 'Viral & Laris',
        description: 'Rancang naskah hook, storyboard visual, dan prompt Google Flow 9:16 otomatis dari link produk Shopee & TikTok.',
        enabled: true,
        category: 'Affiliate Marketing',
        actionTab: 'ugc'
    },
    {
        id: 'drama',
        name: 'AI Drama & Micro-Series Creator',
        icon: 'clapperboard',
        badge: 'Sinematik',
        description: 'Ciptakan naskah drama vertikal multi-scene dengan cliffhanger adiktif untuk TikTok, Reels, dan YouTube Shorts.',
        enabled: true,
        category: 'Serial & Hiburan',
        actionTab: 'drama'
    },
    {
        id: 'flow',
        name: 'Studio Google Flow & Veo Suite',
        icon: 'film',
        badge: '100% Gratis',
        description: 'Akses cepat Google Flow (VideoFX) dan generator AI video terbaik dunia (Kling, Hailuo, Runway, Luma).',
        enabled: true,
        category: 'Video Engine',
        actionTab: 'flow'
    },
    {
        id: 'voiceover',
        name: 'AI Studio Voiceover & Dubbing Multi-Aksen',
        icon: 'mic',
        badge: 'Tahap Rancang',
        description: 'Dubbing suara bahasa Indonesia alami (pria/wanita Gen Z, medok, santai, formal) siap tempel ke CapCut.',
        enabled: false,
        category: 'Audio & Voice',
        actionTab: null
    },
    {
        id: 'script',
        name: 'AI Viral Copywriting & Naskah Hook Generator',
        icon: 'file-text',
        badge: 'Segera Hadir',
        description: 'Formula ratusan hook psikologis pembuka video yang memaksa penonton menonton sampai detik terakhir.',
        enabled: false,
        category: 'Copywriting',
        actionTab: null
    }
];

// Default initial digital products (empty by default until configured by admin)
export const DEFAULT_PRODUCTS = [];

// Default initial tutorial videos
export const DEFAULT_TUTORIALS = [
    {
        id: 'tut_1',
        title: 'Cara Riset Produk Terlaris & Bikin Naskah UGC Affiliate Siap Konversi',
        duration: '08:25',
        category: 'Riset & Naskah',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        summary: 'Langkah demi langkah mengambil link produk Shopee/TikTok Shop, menganalisis selling points, dan menghasilkan 6 tahapan storyboard ideal.'
    },
    {
        id: 'tut_2',
        title: 'Trik Render Video Gratis Tanpa Biaya di Google Flow (Veo)',
        duration: '10:40',
        category: 'Google Flow / Veo',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        summary: 'Cara menempelkan prompt yang dihasilkan KawanDigi langsung ke Google Flow VideoFX dan trik menggabungkan klip 10 detik di CapCut.'
    },
    {
        id: 'tut_3',
        title: 'Formula Hook 1,5 Detik Pertama yang Bikin Penonton Stop Scrolling',
        duration: '06:15',
        category: 'Hook & Visual',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        summary: 'Bedah anatomi naskah hook emosional dan pergerakan kamera agar video Anda tidak dilewati penonton.'
    }
];

/**
 * Feature Flags Management
 */
export function mergeFeatureFlags(flags) {
    if (!Array.isArray(flags)) return DEFAULT_FEATURE_FLAGS;
    return DEFAULT_FEATURE_FLAGS.map(def => {
        const found = flags.find(f => f.id === def.id);
        if (found) {
            return {
                ...def,
                ...found,
                enabled: found.enabled !== undefined ? !!found.enabled : def.enabled
            };
        }
        return def;
    });
}

export function getFeatureFlags() {
    try {
        const raw = localStorage.getItem(STORAGE_FLAGS_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_FLAGS_KEY, JSON.stringify(DEFAULT_FEATURE_FLAGS));
            return DEFAULT_FEATURE_FLAGS;
        }
        const parsed = JSON.parse(raw);
        return mergeFeatureFlags(parsed);
    } catch {
        return DEFAULT_FEATURE_FLAGS;
    }
}

export function saveFeatureFlags(flags) {
    const merged = mergeFeatureFlags(flags);
    localStorage.setItem(STORAGE_FLAGS_KEY, JSON.stringify(merged));
    return merged;
}

export function toggleToolStatus(toolId, isEnabled) {
    const flags = getFeatureFlags();
    const item = flags.find(f => f.id === toolId);
    if (item) {
        item.enabled = !!isEnabled;
        saveFeatureFlags(flags);
        saveFeatureFlagsToServer(flags).catch(() => {});
        return true;
    }
    return false;
}

export function isToolEnabled(toolId) {
    const flags = getFeatureFlags();
    const item = flags.find(f => f.id === toolId);
    return item ? !!item.enabled : true;
}

export async function fetchFeatureFlagsFromServer() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data && Array.isArray(json.data.feature_flags)) {
                const merged = mergeFeatureFlags(json.data.feature_flags);
                saveFeatureFlags(merged);
                return merged;
            }
        }
    } catch (e) {
        console.warn('[KawanDigi] Gagal sinkron feature flags dari server:', e);
    }
    return getFeatureFlags();
}

export async function saveFeatureFlagsToServer(flags) {
    const merged = saveFeatureFlags(flags);
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature_flags: merged })
        });
        return true;
    } catch (e) {
        console.error('[KawanDigi] Gagal simpan feature flags ke server:', e);
    }
    return false;
}

/**
 * Digital Products Management
 */
export function getDigitalProducts() {
    try {
        const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            // Auto clean legacy dummy products (prod_1, prod_2, prod_3) if they were the dummy template
            const isLegacyDummy = parsed.length > 0 && parsed.every(p => ['prod_1', 'prod_2', 'prod_3'].includes(p.id));
            if (isLegacyDummy) {
                localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify([]));
                return [];
            }
            return parsed;
        }
        return [];
    } catch {
        return [];
    }
}

export function saveDigitalProducts(products) {
    const list = Array.isArray(products) ? products : [];
    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(list));
}

export async function fetchDigitalProductsFromServer() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                if (Array.isArray(json.data.digital_products)) {
                    saveDigitalProducts(json.data.digital_products);
                    return json.data.digital_products;
                } else if (json.data.digital_products === null || json.data.digital_products === undefined) {
                    saveDigitalProducts([]);
                    return [];
                }
            }
        }
    } catch (e) {
        console.warn('[KawanDigi] Gagal sinkron produk digital dari server:', e);
    }
    return getDigitalProducts();
}

export async function saveDigitalProductsToServer(products) {
    saveDigitalProducts(products);
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ digital_products: products })
        });
        return true;
    } catch (e) {
        console.error('[KawanDigi] Gagal simpan produk digital ke server:', e);
    }
    return false;
}

export function upsertDigitalProduct(product) {
    const products = getDigitalProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
        products[existingIndex] = { ...products[existingIndex], ...product };
    } else {
        product.id = product.id || 'prod_' + Date.now();
        products.unshift(product);
    }
    saveDigitalProducts(products);
    saveDigitalProductsToServer(products).catch(() => {});
    return product;
}

export function deleteDigitalProduct(productId) {
    const products = getDigitalProducts().filter(p => p.id !== productId);
    saveDigitalProducts(products);
    saveDigitalProductsToServer(products).catch(() => {});
}

export function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(number);
}

/**
 * Generate Direct WhatsApp Purchase Link for Product
 */
export function generateProductWaLink(product, customPhone = null) {
    const phone = (customPhone || product.contactWa || '6282245565454').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : (phone.startsWith('62') ? phone : '62' + phone);
    
    const message = `Halo Admin KawanDigi! Saya tertarik membeli produk digital berikut:\n\n*${product.title}*\nHarga: ${formatRupiah(product.price)}\n\nMohon info cara pembayaran dan langkah aktivasinya ya. Terima kasih! 🙏`;
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Tutorial Videos Management
 */
export function getTutorialVideos() {
    try {
        const raw = localStorage.getItem(STORAGE_TUTORIALS_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_TUTORIALS_KEY, JSON.stringify(DEFAULT_TUTORIALS));
            return DEFAULT_TUTORIALS;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_TUTORIALS;
    }
}

export function saveTutorialVideos(tutorials) {
    localStorage.setItem(STORAGE_TUTORIALS_KEY, JSON.stringify(tutorials));
}

export async function fetchTutorialVideosFromServer() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data && Array.isArray(json.data.tutorial_videos) && json.data.tutorial_videos.length > 0) {
                saveTutorialVideos(json.data.tutorial_videos);
                return json.data.tutorial_videos;
            }
        }
    } catch (e) {
        console.warn('[KawanDigi] Gagal sinkron tutorial video dari server:', e);
    }
    return getTutorialVideos();
}

export async function saveTutorialVideosToServer(tutorials) {
    saveTutorialVideos(tutorials);
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tutorial_videos: tutorials })
        });
        return true;
    } catch (e) {
        console.error('[KawanDigi] Gagal simpan tutorial ke server:', e);
    }
    return false;
}

export function upsertTutorialVideo(tutorial) {
    const tutorials = getTutorialVideos();
    const existingIndex = tutorials.findIndex(t => t.id === tutorial.id);
    if (existingIndex >= 0) {
        tutorials[existingIndex] = { ...tutorials[existingIndex], ...tutorial };
    } else {
        tutorial.id = tutorial.id || 'tut_' + Date.now();
        tutorials.unshift(tutorial);
    }
    saveTutorialVideos(tutorials);
    saveTutorialVideosToServer(tutorials).catch(() => {});
    return tutorial;
}

export function deleteTutorialVideo(tutorialId) {
    const tutorials = getTutorialVideos().filter(t => t.id !== tutorialId);
    saveTutorialVideos(tutorials);
    saveTutorialVideosToServer(tutorials).catch(() => {});
}

/**
 * Dynamic Pricing & Admin WhatsApp Contact Manager
 */
export const STORAGE_PRICING_KEY = 'kawandigi_pricing_settings';

export const DEFAULT_PRICING_CONFIG = {
    admin_whatsapp: '6282245565454',
    price_ugc: 59000,
    price_drama: 79000,
    price_vip_1dev: 199000,
    price_original_1dev: 399000,
    price_vip_alldev: 349000,
    price_original_alldev: 699000
};

export function cleanWhatsAppNumber(input) {
    if (!input) return '6282245565454';
    let clean = String(input).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    return clean || '6282245565454';
}

export function getPricingSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_PRICING_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                admin_whatsapp: cleanWhatsAppNumber(parsed.admin_whatsapp),
                price_ugc: Number(parsed.price_ugc) || DEFAULT_PRICING_CONFIG.price_ugc,
                price_drama: Number(parsed.price_drama) || DEFAULT_PRICING_CONFIG.price_drama,
                price_vip_1dev: Number(parsed.price_vip_1dev) || DEFAULT_PRICING_CONFIG.price_vip_1dev,
                price_original_1dev: Number(parsed.price_original_1dev) || DEFAULT_PRICING_CONFIG.price_original_1dev,
                price_vip_alldev: Number(parsed.price_vip_alldev) || DEFAULT_PRICING_CONFIG.price_vip_alldev,
                price_original_alldev: Number(parsed.price_original_alldev) || DEFAULT_PRICING_CONFIG.price_original_alldev
            };
        }
    } catch {}
    return { ...DEFAULT_PRICING_CONFIG };
}

export function savePricingSettings(settings) {
    const current = getPricingSettings();
    const updated = {
        admin_whatsapp: settings.admin_whatsapp ? cleanWhatsAppNumber(settings.admin_whatsapp) : current.admin_whatsapp,
        price_ugc: Number(settings.price_ugc) || current.price_ugc,
        price_drama: Number(settings.price_drama) || current.price_drama,
        price_vip_1dev: Number(settings.price_vip_1dev) || current.price_vip_1dev,
        price_original_1dev: Number(settings.price_original_1dev) || current.price_original_1dev,
        price_vip_alldev: Number(settings.price_vip_alldev) || current.price_vip_alldev,
        price_original_alldev: Number(settings.price_original_alldev) || current.price_original_alldev
    };
    localStorage.setItem(STORAGE_PRICING_KEY, JSON.stringify(updated));
    return updated;
}

export async function fetchPricingSettingsFromServer() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                const d = json.data;
                const updated = savePricingSettings({
                    admin_whatsapp: d.admin_whatsapp,
                    price_ugc: d.price_ugc,
                    price_drama: d.price_drama,
                    price_vip_1dev: d.price_vip_1dev,
                    price_original_1dev: d.price_original_1dev,
                    price_vip_alldev: d.price_vip_alldev,
                    price_original_alldev: d.price_original_alldev
                });
                return updated;
            }
        }
    } catch (e) {
        console.warn('[KawanDigi] Gagal sinkron pricing dari server:', e);
    }
    return getPricingSettings();
}

export async function savePricingSettingsToServer(settings) {
    const local = savePricingSettings(settings);
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_whatsapp: local.admin_whatsapp,
                price_ugc: local.price_ugc,
                price_drama: local.price_drama,
                price_vip_1dev: local.price_vip_1dev,
                price_original_1dev: local.price_original_1dev,
                price_vip_alldev: local.price_vip_alldev,
                price_original_alldev: local.price_original_alldev
            })
        });
        if (res.ok) {
            return true;
        }
    } catch (e) {
        console.error('[KawanDigi] Gagal simpan pricing ke server:', e);
    }
    return false;
}
