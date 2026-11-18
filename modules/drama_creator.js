/**
 * KAWANDIGI CREATOR TOOLS - AI DRAMA SKETCH & PRODUCT PLACEMENT STUDIO
 * Generates viral short-form drama sketches (30-60s) with organic product placement,
 * comedy plot twists, problem-solver setups, and ready-to-shoot production scenes.
 */

import { callGemini } from './gemini_api.js';
import { hasToolAccess, incrementTrialUsage } from './license_manager.js';

/**
 * 5 Core Product Placement Types
 */
export const PLACEMENT_TYPES = {
    hero_solver: {
        id: 'hero_solver',
        name: 'The Hero Problem Solver',
        desc: 'Produk hadir sebagai penyelamat di puncak masalah/krisis mendesak karakter.'
    },
    plot_twist: {
        id: 'plot_twist',
        name: 'The Plot Twist Reveal',
        desc: 'Konflik dikira masalah serius/perselingkuhan, ternyata berujung kesalahpahaman karena produk.'
    },
    casual_in_use: {
        id: 'casual_in_use',
        name: 'Casual Natural In-Use',
        desc: 'Penempatan halus saat tokoh sedang curhat/obrolan seru, memicu lawan bicara bertanya.'
    },
    contrast: {
        id: 'contrast',
        name: 'Situasi Kontras (Ribet vs Praktis)',
        desc: 'Membandingkan tokoh yang menderita cara lama vs tokoh yang santai karena pakai produk.'
    },
    comic_prop: {
        id: 'comic_prop',
        name: 'Comic Prop & Kesalahpahaman',
        desc: 'Produk menjadi pemicu aksi kocak atau salah paham menggelikan antar karakter.'
    }
};

/**
 * Analyze Product & Recommend 3 Creative Drama Sketch Concepts
 */
export async function analyzeProductForDrama({
    productName = '',
    productCategory = '',
    productUrl = '',
    productImages = [],
    userNotes = ''
}) {
    const access = hasToolAccess('drama');
    if (!access.allowed) {
        throw new Error('Akses Tool AI Sketsa Drama terkunci. Silakan masukkan kode lisensi di tab Lisensi untuk membuka akses.');
    }

    const systemPrompt = `Kamu adalah Konsultan Kreatif & Sutradara Konten Video Pendek Viral TikTok / Reels kelas dunia yang ahli dalam "Product Placement Sketsa Drama".
Tugasmu adalah menganalisis produk yang diberikan dan merancang 3 (tiga) konsep sketsa drama pendek (30-60 detik) yang sangat kreatif, lucu, relatable, dan tidak terkesan jualan murahan (soft selling).

Ketiga konsep HARUS memiliki tipe penempatan produk berbeda:
1. Konsep 1: Plot Twist Komedi (kesalahpahaman serius yang berujung kocak karena produk)
2. Konsep 2: The Hero Problem Solver (krisis genting sehari-hari yang dituntaskan oleh produk)
3. Konsep 3: Casual In-Use / Curhat Pasangan (obrolan santai sambil memakai produk secara alami)

SEMUA OUTPUT HARUS 100% BAHASA INDONESIA YANG AKRAB, GAUL, DAN ALAMI.
Kembalikan HANYA format JSON valid berikut (tanpa markdown backtick):
{
  "product_summary": {
    "name": "${productName || 'Produk'}",
    "category": "${productCategory || 'Umum'}",
    "key_benefits": ["Manfaat 1", "Manfaat 2", "Manfaat 3"],
    "target_audience": "Deskripsi target penonton yang cocok"
  },
  "recommendations": [
    {
      "id": "rec_1",
      "placement_type": "plot_twist",
      "placement_name": "The Plot Twist Reveal",
      "title": "Judul Sketsa Menarik & Mengundang Tawa",
      "hook_premise": "Premis cerita 1-2 kalimat yang memancing rasa penasaran",
      "why_it_works": "Alasan psikologis kenapa konsep ini bakal viral & menjual",
      "characters": [
        {"name": "Tokoh A", "role": "Peran & Karakter"},
        {"name": "Tokoh B", "role": "Peran & Karakter"}
      ],
      "estimated_duration": "30 Detik"
    },
    {
      "id": "rec_2",
      "placement_type": "hero_solver",
      "placement_name": "The Hero Problem Solver",
      "title": "Judul Sketsa Penyelamat Masalah",
      "hook_premise": "Premis krisis genting yang diselamatkan produk",
      "why_it_works": "Alasan penonton relate dengan masalah ini",
      "characters": [
        {"name": "Tokoh A", "role": "Peran & Karakter"},
        {"name": "Tokoh B", "role": "Peran & Karakter"}
      ],
      "estimated_duration": "45 Detik"
    },
    {
      "id": "rec_3",
      "placement_type": "casual_in_use",
      "placement_name": "Casual Natural In-Use",
      "title": "Judul Sketsa Obrolan Santai Alami",
      "hook_premise": "Premis curhat seru yang membuat lawan bicara salah fokus ke produk",
      "why_it_works": "Alasan produk terlihat sangat mewah dan estetik saat dipakai santai",
      "characters": [
        {"name": "Tokoh A", "role": "Peran & Karakter"},
        {"name": "Tokoh B", "role": "Peran & Karakter"}
      ],
      "estimated_duration": "30 Detik"
    }
  ]
}`;

    let userPrompt = `Analisa produk berikut dan buatkan 3 rekomendasi konsep sketsa drama product placement:\n`;
    if (productName) userPrompt += `- Nama Produk: ${productName}\n`;
    if (productCategory) userPrompt += `- Kategori: ${productCategory}\n`;
    if (productUrl) userPrompt += `- Link Produk: ${productUrl}\n`;
    if (userNotes) userPrompt += `- Catatan Tambahan: ${userNotes}\n`;

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, productImages, null, null, { jsonMode: true, disableThinking: true });
        const parsed = parseJsonSafely(rawResponse);
        if (!parsed || !parsed.recommendations || parsed.recommendations.length === 0) {
            throw new Error('Hasil analisa konsep drama tidak lengkap.');
        }
        return parsed;
    } catch (err) {
        console.warn('[DramaSketch] Gemini API fallback activated:', err.message);
        return synthesizeDramaAnalysisFallback({ productName, productCategory, userNotes });
    }
}

/**
 * Generate Complete Production Drama Sketch Script & Product Placement Cue
 */
export async function generateDramaSketch({
    productName = '',
    productCategory = '',
    productSellingPoints = '',
    placementType = 'hero_solver',
    sketchTitle = '',
    sketchPremise = '',
    charactersCount = 2,
    charactersList = [],
    dialogueTone = 'santai_jakarta', // santai_jakarta | kocak_humor | sinetron_lebay | baper_romantis
    durationSeconds = 30, // 30 or 60
    includeDoodle = false
}) {
    const access = hasToolAccess('drama');
    if (!access.allowed) {
        throw new Error('Akses Tool AI Sketsa Drama terkunci. Silakan masukkan kode lisensi di tab Lisensi.');
    }

    const sceneCount = durationSeconds <= 30 ? 3 : 6;
    const prodName = productName || 'Produk Unggulan';

    const toneDescriptions = {
        'santai_jakarta': 'Bahasa santai anak muda Jakarta (lu-gue, akrab, realistis, tidak kaku)',
        'kocak_humor': 'Gaya komedi slapstick & humor segar, dialog ceplas-ceplos memicu tawa',
        'sinetron_lebay': 'Parodi sinetron dramatis lebay, tatap-tatapan mata dramatis zoom in zoom out',
        'baper_romantis': 'Gaya drama romantis manis bikin senyum-senyum sendiri dan baper'
    };
    const toneText = toneDescriptions[dialogueTone] || toneDescriptions['santai_jakarta'];

    const placementTypeName = PLACEMENT_TYPES[placementType]?.name || 'The Hero Problem Solver';

    const systemPrompt = `Kamu adalah Penulis Naskah Sketsa Komedi & Sutradara Iklan Pendek Viral (TikTok/Shorts) nomor 1 di Indonesia.
Tugasmu adalah menyusun Naskah Lengkap Sketsa Drama Pendek (${durationSeconds} detik) yang berfokus pada Penempatan Produk (${placementTypeName}) untuk produk "${prodName}".

ATURAN STRATEGIS PENEMPATAN PRODUK:
- Produk "${prodName}" TIDAK BOLEH muncul langsung teriak jualan di detik pertama!
- Cerita harus memikat penonton di 3 detik pertama dengan konflik/dialog yang bikin penasaran atau ketawa.
- Berikan "Panduan Penempatan Produk (Product Placement Cue)" yang presisi:
  * Detik ke berapa produk muncul pertama kali
  * Cara aktor memegang produk (product holding technique) agar merek/kemasan terlihat jelas tanpa canggung
  * Sudut kamera (close up shot / over the shoulder)
  * Ekspresi aktor saat berinteraksi dengan produk

ATURAN SCENE BREAKDOWN:
- Terdiri dari tepat ${sceneCount} adegan (@ 10 detik per adegan).
- Setiap adegan memiliki: Waktu (00:00 - 00:10), Deskripsi Visual & Aksi Aktor, Naskah Dialog Alami (${toneText}), Efek Suara (SFX), dan Prompt Google Flow (Veo AI).
${includeDoodle ? '- Sertakan instruksi doodle animasi lucu / panah grafis melayang pada prompt Google Flow untuk memperkuat komedi!' : '- Tanpa doodle animasi, fokus pada visual sinematik natural.'}

SEMUA OUTPUT HARUS 100% BAHASA INDONESIA!
Kembalikan HANYA format JSON valid berikut (tanpa markdown backtick):
{
  "sketch_info": {
    "title": "${sketchTitle || 'Sketsa Drama Penyelamat Situasi'}",
    "logline": "1 kalimat premis cerita yang lucu dan memikat",
    "placement_type": "${placementType}",
    "placement_name": "${placementTypeName}",
    "dialogue_tone": "${toneText}",
    "duration_seconds": ${durationSeconds},
    "product_name": "${prodName}"
  },
  "placement_guide": {
    "entry_second_cue": "Detik ke-15 (Tepat saat Tokoh A mulai frustrasi)",
    "holding_technique": "Pegang botol di telapak tangan setinggi dada, hadapkan label ke kamera dengan santai",
    "camera_framing": "Cut to tight close-up pada tangan dan kemasan produk, kedalaman fokus dangkal (shallow DoF)",
    "actor_reaction": "Ekspresi kaget takjub, mata berbinar, lalu tersenyum puas"
  },
  "characters": [
    {"name": "Tokoh 1", "role": "Peran dalam sketsa", "wardrobe": "Pakaian yang dikenakan"}
  ],
  "scenes": [
    {
      "scene_number": 1,
      "timestamp": "00:00 - 00:10",
      "scene_title": "Hook Awal: Konflik / Situasi Lucu",
      "visual_action": "Deskripsi aksi dan blocking kamera yang dinamis",
      "dialogue": "Dialog tokoh yang natural dan mengalir",
      "audio_sfx": "SFX tawa / vine boom / musik tegang",
      "google_flow_prompt": "Prompt teks video 9:16 sinematik fotorealistis dalam bahasa Indonesia untuk Google Flow..."
    }
  ],
  "call_to_action": "Kalimat dialog penutup yang halus dan menggelitik untuk mengajak penonton cek keranjang kuning atau link di bio"
}`;

    let userPrompt = `Buat naskah sketsa drama product placement untuk:\n`;
    userPrompt += `- Produk: ${prodName} (Kategori: ${productCategory || 'Umum'})\n`;
    if (productSellingPoints) userPrompt += `- Keunggulan / Manfaat Utama: ${productSellingPoints}\n`;
    userPrompt += `- Tipe Penempatan Produk: ${placementTypeName}\n`;
    if (sketchTitle) userPrompt += `- Judul Sketsa: ${sketchTitle}\n`;
    if (sketchPremise) userPrompt += `- Premis Cerita: ${sketchPremise}\n`;
    userPrompt += `- Jumlah Karakter: ${charactersCount} orang\n`;
    if (charactersList && charactersList.length > 0) {
        userPrompt += `- Daftar Karakter: ${JSON.stringify(charactersList)}\n`;
    }
    userPrompt += `- Gaya Bahasa: ${toneText}\n`;
    userPrompt += `- Durasi: ${durationSeconds} detik (${sceneCount} Scene)\n`;

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, null, null, null, { jsonMode: true, disableThinking: true });
        const parsed = parseJsonSafely(rawResponse);
        if (!parsed || !parsed.scenes || parsed.scenes.length === 0) {
            throw new Error('Naskah sketsa drama tidak lengkap.');
        }

        if (access.type === 'trial') {
            incrementTrialUsage('drama');
        }

        parsed.parts = (parsed.scenes || []).map((s, idx) => ({
            part_number: s.scene_number || (idx + 1),
            title: `Klip ${idx + 1} (${s.timestamp || `${idx * 10}-${(idx + 1) * 10}s`}): ${s.scene_title || 'Adegan'}`,
            part_title: s.scene_title || `Klip ${idx + 1} (${s.timestamp})`,
            scenes_included: s.timestamp || `00:${idx * 10} - 00:${(idx + 1) * 10}`,
            google_flow_prompt: s.google_flow_prompt
        }));

        return parsed;
    } catch (err) {
        console.warn('[DramaSketch] AI generate call fallback activated:', err.message);
        return synthesizeDramaSketchFallback({
            productName: prodName,
            productCategory,
            productSellingPoints,
            placementType,
            sketchTitle,
            sketchPremise,
            charactersCount,
            dialogueTone,
            durationSeconds,
            includeDoodle
        });
    }
}

/**
 * Resilient Instant Fallback for Product Analysis
 */
function synthesizeDramaAnalysisFallback({ productName, productCategory, userNotes }) {
    const name = productName || 'Produk Favorit';
    const cat = productCategory || 'Lifestyle & Kebutuhan Sehari-hari';

    return {
        product_summary: {
            name: name,
            category: cat,
            key_benefits: [
                'Solusi cepat, praktis, dan instan digunakan',
                'Kualitas premium dengan harga sangat terjangkau',
                'Bikin percaya diri naik seketika dan hemat waktu'
            ],
            target_audience: 'Gen-Z dan milenial yang aktif di media sosial, suka hal praktis, dan menyukai konten komedi ringan'
        },
        recommendations: [
            {
                id: 'rec_1',
                placement_type: 'plot_twist',
                placement_name: 'The Plot Twist Reveal',
                title: 'Tuduhan Rahasia di Balik Tas',
                hook_premise: `Dituduh menyembunyikan sesuatu yang wangi dan mencurigakan oleh temannya, ternyata cuma rahasia pakai ${name} sendiri tanpa mau berbagi.`,
                why_it_works: 'Format kecurigaan selalu memancing retensi tinggi di 5 detik pertama karena penonton penasaran apa isi tasnya.',
                characters: [
                    { name: 'Riko', role: 'Teman kepo yang curigaan' },
                    { name: 'Dimas', role: 'Pemilik produk yang berusaha melindungi barangnya' }
                ],
                estimated_duration: '30 Detik'
            },
            {
                id: 'rec_2',
                placement_type: 'hero_solver',
                placement_name: 'The Hero Problem Solver',
                title: '5 Menit Menuju Bencana',
                hook_premise: `Karakter panik karena harus berangkat kencan atau meeting darurat dalam waktu 5 menit, diselamatkan oleh keajaiban praktis ${name}.`,
                why_it_works: 'Menyentuh pain point kepanikan buru-buru yang sering dialami semua orang, membuat produk langsung terasa wajib dibeli.',
                characters: [
                    { name: 'Salsa', role: 'Cewek panik yang hampir menyerah' },
                    { name: 'Nadia', role: 'Sahabat penyelamat yang santai dan solutif' }
                ],
                estimated_duration: '45 Detik'
            },
            {
                id: 'rec_3',
                placement_type: 'casual_in_use',
                placement_name: 'Casual Natural In-Use',
                title: 'Salah Fokus Pas Lagi Gibah',
                hook_premise: `Dua sahabat sedang asyik membicarakan gosip terpanas di kafe, tapi lawan bicara malah salah fokus mengagumi hasil instan dari ${name}.`,
                why_it_works: 'Percakapan terasa 100% natural tanpa kesan iklan, membuat penonton tidak buru-buru swipe video.',
                characters: [
                    { name: 'Clarissa', role: 'Sahabat yang bercerita dengan menggebu-gebu' },
                    { name: 'Maya', role: 'Teman yang memakai produk sambil mendengarkan' }
                ],
                estimated_duration: '30 Detik'
            }
        ]
    };
}

/**
 * Resilient Instant Fallback for Complete Drama Sketch
 */
function synthesizeDramaSketchFallback({
    productName,
    productCategory,
    productSellingPoints,
    placementType,
    sketchTitle,
    sketchPremise,
    charactersCount,
    dialogueTone,
    durationSeconds,
    includeDoodle
}) {
    const prod = productName || 'Produk Unggulan';
    const is30s = durationSeconds <= 30;
    const placementName = PLACEMENT_TYPES[placementType]?.name || 'The Hero Problem Solver';

    const doodlePromptNote = includeDoodle ? ', dilengkapi doodle animasi lucu berkedip di atas produk' : '';

    const result = {
        sketch_info: {
            title: sketchTitle || `Sketsa: Rahasia Sukses Instan dengan ${prod}`,
            logline: sketchPremise || `Ketika kepanikan memuncak, ${prod} hadir sebagai penyelamat tak terduga yang bikin suasana jadi penuh tawa.`,
            placement_type: placementType,
            placement_name: placementName,
            dialogue_tone: dialogueTone,
            duration_seconds: durationSeconds,
            product_name: prod
        },
        placement_guide: {
            entry_second_cue: is30s ? 'Detik ke-12 (Tepat saat Tokoh 1 mulai panik)' : 'Detik ke-25 (Puncak klimaks adegan)',
            holding_technique: `Pegang kemasan ${prod} dengan jempol dan jari di samping bodi, label merk menghadap lurus ke arah lensa kamera setinggi dada.`,
            camera_framing: 'Medium shot bergerak cepat zoom-in ke arah produk, pencahayaan terang bersih dengan latar belakang soft bokeh.',
            actor_reaction: 'Ekspresi mata melebar kagum, mengangguk puas, lalu tersenyum percaya diri ke kamera.'
        },
        characters: [
            { name: 'Karakter A', role: 'Tokoh yang mengalami masalah', wardrobe: 'Pakaian kasual santai sehari-hari' },
            { name: 'Karakter B', role: 'Tokoh penyelamat yang solutif', wardrobe: 'Pakaian rapi modis dan trendy' }
        ],
        scenes: is30s ? [
            {
                scene_number: 1,
                timestamp: '00:00 - 00:10',
                scene_title: 'Hook Masalah: Kepanikan Memuncak',
                visual_action: 'Karakter A mondar-mandir panik di depan cermin, memegang kepala frustrasi sambil memeriksa jam tangan. Kamera handheld dinamis.',
                dialogue: 'A: "Gawat banget, 10 menit lagi gue harus ketemu klien tapi kondisinya kacau begini! Bisa batal semua rencana!"',
                audio_sfx: 'Sound effect detak jam cepat + BGM komedi panik',
                google_flow_prompt: `Video vertikal 9:16 sinematik fotorealistis. Karakter A tampak panik mondar-mandir di ruangan modern estetik, melihat jam tangan dengan ekspresi cemas alami, pencahayaan hangat, kualitas FHD${doodlePromptNote}.`
            },
            {
                scene_number: 2,
                timestamp: '00:10 - 00:20',
                scene_title: 'Product Entrance: Penyelamat Tiba',
                visual_action: `Karakter B masuk membawa ${prod}. Kamera melakukan zoom halus fokus ke produk yang disodorkan. Karakter A berhenti panik dan tertegun.`,
                dialogue: `B: "Santai dong, gak usah drama! Nih pake ${prod}, cukup 10 detik langsung beres semuanya."\nA: "Hah?! Beneran secepet itu?"`,
                audio_sfx: 'Sound effect swoosh + kilau ting! saat produk masuk',
                google_flow_prompt: `Video vertikal 9:16 sinematik fotorealistis. Karakter B tersenyum percaya diri sambil menyodorkan kemasan ${prod} ke arah kamera dengan elegan, pencahayaan studio cerah, fokus tajam ke produk${doodlePromptNote}.`
            },
            {
                scene_number: 3,
                timestamp: '00:20 - 00:30',
                scene_title: 'Hasil Menakjubkan & Plot Punchline',
                visual_action: `Karakter A tersenyum puas setelah merasakan manfaat ${prod}. Karakter B berusaha mengambil kembali produknya tapi ditahan oleh Karakter A.`,
                dialogue: `A: "Wah gila, kok bisa sebagus ini?! Fix ini jadi punya gue ya!"\nB: "Ehh enak aja, beli sendiri di keranjang kuning sana!"`,
                audio_sfx: 'Sound effect tawa ringan sitkom + musik penutup ceria',
                google_flow_prompt: `Video vertikal 9:16 sinematik fotorealistis. Kedua karakter tertawa ceria sambil berinteraksi akrab di ruangan cerah, ekspresi wajah sangat bahagia dan puas, video jernih FHD${doodlePromptNote}.`
            }
        ] : [
            {
                scene_number: 1,
                timestamp: '00:00 - 00:10',
                scene_title: 'Hook Masalah Awal',
                visual_action: 'Karakter A mengalami kesialan di pagi hari, mengeluh dengan ekspresi kocak.',
                dialogue: 'A: "Hari ini kenapa semua serba salah sih? Udah telat, ini malah ikutan bermasalah!"',
                audio_sfx: 'SFX comic slide whistle',
                google_flow_prompt: `Video vertikal 9:16 sinematik fotorealistis. Karakter mengeluh lucu di ruang tamu, ekspresi komikal alami, pencahayaan alami pagi${doodlePromptNote}.`
            },
            {
                scene_number: 2,
                timestamp: '00:10 - 00:20',
                scene_title: 'Konflik Memanas',
                visual_action: 'Karakter B melihat dengan heran dan mulai mengejek dengan gaya bersahabat.',
                dialogue: 'B: "Lagian zaman sekarang masih pake cara ribet, pantesan lu pusing sendiri!"',
                audio_sfx: 'SFX dramatis pendek',
                google_flow_prompt: `Video vertikal 9:16. Karakter B bersandar di pintu sambil geleng-geleng kepala tersenyum sinis bercanda${doodlePromptNote}.`
            },
            {
                scene_number: 3,
                timestamp: '00:20 - 00:30',
                scene_title: 'Product Entrance: Reveal Produk',
                visual_action: `Karakter B mengeluarkan ${prod} dari saku/meja. Close-up estetik pada produk.`,
                dialogue: `B: "Nih kenalin, solusi cerdas kaum sat-set: ${prod}!"`,
                audio_sfx: 'SFX angelic choir / chime',
                google_flow_prompt: `Video vertikal 9:16 close up shot tangan memegang ${prod} dengan latar belakang bokeh lembut, sangat profesional${doodlePromptNote}.`
            },
            {
                scene_number: 4,
                timestamp: '00:30 - 00:40',
                scene_title: 'Demonstrasi Cepat & Pembuktian',
                visual_action: `Karakter A mencoba ${prod} secara langsung, efek instan langsung terasa.`,
                dialogue: 'A: "Wih, enteng banget pakenya! Baunya juga enak dan hasilnya instan!"',
                audio_sfx: 'SFX pop & success bell',
                google_flow_prompt: `Video vertikal 9:16. Karakter mencoba produk dengan antusias, tatapan kagum dan ekspresi riang${doodlePromptNote}.`
            },
            {
                scene_number: 5,
                timestamp: '00:40 - 00:50',
                scene_title: 'Konflik Rebutan Kocak',
                visual_action: 'Karakter A mencoba memasukkan produk ke kantongnya sendiri secara diam-diam.',
                dialogue: 'B: "Woi! Mau dibawa ke mana itu?! Balikin gak!"\nA: "Udah hak milik bro, anggap aja sedekah teman!"',
                audio_sfx: 'SFX vine boom + fast comedy music',
                google_flow_prompt: `Video vertikal 9:16 komedi. Aktor berusaha menyembunyikan produk sambil tersenyum licik bercanda${doodlePromptNote}.`
            },
            {
                scene_number: 6,
                timestamp: '00:50 - 01:00',
                scene_title: 'Punchline & Call To Action',
                visual_action: 'Karakter B menunjuk ke arah bawah layar (keranjang kuning) sambil tersenyum ke kamera.',
                dialogue: 'B: "Daripada rebutan punya temen, mumpung lagi diskon langsung co di keranjang kuning sekarang!"',
                audio_sfx: 'SFX cash register cha-ching!',
                google_flow_prompt: `Video vertikal 9:16. Aktor menunjuk ramah ke arah bawah layar dengan senyum manis dan gesture mengajak${doodlePromptNote}.`
            }
        ],
        call_to_action: `Jangan sampai kehabisan promonya ya! Klik keranjang kuning di kiri bawah sekarang juga sebelum harga normal! ✨`
    };

    result.parts = (result.scenes || []).map((s, idx) => ({
        part_number: s.scene_number || (idx + 1),
        title: `Klip ${idx + 1} (${s.timestamp}): ${s.scene_title}`,
        part_title: s.scene_title || `Klip ${idx + 1} (${s.timestamp})`,
        scenes_included: s.timestamp,
        google_flow_prompt: s.google_flow_prompt
    }));

    return result;
}

/**
 * Robust JSON parser
 */
function parseJsonSafely(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}
