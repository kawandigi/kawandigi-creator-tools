/**
 * KawanDigi Creator Tools - TikTok Creative Center & Gemini AI Trend Scout
 * Automatic affiliate product research & auto-pick winning products
 */

import { callGemini, getSavedApiKey } from './gemini_api.js';

// Local curated trending fallback dataset (guarantees 100% offline & fast access)
export const DEFAULT_TRENDING_PRODUCTS = [
    {
        "id": "tt-skin-01",
        "rank": 1,
        "name": "The Originote Gluta-Bright B3 Serum 20ml",
        "brand": "The Originote",
        "category": "Skincare & Kecantikan",
        "category_id": "skincare",
        "price_range": "Rp 38.000 - Rp 45.000",
        "est_commission": "15% (Rp 6.750 / pcs)",
        "trend_velocity": "+480% Terjual Minggu Ini (FYP Skincare)",
        "viral_score": 99,
        "tag": "🔥 #1 Terlaris TikTok Shop",
        "image_url": "assets/products/the_originote_gluta_bright.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=The%20Originote%20Gluta%20Bright%20B3%20Serum",
        "tiktok_url": "https://www.tiktok.com/tag/theoriginoteglutabright",
        "marketplace_url": "https://shopee.co.id/search?keyword=The%20Originote%20Gluta%20Bright%20B3%20Serum",
        "hook_angle": "Bukti kulit kusam & flek hitam tersamarkan dalam 7 hari dengan Gluta-Bright B3 Serum The Originote. Tekstur bening cepat meresap tanpa lengket.",
        "selling_points": "Kandungan Glutathione + Niacinamide B3 ampuh mencerahkan, formula watery ringan tidak lengket, resmi BPOM & Halal, harga terjangkau di bawah Rp 45.000, promo Beli 1 Gratis 1 bundling.",
        "recommended_tone": "Casual & Ceria (Gen Z)",
        "recommended_talent": "faceless",
        "duration": 10
    },
    {
        "id": "tt-gadget-01",
        "rank": 2,
        "name": "TNW Wireless Microphone K9 Dual Clip-On Type-C & Lightning",
        "brand": "TNW Official",
        "category": "Gadget & Elektronik",
        "category_id": "gadget",
        "price_range": "Rp 55.000 - Rp 69.000",
        "est_commission": "18% (Rp 11.500 / pcs)",
        "trend_velocity": "+510% Permintaan Kreator Pemula",
        "viral_score": 98,
        "tag": "⚡ Wajib Kreator Pemula",
        "image_url": "assets/products/tnw_k9_mic.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=TNW%20Wireless%20Microphone%20K9",
        "tiktok_url": "https://www.tiktok.com/tag/tnwmicrophonek9",
        "marketplace_url": "https://shopee.co.id/search?keyword=TNW%20Wireless%20Microphone%20K9",
        "hook_angle": "Uji tes audio suara di jalan raya bising vs pakai mic TNW K9 (suara bising langsung hilang total). Solusi audio jernih buat kreator pemula.",
        "selling_points": "Plug and play langsung colok tanpa aplikasi, jangkauan sinyal wireless 20 meter, smart chip noise cancellation suara angin & bising hening, baterai tahan 8 jam non-stop.",
        "recommended_tone": "Review Jujur & Edukatif",
        "recommended_talent": "auto",
        "duration": 10
    },
    {
        "id": "tt-home-01",
        "rank": 3,
        "name": "Samono Food Chopper SW-C150 Mini Elektrik Portable 3 Pisau Stainless",
        "brand": "Samono",
        "category": "Kebutuhan Rumah Tangga",
        "category_id": "home",
        "price_range": "Rp 49.000 - Rp 62.000",
        "est_commission": "16% (Rp 9.900 / pcs)",
        "trend_velocity": "+390% Terjual di TikTok Live",
        "viral_score": 96,
        "tag": "🔥 Paling Laris di Live",
        "image_url": "assets/products/samono_sw_c150.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Samono%20Chopper%20SW-C150",
        "tiktok_url": "https://www.tiktok.com/tag/samonoc150",
        "marketplace_url": "https://shopee.co.id/search?keyword=Samono%20Chopper%20SW-C150",
        "hook_angle": "Cincang bawang putih, cabai, & daging cuma butuh 5 detik tanpa pedih di mata. Demo cincang halus bumbu instan tanpa colokan kabel terus menerus.",
        "selling_points": "Daya baterai USB wireless bisa dipakai di mana saja, 3 mata pisau stainless steel tajam tingkat ganda, wadah food grade borosilicate tebal mudah dicuci, garansi resmi Samono 1 tahun.",
        "recommended_tone": "FOMO & Urgensi Diskon",
        "recommended_talent": "faceless",
        "duration": 10
    },
    {
        "id": "tt-skin-02",
        "rank": 4,
        "name": "Glad2Glow Blueberry 5% Ceramide Barrier Repair Moisturizer 30g",
        "brand": "Glad2Glow",
        "category": "Skincare & Kecantikan",
        "category_id": "skincare",
        "price_range": "Rp 39.000 - Rp 48.000",
        "est_commission": "14% (Rp 6.700 / pcs)",
        "trend_velocity": "+420% Viral Beauty TikTok",
        "viral_score": 96,
        "tag": "⭐ Pereda Kemerahan & Jerawat",
        "image_url": "assets/products/glad2glow_blueberry.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Glad2Glow%20Blueberry%20Moisturizer",
        "tiktok_url": "https://www.tiktok.com/tag/glad2glowblueberry",
        "marketplace_url": "https://shopee.co.id/search?keyword=Glad2Glow%20Blueberry%20Moisturizer",
        "hook_angle": "Kemerahan wajah dan skin barrier rusak langsung adem & terhidrasi dalam sekali oles. Tekstur watery gel dingin menyegarkan di kulit berjerawat.",
        "selling_points": "Kandungan ekstrak Blueberry + 5% Ceramide memperbaiki skin barrier, sensasi dingin watery gel langsung meredakan jerawat meradang, mengontrol minyak berlebih tanpa menyumbat pori.",
        "recommended_tone": "Review Jujur & Edukatif",
        "recommended_talent": "female",
        "duration": 10
    },
    {
        "id": "tt-home-02",
        "rank": 5,
        "name": "Advance C-18 Panci Listrik Serbaguna 1.8L Keramik Anti Lengket",
        "brand": "Advance Digitals",
        "category": "Kebutuhan Rumah Tangga",
        "category_id": "home",
        "price_range": "Rp 68.000 - Rp 82.000",
        "est_commission": "15% (Rp 11.200 / pcs)",
        "trend_velocity": "+310% Favorit Anak Kos & Ibu Muda",
        "viral_score": 94,
        "tag": "⚡ Favorit Anak Kos",
        "image_url": "assets/products/advance_c18_pot.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Advance%20Panci%20Listrik%20C-18",
        "tiktok_url": "https://www.tiktok.com/tag/advancec18",
        "marketplace_url": "https://shopee.co.id/search?keyword=Advance%20Panci%20Listrik%20C-18",
        "hook_angle": "Masak mie instan, rebus telur, hingga goreng sosis cuma pakai 1 panci mini colok listrik tanpa perlu kompor gas.",
        "selling_points": "Lapisan keramik anti lengket premium mudah dilap & dicuci, daya hemat 400 watt tidak bikin listrik jeglek, bonus steamer kukusan stainless steel, diameter 18cm porsi pas.",
        "recommended_tone": "Casual & Ceria (Gen Z)",
        "recommended_talent": "faceless",
        "duration": 10
    },
    {
        "id": "tt-skin-03",
        "rank": 6,
        "name": "Skintific 5X Ceramide Soothing Toner 80ml",
        "brand": "Skintific",
        "category": "Skincare & Kecantikan",
        "category_id": "skincare",
        "price_range": "Rp 89.000 - Rp 99.000",
        "est_commission": "12% (Rp 11.500 / pcs)",
        "trend_velocity": "+360% Penjualan Live TikTok",
        "viral_score": 95,
        "tag": "⭐ Toner Viral Skintific",
        "image_url": "assets/products/skintific_5x_toner.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Skintific%205X%20Ceramide%20Toner",
        "tiktok_url": "https://www.tiktok.com/tag/skintifictoner",
        "marketplace_url": "https://shopee.co.id/search?keyword=Skintific%205X%20Ceramide%20Toner",
        "hook_angle": "Kulit dehidrasi dan perih langsung tenang dalam 10 detik. Buktikan toner 5X Ceramide yang memperbaiki skin barrier dalam 7 hari.",
        "selling_points": "Kandungan 5X Ceramide + Probiotik Complex + Centella Asiatica, menenangkan kulit berjerawat dan kemerahan secara instan, tekstur watery cepat menyerap.",
        "recommended_tone": "Review Jujur & Edukatif",
        "recommended_talent": "female",
        "duration": 10
    },
    {
        "id": "tt-gadget-02",
        "rank": 7,
        "name": "Baseus Bowie WM02 TWS Earphone Bluetooth 5.3 Mini",
        "brand": "Baseus",
        "category": "Gadget & Elektronik",
        "category_id": "gadget",
        "price_range": "Rp 129.000 - Rp 149.000",
        "est_commission": "15% (Rp 20.000 / pcs)",
        "trend_velocity": "+440% TWS Terlaris Pelajar",
        "viral_score": 94,
        "tag": "🔥 TWS #1 Terlaris TikTok",
        "image_url": "assets/products/baseus_wm02_tws.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Baseus%20Bowie%20WM02",
        "tiktok_url": "https://www.tiktok.com/tag/baseuswm02",
        "marketplace_url": "https://shopee.co.id/search?keyword=Baseus%20Bowie%20WM02",
        "hook_angle": "TWS kapsul mini desain estetik transparan suara bass jedag-jedug tanpa delay buat nonton film dan main game.",
        "selling_points": "Bluetooth 5.3 koneksi stabil latency rendah 0.06s, baterai super awet hingga 25 jam pemakaian, desain kapsul mungil elegan transparan, touch control responsif.",
        "recommended_tone": "Casual & Ceria (Gen Z)",
        "recommended_talent": "auto",
        "duration": 10
    },
    {
        "id": "tt-home-03",
        "rank": 8,
        "name": "Deerma DX700 Vacuum Cleaner Handheld 2-in-1 Ultra-Quiet",
        "brand": "Deerma",
        "category": "Kebutuhan Rumah Tangga",
        "category_id": "home",
        "price_range": "Rp 249.000 - Rp 279.000",
        "est_commission": "10% (Rp 26.000 / pcs)",
        "trend_velocity": "+290% Favorit Rumah Tangga",
        "viral_score": 93,
        "tag": "⚡ Sedot Debu Super Kuat",
        "image_url": "assets/products/deerma_dx700_vacuum.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Deerma%20DX700",
        "tiktok_url": "https://www.tiktok.com/tag/deermadx700",
        "marketplace_url": "https://shopee.co.id/search?keyword=Deerma%20DX700",
        "hook_angle": "Sekali sedot karpet dan sela sofa kotor langsung kinclong bebas tungau debu halus tanpa sisa.",
        "selling_points": "Daya hisap tornado 15.000 Pa kuat sedot partikel mikro, filter HEPA 3 lapis udara keluar tetap bersih, bisa mode gagang panjang atau handheld meja, bobot ringan tidak bikin pegal.",
        "recommended_tone": "Review Jujur & Edukatif",
        "recommended_talent": "faceless",
        "duration": 10
    },
    {
        "id": "tt-skin-04",
        "rank": 9,
        "name": "Somethinc 5% Niacinamide + Moisture Sabi Beet Serum",
        "brand": "Somethinc",
        "category": "Skincare & Kecantikan",
        "category_id": "skincare",
        "price_range": "Rp 79.000 - Rp 89.000",
        "est_commission": "13% (Rp 11.000 / pcs)",
        "trend_velocity": "+320% Review Dokter Kulit",
        "viral_score": 92,
        "tag": "⭐ Mencerahkan Aman Sensitif",
        "image_url": "assets/products/somethinc_serum.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Somethinc%205%20Niacinamide%20Serum",
        "tiktok_url": "https://www.tiktok.com/tag/somethincserum",
        "marketplace_url": "https://shopee.co.id/search?keyword=Somethinc%205%20Niacinamide%20Serum",
        "hook_angle": "Mencerahkan bekas jerawat kehitaman tanpa bikin iritasi kulit sensitif dengan kandungan Sabi Beet alami.",
        "selling_points": "Formula 5% Niacinamide grade farmasi + Sabiwhite 8x lebih efektif dari hydroquinone, memperkuat skin barrier dan memudarkan hiperpigmentasi, bersertifikat BPOM & Non-Comedogenic.",
        "recommended_tone": "Review Jujur & Edukatif",
        "recommended_talent": "female",
        "duration": 10
    },
    {
        "id": "tt-food-01",
        "rank": 10,
        "name": "Baso Aci Bapper Tulang Rangu Komplit Kuah Sambal Mercon",
        "brand": "Bapper Food ID",
        "category": "Kuliner & Makanan",
        "category_id": "food",
        "price_range": "Rp 18.000 - Rp 25.000",
        "est_commission": "20% (Rp 4.500 / pcs)",
        "trend_velocity": "+460% FYP Mukbang ASMR",
        "viral_score": 93,
        "tag": "🔥 Sensasi Mukbang Viral",
        "image_url": "assets/products/baso_aci_bapper.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Baso%20Aci%20Bapper%20Tulang%20Rangu",
        "tiktok_url": "https://www.tiktok.com/tag/basoacibapper",
        "marketplace_url": "https://shopee.co.id/search?keyword=Baso%20Aci%20Bapper%20Tulang%20Rangu",
        "hook_angle": "Mukbang ASMR seruput kuah merah mercon pedas nampol dengan sensasi kriuk tulang rangu kenyal yang bikin penonton ngiler.",
        "selling_points": "Isi 13 butir baso aci tulang rangu sapi asli renyah kres, kuah cabai mercon gurih pedas segar dengan jeruk limau, lengkap dengan cuanki lidah dan siomay mini, kemasan higienis bersertifikat Halal.",
        "recommended_tone": "Casual & Ceria (Gen Z)",
        "recommended_talent": "auto",
        "duration": 10
    },
    {
        "id": "tt-fashion-01",
        "rank": 11,
        "name": "Evernext Tas Selempang Pria Slingbag Orion Waterproof Anti Air",
        "brand": "Evernext",
        "category": "Fashion & OOTD",
        "category_id": "fashion",
        "price_range": "Rp 49.000 - Rp 59.000",
        "est_commission": "17% (Rp 9.500 / pcs)",
        "trend_velocity": "+280% OOTD Kuliah & Outdoor",
        "viral_score": 92,
        "tag": "⭐ Tas Distro Terlaris",
        "image_url": "assets/products/evernext_orion_bag.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=Evernext%20Sling%20Bag%20Orion",
        "tiktok_url": "https://www.tiktok.com/tag/evernextorion",
        "marketplace_url": "https://shopee.co.id/search?keyword=Evernext%20Sling%20Bag%20Orion",
        "hook_angle": "Uji siram air seember ke tas Evernext Orion (air langsung meluncur tanpa tembus ke dalam HP & dompet). Tas distro awet anti hujan.",
        "selling_points": "Material Bimo Waterproof tahan hujan deras, resleting karet sealed anti rembes air, kompartemen luas muat tablet, dompet, kunci, & powerbank, desain sporty elegan unisex.",
        "recommended_tone": "Casual & Ceria (Gen Z)",
        "recommended_talent": "female",
        "duration": 10
    },
    {
        "id": "tt-gadget-03",
        "rank": 12,
        "name": "TNW L16 Bluetooth Selfie Stick Tripod 160cm dengan Remote Shutter",
        "brand": "TNW Official",
        "category": "Gadget & Elektronik",
        "category_id": "gadget",
        "price_range": "Rp 69.000 - Rp 85.000",
        "est_commission": "16% (Rp 12.000 / pcs)",
        "trend_velocity": "+340% Perlengkapan Ngonten Mandiri",
        "viral_score": 91,
        "tag": "⚡ Ngonten Mandiri Anti Goyang",
        "image_url": "assets/products/tnw_l16_tripod.jpg",
        "shopee_url": "https://shopee.co.id/search?keyword=TNW%20Tripod%20L16",
        "tiktok_url": "https://www.tiktok.com/tag/tnwtripodl16",
        "marketplace_url": "https://shopee.co.id/search?keyword=TNW%20Tripod%20L16",
        "hook_angle": "Bikin konten video TikTok & foto OOTD estetik sendirian tanpa perlu minta tolong orang lain dengan remote shutter Bluetooth jarak 10 meter.",
        "selling_points": "Tiang aluminium kokoh bisa dipanjangkan hingga 1.6 meter, kaki tripod dengan payung penopang anti goyang tertiup angin, kepala rotasi 360 derajat horizontal vertikal, remote nirkabel respon cepat.",
        "recommended_tone": "Review Jujur & Edukatif",
        "recommended_talent": "auto",
        "duration": 10
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
Analisis tren pasar saat ini dan berikan 3 rekomendasi PRODUK AFFILIATE RESMI SPESIFIK BERMERK NYATA (high conversion rate & viral potential) untuk pencarian/niche: "${nicheQuery}".

SYARAT MUTLAK:
1. WAJIB MENYEBUTKAN MERK RESMI & TIPE SPESIFIK NYATA (Contoh: "Skintific 5X Ceramide Barrier Repair 30g", "The Originote Gluta-Bright B3 Serum", "Samono Chopper SW-C150", "Baseus Bowie WM02 TWS", "Acome Speaker Bluetooth A5", dll.). DILARANG KERAS memberikan nama generik tanpa merk seperti "Pembersih Sepatu" atau "Serum Wajah" saja!
2. Rentang harga impulsif (Rp 25.000 - Rp 150.000).
3. Memiliki problem-solving yang nyata atau visual demonstrasi menarik untuk video TikTok.
4. Potensi komisi affiliate minimal 10% - 20%.

Keluarkan HANYA format JSON valid tanpa tanda markdown pembuka/penutup:
[
  {
    "name": "Nama Lengkap Produk Resmi Beserta Merk (Contoh: Skintific 5X Ceramide Barrier Moisturizer Gel 30g)",
    "brand": "Nama Merk Resmi (Contoh: Skintific)",
    "category": "Kategori Sesuai (Skincare & Kecantikan / Kebutuhan Rumah Tangga / Gadget & Elektronik / Fashion & OOTD / Kuliner & Makanan)",
    "price_range": "Contoh: Rp 45.000 - Rp 65.000",
    "est_commission": "Contoh: 15% (Rp 8.000 / pcs)",
    "viral_score": 95,
    "tag": "Contoh: 🔥 Trending TikTok Shop",
    "hook_angle": "Alasan kenapa produk merk ini sangat laku dan ide hook visual 3 detik pertama",
    "selling_points": "Poin keunggulan utama spesifik merk & produk ini yang memicu pembelian cepat",
    "recommended_tone": "Casual & Ceria (Gen Z)",
    "recommended_talent": "faceless"
  }
]`;

    const responseText = await callGemini(prompt, { temperature: 0.4 });
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const items = JSON.parse(cleanJson);
    return items.map(item => ({
        ...item,
        image_url: item.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        shopee_url: item.shopee_url || `https://shopee.co.id/search?keyword=${encodeURIComponent(item.name || nicheQuery)}`,
        tiktok_url: item.tiktok_url || `https://www.tiktok.com/tag/${encodeURIComponent((item.name || nicheQuery).replace(/\s+/g, ''))}`,
        marketplace_url: item.marketplace_url || item.shopee_url || `https://shopee.co.id/search?keyword=${encodeURIComponent(item.name || nicheQuery)}`
    }));
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
    const urlInput = document.getElementById('ugc-url');

    if (nameInput) nameInput.value = product.name || '';
    if (sellingTextarea) sellingTextarea.value = product.selling_points || '';

    // Set Storefront Search / Affiliate Link
    const storeUrl = product.marketplace_url || product.shopee_url || product.tiktok_url || 
        (product.name ? `https://shopee.co.id/search?keyword=${encodeURIComponent(product.name)}` : '');
    if (urlInput && storeUrl) {
        urlInput.value = storeUrl;
    }

    // Auto-inject HD Reference Image into Gallery
    if (product.image_url && typeof window.kdAddStorefrontImage === 'function') {
        window.kdAddStorefrontImage(product.image_url, product.name);
    }

    // Save active selected product into window for result card rendering
    window.kdCurrentSelectedProduct = product;

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
