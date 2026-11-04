/**
 * KawanDigi Creator Studio - Catalog, Feature Flags & Digital Store Manager
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

// Default initial digital products
export const DEFAULT_PRODUCTS = [
    {
        id: 'prod_1',
        title: 'Lisensi VIP Master Lifetime (Akses Seluruh Tools Selamanya)',
        badge: '🔥 Paling Diminati',
        price: 199000,
        originalPrice: 499000,
        thumbnail: 'assets/icons/logo.png',
        description: 'Akses tanpa batas ke seluruh tools AI KawanDigi tanpa langganan bulanan. Termasuk update tools baru seumur hidup & support VIP.',
        contactWa: '6281234567890'
    },
    {
        id: 'prod_2',
        title: 'Paket API Key Google Gemini & DeepSeek Siap Pakai (No CC)',
        badge: '⚡ Tanpa Ribet',
        price: 49000,
        originalPrice: 99000,
        thumbnail: 'assets/icons/icon-192.png',
        description: 'Tinggal pakai tanpa perlu kartu kredit. Kuota besar untuk generate ratusan naskah iklan & storyboard siap pakai.',
        contactWa: '6281234567890'
    },
    {
        id: 'prod_3',
        title: 'Mentoring Privat 1-on-1: Cuan Jutaan dari Konten UGC Affiliate',
        badge: '⭐ Kelas Eksklusif',
        price: 349000,
        originalPrice: 750000,
        thumbnail: 'assets/icons/favicon.png',
        description: 'Bimbingan intensif langsung via Google Meet/Zoom dari nol sampai pecah telur komisi affiliate TikTok Shop & Shopee.',
        contactWa: '6281234567890'
    }
];

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
export function getFeatureFlags() {
    try {
        const raw = localStorage.getItem(STORAGE_FLAGS_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_FLAGS_KEY, JSON.stringify(DEFAULT_FEATURE_FLAGS));
            return DEFAULT_FEATURE_FLAGS;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_FEATURE_FLAGS;
    }
}

export function saveFeatureFlags(flags) {
    localStorage.setItem(STORAGE_FLAGS_KEY, JSON.stringify(flags));
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
            if (json.status === 'success' && json.data && json.data.feature_flags) {
                saveFeatureFlags(json.data.feature_flags);
                return json.data.feature_flags;
            }
        }
    } catch (e) {
        console.warn('[KawanDigi] Gagal sinkron feature flags dari server:', e);
    }
    return getFeatureFlags();
}

export async function saveFeatureFlagsToServer(flags) {
    saveFeatureFlags(flags);
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature_flags: flags })
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
            localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
            return DEFAULT_PRODUCTS;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_PRODUCTS;
    }
}

export function saveDigitalProducts(products) {
    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
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
    return product;
}

export function deleteDigitalProduct(productId) {
    const products = getDigitalProducts().filter(p => p.id !== productId);
    saveDigitalProducts(products);
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
    const phone = (customPhone || product.contactWa || '6281234567890').replace(/\D/g, '');
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
    return tutorial;
}

export function deleteTutorialVideo(tutorialId) {
    const tutorials = getTutorialVideos().filter(t => t.id !== tutorialId);
    saveTutorialVideos(tutorials);
}

/**
 * Dynamic Pricing & Admin WhatsApp Contact Manager
 */
export const STORAGE_PRICING_KEY = 'kawandigi_pricing_settings';

export const DEFAULT_PRICING_CONFIG = {
    admin_whatsapp: '6281234567890',
    price_ugc: 99000,
    price_drama: 149000,
    price_vip_1dev: 199000,
    price_vip_alldev: 349000
};

export function cleanWhatsAppNumber(input) {
    if (!input) return '6281234567890';
    let clean = String(input).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    return clean || '6281234567890';
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
                price_vip_alldev: Number(parsed.price_vip_alldev) || DEFAULT_PRICING_CONFIG.price_vip_alldev
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
        price_vip_alldev: Number(settings.price_vip_alldev) || current.price_vip_alldev
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
                    price_vip_alldev: d.price_vip_alldev
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
                price_vip_alldev: local.price_vip_alldev
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
