/**
 * KawanDigi Creator Tools - AI UGC Affiliate Video Creator
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
/**
 * Build a concise Shopee Video caption with hashtags that strictly fits within 150 characters
 */
export function buildShopeeCaption(productName = '', sellingPoints = '') {
    const pName = (productName || 'Produk pilihan ini').trim();
    const tags = '#RacunShopee #ShopeeHaul';
    const cta = 'Cek keranjang oranye ya!';
    
    // Attempt 1: Full name + benefit + cta + tags
    let benefitSnippet = (sellingPoints || '').split('.')[0].trim();
    if (benefitSnippet.length > 50) benefitSnippet = benefitSnippet.slice(0, 47) + '...';
    
    let candidate = `${pName}! ${benefitSnippet ? benefitSnippet + '. ' : ''}${cta} ${tags}`.trim();
    if (candidate.length <= 150) {
        return candidate;
    }

    // Attempt 2: Shortened name + cta + tags
    const spaceForName = 150 - cta.length - tags.length - 5;
    const shortName = pName.length > spaceForName ? pName.slice(0, Math.max(10, spaceForName)).trim() + '...' : pName;
    candidate = `${shortName} racun banget! ${cta} ${tags}`.trim();
    return candidate.slice(0, 150);
}

/**
 * Ensure caption string is strictly <= 150 characters including spaces and hashtags
 */
export function ensureShopeeLength(text, fallbackTags = '#RacunShopee #ShopeeHaul') {
    if (!text) return fallbackTags;
    let cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 150 && cleaned.includes('#')) {
        return cleaned;
    }
    if (cleaned.length > 150) {
        // Find existing hashtags
        const tagMatch = cleaned.match(/(#[a-zA-Z0-9_]+\s*)+$/);
        const tags = tagMatch ? tagMatch[0].trim() : fallbackTags;
        const maxTextLen = 150 - tags.length - 2;
        let mainPart = cleaned.replace(/(#[a-zA-Z0-9_]+\s*)+$/, '').trim();
        if (mainPart.length > maxTextLen) {
            mainPart = mainPart.slice(0, Math.max(10, maxTextLen - 3)).trim() + '...';
        }
        cleaned = `${mainPart} ${tags}`.trim();
    } else if (!cleaned.includes('#')) {
        const spaceLeft = 150 - cleaned.length - 1;
        if (spaceLeft >= fallbackTags.length) {
            cleaned = `${cleaned} ${fallbackTags}`.trim();
        }
    }
    return cleaned.slice(0, 150);
}

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

PILIHAN KATEGORI (PILIH SALAH SATU YANG PALING TEPAT):
- 👗 Fashion & OOTD (pakaian, baju, celana, jaket, tas, ransel, sepatu, sandal, dompet, hijab, jam tangan, kacamata)
- 💄 Skincare & Kecantikan (skincare, serum, sunscreen, lotion, sabun, toner, kosmetik, makeup, parfum, perawatan kulit/rambut)
- 📱 Gadget & Elektronik (hp, casing hp, powerbank, headset, TWS, earphone, charger, kabel, speaker, aksesoris komputer/elektronik)
- 🍔 Kuliner & Makanan (makanan, cemilan, snack, frozen food, kopi, teh, minuman, bumbu dapur, sambal)
- 🏠 Kebutuhan Rumah Tangga (perabot rumah, perlengkapan dapur, sprei, bantal, sapu, wadah, dekorasi kamar)
- ✨ Kesehatan & Kebugaran (suplemen, vitamin, madu herbal, alat fitness/olahraga)
- 🍼 Ibu & Anak (perlengkapan bayi, mainan anak, popok, susu formula)
- 🚗 Otomotif & Aksesoris (perlengkapan motor, mobil, helm, oli, aksesoris kendaraan)

PILIHAN GAYA BAHASA (TONE):
- Casual & Ceria (Gen Z)
- Review Jujur & Edukatif
- FOMO & Urgensi Diskon
- Elegan & Mewah

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick):
{
  "product_name": "Nama produk lengkap yang bersih, mudah dipahami, tanpa karakter/simbol sampah",
  "category": "PILIH PERSIS SALAH SATU DARI 8 KATEGORI DI ATAS (misal '👗 Fashion & OOTD')",
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
        const rawResponse = await callGemini(userPrompt, systemPrompt, null, null, null, { jsonMode: true, disableThinking: true });
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
 * Intelligent AI Multimodal Extraction from One or More Screenshots / Photos
 * Supports multiple reference images simultaneously (e.g. storefront + review + variant details)
 */
export async function extractDetailsFromMultipleImages(images) {
    if (!images || images.length === 0) {
        throw new Error('Pilih minimal satu gambar referensi etalase produk.');
    }

    const systemPrompt = `Kamu adalah Kawan Digital, asisten AI spesialis analisis multi-gambar screenshot etalase marketplace (Shopee, TikTok Shop, Tokopedia, Lazada), detail ulasan pembeli, atau menu kuliner.
Tugasmu adalah menganalisis seluruh gambar referensi yang diunggah secara objektif, akurat, dan menyeluruh tanpa mengarang fakta. Gabungkan informasi dari seluruh gambar (nama produk, varian, harga, bahan, keunggulan, ulasan).

WAJIB KLASIFIKASIKAN KATEGORI NICHE KE SALAH SATU PILIHAN BERIKUT:
- "👗 Fashion & OOTD" (jika produk pakaian, baju, celana, jaket, tas, ransel, backpack, sepatu, sandal, dompet, hijab, jam tangan, kacamata)
- "💄 Skincare & Kecantikan" (jika produk skincare, serum, sunscreen, lotion, sabun, toner, kosmetik, makeup, parfum, perawatan kulit/rambut)
- "📱 Gadget & Elektronik" (jika produk hp, casing hp, powerbank, headset, TWS, earphone, charger, kabel, speaker, aksesoris komputer/elektronik)
- "🍔 Kuliner & Makanan" (jika produk makanan, cemilan, snack, frozen food, kopi, teh, minuman, bumbu dapur, sambal)
- "🏠 Kebutuhan Rumah Tangga" (jika perabot rumah, perlengkapan dapur, sprei, bantal, sapu, wadah, dekorasi kamar)
- "✨ Kesehatan & Kebugaran" (jika suplemen, vitamin, madu herbal, alat fitness/olahraga)
- "🍼 Ibu & Anak" (jika perlengkapan bayi, mainan anak, popok, susu formula)
- "🚗 Otomotif & Aksesoris" (jika perlengkapan motor, mobil, helm, oli, aksesoris kendaraan)

Ekstrak informasi yang terbaca dari seluruh gambar dan kembalikan HANYA format JSON valid berikut (tanpa markdown backtick):
{
  "product_name": "Nama produk lengkap yang bersih, mudah dipahami, tanpa karakter sampah",
  "category": "PILIH PERSIS SALAH SATU DARI 8 KATEGORI DI ATAS (misal '👗 Fashion & OOTD')",
  "variant": "Warna & varian yang terlihat di gambar (atau 'Standar')",
  "visual_details": "Detail visual yang terlihat dari gambar (bahan, bentuk, kemasan, warna, dsb.)",
  "price": "Harga / diskon / rating jika terbaca jelas, atau 'belum terdeteksi'",
  "selling_points": "Keunggulan utama / benefit yang tampak atau terbaca dari deskripsi & ulasan screenshot (2-3 kalimat padat)",
  "suggested_tone": "Casual & Ceria (Gen Z)",
  "target_audience": "Target calon pembeli ideal produk ini"
}`;

    const prompt = `Analisis seluruh ${images.length} gambar referensi produk berikut. Ekstrak nama produk lengkap, kategori, detail visual/spesifikasi, ulasan/keunggulan utama dalam format JSON.`;

    const inlineDataPayload = images.map(img => ({
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64
    }));

    const rawResponse = await callGemini(prompt, systemPrompt, null, null, inlineDataPayload, { jsonMode: true, disableThinking: true });

    if (rawResponse) {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {}
        }
    }

    throw new Error('Gagal menganalisis referensi gambar. Pastikan gambar memuat teks judul atau informasi yang cukup jelas.');
}

export async function extractDetailsFromImage(base64Data, mimeType = 'image/jpeg') {
    return extractDetailsFromMultipleImages([{ base64: base64Data, mimeType }]);
}

/**
 * Intelligent Unified & Simultaneous Product Extractor
 * Accommodates:
 * 1. Images only -> Multimodal image analysis
 * 2. URL only -> Web scraping & text analysis
 * 3. BOTH Images AND URL -> Simultaneous multimodal analysis combining visual evidence & URL specs
 */
export async function extractProductSimultaneous({ images = [], url = '' }) {
    const hasImages = Array.isArray(images) && images.length > 0;
    const cleanUrl = (url || '').trim();
    const hasUrl = cleanUrl.startsWith('http');

    if (!hasImages && !hasUrl) {
        throw new Error('Silakan unggah minimal satu foto produk atau masukkan link produk (Shopee/TikTok).');
    }

    // Case 1: Only Images
    if (hasImages && !hasUrl) {
        return await extractDetailsFromMultipleImages(images);
    }

    // Case 2: Only URL
    if (!hasImages && hasUrl) {
        return await extractProductDetails(cleanUrl);
    }

    // Case 3: BOTH Images AND URL (Simultaneous & Complementary Analysis!)
    const slug = extractSlugFromUrl(cleanUrl);
    let pageText = '';
    if (!slug || slug.length < 8) {
        pageText = await fetchPageContent(cleanUrl, 2000);
    }

    const detectedCat = detectCategory(slug || cleanUrl || pageText);
    const cleanName = slug 
        ? slug.replace(/\b\w/g, l => l.toUpperCase()).replace(/\s+/g, ' ').trim()
        : 'Produk Rekomendasi Pilihan';

    const fallbackData = {
        product_name: cleanName,
        category: detectedCat,
        selling_points: generateHeuristicSellingPoints(cleanName, detectedCat),
        target_audience: 'Target calon pembeli potensial di marketplace',
        suggested_tone: 'Casual & Ceria (Gen Z)'
    };

    const apiKey = getSavedApiKey();
    if (!apiKey) {
        return fallbackData;
    }

    const systemPrompt = `Kamu adalah Kawan Digital, asisten AI multimodal tingkat lanjut untuk analisis produk e-commerce & affiliate marketplace (Shopee, TikTok Shop, Tokopedia).
Pengguna memberikan KEDUA sumber data: LINK URL PRODUK dan GAMBAR REFERENSI (foto etalase, varian, kemasan fisik, ulasan).
Tugasmu adalah menganalisis KEDUANYA secara simultan dan saling melengkapi:
- Gunakan data teks dari link URL untuk mendapatkan nama resmi produk, spesifikasi, dan harga.
- Gunakan data visual dari gambar untuk mengidentifikasi wujud fisik asli produk, warna, kemasan, tekstur, varian yang tampak, dan ulasan foto pembeli.
- Gabungkan keduanya menjadi profil produk yang kaya, akurat, dan sangat menjual untuk konten video UGC Affiliate.

WAJIB KLASIFIKASIKAN KATEGORI NICHE KE SALAH SATU PILIHAN:
- "👗 Fashion & OOTD"
- "💄 Skincare & Kecantikan"
- "📱 Gadget & Elektronik"
- "🍔 Kuliner & Makanan"
- "🏠 Kebutuhan Rumah Tangga"
- "✨ Kesehatan & Kebugaran"
- "🍼 Ibu & Anak"
- "🚗 Otomotif & Aksesoris"

PILIHAN GAYA BAHASA (TONE):
- Casual & Ceria (Gen Z)
- Review Jujur & Edukatif
- FOMO & Urgensi Diskon
- Elegan & Mewah

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick):
{
  "product_name": "Nama produk lengkap yang bersih dan resmi",
  "category": "Salah satu dari 8 kategori di atas",
  "variant": "Varian dan warna yang terlihat di gambar / tercatat di URL",
  "visual_details": "Deskripsi wujud fisik produk dari gambar (warna, kemasan, tekstur, ukuran)",
  "selling_points": "Keunggulan utama produk gabungan dari klaim resmi URL dan bukti visual gambar (2-3 kalimat padat persuasif)",
  "suggested_tone": "Casual & Ceria (Gen Z)",
  "target_audience": "Target calon pembeli ideal produk ini"
}`;

    let userPrompt = `Analisis produk ini secara simultan dari link URL dan ${images.length} gambar yang disertakan:\n`;
    userPrompt += `- Link URL: ${cleanUrl}\n`;
    if (slug) userPrompt += `- Judul dari URL: ${slug}\n`;
    if (pageText) userPrompt += `- Konten Halaman: ${pageText.slice(0, 1500)}\n`;
    userPrompt += `Gabungkan informasi URL dengan bukti visual dari gambar referensi terlampir.`;

    const inlineDataPayload = images.map(img => ({
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64
    }));

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, null, null, inlineDataPayload, { jsonMode: true, disableThinking: true });
        if (rawResponse) {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.product_name) {
                    return {
                        product_name: parsed.product_name || fallbackData.product_name,
                        category: parsed.category || fallbackData.category,
                        variant: parsed.variant || 'Standar',
                        visual_details: parsed.visual_details || '',
                        selling_points: parsed.selling_points || fallbackData.selling_points,
                        suggested_tone: parsed.suggested_tone || fallbackData.suggested_tone,
                        target_audience: parsed.target_audience || fallbackData.target_audience
                    };
                }
            }
        }
    } catch (err) {
        console.warn('[KawanDigi] Simultaneous extraction fallback to images:', err.message);
        return await extractDetailsFromMultipleImages(images);
    }

    return fallbackData;
}

// Backwards compatibility alias
export const scrapeProductFromUrl = fetchPageContent;

/**
 * Sanitize & translate any rogue English terms to pure natural Bahasa Indonesia
 */
function sanitizeIndonesianUgc(campaign, targetDuration = 10, includeTextOverlay = false) {
    if (!campaign || !Array.isArray(campaign.scenes)) return campaign;
    const dur = parseInt(targetDuration, 10) || campaign.duration_seconds || 10;
    const partCount = dur <= 10 ? 1 : (dur <= 20 ? 2 : 3);
    campaign.duration_seconds = dur;
    campaign.part_count = partCount;

    // Enforce Shopee Video Caption (Maks. 150 Karakter)
    if (campaign.captions) {
        if (!campaign.captions.shopee_video || !campaign.captions.shopee_video.full_text) {
            campaign.captions.shopee_video = {
                hook: 'Rekomendasi produk viral!',
                benefit: '',
                cta: 'Cek keranjang oranye ya!',
                hashtags: ['#RacunShopee', '#ShopeeHaul'],
                full_text: buildShopeeCaption(campaign.product_analysis?.product_name, campaign.product_analysis?.core_benefit)
            };
        } else {
            campaign.captions.shopee_video.full_text = ensureShopeeLength(
                campaign.captions.shopee_video.full_text,
                '#RacunShopee #ShopeeHaul'
            );
        }
    }

    const enToIdCamera = [
        [/handheld snap zoom (in|up)?/gi, 'Zoom cepat ke arah produk'],
        [/snap zoom (in|up)?/gi, 'Zoom cepat ke arah produk'],
        [/pan left,? medium close up/gi, 'Kamera bergerak ke kiri, close up sedang'],
        [/pan left/gi, 'Kamera bergerak perlahan ke kiri'],
        [/pan right/gi, 'Kamera bergerak perlahan ke kanan'],
        [/tilt up/gi, 'Kamera mendongak ke atas (tilt up)'],
        [/tilt down/gi, 'Kamera menunduk ke bawah (tilt down)'],
        [/close up macro shot/gi, 'Kamera statis jarak dekat fokus detail produk'],
        [/extreme close up/gi, 'Kamera sangat dekat detail produk'],
        [/close up/gi, 'Kamera jarak dekat'],
        [/medium shot/gi, 'Kamera jarak sedang'],
        [/wide shot/gi, 'Kamera jarak jauh'],
        [/orbit pan|orbit shot/gi, 'Kamera berputar mengelilingi model (orbit pan)'],
        [/eye[- ]level/gi, 'Kamera sejajar mata'],
        [/slow pull back/gi, 'Kamera bergerak mundur perlahan'],
        [/dolly in/gi, 'Kamera maju perlahan ke arah objek'],
        [/dolly out/gi, 'Kamera mundur perlahan menjauhi objek'],
        [/static shot/gi, 'Kamera statis']
    ];

    // Cek apakah scene masih menggunakan skala 10 detik saat user memilih durasi 20s atau 30s
    let totalCurrentDur = 0;
    campaign.scenes.forEach(s => {
        totalCurrentDur += parseFloat(s.duration_seconds) || 1.5;
    });
    const needsRescale = (dur > 10 && totalCurrentDur <= 12) || (campaign.scenes[5] && /10\s*detik/i.test(campaign.scenes[5].time_range) && dur > 10);

    const timeMap30 = [
        { range: "0–5 detik", dur: 5.0, part: 1 },
        { range: "5–10 detik", dur: 5.0, part: 1 },
        { range: "10–15 detik", dur: 5.0, part: 2 },
        { range: "15–20 detik", dur: 5.0, part: 2 },
        { range: "20–25 detik", dur: 5.0, part: 3 },
        { range: "25–30 detik", dur: 5.0, part: 3 }
    ];

    const timeMap20 = [
        { range: "0–3 detik", dur: 3.0, part: 1 },
        { range: "3–6,5 detik", dur: 3.5, part: 1 },
        { range: "6,5–10 detik", dur: 3.5, part: 1 },
        { range: "10–13,5 detik", dur: 3.5, part: 2 },
        { range: "13,5–17 detik", dur: 3.5, part: 2 },
        { range: "17–20 detik", dur: 3.0, part: 2 }
    ];

    campaign.scenes.forEach((s, idx) => {
        if (needsRescale) {
            const map = dur === 30 ? timeMap30[idx] : timeMap20[idx];
            if (map) {
                s.time_range = map.range;
                s.duration_seconds = map.dur;
                s.part_number = map.part;
            }
        }

        if (s.camera_movement) {
            for (const [enRegex, idText] of enToIdCamera) {
                if (enRegex.test(s.camera_movement)) {
                    s.camera_movement = s.camera_movement.replace(enRegex, idText);
                }
            }
        }
        if (s.google_flow_prompt) {
            s.google_flow_prompt = s.google_flow_prompt
                .replace(/^Cinematic vertical 9:16 UGC video,?\s*/i, 'Video UGC vertikal 9:16 kualitas FHD. Talent: wanita muda Indonesia berpenampilan natural, ')
                .replace(/natural handheld lighting/gi, 'pencahayaan alami kamar estetik')
                .replace(/natural lighting/gi, 'pencahayaan alami')
                .replace(/photorealistic,?\s*FHD/gi, 'fotorealistis FHD tanpa watermark')
                .replace(/photorealistic/gi, 'fotorealistis')
                .replace(/highly detailed/gi, 'sangat detail')
                .replace(/bright room/gi, 'ruangan terang')
                .replace(/bright bedroom background/gi, 'latar kamar tidur estetik')
                .replace(/stylish outfit/gi, 'pakaian kasual modis')
                .replace(/casual style/gi, 'gaya kasual');

            // Ensure explicit Indonesian voiceover directive is present
            if (!/voiceover bahasa indonesia/i.test(s.google_flow_prompt) && s.voiceover_script) {
                s.google_flow_prompt += `. Voiceover bahasa Indonesia: "${s.voiceover_script}". Percakapan wajib Bahasa Indonesia, tanpa kata bahasa Inggris.`;
            }

            // Opsi Teks Overlay: Jika dimatikan (default), bersihkan teks subtitle dan kunci ke clean footage
            if (!includeTextOverlay) {
                s.google_flow_prompt = s.google_flow_prompt
                    .replace(/\.?\s*Teks subtitle di layar[^.]*(\.|$)/gi, '.')
                    .replace(/\.?\s*Teks overlay[^.]*(\.|$)/gi, '.')
                    .replace(/dan tulisan/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!/clean footage|tanpa teks di layar/i.test(s.google_flow_prompt)) {
                    s.google_flow_prompt += ' Clean footage, tanpa teks di layar, tanpa subtitle, no typography, no watermarks.';
                }
                s.caption_overlay = '-';
            }
        }
    });

    // Validasi dan lengkapi array parts sesuai partCount
    if (!Array.isArray(campaign.parts) || campaign.parts.length < partCount) {
        const scenes = campaign.scenes;
        if (dur === 30) {
            campaign.parts = [
                {
                    part_number: 1,
                    part_title: "KLIP 1: HOOK & PROBLEM RELATABLE",
                    duration_seconds: 10,
                    scenes_included: "Adegan 1 - 2 (0–10 Detik)",
                    narasi_part: `${scenes[0]?.voiceover_script || ''} ${scenes[1]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[0]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                },
                {
                    part_number: 2,
                    part_title: "KLIP 2: PENGENALAN PRODUK & DEMONSTRASI FITUR",
                    duration_seconds: 10,
                    scenes_included: "Adegan 3 - 4 (10–20 Detik)",
                    narasi_part: `${scenes[2]?.voiceover_script || ''} ${scenes[3]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[2]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                },
                {
                    part_number: 3,
                    part_title: "KLIP 3: HONEST REVIEW & CALL TO ACTION",
                    duration_seconds: 10,
                    scenes_included: "Adegan 5 - 6 (20–30 Detik)",
                    narasi_part: `${scenes[4]?.voiceover_script || ''} ${scenes[5]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[4]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                }
            ];
        } else if (dur === 20) {
            campaign.parts = [
                {
                    part_number: 1,
                    part_title: "KLIP 1: HOOK, PROBLEM & PENGENALAN SOLUSI",
                    duration_seconds: 10,
                    scenes_included: "Adegan 1 - 3 (0–10 Detik)",
                    narasi_part: `${scenes[0]?.voiceover_script || ''} ${scenes[1]?.voiceover_script || ''} ${scenes[2]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[0]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                },
                {
                    part_number: 2,
                    part_title: "KLIP 2: DEMONSTRASI, REVIEW & CALL TO ACTION",
                    duration_seconds: 10,
                    scenes_included: "Adegan 4 - 6 (10–20 Detik)",
                    narasi_part: `${scenes[3]?.voiceover_script || ''} ${scenes[4]?.voiceover_script || ''} ${scenes[5]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[3]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                }
            ];
        } else {
            campaign.parts = [
                {
                    part_number: 1,
                    part_title: "KLIP 1: HOOK & PENGENALAN LENGKAP",
                    duration_seconds: 10,
                    scenes_included: "Adegan 1 - 6 (0–10 Detik)",
                    narasi_part: scenes.map(s => s.voiceover_script).filter(Boolean).join(' '),
                    google_flow_prompt: scenes[0]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                }
            ];
        }
    }

    if (Array.isArray(campaign.parts)) {
        campaign.parts.forEach(p => {
            if (p.google_flow_prompt && !/voiceover bahasa indonesia/i.test(p.google_flow_prompt) && p.narasi_part) {
                p.google_flow_prompt += `. Voiceover bahasa Indonesia: "${p.narasi_part}". Wajib Bahasa Indonesia, tanpa watermark.`;
            }
            if (!includeTextOverlay && p.google_flow_prompt) {
                p.google_flow_prompt = p.google_flow_prompt
                    .replace(/\.?\s*Teks subtitle di layar[^.]*(\.|$)/gi, '.')
                    .replace(/\.?\s*Teks overlay[^.]*(\.|$)/gi, '.')
                    .replace(/dan tulisan/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!/clean footage|tanpa teks di layar/i.test(p.google_flow_prompt)) {
                    p.google_flow_prompt += ' Clean footage, tanpa teks di layar, tanpa subtitle, no typography, no watermarks.';
                }
            }
        });
    }

    return campaign;
}

/**
 * Robust & Resilient JSON Parser with Auto-Repair
 */
function parseJsonSafely(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('AI tidak mengembalikan respon.');
    }

    let cleaned = rawText.trim();
    // 1. Strip markdown fences if present
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // 2. Direct attempt
    try {
        return JSON.parse(cleaned);
    } catch {}

    // 3. Regex match for outermost JSON block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        let candidate = match[0];
        try {
            return JSON.parse(candidate);
        } catch {}

        // 4. Auto-repair trailing commas before closing braces/brackets
        candidate = candidate
            .replace(/,\s*([\}\]])/g, '$1')
            .replace(/[\u0000-\u0019]+/g, '');
        try {
            return JSON.parse(candidate);
        } catch {}
    }

    throw new Error('JSON_PARSE_FAILED');
}

/**
 * Instant Fast Synthesizer: Generates ideal UGC campaign directly from existing form inputs
 * Guarantees zero latency and 0% failure even if external AI connection fluctuates
 */
/**
 * Instant Fast Synthesizer: Generates ideal UGC campaign directly from existing form inputs
 * Guarantees zero latency and 0% failure even if external AI connection fluctuates
 */
function synthesizeUgcFromDetails({ productName, productCategory, sellingPoints, videoDuration, tone, talentPreference = 'auto', includeTextOverlay = false }) {
    const dur = parseInt(videoDuration, 10) || 10;
    const pName = productName || 'Produk Rekomendasi Pilihan';
    const sPoints = sellingPoints || 'Kualitas terbaik, nyaman digunakan, dan sangat terjangkau.';
    const cat = productCategory || 'Affiliate Produk';
    const isFaceless = talentPreference === 'faceless';
    const isMale = talentPreference === 'male';

    let talentLabel = 'wanita muda Indonesia berpenampilan natural ramah, pencahayaan alami kamar estetik';
    let visualStyle = 'Talent';
    let scene1Visual = `Seorang talent wanita muda Indonesia tersenyum ceria menunjukkan ${pName} di depan kamera dengan pencahayaan alami estetik.`;
    let scene2Visual = `Talent memasang ekspresi bingung membandingkan produk lama yang kurang memuaskan.`;
    let scene4Visual = `Talent memperagakan cara pakai dan fitur unggulan ${pName} dengan antusias.`;
    let scene5Visual = `Talent tersenyum puas mengacungkan jempol sambil mengenakan ${pName} dengan percaya diri di ruangan terang.`;
    let scene6Visual = `Talent tersenyum ramah menunjuk ke arah bawah video mengajak penonton mengecek keranjang.`;

    if (isFaceless) {
        talentLabel = 'Gaya: Faceless aesthetic product presentation, hands-only POV unboxing, tanpa menampakkan wajah';
        visualStyle = 'Tangan (Hands-only POV)';
        scene1Visual = `Tangan membuka kemasan rapi ${pName} secara estetik di atas meja kayu minimalis dengan pencahayaan alami kamar estetik.`;
        scene2Visual = `Close-up perbandingan tangan memegang produk lama yang rusak vs ${pName} yang kokoh dan presisi.`;
        scene4Visual = `Tangan mendemonstrasikan keunggulan fitur ${pName} secara close-up dan praktis.`;
        scene5Visual = `Flatlay estetik ${pName} ditata rapi bersama aksesoris pelengkap dari sudut atas (top-down view) dengan pencahayaan alami.`;
        scene6Visual = `Tangan menunjuk ke arah tombol keranjang di bawah video dengan gestur estetik mengajak checkout.`;
    } else if (isMale) {
        talentLabel = 'pria muda Indonesia berpenampilan kasual keren dan rapi, pencahayaan alami kamar estetik';
        scene1Visual = `Seorang talent pria muda Indonesia tersenyum ceria menunjukkan ${pName} ke arah kamera dengan gaya kasual.`;
        scene2Visual = `Talent pria memasang ekspresi bingung membandingkan produk lama yang kurang memuaskan.`;
        scene4Visual = `Talent pria mendemonstrasikan kepraktisan ${pName} dengan antusias.`;
        scene5Visual = `Talent pria tersenyum puas mengacungkan jempol sambil mengenakan ${pName} dengan percaya diri.`;
        scene6Visual = `Talent pria tersenyum ramah menunjuk ke arah bawah video mengajak penonton klik keranjang.`;
    }

    const makeFlowPrompt = (tLabel, visual, camera, vo, sub) => {
        let p = `Video UGC vertikal 9:16 kualitas FHD. Talent: ${tLabel}. Visual adegan: ${visual} Pergerakan kamera: ${camera}. Voiceover bahasa Indonesia: "${vo}".`;
        if (includeTextOverlay && sub) {
            p += ` Teks subtitle di layar: "${sub}".`;
        } else {
            p += ` Clean footage, tanpa teks di layar, tanpa subtitle, no typography, no watermarks.`;
        }
        p += ` Wajib Bahasa Indonesia, tanpa kata bahasa Inggris, tanpa watermark${isFaceless ? ', tanpa menampilkan wajah model' : ''}.`;
        return p;
    };
    const makeOverlay = (sub) => (includeTextOverlay && sub ? sub : '-');

    const partCount = dur <= 10 ? 1 : (dur <= 20 ? 2 : 3);
    let parts = [];
    let scenes = [];
    let totalNarasiKata = 25;

    if (dur === 30) {
        totalNarasiKata = 70;
        parts = [
            {
                part_number: 1,
                part_title: "KLIP 1: HOOK & PROBLEM RELATABLE",
                duration_seconds: 10,
                scenes_included: "Adegan 1 - 2 (0–10 Detik)",
                google_flow_prompt: makeFlowPrompt(
                    talentLabel,
                    isFaceless ? `Tangan membuka paket kemasan rapi ${pName} di atas meja kayu minimalis, membandingkannya dengan produk lama yang rusak.` : `Talent menunjukkan ${pName} ke arah kamera dengan ekspresi penasaran lalu membandingkannya dengan produk lama.`,
                    "Zoom cepat ke arah produk lalu pan perlahan ke kiri",
                    `Lagi cari ${pName} yang beneran berkualitas dan awet? Sering kecewa sama produk gampang rusak?`,
                    "Lagi Cari Yang Awet?"
                ),
                narasi_part: `Lagi cari ${pName} yang beneran berkualitas dan awet? Sering kecewa sama produk gampang rusak?`
            },
            {
                part_number: 2,
                part_title: "KLIP 2: PENGENALAN PRODUK & DEMONSTRASI FITUR",
                duration_seconds: 10,
                scenes_included: "Adegan 3 - 4 (10–20 Detik)",
                google_flow_prompt: makeFlowPrompt(
                    talentLabel,
                    isFaceless ? `Close up tangan memperlihatkan tekstur bahan ${pName}, jahitan rapi, dan mendemonstrasikan keunggulan praktisnya.` : `Talent memperlihatkan detail fisik ${pName} lalu memperagakan keunggulannya dengan senyum puas.`,
                    "Kamera statis jarak dekat fokus detail bahan lalu maju perlahan",
                    `Untung langsung ketemu ${pName} ini! ${sPoints.slice(0, 80)}.`,
                    "Solusi Terbaik & Awet!"
                ),
                narasi_part: `Untung langsung ketemu ${pName} ini! ${sPoints.slice(0, 80)}.`
            },
            {
                part_number: 3,
                part_title: "KLIP 3: HONEST REVIEW & CALL TO ACTION",
                duration_seconds: 10,
                scenes_included: "Adegan 5 - 6 (20–30 Detik)",
                google_flow_prompt: makeFlowPrompt(
                    talentLabel,
                    isFaceless ? `Flatlay estetik ${pName} bersama perlengkapan harian di ruangan terang, lalu tangan menunjuk ke arah tombol keranjang di bawah video.` : `Talent tersenyum puas mengacungkan jempol sambil mengenakan ${pName}, lalu menunjuk ramah ke arah bawah video.`,
                    "Orbit pan mengelilingi objek lalu sejajar mata fokus ke bawah",
                    `Dipakai seharian tetep nyaman dan bikin makin percaya diri! Yuk, langsung klik keranjang di bawah video ini ya!`,
                    "Klik Keranjang di Bawah Video!"
                ),
                narasi_part: `Dipakai seharian tetep nyaman dan bikin makin percaya diri! Yuk, langsung klik keranjang di bawah video ini ya!`
            }
        ];

        scenes = [
            {
                scene_number: 1,
                part_number: 1,
                time_range: "0–5 detik",
                duration_seconds: 5.0,
                scene_title: "HOOK",
                visual_description: scene1Visual,
                camera_movement: "Zoom cepat ke arah produk",
                voiceover_script: `Lagi cari ${pName} yang beneran berkualitas dan awet?`,
                caption_overlay: makeOverlay("Lagi Cari Yang Beneran Awet?"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene1Visual, "Zoom cepat ke arah produk", `Lagi cari ${pName} yang beneran berkualitas dan awet?`, "Lagi Cari Yang Beneran Awet?")
            },
            {
                scene_number: 2,
                part_number: 1,
                time_range: "5–10 detik",
                duration_seconds: 5.0,
                scene_title: "PROBLEM",
                visual_description: scene2Visual,
                camera_movement: "Kamera bergerak perlahan ke kiri",
                voiceover_script: `Sering banget kecewa beli produk yang gampang rusak padahal baru dipakai sebentar?`,
                caption_overlay: makeOverlay("Sering Kecewa Cepat Rusak?"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene2Visual, "Kamera bergerak perlahan ke kiri", `Sering banget kecewa beli produk yang gampang rusak padahal baru dipakai sebentar?`, "Sering Kecewa?")
            },
            {
                scene_number: 3,
                part_number: 2,
                time_range: "10–15 detik",
                duration_seconds: 5.0,
                scene_title: "PENGENALAN",
                visual_description: `Close-up detail fisik ${pName}, memperlihatkan jahitan, tekstur bahan, dan logo resmi dengan pencahayaan jelas.`,
                camera_movement: "Kamera statis jarak dekat fokus detail bahan",
                voiceover_script: `Untung sekarang nemu ${pName} ini, kualitas bahannya kerasa beda banget sejak pertama pegang!`,
                caption_overlay: makeOverlay("Solusi Terbaik Buat Kamu!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, `Close up detail bahan dan jahitan ${pName} sangat rapi.`, "Kamera statis jarak dekat fokus detail bahan", `Untung sekarang nemu ${pName} ini, kualitas bahannya kerasa beda banget sejak pertama pegang!`, "Solusi Terbaik!")
            },
            {
                scene_number: 4,
                part_number: 2,
                time_range: "15–20 detik",
                duration_seconds: 5.0,
                scene_title: "DEMONSTRASI",
                visual_description: scene4Visual,
                camera_movement: "Kamera maju perlahan ke arah objek",
                voiceover_script: `${sPoints.slice(0, 90)}.`,
                caption_overlay: makeOverlay("Keunggulan Nyata & Praktis!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene4Visual, "Kamera maju perlahan ke arah objek", `${sPoints.slice(0, 90)}.`, "Keunggulan Nyata!")
            },
            {
                scene_number: 5,
                part_number: 3,
                time_range: "20–25 detik",
                duration_seconds: 5.0,
                scene_title: "HONEST REVIEW",
                visual_description: scene5Visual,
                camera_movement: "Kamera berputar mengelilingi model (orbit pan)",
                voiceover_script: `Dipakai seharian bener-bener nyaman, adem, dan bikin makin percaya diri saat hangout!`,
                caption_overlay: makeOverlay("Nyaman & Bikin Pede!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene5Visual, "Kamera berputar mengelilingi model (orbit pan)", `Dipakai seharian bener-bener nyaman, adem, dan bikin makin percaya diri saat hangout!`, "Nyaman & Bikin Pede!")
            },
            {
                scene_number: 6,
                part_number: 3,
                time_range: "25–30 detik",
                duration_seconds: 5.0,
                scene_title: "CTA NETRAL",
                visual_description: scene6Visual,
                camera_movement: "Kamera sejajar mata fokus menunjuk ke bawah",
                voiceover_script: `Yuk, langsung klik keranjang di bawah video ini sebelum kehabisan promonya ya!`,
                caption_overlay: makeOverlay("Klik Keranjang di Bawah Video!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene6Visual, "Kamera sejajar mata fokus menunjuk ke bawah", `Yuk, langsung klik keranjang di bawah video ini sebelum kehabisan promonya ya!`, "Klik Keranjang di Bawah!")
            }
        ];
    } else if (dur === 20) {
        totalNarasiKata = 48;
        parts = [
            {
                part_number: 1,
                part_title: "KLIP 1: HOOK, PROBLEM & PENGENALAN SOLUSI",
                duration_seconds: 10,
                scenes_included: "Adegan 1 - 3 (0–10 Detik)",
                google_flow_prompt: makeFlowPrompt(
                    talentLabel,
                    isFaceless ? `Tangan memperlihatkan kemasan ${pName} di atas meja, unboxing rapi, dan membandingkannya dengan produk lama.` : `Menunjukkan ${pName} ke arah kamera dengan senyum ceria lalu membandingkannya antusias.`,
                    "Zoom cepat lalu pan ke kiri dan fokus detail bahan",
                    `Lagi cari ${pName} yang awet dan stylish? Sering kecewa sama produk gampang rusak? Untung nemu ini!`,
                    "Solusi Awet & Stylish!"
                ),
                narasi_part: `Lagi cari ${pName} yang awet dan stylish? Sering kecewa sama produk gampang rusak? Untung nemu ini!`
            },
            {
                part_number: 2,
                part_title: "KLIP 2: DEMONSTRASI, REVIEW & CALL TO ACTION",
                duration_seconds: 10,
                scenes_included: "Adegan 4 - 6 (10–20 Detik)",
                google_flow_prompt: makeFlowPrompt(
                    talentLabel,
                    isFaceless ? `Tangan mendemonstrasikan fitur ${pName}, flatlay estetik, lalu menunjuk ke arah bawah video.` : `Talent memperagakan cara pakai ${pName}, tersenyum puas mengacungkan jempol, lalu menunjuk ramah ke bawah video.`,
                    "Kamera maju perlahan, orbit pan, lalu sejajar mata fokus ke bawah",
                    `${sPoints.slice(0, 60)}. Dipakai seharian nyaman banget! Yuk klik keranjang di bawah video ya!`,
                    "Klik Keranjang di Bawah!"
                ),
                narasi_part: `${sPoints.slice(0, 60)}. Dipakai seharian nyaman banget! Yuk klik keranjang di bawah video ya!`
            }
        ];

        scenes = [
            {
                scene_number: 1,
                part_number: 1,
                time_range: "0–3 detik",
                duration_seconds: 3.0,
                scene_title: "HOOK",
                visual_description: scene1Visual,
                camera_movement: "Zoom cepat ke arah produk",
                voiceover_script: `Beneran nemu ${pName} sebagus dan sekeren ini?`,
                caption_overlay: makeOverlay("Beneran Sebagus Ini?"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene1Visual, "Zoom cepat ke arah produk", `Beneran nemu ${pName} sebagus dan sekeren ini?`, "Beneran Sebagus Ini?")
            },
            {
                scene_number: 2,
                part_number: 1,
                time_range: "3–6,5 detik",
                duration_seconds: 3.5,
                scene_title: "PROBLEM",
                visual_description: scene2Visual,
                camera_movement: "Kamera bergerak perlahan ke kiri",
                voiceover_script: `Sering kecewa sama produk yang gampang rusak padahal baru dipakai?`,
                caption_overlay: makeOverlay("Sering Kecewa Cepat Rusak?"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene2Visual, "Kamera bergerak perlahan ke kiri", `Sering kecewa sama produk yang gampang rusak padahal baru dipakai?`, "Sering Kecewa?")
            },
            {
                scene_number: 3,
                part_number: 1,
                time_range: "6,5–10 detik",
                duration_seconds: 3.5,
                scene_title: "PENGENALAN",
                visual_description: `Close-up detail fisik ${pName}, memperlihatkan jahitan, tekstur bahan, dan logo resmi dengan pencahayaan jelas.`,
                camera_movement: "Kamera statis jarak dekat fokus detail bahan",
                voiceover_script: `Untung langsung ketemu ${pName} ini, bahannya beneran premium!`,
                caption_overlay: makeOverlay("Solusi Terbaik Buat Kamu!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, `Close up detail bahan dan jahitan ${pName} sangat rapi.`, "Kamera statis jarak dekat fokus detail bahan", `Untung langsung ketemu ${pName} ini, bahannya beneran premium!`, "Solusi Terbaik!")
            },
            {
                scene_number: 4,
                part_number: 2,
                time_range: "10–13,5 detik",
                duration_seconds: 3.5,
                scene_title: "DEMONSTRASI",
                visual_description: scene4Visual,
                camera_movement: "Kamera maju perlahan ke arah objek",
                voiceover_script: `${sPoints.slice(0, 75)}.`,
                caption_overlay: makeOverlay("Kualitas Nyata & Awet!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene4Visual, "Kamera maju perlahan ke arah objek", `${sPoints.slice(0, 75)}.`, "Kualitas Nyata!")
            },
            {
                scene_number: 5,
                part_number: 2,
                time_range: "13,5–17 detik",
                duration_seconds: 3.5,
                scene_title: "HONEST REVIEW",
                visual_description: scene5Visual,
                camera_movement: "Kamera berputar mengelilingi model (orbit pan)",
                voiceover_script: `Dipakai seharian tetep nyaman dan bikin makin percaya diri!`,
                caption_overlay: makeOverlay("Nyaman & Bikin Pede!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene5Visual, "Kamera berputar mengelilingi model (orbit pan)", `Dipakai seharian tetep nyaman dan bikin makin percaya diri!`, "Nyaman & Bikin Pede!")
            },
            {
                scene_number: 6,
                part_number: 2,
                time_range: "17–20 detik",
                duration_seconds: 3.0,
                scene_title: "CTA NETRAL",
                visual_description: scene6Visual,
                camera_movement: "Kamera sejajar mata fokus menunjuk ke bawah",
                voiceover_script: `Yuk, langsung klik keranjang di bawah video ini ya!`,
                caption_overlay: makeOverlay("Klik Keranjang di Bawah Video!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene6Visual, "Kamera sejajar mata fokus menunjuk ke bawah", `Yuk, langsung klik keranjang di bawah video ini ya!`, "Klik Keranjang di Bawah!")
            }
        ];
    } else {
        // dur === 10 (Single 10s Clip)
        totalNarasiKata = 25;
        parts = [
            {
                part_number: 1,
                part_title: "KLIP 1: HOOK & PENGENALAN SOLUSI LENGKAP",
                duration_seconds: 10,
                scenes_included: "Adegan 1 - 6 (0–10 Detik)",
                google_flow_prompt: makeFlowPrompt(
                    talentLabel,
                    isFaceless ? `Tangan memperlihatkan ${pName} secara estetik di atas meja, unboxing membuka kemasan rapi, demonstrasi detail bahan secara close-up.` : `Menunjukkan ${pName} ke arah kamera dengan senyum ceria dan gestur antusias.`,
                    "Zoom perlahan ke arah produk",
                    `Lagi cari ${pName} yang awet dan stylish? Ini solusinya!`,
                    "Lagi Cari Yang Awet & Keren?"
                ),
                narasi_part: `Lagi cari ${pName} yang awet dan stylish? Ini solusinya!`
            }
        ];

        scenes = [
            {
                scene_number: 1,
                part_number: 1,
                time_range: "0–1,5 detik",
                duration_seconds: 1.5,
                scene_title: "HOOK",
                visual_description: scene1Visual,
                camera_movement: "Zoom cepat ke arah produk",
                voiceover_script: `Beneran nemu ${pName} sebagus ini?`,
                caption_overlay: makeOverlay("Beneran Sebagus Ini?"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene1Visual, "Zoom cepat ke arah produk", `Beneran nemu ${pName} sebagus ini?`, "Beneran Sebagus Ini?")
            },
            {
                scene_number: 2,
                part_number: 1,
                time_range: "1,5–3 detik",
                duration_seconds: 1.5,
                scene_title: "PROBLEM",
                visual_description: scene2Visual,
                camera_movement: "Kamera bergerak perlahan ke kiri",
                voiceover_script: `Sering kecewa sama produk yang gampang rusak?`,
                caption_overlay: makeOverlay("Sering Kecewa Cepat Rusak?"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene2Visual, "Kamera bergerak perlahan ke kiri", `Sering kecewa sama produk yang gampang rusak?`, "Sering Kecewa?")
            },
            {
                scene_number: 3,
                part_number: 1,
                time_range: "3–4,5 detik",
                duration_seconds: 1.5,
                scene_title: "PENGENALAN",
                visual_description: `Close-up detail fisik ${pName}, memperlihatkan jahitan, tekstur bahan, dan logo resmi dengan pencahayaan jelas.`,
                camera_movement: "Kamera statis jarak dekat fokus detail bahan",
                voiceover_script: `Untung langsung ketemu ${pName} ini!`,
                caption_overlay: makeOverlay("Solusi Terbaik Buat Kamu!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, `Close up detail bahan dan jahitan ${pName} sangat rapi.`, "Kamera statis jarak dekat fokus detail bahan", `Untung langsung ketemu ${pName} ini!`, "Solusi Terbaik!")
            },
            {
                scene_number: 4,
                part_number: 1,
                time_range: "4,5–6,5 detik",
                duration_seconds: 2.0,
                scene_title: "DEMONSTRASI",
                visual_description: scene4Visual,
                camera_movement: "Kamera maju perlahan ke arah objek",
                voiceover_script: `${sPoints.slice(0, 70)}.`,
                caption_overlay: makeOverlay("Kapasitas Lega & Awet!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene4Visual, "Kamera maju perlahan ke arah objek", `${sPoints.slice(0, 70)}.`, "Kapasitas Lega!")
            },
            {
                scene_number: 5,
                part_number: 1,
                time_range: "6,5–8,5 detik",
                duration_seconds: 2.0,
                scene_title: "HONEST REVIEW",
                visual_description: scene5Visual,
                camera_movement: "Kamera berputar mengelilingi model (orbit pan)",
                voiceover_script: `Dipakai seharian tetep nyaman dan bikin makin percaya diri!`,
                caption_overlay: makeOverlay("Nyaman & Bikin Pede!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene5Visual, "Kamera berputar mengelilingi model (orbit pan)", `Dipakai seharian tetep nyaman dan bikin makin percaya diri!`, "Nyaman & Bikin Pede!")
            },
            {
                scene_number: 6,
                part_number: 1,
                time_range: "8,5–10 detik",
                duration_seconds: 1.5,
                scene_title: "CTA NETRAL",
                visual_description: scene6Visual,
                camera_movement: "Kamera sejajar mata fokus menunjuk ke bawah",
                voiceover_script: `Yuk, langsung klik keranjang di bawah video ini ya!`,
                caption_overlay: makeOverlay("Klik Keranjang di Bawah Video!"),
                google_flow_prompt: makeFlowPrompt(talentLabel, scene6Visual, "Kamera sejajar mata fokus menunjuk ke bawah", `Yuk, langsung klik keranjang di bawah video ini ya!`, "Klik Keranjang di Bawah!")
            }
        ];
    }

    return {
        product_analysis: {
            product_name: pName,
            category: cat,
            core_benefit: sPoints.slice(0, 150),
            target_buyer: 'Pengguna yang mencari produk berkualitas dengan harga terbaik'
        },
        duration_seconds: dur,
        part_count: partCount,
        parts: parts,
        scenes: scenes,
        total_narasi_kata: totalNarasiKata,
        captions: {
            shopee_video: {
                hook: `Mau ${pName} original promo hari ini?`,
                benefit: `${sPoints.slice(0, 50)}`,
                cta: "Cek keranjang oranye ya!",
                hashtags: ["#RacunShopee", "#ShopeeHaul"],
                full_text: buildShopeeCaption(pName, sPoints)
            },
            hard_selling: {
                hook: `Mau ${pName} original dengan promo terbaik hari ini?`,
                benefit: `${sPoints}`,
                cta: "Yuk, langsung klik keranjang di bawah video ini sebelum kehabisan!",
                hashtags: ["#racunshopee", "#tiktokaffiliate", "#rekomendasiproduk"],
                full_text: `Mau ${pName} original dengan promo terbaik hari ini?\n${sPoints}\nYuk, langsung klik keranjang di bawah video ini sebelum kehabisan!\n#racunshopee #tiktokaffiliate #rekomendasiproduk`
            },
            storytelling: {
                hook: `Sering banget nyesel beli produk abal-abal yang cepet jebol?`,
                benefit: `Akhirnya nemu ${pName} ini. Bahannya kuat, kapasitasnya lega, dan modelnya kekinian banget.`,
                cta: "Temukan tautan produknya persis di bawah video ya.",
                hashtags: ["#reviewjujur", "#ootd", "#affiliate"],
                full_text: `Sering banget nyesel beli produk abal-abal yang cepet jebol?\nAkhirnya nemu ${pName} ini. Bahannya kuat, kapasitasnya lega, dan modelnya kekinian banget.\nTemukan tautan produknya persis di bawah video ini ya.\n#reviewjujur #ootd #affiliate`
            },
            soft_selling: {
                hook: `Tips cari produk yang awet buat harian tanpa bikin kantong jebol:`,
                benefit: `${pName} ini recommended banget karena ${sPoints.slice(0, 100)}.`,
                cta: "Link lengkapnya ada di bawah video ini ya.",
                hashtags: ["#tipshemat", "#rekomendasiproduk", "#reviewproduk"],
                full_text: `Tips cari produk yang awet buat harian tanpa bikin kantong jebol:\n${pName} ini recommended banget karena ${sPoints.slice(0, 100)}.\nLink lengkapnya ada di bawah video ini ya.\n#tipshemat #rekomendasiproduk #reviewproduk`
            }
        }
    };
}

/**
 * Generate Complete UGC Affiliate Storyboard & Scene Prompts
 * Strictly adheres to Kawan Digital Skill v2.0:
 * - 6-Scene UGC Video structure (Hook, Problem, Pengenalan, Demonstrasi, Review, CTA)
 * - Multi-Part 10s Video Splitting (10s = 1 clip, 20s = 2 clips @ 10s, 30s = 3 clips @ 10s)
 * - Explicit Indonesian Voiceover & Talent Directives in Prompts (Zero English Leakage)
 * - Safe zone: area tengah-atas, hindari area bawah 15% & kanan 10%
 * - Multi-Platform Neutral CTA (tidak menyebut warna keranjang)
 * - 3 Template Caption Siap Pakai (Hard-selling, Storytelling, Soft-selling)
 * - Formatted Copyable Video Prompt Block 100% BAHASA INDONESIA
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
    talentPreference = 'auto',
    imageAnalysis = null,
    includeTextOverlay = false
}) {
    // 1. License / Trial Check
    const access = hasToolAccess('ugc');
    if (!access.allowed) {
        throw new Error('Akses Tool AI UGC Creator terkunci. Silakan masukkan kode lisensi di tab Lisensi untuk membuka akses.');
    }

    const dur = parseInt(videoDuration, 10) || 10;
    const partCount = dur <= 10 ? 1 : (dur <= 20 ? 2 : 3);

    // Directive based on talent preference
    let talentDirective = '';
    if (talentPreference === 'faceless') {
        talentDirective = `
ATURAN WAJIB FORMAT FACELESS (TANPA MODEL WAJAH / FOKUS PRESENTASI PRODUK / UNBOXING POV):
- Video ini DILARANG KERAS MENAMPILKAN WAJAH MODEL SAMA SEKALI!
- Visual adegan HARUS fokus penuh pada presentasi produk secara profesional & estetik.
- Visual adegan harus berupa POV orang pertama (first-person POV): tangan unboxing membuka paket/kemasan, tangan memegang produk, demonstrasi close-up tekstur bahan dan fungsi secara detail, serta flatlay estetik di atas meja dengan pencahayaan alami kamar estetik.
- Di seluruh scene dan "google_flow_prompt", WAJIB menggunakan struktur:
  "Video UGC vertikal 9:16 kualitas FHD. Gaya: Faceless aesthetic product presentation, hands-only POV unboxing. Visual adegan: Tangan memperlihatkan [nama produk] secara estetik di atas meja minimalis, unboxing membuka kemasan rapi, demonstrasi detail bahan secara close-up... Pergerakan kamera: [pergerakan kamera]. Voiceover bahasa Indonesia: '[naskah suara]'. ${includeTextOverlay ? "Teks subtitle di layar bahasa Indonesia: '[teks overlay]'." : "Clean footage, tanpa teks di layar, tanpa subtitle, no typography, no watermarks."} Wajib Bahasa Indonesia, tanpa kata bahasa Inggris, tanpa watermark, tanpa menampakkan wajah model."
`;
    } else if (talentPreference === 'female') {
        talentDirective = `
ATURAN WAJIB MODEL WANITA:
- Seluruh visual adegan dan "google_flow_prompt" WAJIB menggunakan talent WANITA muda Indonesia berpenampilan natural, ceria, ramah, dan ekspresif.
- Di seluruh scene dan "google_flow_prompt", awali dengan: "Video UGC vertikal 9:16 kualitas FHD. Talent: wanita muda Indonesia berpenampilan natural ramah, pencahayaan alami kamar estetik. Visual adegan: ..."
`;
    } else if (talentPreference === 'male') {
        talentDirective = `
ATURAN WAJIB MODEL PRIA:
- Seluruh visual adegan dan "google_flow_prompt" WAJIB menggunakan talent PRIA muda Indonesia berpenampilan kasual keren, rapi, ramah, dan komunikatif.
- Di seluruh scene dan "google_flow_prompt", awali dengan: "Video UGC vertikal 9:16 kualitas FHD. Talent: pria muda Indonesia berpenampilan kasual rapi, pencahayaan alami estetik. Visual adegan: ..."
`;
    } else {
        talentDirective = `
GAYA VISUAL & MODEL (BEBAS / REKOMENDASI AI):
- AI bebas berkreasi menentukan gaya visual terbaik yang paling menjual (apakah model wanita, model pria, atau faceless unboxing hands-only) sesuai kecocokan produk ${productCategory || 'ini'}.
`;
    }

    const textOverlayRule = includeTextOverlay ? `
ATURAN TEKS/SUBTITLE DI LAYAR VIDEO (OPSI PENGGUNA DIAKTIFKAN):
- Pengguna memilih menyertakan teks overlay di dalam video.
- "google_flow_prompt" menyertakan: "Teks subtitle di layar bahasa Indonesia: '[teks overlay ringkas]'".
- Field "caption_overlay" diisi teks safe-zone ringkas yang akan muncul.
` : `
ATURAN WAJIB PROMPT VIDEO BERSIH TANPA TEKS (DEFAULT: CLEAN FOOTAGE):
- DILARANG KERAS memunculkan tulisan teks, subtitle, safe-zone caption, watermark, tipografi, logo, atau banner overlay di dalam video!
- Generator video AI menghasilkan rekaman jauh lebih jernih dan bebas glitch bila tidak dipaksa menulis teks. Karena itu rekaman video HARUS 100% BERSIH (CLEAN FOOTAGE).
- Di setiap "google_flow_prompt", WAJIB gunakan akhiran: "Clean footage, tanpa teks di layar, tanpa subtitle, no typography, no watermarks. Wajib percakapan Bahasa Indonesia, tanpa kata bahasa Inggris."
- Field "caption_overlay" WAJIB diisi "-" (strip) karena footage bersih tanpa tulisan di layar.
`;

    // 2. Construct prompt for Gemini according to Kawan Digital Skill v2.0
    const systemPrompt = `Kamu adalah Kawan Digital, asisten pembuat konten affiliate dan review berbahasa Indonesia kelas dunia.
Tugasmu adalah menghasilkan Storyboard UGC ideal (Hook, Problem, Pengenalan, Demonstrasi, Honest Review, CTA), prompt video Google Flow / Veo per klip 10 detik, dan 3 template caption siap pakai untuk TikTok & Shopee Video.

${talentDirective}
${textOverlayRule}

ATURAN STRUKTUR SCENE (WAJIB TEPAT 6 TAHAPAN INI, BERAPAPUN DURASINYA):
1. Hook — menarik perhatian di detik awal
2. Problem — masalah relatable yang dialami penonton
3. Pengenalan — memperkenalkan produk sebagai solusi
4. Demonstrasi — aksi nyata penggunaan atau keunggulan produk
5. Honest Review — ulasan jujur & manfaat yang dirasakan
6. CTA Netral — ajakan bertindak (klik keranjang/link di bawah video)

ATURAN PEMBAGIAN DURASI & KLIP 10 DETIK (${dur} DETIK — ${partCount} KLIP):
Google Flow / Veo / AI Video merender video per klip 10 detik.
${partCount === 1 ? `
- Video 10 detik dibuat dalam 1 Klip utuh 10 detik (Adegan 1 s/d 6). Total narasi 22-26 kata:
  * Adegan 1: Hook (0–1,5 detik)
  * Adegan 2: Problem (1,5–3 detik)
  * Adegan 3: Pengenalan (3–4,5 detik)
  * Adegan 4: Demonstrasi (4,5–6,5 detik)
  * Adegan 5: Honest Review (6,5–8,5 detik)
  * Adegan 6: CTA Netral (8,5–10 detik)
` : (partCount === 2 ? `
- Video 20 detik dipecah menjadi tepat 2 KLIP (@ 10 detik per klip, total 45-50 kata narasi):
  * KLIP 1 (10 Detik, narasi 20-25 kata):
    - Adegan 1: Hook (0–3 detik, part_number: 1)
    - Adegan 2: Problem (3–6,5 detik, part_number: 1)
    - Adegan 3: Pengenalan Solusi (6,5–10 detik, part_number: 1)
  * KLIP 2 (10 Detik, narasi 20-25 kata):
    - Adegan 4: Demonstrasi Aksi (10–13,5 detik, part_number: 2)
    - Adegan 5: Honest Review (13,5–17 detik, part_number: 2)
    - Adegan 6: CTA Netral (17–20 detik, part_number: 2)
` : `
- Video 30 detik dipecah menjadi tepat 3 KLIP (@ 10 detik per klip, total 65-75 kata narasi):
  * KLIP 1 (10 Detik, narasi 20-25 kata):
    - Adegan 1: Hook Menusuk Rasa Ingin Tahu (0–5 detik, part_number: 1)
    - Adegan 2: Problem Relatable & Keresahan (5–10 detik, part_number: 1)
  * KLIP 2 (10 Detik, narasi 20-25 kata):
    - Adegan 3: Pengenalan Produk & Detail Bahan (10–15 detik, part_number: 2)
    - Adegan 4: Demonstrasi Nyata & Fitur Unggulan (15–20 detik, part_number: 2)
  * KLIP 3 (10 Detik, narasi 20-25 kata):
    - Adegan 5: Honest Review & Bukti Kenyamanan (20–25 detik, part_number: 3)
    - Adegan 6: CTA Netral Ajakan Checkout (25–30 detik, part_number: 3)
`)}

ATURAN BAHASA & PROMPT GOOGLE FLOW (WAJIB 100% BAHASA INDONESIA):
- SEMUA teks output HARUS 100% BAHASA INDONESIA! DILARANG KERAS MENGGUNAKAN BAHASA INGGRIS!
- Agar AI video generator menghasilkan video dengan talent Indonesia dan audio bahasa Indonesia (bukan bahasa Inggris), setiap "google_flow_prompt" WAJIB MENGIKUTI STRUKTUR SPESIFIK BERIKUT:
  ${includeTextOverlay 
    ? `"Video UGC vertikal 9:16 kualitas FHD. Talent: [deskripsi talent]. Visual adegan: [deskripsi visual detail adegan dalam bahasa Indonesia]. Pergerakan kamera: [kamera bahasa Indonesia]. Voiceover bahasa Indonesia: '[naskah suara adegan ini]'. Teks subtitle di layar bahasa Indonesia: '[teks overlay]'. Wajib percakapan dan tulisan Bahasa Indonesia, tanpa kata bahasa Inggris, tanpa watermark."` 
    : `"Video UGC vertikal 9:16 kualitas FHD. Talent: [deskripsi talent]. Visual adegan: [deskripsi visual detail adegan dalam bahasa Indonesia]. Pergerakan kamera: [kamera bahasa Indonesia]. Voiceover bahasa Indonesia: '[naskah suara adegan ini]'. Clean footage, tanpa teks di layar, tanpa subtitle, no typography, no watermarks. Wajib percakapan Bahasa Indonesia, tanpa kata bahasa Inggris."`}

ATURAN PERGERAKAN KAMERA (WAJIB BAHASA INDONESIA):
Contoh: "Zoom cepat ke arah produk", "Kamera bergerak ke kiri perlahan, close-up sedang", "Kamera statis jarak dekat fokus detail bahan", "Kamera meregangkan produk secara dekat", "Kamera berputar mengelilingi model (orbit pan)", "Kamera sejajar mata fokus menunjuk ke bawah".

ATURAN CTA NETRAL:
JANGAN SEBUT WARNA KERANJANG (JANGAN "keranjang kuning" / "keranjang oranye"). Gunakan: "Yuk, langsung klik keranjang di bawah video ini ya!" atau "Temukan tautan produknya persis di bawah video ya."

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick):
{
  "product_analysis": {
    "product_name": "Nama produk lengkap",
    "category": "Kategori produk/tempat",
    "core_benefit": "Manfaat utama produk",
    "target_buyer": "Target calon pembeli"
  },
  "duration_seconds": ${dur},
  "part_count": ${partCount},
  "parts": [
    ${dur === 30 ? `{
      "part_number": 1,
      "part_title": "KLIP 1: HOOK & PROBLEM",
      "duration_seconds": 10,
      "scenes_included": "Adegan 1 - 2 (0–10 Detik)",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD. Talent: ...",
      "narasi_part": "Naskah voiceover lengkap klip 1 (20-25 kata)"
    },
    {
      "part_number": 2,
      "part_title": "KLIP 2: PENGENALAN & DEMONSTRASI",
      "duration_seconds": 10,
      "scenes_included": "Adegan 3 - 4 (10–20 Detik)",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD. Talent: ...",
      "narasi_part": "Naskah voiceover lengkap klip 2 (20-25 kata)"
    },
    {
      "part_number": 3,
      "part_title": "KLIP 3: HONEST REVIEW & CTA",
      "duration_seconds": 10,
      "scenes_included": "Adegan 5 - 6 (20–30 Detik)",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD. Talent: ...",
      "narasi_part": "Naskah voiceover lengkap klip 3 (20-25 kata)"
    }` : (dur === 20 ? `{
      "part_number": 1,
      "part_title": "KLIP 1: HOOK, PROBLEM & PENGENALAN",
      "duration_seconds": 10,
      "scenes_included": "Adegan 1 - 3 (0–10 Detik)",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD. Talent: ...",
      "narasi_part": "Naskah voiceover lengkap klip 1 (20-25 kata)"
    },
    {
      "part_number": 2,
      "part_title": "KLIP 2: DEMONSTRASI, REVIEW & CTA",
      "duration_seconds": 10,
      "scenes_included": "Adegan 4 - 6 (10–20 Detik)",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD. Talent: ...",
      "narasi_part": "Naskah voiceover lengkap klip 2 (20-25 kata)"
    }` : `{
      "part_number": 1,
      "part_title": "KLIP 1: HOOK & PENGENALAN LENGKAP",
      "duration_seconds": 10,
      "scenes_included": "Adegan 1 - 6 (0–10 Detik)",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD. Talent: ...",
      "narasi_part": "Naskah voiceover lengkap 10s (22-26 kata)"
    }`)}
  ],
  "scenes": [
    {
      "scene_number": 1,
      "part_number": 1,
      "time_range": "${dur === 30 ? '0–5 detik' : (dur === 20 ? '0–3 detik' : '0–1,5 detik')}",
      "duration_seconds": ${dur === 30 ? 5.0 : (dur === 20 ? 3.0 : 1.5)},
      "scene_title": "HOOK",
      "visual_description": "Deskripsi visual adegan 1",
      "camera_movement": "Zoom cepat ke arah produk",
      "voiceover_script": "Naskah voiceover adegan 1",
      "caption_overlay": "${includeTextOverlay ? 'Teks safe zone' : '-'}",
      "google_flow_prompt": "Video UGC vertikal 9:16 kualitas FHD..."
    }
  ],
  "total_narasi_kata": ${dur === 30 ? 70 : (dur === 20 ? 48 : 25)},
  "captions": {
    "shopee_video": {
      "hook": "Teks hook singkat",
      "benefit": "Benefit singkat",
      "cta": "Cek keranjang oranye ya!",
      "hashtags": ["#RacunShopee", "#ShopeeHaul"],
      "full_text": "Teks caption khusus Shopee Video DENGAN hashtag, WAJIB MAKSIMAL 150 KARAKTER TERMASUK SPASI"
    },
    "hard_selling": {
      "hook": "Teks hook bahasa Indonesia",
      "benefit": "Teks benefit bahasa Indonesia",
      "cta": "Yuk, langsung klik keranjang di bawah video ini ya!",
      "hashtags": ["#racunshopee", "#reviewjujur", "#affiliate"],
      "full_text": "Teks lengkap caption siap salin bahasa Indonesia"
    },
    "storytelling": {
      "hook": "Teks hook bahasa Indonesia",
      "benefit": "Teks benefit bahasa Indonesia",
      "cta": "Temukan tautan produknya persis di bawah video ya.",
      "hashtags": ["#reviewjujur", "#tiktokaffiliate", "#rekomendasiproduk"],
      "full_text": "Teks lengkap caption siap salin bahasa Indonesia"
    },
    "soft_selling": {
      "hook": "Teks hook bahasa Indonesia",
      "benefit": "Teks benefit bahasa Indonesia",
      "cta": "Link ada di bawah video ya.",
      "hashtags": ["#tipsbelanja", "#reviewproduk", "#affiliate"],
      "full_text": "Teks lengkap caption siap salin bahasa Indonesia"
    }
  }
}`;

    let userPrompt = `Buatkan Storyboard UGC Ideal, Prompt Video Google Flow per Klip 10 Detik, dan 3 Template Caption sesuai standar Kawan Digital (TOTAL DURASI: ${dur} DETIK, DIBAGI MENJADI ${partCount} KLIP @ 10 DETIK):\n`;
    if (productName) userPrompt += `- Nama Produk: ${productName}\n`;
    if (productCategory) userPrompt += `- Kategori: ${productCategory}\n`;
    if (sellingPoints) userPrompt += `- Keunggulan / Selling Points: ${sellingPoints}\n`;
    if (targetAudience) userPrompt += `- Target Audiens: ${targetAudience}\n`;
    if (productUrl) userPrompt += `- Referensi URL: ${productUrl}\n`;
    userPrompt += `- Gaya Bahasa / Tone: ${tone}\n`;
    userPrompt += `- Tipe Voiceover: ${voiceGender}\n`;
    userPrompt += `- Preferensi Model / Talent: ${talentPreference.toUpperCase()} (${talentPreference === 'faceless' ? 'WAJIB FACELESS / TANPA MODEL WAJAH / FOKUS UNBOXING HANDS ONLY' : (talentPreference === 'female' ? 'WAJIB MODEL WANITA' : (talentPreference === 'male' ? 'WAJIB MODEL PRIA' : 'BEBAS REKOMENDASI AI'))})\n`;
    userPrompt += `- Format Teks Video: ${includeTextOverlay ? 'Sertakan teks safe-zone overlay di layar' : 'PROMPT WAJIB BERSIH TANPA TEKS DI LAYAR (Clean Footage)'}\n`;

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, null, null, null, { jsonMode: true, disableThinking: true });
        const parsed = parseJsonSafely(rawResponse);
        if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
            throw new Error('Format adegan tidak lengkap');
        }
        const campaign = sanitizeIndonesianUgc(parsed, dur, includeTextOverlay);
        if (access.type === 'trial') {
            incrementTrialUsage('ugc');
        }
        return campaign;
    } catch (err) {
        console.warn('[KawanDigi] AI call fallback activated:', err.message);
        const fallbackCampaign = synthesizeUgcFromDetails({
            productName,
            productCategory,
            sellingPoints,
            videoDuration: dur,
            tone,
            talentPreference,
            includeTextOverlay
        });
        if (access.type === 'trial') {
            incrementTrialUsage('ugc');
        }
        return fallbackCampaign;
    }
}
