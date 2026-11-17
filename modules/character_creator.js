/**
 * KAWANDIGI CREATOR TOOLS - CHARACTER CREATOR ENGINE
 * Module untuk menghasilkan Master DNA Prompt, Character Turnaround Sheet Prompt (Gemini/Imagen/Flux),
 * Prompt Video Google Flow (Veo AI), dan Profil Media Sosial untuk AI Influencer / AI Artist.
 */

import { callGemini } from './gemini_api.js';

export const CHARACTER_PRESETS = [
    {
        name: 'Maya Putri',
        type: 'influencer',
        gender: 'female',
        ageGroup: '22',
        ethnicity: 'indonesian_natural',
        hairStyle: 'Sebahu bergelombang warna dark brown dengan soft curtain bangs',
        bodyType: 'Petite fit & natural',
        fashionStyle: 'Korean Minimalist Cafe OOTD (cardigan rajut krem & celana high-waist)',
        niche: 'Skincare, Beauty & Lifestyle',
        vibe: 'Ceria, ramah, hangat, dan estetik',
        customTraits: 'Lesung pipi manis di pipi kanan, kulit sawo matang glowing alami, riasan wajah clean girl look.'
    },
    {
        name: 'Alya Melody',
        type: 'artist',
        gender: 'female',
        ageGroup: '20',
        ethnicity: 'eurasian',
        hairStyle: 'Rambut panjang lurus hitam legam dengan highlight silver halus',
        bodyType: 'Slim & anggun',
        fashionStyle: 'Indie Pop Stage Aesthetic (oversized blazer hitam & aksesoris perak vintage)',
        niche: 'Penyanyi Virtual, Indie Pop & Acoustic R&B',
        vibe: 'Melankolis, puitis, bersuara merdu, dan penuh karisma',
        customTraits: 'Mata cokelat hazel ekspresif, kalung liontin perak khas, selalu memegang gitar akustik kayu.'
    },
    {
        name: 'Rian Pratama',
        type: 'influencer',
        gender: 'male',
        ageGroup: '24',
        ethnicity: 'indonesian_natural',
        hairStyle: 'Messy two-block cut hitam rapi dengan tekstur alami',
        bodyType: 'Athletic lean & proporsional',
        fashionStyle: 'Urban Streetwear Hypebeast (hoodie oversized abu-abu, cargo pants, dan sneakers)',
        niche: 'Gadget, Tech Reviewer & Street Fashion',
        vibe: 'Santai, komunikatif, melek teknologi, dan percaya diri',
        customTraits: 'Garis rahang tegas, senyum ramah, memakai smartwatch hitam dan kacamata berbingkai tipis.'
    },
    {
        name: 'Kenzo Daiki',
        type: 'influencer',
        gender: 'male',
        ageGroup: '21',
        ethnicity: 'east_asian',
        hairStyle: 'Wolfcut hitam dengan fringe poni khas anime idol',
        bodyType: 'Slim idol physique',
        fashionStyle: 'Cyberpunk Techwear / Anime Aesthetic (jaket bomber beraksen neon dan headphone)',
        niche: 'Gaming Streamer, Anime & Cosplay',
        vibe: 'Kreatif, energik, kocak, dan interaktif dengan fans',
        customTraits: 'Tindik anting perak kecil di telinga kiri, ekspresi wajah dinamis dan fotogenik.'
    }
];

/**
 * Generate Character DNA, Turnaround Sheet Prompts, Google Flow Prompts, and Social Bio
 */
export async function generateCharacterProfile({
    name = '',
    type = 'influencer', // 'influencer' | 'artist'
    gender = 'female',
    ageGroup = '22',
    ethnicity = 'indonesian_natural',
    hairStyle = '',
    bodyType = '',
    fashionStyle = '',
    niche = '',
    vibe = '',
    customTraits = ''
}) {
    const charName = name.trim() || (gender === 'female' ? (type === 'artist' ? 'Alya Melody' : 'Maya Putri') : 'Rian Pratama');
    const isArtist = type === 'artist';

    const systemPrompt = `Kamu adalah Kawan Digital, Master AI Character Designer & Creative Director untuk Virtual Influencer dan AI Artist kelas dunia.
Tugasmu adalah merancang profil lengkap, Master Character DNA (kunci konsistensi wajah & fisik), Prompt Character Sheet Turnaround Multi-Angle untuk Google Gemini Imagen 3 / Flux / Midjourney, Prompt Video Gerak 10s untuk Google Flow (Veo AI), dan Profil Media Sosial.

ATURAN MASTER CHARACTER DNA:
- Master DNA Prompt harus sangat detail dan presisi dalam bahasa Inggris standar industri generator gambar AI (Midjourney v6, Flux.1, Imagen 3, Stable Diffusion).
- Menjelaskan struktur tulang wajah, bentuk mata, rona kulit, warna & tekstur rambut, bentuk hidung & bibir, ekspresi khas, serta pencahayaan sinematik agar wajah karakter 100% KONSISTEN di setiap prompt turunan.

ATURAN CHARACTER SHEET TURNAROUND PROMPT:
- Format standar industri model sheet turnaround: satu gambar komprehensif berisi multiple angle (front view, three-quarter view, profile side view, and facial expression sheet: smiling, neutral, laughing, talking) dengan latar belakang netral abu-abu terang / studio putih bersih.
- Menjamin karakter dapat dijadikan acuan visual utama (*reference sheet*) untuk prompt-prompt selanjutnya.

ATURAN PROMPT GOOGLE FLOW (VEO AI):
- Prompt video gerak vertikal 9:16 durasi 10 detik.
- Mengadopsi karakter DNA yang konsisten, dengan gerakan alami (tersenyum, menoleh halus, menyapa ke kamera, atau memegang mikrofon/produk).
- Clean footage, sinematik, fotorealistis FHD, pencahayaan alami kamar/studio estetik.

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERSIH BERIKUT (Dilarang ada markdown pembuka/penutup):
{
  "name": "${charName}",
  "type": "${type}",
  "tagline": "Slogan ringkas karakter (contoh: Virtual Beauty & OOTD Creator from Jakarta)",
  "niche": "Niche utama karakter",
  "master_dna_prompt": "Prompt teks Master DNA lengkap dalam bahasa Inggris...",
  "character_sheet_prompt": "Prompt turnaround model sheet lengkap dalam bahasa Inggris untuk Gemini Imagen 3 / Flux...",
  "photo_variations": [
    {
      "title": "1. Headshot Portrait / Avatar Profile",
      "purpose": "Foto profil media sosial (Instagram/TikTok)",
      "prompt": "Prompt bahasa Inggris untuk foto close-up..."
    },
    {
      "title": "2. Full-Body OOTD / Cafe Mirror Selfie",
      "purpose": "Postingan feed OOTD gaya hidup",
      "prompt": "Prompt bahasa Inggris untuk full-body shot..."
    },
    {
      "title": "3. Lifestyle Niche Activity",
      "purpose": "Aktivitas hobi / unboxing produk / di studio",
      "prompt": "Prompt bahasa Inggris aktivitas gaya hidup..."
    },
    {
      "title": "4. Glamour / Editorial Poster Shot",
      "purpose": "Foto sampul majalah atau promosi premium",
      "prompt": "Prompt bahasa Inggris foto glamor editorial..."
    }
  ],
  "google_flow_video_prompt": "Prompt video 10 detik vertikal 9:16 untuk Google Flow / Veo...",
  "social_profile": {
    "suggested_usernames": ["@username1", "@username2", "@username3"],
    "instagram_bio": "Teks bio Instagram estetik lengkap dengan emoji dan CTA",
    "catchphrase": "Sapaan khas saat membuka konten",
    "content_pillars": [
      "Ide konten 1",
      "Ide konten 2",
      "Ide konten 3"
    ]
  },
  "artist_specs": ${isArtist ? `{
    "vocal_timbre": "Deskripsi timbre suara (contoh: Warm airy soprano with smooth vibrato)",
    "music_genre": "Genre musik utama (contoh: Indie Pop / Lo-Fi Bedroom Acoustic)",
    "suno_prompt": "Prompt instan untuk Suno / Udio AI untuk membuat lagu karakter..."
  }` : "null"}
}`;

    const ethnicityLabel = {
        'indonesian_natural': 'Indonesian with warm golden-tan skin and soft natural features',
        'eurasian': 'Eurasian mixed Indonesian-European with hazel eyes and striking bone structure',
        'east_asian': 'East Asian with porcelain smooth skin and K-pop idol aesthetic',
        'caucasian': 'Caucasian with defined facial features and bright eyes'
    }[ethnicity] || 'Indonesian with warm natural beauty';

    let userPrompt = `Rancang profil karakter ${isArtist ? 'AI Artist / Virtual Singer' : 'AI Influencer / Virtual KOL'}:\n`;
    userPrompt += `- Nama: ${charName}\n`;
    userPrompt += `- Gender: ${gender === 'female' ? 'Wanita' : 'Pria'}\n`;
    userPrompt += `- Usia: ${ageGroup} tahun\n`;
    userPrompt += `- Etnisitas / Karakteristik Wajah: ${ethnicityLabel}\n`;
    if (hairStyle) userPrompt += `- Gaya Rambut: ${hairStyle}\n`;
    if (bodyType) userPrompt += `- Bentuk Tubuh: ${bodyType}\n`;
    if (fashionStyle) userPrompt += `- Gaya Busana / Signature OOTD: ${fashionStyle}\n`;
    if (niche) userPrompt += `- Niche: ${niche}\n`;
    if (vibe) userPrompt += `- Vibe & Kepribadian: ${vibe}\n`;
    if (customTraits) userPrompt += `- Ciri Khas Khusus: ${customTraits}\n`;

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, null, null, null, { jsonMode: true, disableThinking: true });
        const parsed = parseJsonSafely(rawResponse);
        if (!parsed || !parsed.master_dna_prompt) {
            throw new Error('Hasil rancangan karakter tidak lengkap.');
        }

        return {
            id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            ...parsed,
            createdAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn('[CharacterCreator] AI call fallback activated:', err.message);
        return synthesizeCharacterFallback({
            name: charName,
            type,
            gender,
            ageGroup,
            ethnicity,
            hairStyle,
            bodyType,
            fashionStyle,
            niche,
            vibe,
            customTraits
        });
    }
}

/**
 * Resilient Instant Fallback Generator (0% failure rate)
 */
export function synthesizeCharacterFallback({
    name,
    type = 'influencer',
    gender = 'female',
    ageGroup = '22',
    ethnicity = 'indonesian_natural',
    hairStyle = '',
    bodyType = '',
    fashionStyle = '',
    niche = '',
    vibe = '',
    customTraits = ''
}) {
    const isArtist = type === 'artist';
    const isFemale = gender === 'female';
    const charName = name || (isFemale ? (isArtist ? 'Alya Melody' : 'Maya Putri') : 'Rian Pratama');
    const age = ageGroup || '22';

    const hairDesc = hairStyle || (isFemale ? 'shoulder-length wavy glossy dark brown hair with curtain bangs' : 'stylish two-block textured messy dark hair');
    const fashionDesc = fashionStyle || (isFemale ? 'minimalist aesthetic oversized knit cardigan, white top, and high-waisted jeans' : 'urban streetwear oversized neutral hoodie, utility cargo pants, and sleek sneakers');
    const nicheDesc = niche || (isArtist ? 'Virtual Indie Pop Singer & Songwriter' : 'Beauty, Fashion OOTD & Digital Lifestyle');

    const ethnicityPromptMap = {
        'indonesian_natural': 'young Indonesian with glowing warm honey-tan skin, friendly almond eyes, natural features',
        'eurasian': 'Eurasian mixed Indonesian with striking hazel eyes, defined jawline, and natural radiance',
        'east_asian': 'East Asian look with clear porcelain skin, expressive eyes, and modern K-idol aesthetic',
        'caucasian': 'young Caucasian with sun-kissed skin and defined graceful facial structure'
    };
    const ethPrompt = ethnicityPromptMap[ethnicity] || ethnicityPromptMap['indonesian_natural'];

    const masterDna = `Ultra-consistent photorealistic character DNA of ${charName}, a ${age}-year-old ${ethPrompt}. Face metrics: perfectly symmetrical facial structure, natural skin texture with subtle pores and healthy skin glow, expressive warm brown eyes, natural soft pink lips, ${customTraits ? customTraits : 'subtle youthful dimples'}. Hair: ${hairDesc}. Body: healthy athletic lean proportions. Lighting: soft diffused cinematic natural daylight, 85mm portrait lens, f/1.8 aperture, 8k resolution, highly detailed, photorealistic. Negative prompt: cartoon, 3d render, distorted face, duplicate features, blurry, oversaturated.`;

    const sheetPrompt = `Professional character model turnaround sheet of ${charName}, ${age}-year-old ${ethPrompt}, ${hairDesc}. Wearing ${fashionDesc}. Multi-angle reference sheet showing 4 views: front view, three-quarter angle view, side profile view, and a close-up facial expression matrix (neutral, gentle smile, laughing, playful wink). Clean neutral light-grey studio background, even commercial studio lighting, symmetrical lineup, highly consistent facial anatomy, ultra-realistic photorealistic 8k texture reference sheet.`;

    const flowPrompt = `Vertical 9:16 cinematic video. Consistent character: ${charName}, ${age}-year-old ${ethPrompt}, ${hairDesc}. She is smiling gently at the camera, doing a subtle graceful turn and friendly wave in an aesthetic sunlit cafe. Ultra-realistic, photorealistic FHD quality, perfectly consistent facial features, smooth natural facial expressions, clean footage, no typography, no text on screen.`;

    return {
        id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: charName,
        type: type,
        tagline: `${isArtist ? 'Virtual Singer & Indie Artist' : 'Virtual Influencer & KOL'} from Indonesia`,
        niche: nicheDesc,
        master_dna_prompt: masterDna,
        character_sheet_prompt: sheetPrompt,
        photo_variations: [
            {
                title: '1. Headshot Portrait / Avatar Profile',
                purpose: 'Foto profil media sosial (Instagram/TikTok/YouTube)',
                prompt: `Close-up beauty portrait of ${charName}, ${masterDna}. Looking directly into camera with a warm inviting smile, soft indoor cafe lighting, bokeh background, 8k resolution.`
            },
            {
                title: '2. Full-Body OOTD / Cafe Mirror Selfie',
                purpose: 'Postingan feed fashion OOTD gaya hidup',
                prompt: `Full-body shot of ${charName}, wearing ${fashionDesc}, standing gracefully in an aesthetic modern sunlit minimalist cafe with indoor plants, holding an iced matcha cup, natural candid pose, 8k.`
            },
            {
                title: '3. Lifestyle Niche Activity',
                purpose: `${isArtist ? 'Sesi rekaman akustik di kamar estetik' : 'Review produk kecantikan & unboxing'}`,
                prompt: isArtist
                    ? `Medium shot of ${charName} holding an acoustic wooden guitar, sitting on a cozy rug in an aesthetic bedroom with warm fairy lights and microphone stand, singing gently, cinematic moody lighting, 8k.`
                    : `Medium close-up of ${charName} holding an aesthetic skincare dropper bottle near her cheek, showing genuine excited expression in bright aesthetic vanity room, photorealistic, 8k.`
            },
            {
                title: '4. Glamour / Editorial Poster Shot',
                purpose: 'Foto sampul promosi premium & cover poster',
                prompt: `Dramatic editorial magazine cover portrait of ${charName}, wearing a sophisticated modern black tailored blazer, dramatic rim lighting, dark moody studio backdrop, high fashion pose, 8k.`
            }
        ],
        google_flow_video_prompt: flowPrompt,
        social_profile: {
            suggested_usernames: [
                `@${charName.toLowerCase().replace(/\s+/g, '')}.daily`,
                `@${charName.toLowerCase().replace(/\s+/g, '_')}_official`,
                `@its.${charName.toLowerCase().replace(/\s+/g, '')}`
            ],
            instagram_bio: `✨ Virtual ${isArtist ? 'Artist & Singer' : 'Creator & Lifestyle Explorer'}\n📍 Jakarta / Nusantara\n☕ Coffee, Aesthetic OOTD & Good Vibes\n📩 Inquiries & Collabs: DM or link below 👇`,
            catchphrase: `Halo semuanya! Kenalin, aku ${charName}. Temani hari-hariku yuk! ✨`,
            content_pillars: [
                'Postingan OOTD & inspirasi gaya harian minimalis',
                `${isArtist ? 'Cover lagu akustik 30 detik & cuplikan lirik' : 'Review jujur produk skincare & unboxing seru'}`,
                'Vlog mini "A Day in My Virtual Life" format vertikal'
            ]
        },
        artist_specs: isArtist ? {
            vocal_timbre: 'Sweet warm airy soprano with gentle acoustic vibrato, similar to Niki / Olivia Rodrigo acoustic style.',
            music_genre: 'Indie Pop, Bedroom Pop, Lo-Fi R&B Acoustic',
            suno_prompt: 'Acoustic indie pop ballad, soft emotional female vocals, acoustic guitar fingerpicking, subtle reverb, warm intimate bedroom recording, poetic lyrics, 85 bpm.'
        } : null,
        createdAt: new Date().toISOString()
    };
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
