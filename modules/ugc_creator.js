/**
 * KawanDigi Creator Studio - AI UGC Affiliate Video Creator
 * Handles product URL scraping via Jina Reader, AIDA reasoning, and multi-scene storyboard (10s - 60s)
 */

import { callGemini, generateImagen3 } from './gemini_api.js';
import { hasToolAccess, incrementTrialUsage } from './license_manager.js';

/**
 * Fetch product details from URL using Jina Reader (CORS-friendly client-side reader)
 */
export async function scrapeProductFromUrl(url) {
    if (!url || !url.startsWith('http')) {
        throw new Error('Masukkan URL produk yang valid (contoh: https://shopee.co.id/... atau TikTok Shop)');
    }

    try {
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url.trim())}`;
        const resp = await fetch(jinaUrl, {
            headers: {
                'X-Return-Format': 'markdown'
            }
        });

        if (!resp.ok) {
            throw new Error(`Gagal membaca etalase produk (${resp.status}). Anda dapat mengisi detail produk secara manual.`);
        }

        const text = await resp.text();
        return text.slice(0, 4000); // Take first 4000 chars for analysis
    } catch (err) {
        throw new Error(`Gagal mengambil data URL otomatis: ${err.message}. Silakan masukkan nama dan deskripsi produk secara manual.`);
    }
}

/**
 * Generate Complete UGC Affiliate Storyboard & Google Flow Video Prompts
 */
export async function generateUgcCampaign({
    productUrl = '',
    productName = '',
    productCategory = '',
    sellingPoints = '',
    targetAudience = '',
    videoDuration = 30, // 10, 20, 30, or 60
    tone = 'Casual & Ceria (Gen Z)',
    voiceGender = 'Cewek Ceria'
}) {
    // 1. License / Trial Check
    const access = hasToolAccess('ugc');
    if (!access.allowed) {
        throw new Error('Akses Tool AI UGC Creator terkunci. Silakan masukkan kode lisensi di tab Lisensi untuk membuka akses.');
    }

    // 2. Determine number of scenes (Google Flow limit is 10s per clip)
    let sceneCount = 3;
    if (videoDuration === 10) sceneCount = 1;
    else if (videoDuration === 20) sceneCount = 2;
    else if (videoDuration === 30) sceneCount = 3;
    else if (videoDuration === 60) sceneCount = 6;

    // 3. Construct prompt for Gemini
    const systemPrompt = `Anda adalah Creative Director & Video Affiliate Strategist handal di TikTok Shop, Shopee Video, dan Instagram Reels. 
Tugas Anda adalah menganalisis produk affiliate dan merancang Storyboard Iklan UGC Vertikal (9:16) yang menghasilkan konversi tinggi (High CTR & CVR).

CATATAN TEKNIS PENTING:
Karena generator video Google (Google Flow / Veo) memiliki durasi maksimal 10 detik per klip video, Anda HARUS membagi video ini tepat menjadi ${sceneCount} scene terpisah, di mana masing-masing scene berdurasi MAKSIMAL 10 DETIK.

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick tambahan di luar json):
{
  "product_analysis": {
    "product_name": "Nama produk ringkas",
    "core_benefit": "Manfaat utama produk",
    "target_buyer": "Target pembeli ideal",
    "hook_angle": "Sudut pandang hook yang dipakai (Problem / Curiosity / Social Proof)"
  },
  "scenes": [
    {
      "scene_number": 1,
      "duration_seconds": 10,
      "scene_title": "HOOK PEMBUKA",
      "visual_description": "Deskripsi visual adegan dalam bahasa Indonesia",
      "google_flow_prompt": "Prompt bahasa Inggris sinematik 9:16 vertikal siap copy-paste ke Google Flow / Veo",
      "voiceover_script": "Naskah narasi suara bahasa Indonesia yang natural, ceria, dan memikat",
      "caption_overlay": "Teks singkat tebal untuk di layar"
    }
  ],
  "call_to_action": "Teks ajakan bertindak (Contoh: Klik keranjang kuning sekarang selagi promo!)",
  "hashtags": ["#racuntiktok", "#fyp", "#reviewproduk"]
}`;

    let userPrompt = `Rancang kampanye video UGC Affiliate untuk produk berikut:\n`;
    if (productUrl) userPrompt += `- URL Produk: ${productUrl}\n`;
    if (productName) userPrompt += `- Nama Produk: ${productName}\n`;
    if (productCategory) userPrompt += `- Kategori Produk: ${productCategory}\n`;
    if (sellingPoints) userPrompt += `- Keunggulan / Selling Points: ${sellingPoints}\n`;
    if (targetAudience) userPrompt += `- Target Audiens: ${targetAudience}\n`;
    userPrompt += `- Total Durasi: ${videoDuration} Detik (${sceneCount} Scene @ 10 detik)\n`;
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
