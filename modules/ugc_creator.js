/**
 * KawanDigi Creator Studio - AI UGC Affiliate Video Creator
 * Handles intelligent product extraction via AI, fast-paced affiliate scene duration, and AIDA reasoning
 */

import { callGemini, generateImagen3, getSavedApiKey } from './gemini_api.js';
import { hasToolAccess, incrementTrialUsage } from './license_manager.js';

/**
 * Extract clean product slug from URL (e.g. Shopee / TikTok Shop URL)
 */
function extractSlugFromUrl(url) {
    try {
        const parsed = new URL(url);
        const pathname = decodeURIComponent(parsed.pathname);
        const segments = pathname.split('/').filter(p => p.length > 2);
        if (segments.length > 0) {
            // Find segment that looks like a title slug
            const candidate = segments.find(s => s.includes('-') && s.length > 8) || segments[segments.length - 1];
            return candidate.replace(/-i\.\d+\.\d+.*$/, '').replace(/[-_]+/g, ' ').trim();
        }
    } catch {
        // Fallback to empty
    }
    return '';
}

/**
 * Fetch raw web page text using Jina Reader with strict 2.5s timeout (never hangs!)
 */
async function fetchPageContent(url, timeoutMs = 2500) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url.trim())}`;
        const resp = await fetch(jinaUrl, {
            signal: controller.signal,
            headers: {
                'X-Return-Format': 'markdown'
            }
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const text = await resp.text();
            if (text && text.length > 100 && !text.includes('Please turn on JavaScript') && !text.includes('Cloudflare')) {
                return text.slice(0, 4000);
            }
        }
    } catch {
        // Aborted or network timeout, proceed smoothly without freezing
    }
    return '';
}

function detectCategory(text) {
    if (!text) return '💄 Skincare & Kecantikan';
    const lower = text.toLowerCase();
    if (/parfum|perfume|serum|skincare|lipstick|lip|cream|sunscreen|facial|lotion|glow|acne|whitening|lelabo|wangi/i.test(lower)) {
        return '💄 Skincare & Kecantikan';
    }
    if (/baju|kaos|celana|rok|dress|jaket|cardigan|hoodie|sepatu|sandal|tas|outfit|ootd|fashion|kemeja|knit/i.test(lower)) {
        return '👗 Fashion & OOTD';
    }
    if (/tws|earphone|headphone|earbuds|hp|handphone|gadget|case|charger|powerbank|smartwatch|speaker|bluetooth/i.test(lower)) {
        return '📱 Gadget & Elektronik';
    }
    if (/makanan|snack|kopi|coffee|sambal|mie|keripik|biskuit|cokelat|kuliner|minuman/i.test(lower)) {
        return '🍔 Kuliner & Makanan';
    }
    return '🏠 Kebutuhan Rumah Tangga';
}

function generateHeuristicSellingPoints(name, category) {
    const lower = (name + ' ' + category).toLowerCase();
    if (/parfum|perfume|wangi|lelabo|scent|eau/i.test(lower)) {
        return 'Inspirasi aroma mewah elegan kelas dunia, wangi semerbak tahan hingga 12 jam, tidak meninggalkan noda di pakaian, kemasan praktis travel-friendly.';
    }
    if (/serum|sunscreen|moisturizer|acne|whitening|glow|skincare|facial|lip|lipstick|cream/i.test(lower)) {
        return 'Formula mencerahkan dengan bahan aktif teruji klinis, tekstur ringan cepat meresap tanpa rasa lengket, sudah bersertifikat BPOM & Halal, aman untuk semua jenis kulit.';
    }
    if (/baju|kaos|celana|rok|dress|jaket|cardigan|hoodie|sepatu|sandal|tas|outfit|ootd|fashion|kemeja|knit/i.test(lower)) {
        return 'Bahan premium adem & tidak mudah kusut, jahitan rapi kuat, cuttingan pas di badan bikin ilusi ramping & jenjang, cocok untuk kuliah, kerja, maupun hangout.';
    }
    if (/tws|earphone|headphone|earbuds|hp|gadget|case|charger|powerbank|smartwatch|speaker|bluetooth/i.test(lower)) {
        return 'Koneksi bluetooth stabil tanpa delay, bass mantap suara jernih, baterai tahan seharian hingga puluhan jam, desain ergonomis stylish & nyaman dipakai lama.';
    }
    if (/makanan|snack|kopi|coffee|sambal|mie|keripik|biskuit|cokelat|kuliner|minuman/i.test(lower)) {
        return 'Cita rasa autentik pedas gurih nagih, dibuat dari bahan segar higienis pilihan, kemasan kedap udara anti melempem, cocok untuk lauk makan atau camilan saat santai.';
    }
    return 'Kualitas terjamin original, harga terjangkau dengan promo diskon spesial hari ini, pengiriman cepat & aman bergaransi uang kembali.';
}

/**
 * Intelligent AI Product Extraction from any Affiliate URL (Shopee, TikTok Shop, Tokopedia, etc.)
 */
export async function extractProductDetails(url) {
    if (!url || !url.startsWith('http')) {
        throw new Error('Masukkan URL produk yang valid (contoh: link Shopee atau TikTok Shop).');
    }

    // 1. Extract slug from URL immediately (0ms, 100% reliable)
    const slug = extractSlugFromUrl(url);

    // 2. Fetch page content only if slug is empty or short
    let pageText = '';
    if (!slug || slug.length < 8) {
        pageText = await fetchPageContent(url, 2000);
    }

    const detectedCat = detectCategory(slug || url || pageText);
    const cleanName = slug 
        ? slug.replace(/\b\w/g, l => l.toUpperCase()).replace(/\s+/g, ' ').trim()
        : 'Produk Rekomendasi Pilihan';
    
    const fallbackData = {
        product_name: cleanName,
        category: detectedCat,
        selling_points: generateHeuristicSellingPoints(cleanName, detectedCat),
        target_audience: detectedCat.includes('Fashion') ? 'Pria dan wanita yang ingin tampil stylish & percaya diri' : (detectedCat.includes('Gadget') ? 'Pengguna gadget & pecinta teknologi praktis' : 'Pria dan wanita yang menyukai produk berkualitas dengan harga terjangkau'),
        suggested_tone: detectedCat.includes('Skincare') ? 'Elegan & Mewah' : 'Casual & Ceria (Gen Z)'
    };

    // If user has not configured API key yet, return instant high-quality data
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        return fallbackData;
    }

    // 3. Prompt Gemini to refine details
    const systemPrompt = `Anda adalah Spesialis Analisis Produk E-Commerce & Affiliate Marketing (Shopee, TikTok Shop, Tokopedia, Lazada).
Tugas Anda adalah mengekstrak data produk yang akurat dari isi halaman etalase atau URL produk yang diberikan.

PILIHAN KATEGORI (Pilih salah satu):
- 💄 Skincare & Kecantikan
- 👗 Fashion & OOTD
- 📱 Gadget & Elektronik
- 🍔 Kuliner & Makanan
- 🏠 Kebutuhan Rumah Tangga

PILIHAN GAYA BAHASA (TONE):
- Casual & Ceria (Gen Z)
- Review Jujur & Edukatif
- FOMO & Urgensi Diskon
- Elegan & Mewah

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick):
{
  "product_name": "Nama produk lengkap yang bersih, mudah dipahami, tanpa karakter/simbol sampah",
  "category": "💄 Skincare & Kecantikan",
  "selling_points": "Poin-poin keunggulan utama, manfaat, aroma/spesifikasi, atau promo menarik dari produk ini (2-3 kalimat padat)",
  "target_audience": "Target calon pembeli ideal produk ini",
  "suggested_tone": "Casual & Ceria (Gen Z)"
}`;

    let userPrompt = `Ekstrak dan analisis informasi produk dari link berikut:\nURL: ${url}\n`;
    if (slug) {
        userPrompt += `Judul Terdeteksi dari URL: ${slug}\n`;
    }
    if (pageText) {
        userPrompt += `Konten Halaman Tambahan:\n${pageText}\n`;
    }

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, 'gemini-3.8-flash');
        if (rawResponse) {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.product_name) {
                    return {
                        product_name: parsed.product_name || fallbackData.product_name,
                        category: parsed.category || fallbackData.category,
                        selling_points: parsed.selling_points || fallbackData.selling_points,
                        target_audience: parsed.target_audience || fallbackData.target_audience,
                        suggested_tone: parsed.suggested_tone || fallbackData.suggested_tone
                    };
                }
            }
        }
    } catch (err) {
        console.warn('[KawanDigi] Gemini extraction fallback engaged:', err.message);
    }

    return fallbackData;
}

// Backwards compatibility alias
export const scrapeProductFromUrl = fetchPageContent;

/**
 * Generate Complete UGC Affiliate Storyboard & Scene Prompts
 * Fast-paced pacing tuned for TikTok/Reels/Shorts:
 * - 10s: 3 scenes (Hook 3s, Demo 4s, CTA 3s)
 * - 15s: 4 scenes (Hook 3s, Problem 4s, Demo 4s, CTA 4s)
 * - 30s: 6 scenes (AIDA High Conversion Review)
 * - 60s: 8 scenes (Full Storytelling & Detailed Demonstration)
 */
export async function generateUgcCampaign({
    productUrl = '',
    productName = '',
    productCategory = '',
    sellingPoints = '',
    targetAudience = '',
    videoDuration = 30, // 10, 15, 20, 30, or 60
    tone = 'Casual & Ceria (Gen Z)',
    voiceGender = 'Cewek Ceria'
}) {
    // 1. License / Trial Check
    const access = hasToolAccess('ugc');
    if (!access.allowed) {
        throw new Error('Akses Tool AI UGC Creator terkunci. Silakan masukkan kode lisensi di tab Lisensi untuk membuka akses.');
    }

    // 2. Determine number of fast-paced cut scenes for affiliate retention
    let sceneCount = 3;
    if (videoDuration === 10) sceneCount = 3;       // 10s = 3 scenes (Fast Hook 3s, Core Demo 4s, CTA 3s)
    else if (videoDuration === 15) sceneCount = 4;  // 15s = 4 scenes (TikTok Standard)
    else if (videoDuration === 20) sceneCount = 4;  // 20s = 4 scenes
    else if (videoDuration === 30) sceneCount = 6;  // 30s = 6 scenes (AIDA High Conversion)
    else if (videoDuration === 60) sceneCount = 8;  // 60s = 8 scenes (Full Storytelling & Review)

    // 3. Construct prompt for Gemini
    const systemPrompt = `Anda adalah Creative Director & Master Video Affiliate Strategist nomor satu di TikTok Shop, Shopee Video, dan Instagram Reels.
Tugas Anda adalah menganalisis produk dan merancang Storyboard Iklan UGC Vertikal (9:16) yang menghasilkan konversi tinggi (High CTR & CVR).

ATURAN DURASI & PACING AFFILIATE (PENTING!):
Video affiliate yang viral dan berkonversi tinggi TIDAK BOLEH lambat atau monoton.
Video ini berdurasi total ${videoDuration} detik yang HARUS Anda bagi tepat menjadi ${sceneCount} scene/shot pendek beritme cepat (fast-paced cuts), di mana total akumulasi detik seluruh scene pas ${videoDuration} detik.

Setiap scene memiliki peranan strategis:
- SCENE AWAL (Detik 0-3): Visual Hook yang mengejutkan, rasa penasaran, atau pain-point yang menghentikan scroll (Stop Scrolling).
- SCENE TENGAH: Unboxing / Live Demo / Reaksi Jujur / Pembuktian Manfaat / Before-After yang memuaskan.
- SCENE AKHIR: Call to Action (CTA) yang mendesak, menunjuk keranjang kuning, promo terbatas hari ini.

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick):
{
  "product_analysis": {
    "product_name": "Nama produk ringkas",
    "core_benefit": "Manfaat utama produk",
    "target_buyer": "Target pembeli ideal",
    "hook_angle": "Sudut pandang hook yang dipakai (Problem / Curiosity / Social Proof / Shock Value)"
  },
  "scenes": [
    {
      "scene_number": 1,
      "duration_seconds": 3,
      "scene_title": "HOOK PEMBUKA",
      "visual_description": "Deskripsi visual adegan cepat dalam bahasa Indonesia",
      "google_flow_prompt": "Cinematic vertical 9:16 video prompt in English, fast motion, vivid lighting, ready for Google Omni / Veo",
      "voiceover_script": "Naskah narasi suara bahasa Indonesia yang singkat, padat, natural, dan memikat",
      "caption_overlay": "Teks tebal di layar (contoh: JANGAN DI-SKIP!)"
    }
  ],
  "call_to_action": "Teks ajakan bertindak (Contoh: Klik keranjang kuning sekarang mumpung diskon!)",
  "hashtags": ["#racuntiktok", "#fyp", "#racunshopee", "#reviewjujur"]
}`;

    let userPrompt = `Rancang kampanye video UGC Affiliate beritme cepat (Fast-Paced Cuts):\n`;
    if (productUrl) userPrompt += `- URL Produk: ${productUrl}\n`;
    if (productName) userPrompt += `- Nama Produk: ${productName}\n`;
    if (productCategory) userPrompt += `- Kategori Produk: ${productCategory}\n`;
    if (sellingPoints) userPrompt += `- Keunggulan / Selling Points: ${sellingPoints}\n`;
    if (targetAudience) userPrompt += `- Target Audiens: ${targetAudience}\n`;
    userPrompt += `- Total Durasi Video: ${videoDuration} Detik (Wajib dibagi menjadi ${sceneCount} Scene @ 2-8 detik per scene)\n`;
    userPrompt += `- Gaya Bahasa / Tone: ${tone}\n`;
    userPrompt += `- Tipe Voiceover: ${voiceGender}\n`;

    const rawResponse = await callGemini(userPrompt, systemPrompt);

    // Clean JSON response
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
        const campaign = JSON.parse(cleaned);
        // Track trial usage if in trial mode
        if (access.type === 'trial') {
            incrementTrialUsage('ugc');
        }
        return campaign;
    } catch {
        throw new Error('Gagal memproses struktur storyboard JSON dari AI. Silakan coba klik generate kembali.');
    }
}
