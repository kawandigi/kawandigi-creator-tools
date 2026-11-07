/**
 * KawanDigi Creator Tools - TikTok Creative Center & Gemini AI Trend Scout
 * Automatic affiliate product research & auto-pick winning products
 */

import { callGemini, getSavedApiKey } from './gemini_api.js';

// Local curated trending fallback dataset (guarantees 100% offline & fast access)
export const DEFAULT_TRENDING_PRODUCTS = [
    {
        id: 'tt-skin-01',
        rank: 1,
        name: 'Serum Pencerah 10x Niacinamide + Alpha Arbutin',
        category: 'Skincare & Kecantikan',
        category_id: 'skincare',
        price_range: 'Rp 49.000 - Rp 59.000',
        est_commission: '15% (Rp 8.850 / pcs)',
        trend_velocity: '+380% Terjual Minggu Ini',
        viral_score: 99,
        tag: '🔥 #1 Viral TikTok Shop',
        hook_angle: 'Problem-solving flek hitam & bekas jerawat membandel pudar dalam 7 hari. Visual tekstur cair cepat meresap sangat disukai algoritma FYP.',
        selling_points: 'Beli 1 Gratis 1 promo gajian, memudarkan bekas jerawat & flek hitam dalam 7 hari, bersertifikat BPOM & Halal, tekstur watery cepat meresap tanpa lengket.',
        recommended_tone: 'Casual & Ceria (Gen Z)',
        recommended_talent: 'faceless',
        duration: 10
    },
    {
        id: 'tt-gadget-01',
        rank: 2,
        name: 'Wireless Lavalier Mic Clip-On Type-C & Lightning',
        category: 'Gadget & Elektronik',
        category_id: 'gadget',
        price_range: 'Rp 52.000 - Rp 65.000',
        est_commission: '16% (Rp 9.600 / pcs)',
        trend_velocity: '+420% Permintaan Kreator',
        viral_score: 97,
        tag: '⚡ Wajib Kreator Pemula',
        hook_angle: 'Uji suara di tempat bising vs pakai mic clip-on (perbandingan audio sebelum/sesudah). Solusi audio jernih tanpa kabel ribet.',
        selling_points: 'Plug and play langsung colok tanpa aplikasi, jangkauan sinyal hingga 20 meter, baterai tahan 8 jam non-stop, fitur smart noise cancelling suara angin & bising hilang total.',
        recommended_tone: 'Review Jujur & Edukatif',
        recommended_talent: 'auto',
        duration: 10
    },
    {
        id: 'tt-home-01',
        rank: 3,
        name: 'Mini Chopper Listrik Portable 3 Pisau Tajam',
        category: 'Kebutuhan Rumah Tangga',
        category_id: 'home',
        price_range: 'Rp 45.000 - Rp 55.000',
        est_commission: '18% (Rp 9.900 / pcs)',
        trend_velocity: '+310% Terjual di TikTok Live',
        viral_score: 96,
        tag: '🔥 Paling Laris di Live',
        hook_angle: 'Cincang bawang & cabai cuma 5 detik tanpa pedih di mata. Demo visual cincang daging & bumbu cepat tanpa colokan listrik terus menerus (bisa dicas).',
        selling_points: 'Bisa dicas USB tanpa kabel saat dipakai, 3 mata pisau stainless steel super tajam, cincang cabai bawang daging cuma hitungan detik, wadah food grade mudah dicuci.',
        recommended_tone: 'FOMO & Urgensi Diskon',
        recommended_talent: 'faceless',
        duration: 10
    },
    {
        id: 'tt-skin-02',
        rank: 4,
        name: 'Sunscreen Serum SPF 50 PA++++ Watery Sunscreen',
        category: 'Skincare & Kecantikan',
        category_id: 'skincare',
        price_range: 'Rp 42.000 - Rp 49.000',
        est_commission: '12% (Rp 5.800 / pcs)',
        trend_velocity: '+290% Pencarian Harian',
        viral_score: 95,
        tag: '⭐ Rekomendasi Dokter Kulit',
        hook_angle: 'Buktikan sunscreen tanpa whitecast, tidak pedih di mata, dan hasil kulit glowing sehat di bawah terik matahari.',
        selling_points: 'Proteksi maksimal SPF 50 PA++++ anti sinar UVA & UVB, nol persen whitecast, sensasi dingin menyegarkan di kulit berminyak, cocok untuk semua jenis kulit pria & wanita.',
        recommended_tone: 'Review Jujur & Edukatif',
        recommended_talent: 'female',
        duration: 10
    },
    {
        id: 'tt-home-02',
        rank: 5,
        name: 'Panci Listrik Serbaguna Keramik Anti Lengket 1.8L',
        category: 'Kebutuhan Rumah Tangga',
        category_id: 'home',
        price_range: 'Rp 65.000 - Rp 79.000',
        est_commission: '14% (Rp 10.500 / pcs)',
        trend_velocity: '+240% Favorit Anak Kost',
        viral_score: 94,
        tag: '⚡ Favorit Anak Kos',
        hook_angle: 'Masak mie, rebus telur, hingga goreng sosis cuma pakai 1 alat colok listrik tanpa kompor gas.',
        selling_points: 'Lapisan keramik anti lengket premium mudah dibersihkan, daya hemat cuma 450 watt tidak bikin jeglek, dilengkapi kukusan stainless steel, multifungsi rebus goreng kukus praktis.',
        recommended_tone: 'Casual & Ceria (Gen Z)',
        recommended_talent: 'faceless',
        duration: 10
    },
    {
        id: 'tt-food-01',
        rank: 6,
        name: 'Baso Aci Tulang Rangu Kuah Mercon Pedas Gurih',
        category: 'Kuliner & Makanan',
        category_id: 'food',
        price_range: 'Rp 15.000 - Rp 22.000',
        est_commission: '22% (Rp 4.400 / pcs)',
        trend_velocity: '+370% FYP Mukbang',
        viral_score: 93,
        tag: '🔥 Sensasi Mukbang Viral',
        hook_angle: 'Mukbang ASMR seruput kuah merah mercon dengan kriuk tulang rangu yang menggoda selera makan penonton.',
        selling_points: 'Sensasi kuah merah cabai asli pedas gurih nagih, tekstur baso kenyal renyah tulang rangu asli, porsi kenyang lengkap dengan siomay kering dan pilus cikur, halal & higienis.',
        recommended_tone: 'Casual & Ceria (Gen Z)',
        recommended_talent: 'auto',
        duration: 10
    },
    {
        id: 'tt-fashion-01',
        rank: 7,
        name: 'Tas Selempang Kanvas Casual Aesthetic Waterproof',
        category: 'Fashion & OOTD',
        category_id: 'fashion',
        price_range: 'Rp 48.000 - Rp 58.000',
        est_commission: '17% (Rp 9.100 / pcs)',
        trend_velocity: '+210% OOTD Kuliah',
        viral_score: 91,
        tag: '⭐ OOTD Mahasiswa Viral',
        hook_angle: 'Uji siram air ke tas (anti air gerimis) + spill muatan barang: muat dompet, HP, payung lipat, dan botol minum.',
        selling_points: 'Bahan kanvas cordura tebal anti cipratan air (water-resistant), tali strap empuk bisa diatur panjang pendek, banyak kompartemen resleting rapi, model unisex cocok cowok & cewek.',
        recommended_tone: 'Casual & Ceria (Gen Z)',
        recommended_talent: 'female',
        duration: 10
    },
    {
        id: 'tt-gadget-02',
        rank: 8,
        name: 'Tripod Tongsis Bluetooth 4-in-1 dengan Remote & Ringlight',
        category: 'Gadget & Elektronik',
        category_id: 'gadget',
        price_range: 'Rp 58.000 - Rp 72.000',
        est_commission: '15% (Rp 9.800 / pcs)',
        trend_velocity: '+190% Alat Wajib Ngonten',
        viral_score: 90,
        tag: '⚡ Ngonten Mandiri',
        hook_angle: 'Bikin video TikTok & foto OOTD sendiri di jalan tanpa minta tolong orang lain dengan tombol remote wireless.',
        selling_points: 'Kaki tripod kokoh anti goyang saat ditiup angin, remote bluetooth shutter connect instan hingga 10 meter, bisa diputar 360 derajat vertikal horizontal, lampu LED bawaan untuk selfie malam.',
        recommended_tone: 'Review Jujur & Edukatif',
        recommended_talent: 'auto',
        duration: 10
    }
];

/**
 * Fetch trending TikTok products from backend Worker API, fallback to local dataset
 */
export async function getTrendingProducts(category = 'all') {
    try {
        const resp = await fetch(`/api/trends/tiktok?category=${encodeURIComponent(category)}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
        });
        if (resp.ok) {
            const json = await resp.json();
            if (json && json.data && json.data.length > 0) {
                return json.data;
            }
        }
    } catch (e) {
        // Fallback to local curated trending dataset
    }

    if (category === 'all') {
        return DEFAULT_TRENDING_PRODUCTS;
    }
    return DEFAULT_TRENDING_PRODUCTS.filter(p => p.category_id === category);
}

/**
 * Auto-Pick the #1 highest-converting product
 */
export function autoPickWinningProduct(category = 'all') {
    const list = category === 'all' 
        ? DEFAULT_TRENDING_PRODUCTS 
        : DEFAULT_TRENDING_PRODUCTS.filter(p => p.category_id === category);
    
    if (list.length === 0) return DEFAULT_TRENDING_PRODUCTS[0];
    // Return highest viral_score
    return list.slice().sort((a, b) => (b.viral_score || 0) - (a.viral_score || 0))[0];
}

/**
 * Live AI Niche Scout with Gemini
 * For custom niches requested on-the-fly
 */
export async function scoutLiveNicheWithGemini(nicheQuery) {
    const prompt = `Kamu adalah Affiliate Product Intelligence & Trend Scout Specialist untuk TikTok Shop & Shopee Indonesia.
Analisis tren pasar saat ini dan berikan 3 ide produk affiliate paling laris (high conversion rate & viral potential) untuk pencarian/niche: "${nicheQuery}".

Kriteria produk:
1. Rentang harga impulsif (Rp 25.000 - Rp 150.000).
2. Memiliki problem-solving yang nyata atau visual demonstrasi menarik.
3. Potensi komisi affiliate minimal 10% - 20%.

Keluarkan HANYA format JSON valid tanpa tanda markdown pembuka/penutup:
[
  {
    "name": "Nama Lengkap Produk Komersial",
    "category": "Kategori Sesuai (contoh: Skincare & Kecantikan / Kebutuhan Rumah Tangga / Gadget)",
    "price_range": "Contoh: Rp 45.000 - Rp 65.000",
    "est_commission": "Contoh: 15% (Rp 8.000 / pcs)",
    "viral_score": 95,
    "tag": "Contoh: 🔥 Trending TikTok",
    "hook_angle": "Alasan kenapa produk ini sangat laku dan ide hook 3 detik pertama",
    "selling_points": "Poin keunggulan utama produk yang memicu pembelian cepat",
    "recommended_tone": "Casual & Ceria (Gen Z)",
    "recommended_talent": "faceless"
  }
]`;

    const responseText = await callGemini(prompt, { temperature: 0.4 });
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}

/**
 * Populate UGC Form with the Selected Winning Product
 */
export function applyProductToUgcForm(product) {
    if (!product) return;

    const nameInput = document.getElementById('ugc-name');
    const catSelect = document.getElementById('ugc-category');
    const toneSelect = document.getElementById('ugc-tone');
    const talentSelect = document.getElementById('ugc-talent');
    const sellingTextarea = document.getElementById('ugc-selling');

    if (nameInput) nameInput.value = product.name || '';
    if (sellingTextarea) sellingTextarea.value = product.selling_points || '';

    // Match category
    if (catSelect && product.category) {
        for (let opt of catSelect.options) {
            if (opt.value.toLowerCase().includes(product.category.toLowerCase()) || 
                product.category.toLowerCase().includes(opt.text.toLowerCase())) {
                catSelect.value = opt.value;
                break;
            }
        }
    }

    // Match tone
    if (toneSelect && product.recommended_tone) {
        for (let opt of toneSelect.options) {
            if (opt.value.toLowerCase().includes(product.recommended_tone.toLowerCase()) || 
                opt.text.toLowerCase().includes(product.recommended_tone.toLowerCase())) {
                toneSelect.value = opt.value;
                break;
            }
        }
    }

    // Match talent
    if (talentSelect && product.recommended_talent) {
        talentSelect.value = product.recommended_talent;
        talentSelect.dispatchEvent(new Event('change'));
    }

    // Highlight form fields briefly with pulse
    const formCard = document.querySelector('#section-ugc .lg\\:col-span-5');
    if (formCard) {
        formCard.classList.add('ring-2', 'ring-emerald-500', 'transition-all');
        setTimeout(() => {
            formCard.classList.remove('ring-2', 'ring-emerald-500');
        }, 1500);
    }
}
