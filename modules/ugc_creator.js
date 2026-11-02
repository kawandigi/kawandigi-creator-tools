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

/**
 * Intelligent AI Multimodal Extraction from Screenshot (Shopee, TikTok Shop, Tokopedia, Listing, Menu)
 * As defined in Kawan Digital Skill v2.0
 */
export async function extractDetailsFromImage(base64Data, mimeType = 'image/jpeg') {
    const systemPrompt = `Kamu adalah Kawan Digital, asisten AI spesialis analisis screenshot etalase marketplace (Shopee, TikTok Shop, Tokopedia, Lazada), listing hotel/staycation, atau menu kuliner.
Tugasmu adalah menganalisis gambar screenshot yang diunggah secara objektif, akurat, dan jujur tanpa mengarang fakta.

Ekstrak informasi yang terbaca dari gambar dan kembalikan HANYA format JSON valid berikut (tanpa markdown backtick):
{
  "product_name": "Nama produk / nama tempat / nama menu yang terbaca jelas",
  "category": "🛍️ Konten Affiliate Produk",
  "variant": "Warna & varian yang terlihat di gambar (atau 'Standar')",
  "visual_details": "Detail visual yang terlihat (bahan, bentuk, kemasan, porsi, dsb.)",
  "price": "Harga / diskon / rating jika terbaca jelas, atau 'belum terdeteksi'",
  "selling_points": "Keunggulan utama / benefit yang tampak atau terbaca dari deskripsi screenshot (2-3 kalimat padat)",
  "suggested_tone": "Casual & Ceria (Gen Z)",
  "target_audience": "Target calon pembeli ideal produk ini"
}`;

    const prompt = `Analisis screenshot etalase produk berikut. Ekstrak nama produk, kategori, varian warna/detail visual, harga (jika terbaca), dan keunggulan utamanya dalam format JSON.`;

    const rawResponse = await callGemini(prompt, systemPrompt, 'gemini-3.8-flash', null, {
        mimeType: mimeType,
        data: base64Data
    });

    if (rawResponse) {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {}
        }
    }

    throw new Error('Gagal menganalisis screenshot. Pastikan gambar etalase memiliki teks judul yang jelas.');
}

// Backwards compatibility alias
export const scrapeProductFromUrl = fetchPageContent;

/**
 * Generate Complete UGC Affiliate Storyboard & Scene Prompts
 * Strictly adheres to Kawan Digital Skill v2.0:
 * - 6-Scene UGC Video (10 Seconds, FHD 9:16)
 *   1. Hook (0–1.5s, 3–5 kata)
 *   2. Problem (1.5–3s, 4–6 kata)
 *   3. Pengenalan (3–4.5s, 4–6 kata)
 *   4. Demonstrasi (4.5–6.5s, 4–6 kata)
 *   5. Honest Review (6.5–8.5s, 4–6 kata)
 *   6. CTA Netral (8.5–10s, 3–5 kata)
 * - Total narasi: 22–26 kata (maksimal 28 kata)
 * - Safe zone: area tengah-atas, hindari area bawah 15% & kanan 10%
 * - Multi-Platform Neutral CTA (tidak menyebut warna keranjang)
 * - 3 Template Caption Siap Pakai (Hard-selling, Storytelling, Soft-selling)
 * - Formatted Copyable Video Prompt Block
 */
export async function generateUgcCampaign({
    productUrl = '',
    productName = '',
    productCategory = '',
    sellingPoints = '',
    targetAudience = '',
    videoDuration = 10,
    tone = 'Casual & Ceria (Gen Z)',
    voiceGender = 'Cewek Ceria',
    imageAnalysis = null
}) {
    // 1. License / Trial Check
    const access = hasToolAccess('ugc');
    if (!access.allowed) {
        throw new Error('Akses Tool AI UGC Creator terkunci. Silakan masukkan kode lisensi di tab Lisensi untuk membuka akses.');
    }

    // 2. Construct prompt for Gemini according to Kawan Digital Skill v2.0
    const systemPrompt = `Kamu adalah Kawan Digital, asisten pembuat konten affiliate dan review berbahasa Indonesia.
Tugasmu adalah menghasilkan Storyboard 6 adegan (grid 2x3), prompt video UGC durasi 10 detik, dan 3 template caption siap pakai untuk TikTok & Shopee Video.

ATURAN STRUKTUR VIDEO (WAJIB TEPAT 6 ADEGAN BERIKUT):
| # | Adegan | Waktu | Kata Narasi |
|---|---|---|---|
| 1 | Hook — tarik perhatian | 0–1,5 detik | 3–5 kata |
| 2 | Problem — masalah yang relate | 1,5–3 detik | 4–6 kata |
| 3 | Pengenalan — tampilkan produk/tempat | 3–4,5 detik | 4–6 kata |
| 4 | Demonstrasi — tunjukkan aksi/keunggulan | 4,5–6,5 detik | 4–6 kata |
| 5 | Honest Review — benefit jujur | 6,5–8,5 detik | 4–6 kata |
| 6 | CTA Netral — ajakan bertindak | 8,5–10 detik | 3–5 kata |

ATURAN NARASI:
- Total narasi SELURUH video: TEPAT 22–26 KATA (maksimal 28 kata).
- Bahasa Indonesia natural, seolah sedang ngobrol ramah.
- CTA Netral: JANGAN SEBUT WARNA KERANJANG (JANGAN "keranjang kuning" / "keranjang oranye").
  Gunakan CTA netral seperti: "Yuk, langsung klik keranjang di bawah video ini ya!" atau "Temukan tautan produknya persis di bawah video ya."

ATURAN SAFE ZONE & SUBTITLE:
- Subtitle maksimal 2 baris di area tengah-atas.
- Hindari ~15% area bawah dan ~10–15% area kanan (tertutup tombol like, komentar, keranjang, caption).

3 TEMPLATE CAPTION SIAP PAKAI:
1. Hard-selling: Singkat, langsung, to the point, urgensi + 3-6 hashtag relevan.
2. Storytelling: Relatable, personal experience, emosional + 3-6 hashtag relevan.
3. Soft-selling: Edukatif, informatif, subtle persuasion + 3-6 hashtag relevan.

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick):
{
  "product_analysis": {
    "product_name": "Nama produk lengkap",
    "category": "Kategori produk/tempat",
    "core_benefit": "Manfaat utama produk",
    "target_buyer": "Target calon pembeli"
  },
  "scenes": [
    {
      "scene_number": 1,
      "time_range": "0–1.5s",
      "duration_seconds": 1.5,
      "scene_title": "HOOK",
      "visual_description": "Deskripsi visual adegan realistis UGC pencahayaan natural",
      "camera_movement": "Handheld snap zoom in",
      "voiceover_script": "Naskah 3-5 kata",
      "word_count": 4,
      "caption_overlay": "Teks overlay tengah-atas (maks 2 baris)",
      "google_flow_prompt": "Cinematic vertical 9:16 UGC video, natural handheld lighting, photorealistic, FHD..."
    }
  ],
  "total_narasi_kata": 24,
  "formatted_prompt_video": "PROMPT VIDEO — [Nama Produk]\nDurasi: 10 detik | Rasio: 9:16 | Kualitas: FHD...",
  "captions": {
    "hard_selling": {
      "hook": "Teks hook",
      "benefit": "Teks benefit",
      "cta": "Yuk, langsung klik keranjang di bawah video ini ya!",
      "hashtags": ["#racunshopee", "#reviewjujur", "#affiliate"],
      "full_text": "Teks lengkap caption siap salin"
    },
    "storytelling": {
      "hook": "Teks hook",
      "benefit": "Teks benefit",
      "cta": "Temukan tautan produknya persis di bawah video ya.",
      "hashtags": ["#reviewjujur", "#tiktokaffiliate", "#rekomendasiproduk"],
      "full_text": "Teks lengkap caption siap salin"
    },
    "soft_selling": {
      "hook": "Teks hook",
      "benefit": "Teks benefit",
      "cta": "Link ada di bawah video ya.",
      "hashtags": ["#tipsbelanja", "#reviewproduk", "#affiliate"],
      "full_text": "Teks lengkap caption siap salin"
    }
  }
}`;

    let userPrompt = `Buatkan Storyboard 6 Adegan, Prompt Video 10 Detik, dan 3 Template Caption sesuai standar Kawan Digital:\n`;
    if (productName) userPrompt += `- Nama Produk: ${productName}\n`;
    if (productCategory) userPrompt += `- Kategori: ${productCategory}\n`;
    if (sellingPoints) userPrompt += `- Keunggulan / Selling Points: ${sellingPoints}\n`;
    if (targetAudience) userPrompt += `- Target Audiens: ${targetAudience}\n`;
    if (productUrl) userPrompt += `- Referensi URL: ${productUrl}\n`;
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
        if (access.type === 'trial') {
            incrementTrialUsage('ugc');
        }
        return campaign;
    } catch {
        throw new Error('Gagal memproses struktur storyboard JSON dari AI. Silakan coba klik generate kembali.');
    }
}
