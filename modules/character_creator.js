/**
 * KAWANDIGI CREATOR TOOLS - CHARACTER CREATOR ENGINE
 * Module untuk menghasilkan Master DNA Prompt, Character Turnaround Sheet Prompt (Gemini/Imagen/Flux/Midjourney),
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
        skinTone: 'Sawo matang alami khas Indonesia dengan rona sehat glowing',
        hairStyle: 'Sebahu bergelombang alami dengan soft curtain bangs',
        hairColor: 'Hitam alami berkilau sehat',
        bodyType: 'Petite fit, ramping alami dan proporsional',
        fashionStyle: 'Korean Minimalist Cafe OOTD (cardigan rajut krem & celana high-waist)',
        niche: 'Fashion & OOTD Gaya Hidup Estetik',
        vibe: 'Ceria, ramah, hangat, bersahabat (Girl Next Door)',
        customTraits: 'Lesung pipi manis di pipi kanan saat tersenyum, kulit glowing alami, riasan clean girl look.'
    },
    {
        name: 'Alya Melody',
        type: 'artist',
        gender: 'female',
        ageGroup: '20',
        ethnicity: 'eurasian',
        skinTone: 'Kuning langsat cerah merona bercahaya',
        hairStyle: 'Panjang lurus terurai belah tengah berkilau',
        hairColor: 'Ash brown dengan highlight silver halus',
        bodyType: 'Slim athletic, bugar dan tinggi semampai',
        fashionStyle: 'Indie Pop Stage Aesthetic (oversized blazer hitam & aksesoris perak vintage)',
        niche: 'Musik Indie Pop, Akustik & Virtual Singer',
        vibe: 'Anggun, puitis, bersuara merdu, dan penuh karisma',
        customTraits: 'Mata almond cokelat hazel tajam ekspresif, kalung liontin perak khas, selalu memegang gitar akustik kayu.'
    },
    {
        name: 'Rian Pratama',
        type: 'influencer',
        gender: 'male',
        ageGroup: '24',
        ethnicity: 'indonesian_natural',
        skinTone: 'Sawo matang alami khas Indonesia dengan rona sehat glowing',
        hairStyle: 'Modern two-block cut dengan tekstur natural',
        hairColor: 'Hitam alami berkilau sehat',
        bodyType: 'Lean muscular, dada bidang dan berotot atletis',
        fashionStyle: 'Urban Streetwear Hypebeast (hoodie oversized abu-abu, cargo pants, dan sneakers)',
        niche: 'Tech, Gadget & Smartphone Reviewer',
        vibe: 'Santai, komunikatif, melek teknologi, dan percaya diri',
        customTraits: 'Garis rahang tegas dan simetris sangat fotogenik, senyum ramah, memakai smartwatch hitam dan kacamata berbingkai tipis.'
    },
    {
        name: 'Kenzo Daiki',
        type: 'artist',
        gender: 'male',
        ageGroup: '21',
        ethnicity: 'east_asian',
        skinTone: 'Putih porselen mulus glass skin khas idol',
        hairStyle: 'Korean comma hair rapi berkarisma',
        hairColor: 'Cokelat gelap espresso (Dark Espresso Brown)',
        bodyType: 'Slim athletic, bugar dan tinggi semampai',
        fashionStyle: 'Cyberpunk Techwear / J-Rock Idol (jaket bomber beraksen neon dan headphone)',
        niche: 'Musik & Virtual Singer (J-Rock / Future Bass)',
        vibe: 'Edgy, berani, trendsetter dan penuh percaya diri',
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
    skinTone = '',
    hairStyle = '',
    hairColor = '',
    bodyType = '',
    fashionStyle = '',
    niche = '',
    vibe = '',
    customTraits = '',
    targetEngine = 'gemini', // 'gemini' | 'midjourney' | 'flux' | 'sdxl'
    lightingStyle = 'studio' // 'studio' | 'golden_hour' | 'moody_stage' | 'candid_flash'
}) {
    const isFemale = gender === 'female';
    const isArtist = type === 'artist';
    const charName = name.trim() || (isFemale ? (isArtist ? 'Alya Melody' : 'Maya Putri') : (isArtist ? 'Kenzo Daiki' : 'Rian Pratama'));

    const lightingMap = {
        'studio': 'commercial studio lighting with soft front key light, subtle fill light, neutral background, 85mm portrait lens, f/2.0 aperture',
        'golden_hour': 'warm golden hour sunset lighting, soft sun-kissed backlight, cinematic rim lighting, 50mm f/1.4 lens with natural bokeh',
        'moody_stage': 'moody concert stage neon lighting, cyan and magenta accent rim lights, atmospheric haze, dramatic cinematic contrast',
        'candid_flash': 'direct on-camera flash paparazzi aesthetic, authentic iPhone snapshot look, raw and sharp flash reflections'
    };
    const lightingPrompt = lightingMap[lightingStyle] || lightingMap['studio'];

    const engineSuffixMap = {
        'gemini': ', ultra-photorealistic photographic shot, 8k resolution, true-to-life skin texture, masterwork photograph',
        'midjourney': ' --ar 9:16 --v 6.1 --style raw',
        'flux': ', 35mm photograph, shot on Kodak Portra 400, hyperrealistic pores and skin imperfections, dynamic depth of field, 8k',
        'sdxl': ', high quality dslr photography, sharp focus, 8k uhd, photorealistic octane render texture'
    };
    const engineSuffix = engineSuffixMap[targetEngine] || engineSuffixMap['gemini'];

    const systemPrompt = `Kamu adalah Master AI Character Designer & Creative Director untuk Virtual Influencer dan AI Artist / Singer kelas dunia.
Tugasmu adalah merancang profil komprehensif, Master Character DNA (kunci konsistensi wajah & fisik), Prompt Character Sheet Turnaround Multi-Angle untuk Google Gemini Imagen 3 / Flux / Midjourney, Prompt Video Gerak 10s untuk Google Flow (Veo AI), dan Profil Media Sosial.

ATURAN MASTER CHARACTER DNA:
- Master DNA Prompt harus sangat detail dan presisi dalam bahasa Inggris standar industri generator gambar AI.
- Menjelaskan: gender (${isFemale ? 'female' : 'male'}), etnisitas, warna kulit (${skinTone || 'natural'}), warna & gaya rambut (${hairColor || ''} ${hairStyle || ''}), struktur tulang rahang, bentuk mata, tekstur pori-pori kulit alami, ciri unik konsistensi (${customTraits || 'natural dimples'}), dan pencahayaan (${lightingPrompt}).
- Target Engine: ${targetEngine} (${engineSuffix}).

ATURAN CHARACTER SHEET TURNAROUND PROMPT:
- Format standar industri model sheet turnaround: satu gambar komprehensif berisi multiple angles (front view, three-quarter view, profile side view, and facial expression matrix: smiling, neutral, laughing, talking) dengan latar belakang netral studio.
- Sangat penting sebagai reference visual sheet untuk LoRA atau image-to-image consistency.

ATURAN PROMPT GOOGLE FLOW (VEO AI):
- Prompt video gerak vertikal 9:16 durasi 10 detik.
- Mengadopsi karakter DNA yang konsisten, dengan gerakan alami (${isArtist ? 'menyanyi lembut, memegang mikrofon/gitar, menoleh ke kamera' : 'tersenyum manis, memegang produk/cangkir kopi, pose OOTD natural'}).
- Clean footage, sinematik, fotorealistis FHD, tanpa teks pada layar.

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERSIH BERIKUT (Dilarang ada markdown pembuka/penutup):
{
  "name": "${charName}",
  "type": "${type}",
  "gender": "${gender}",
  "target_engine": "${targetEngine}",
  "lighting_style": "${lightingStyle}",
  "tagline": "Slogan ringkas karakter (contoh: Virtual Beauty & OOTD Creator from Jakarta)",
  "niche": "Niche utama karakter",
  "master_dna_prompt": "Prompt teks Master DNA lengkap dalam bahasa Inggris...",
  "character_sheet_prompt": "Prompt turnaround model sheet lengkap dalam bahasa Inggris...",
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
      "purpose": "${isArtist ? 'Sesi bernyanyi akustik / rekaman lagu' : 'Aktivitas niche / review produk'}",
      "prompt": "Prompt bahasa Inggris aktivitas..."
    },
    {
      "title": "4. Glamour / Editorial Poster Shot",
      "purpose": "${isArtist ? 'Sampul Album Musik / Poster Konser' : 'Foto sampul majalah fashion / editorial'}",
      "prompt": "Prompt bahasa Inggris foto glamor..."
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
    "vocal_timbre": "Deskripsi timbre suara (contoh: Warm airy soprano with smooth acoustic vibrato)",
    "music_genre": "Genre musik utama (contoh: Indie Pop / Lo-Fi Bedroom Acoustic)",
    "suno_prompt": "Prompt instan untuk Suno / Udio AI untuk membuat lagu karakter..."
  }` : "null"}
}`;

    let userPrompt = `Rancang profil karakter ${isArtist ? 'AI Artist / Virtual Singer' : 'AI Influencer / Virtual KOL'}:\n`;
    userPrompt += `- Nama: ${charName}\n`;
    userPrompt += `- Gender: ${isFemale ? 'Wanita (Female)' : 'Pria (Male)'}\n`;
    userPrompt += `- Usia: ${ageGroup} tahun\n`;
    userPrompt += `- Etnisitas / Wajah: ${ethnicity}\n`;
    if (skinTone) userPrompt += `- Warna Kulit: ${skinTone}\n`;
    if (hairStyle) userPrompt += `- Gaya Rambut: ${hairStyle}\n`;
    if (hairColor) userPrompt += `- Warna Rambut: ${hairColor}\n`;
    if (bodyType) userPrompt += `- Bentuk Tubuh: ${bodyType}\n`;
    if (fashionStyle) userPrompt += `- Gaya Busana / Signature OOTD: ${fashionStyle}\n`;
    if (niche) userPrompt += `- Niche / Industri: ${niche}\n`;
    if (vibe) userPrompt += `- Vibe & Kepribadian: ${vibe}\n`;
    if (customTraits) userPrompt += `- Ciri Khas Khusus: ${customTraits}\n`;
    userPrompt += `- Target Engine: ${targetEngine}\n`;
    userPrompt += `- Gaya Pencahayaan: ${lightingStyle}\n`;

    try {
        const rawResponse = await callGemini(userPrompt, systemPrompt, null, null, null, { jsonMode: true, disableThinking: true });
        const parsed = parseJsonSafely(rawResponse);
        if (!parsed || !parsed.master_dna_prompt) {
            throw new Error('Hasil rancangan karakter tidak lengkap.');
        }

        return {
            id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            ...parsed,
            target_engine: targetEngine,
            lighting_style: lightingStyle,
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
            skinTone,
            hairStyle,
            hairColor,
            bodyType,
            fashionStyle,
            niche,
            vibe,
            customTraits,
            targetEngine,
            lightingStyle
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
    skinTone = '',
    hairStyle = '',
    hairColor = '',
    bodyType = '',
    fashionStyle = '',
    niche = '',
    vibe = '',
    customTraits = '',
    targetEngine = 'gemini',
    lightingStyle = 'studio'
}) {
    const isArtist = type === 'artist';
    const isFemale = gender === 'female';
    const charName = name || (isFemale ? (isArtist ? 'Alya Melody' : 'Maya Putri') : (isArtist ? 'Kenzo Daiki' : 'Rian Pratama'));
    const age = ageGroup || '22';

    const skinDesc = skinTone || (isFemale ? 'warm glowing Indonesian golden-tan skin with natural healthy radiance' : 'natural healthy warm tan skin with subtle pores');
    const hairDesc = (hairColor ? hairColor + ' ' : '') + (hairStyle || (isFemale ? 'shoulder-length wavy hair with soft curtain bangs' : 'modern two-block textured haircut'));
    const fashionDesc = fashionStyle || (isFemale ? 'minimalist aesthetic oversized knit cardigan, white top, and high-waisted jeans' : 'urban streetwear oversized neutral hoodie, utility cargo pants, and sleek sneakers');
    const nicheDesc = niche || (isArtist ? 'Virtual Indie Pop Singer & Songwriter' : 'Fashion & OOTD Digital Lifestyle');

    const ethnicityPromptMap = {
        'indonesian_natural': 'young Indonesian with glowing warm honey-tan skin, friendly almond eyes, natural features',
        'eurasian': 'Eurasian mixed Indonesian with striking hazel eyes, defined jawline, and natural radiance',
        'east_asian': 'East Asian look with clear porcelain skin, expressive eyes, and modern K-idol aesthetic',
        'caucasian': 'young Caucasian with sun-kissed skin and defined graceful facial structure',
        'middle_eastern': 'Middle Eastern with deep expressive almond eyes, olive skin tone, and striking defined facial features'
    };
    const ethPrompt = ethnicityPromptMap[ethnicity] || ethnicity;

    const lightingMap = {
        'studio': 'even commercial studio lighting, soft key light, neutral light-grey backdrop, 85mm portrait lens, f/2.0 aperture',
        'golden_hour': 'warm golden hour sunset lighting, soft sun-kissed backlight, natural lens flare, 50mm f/1.4 lens bokeh',
        'moody_stage': 'moody concert stage neon lighting, cyan and magenta accent rim lights, dynamic atmospheric contrast',
        'candid_flash': 'direct on-camera flash snapshot aesthetic, authentic iPhone paparazzi photo, raw and crisp lighting'
    };
    const lightingPrompt = lightingMap[lightingStyle] || lightingMap['studio'];

    const engineSuffixMap = {
        'gemini': ', ultra-photorealistic photographic shot, 8k resolution, true-to-life skin texture',
        'midjourney': ' --ar 9:16 --v 6.1 --style raw',
        'flux': ', 35mm photography, shot on Kodak Portra 400, hyperrealistic pores and skin imperfections, dynamic depth of field, 8k',
        'sdxl': ', dslr photography, sharp focus, 8k uhd, photorealistic texture'
    };
    const engineSuffix = engineSuffixMap[targetEngine] || engineSuffixMap['gemini'];

    const masterDna = `Ultra-consistent photorealistic character DNA of ${charName}, a ${age}-year-old ${isFemale ? 'woman' : 'man'} (${ethPrompt}). Skin: ${skinDesc}. Face metrics: perfectly symmetrical facial structure, natural skin texture with subtle pores, expressive eyes, natural lips, ${customTraits || 'subtle youthful dimples'}. Hair: ${hairDesc}. Body: ${bodyType || 'healthy athletic lean proportions'}. Lighting: ${lightingPrompt}${engineSuffix}.`;

    const sheetPrompt = `Professional character model turnaround sheet of ${charName}, ${age}-year-old ${isFemale ? 'woman' : 'man'} (${ethPrompt}), ${hairDesc}. Wearing ${fashionDesc}. Multi-angle reference lineup sheet showing 4 views: front view, three-quarter angle view, side profile view, and a close-up facial expression matrix (neutral, gentle smile, laughing, talking). Clean neutral light-grey studio background, ${lightingPrompt}, highly consistent facial anatomy, ultra-realistic photorealistic 8k texture reference sheet${engineSuffix}.`;

    const flowPrompt = `Vertical 9:16 cinematic video. Consistent character: ${charName}, ${age}-year-old ${isFemale ? 'woman' : 'man'} (${ethPrompt}), ${hairDesc}. ${isFemale ? 'She' : 'He'} is smiling gently at the camera, doing a subtle graceful turn and friendly wave in an aesthetic sunlit modern space. Ultra-realistic, photorealistic FHD quality, perfectly consistent facial features, smooth natural facial expressions, clean footage, no typography, no text on screen.`;

    return {
        id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: charName,
        type: type,
        gender: gender,
        target_engine: targetEngine,
        lighting_style: lightingStyle,
        tagline: `${isArtist ? 'Virtual Singer & Songwriter' : 'Virtual Influencer & KOL'} from Indonesia`,
        niche: nicheDesc,
        master_dna_prompt: masterDna,
        character_sheet_prompt: sheetPrompt,
        photo_variations: [
            {
                title: '1. Headshot Portrait / Avatar Profile',
                purpose: 'Foto profil media sosial (Instagram/TikTok/YouTube)',
                prompt: `Close-up beauty portrait of ${charName}, ${masterDna}. Looking directly into camera with a warm inviting smile, ${lightingPrompt}${engineSuffix}.`
            },
            {
                title: '2. Full-Body OOTD / Cafe Mirror Selfie',
                purpose: 'Postingan feed fashion OOTD gaya hidup',
                prompt: `Full-body shot of ${charName}, wearing ${fashionDesc}, standing gracefully in an aesthetic modern sunlit minimalist cafe with indoor plants, holding an iced cup, natural candid pose, ${lightingPrompt}${engineSuffix}.`
            },
            {
                title: '3. Lifestyle Niche Activity',
                purpose: `${isArtist ? 'Sesi rekaman akustik di kamar estetik' : 'Review produk kecantikan & unboxing'}`,
                prompt: isArtist
                    ? `Medium shot of ${charName} holding an acoustic wooden guitar, sitting on a cozy rug in an aesthetic bedroom with warm fairy lights and microphone stand, singing gently, cinematic moody lighting${engineSuffix}.`
                    : `Medium close-up of ${charName} holding an aesthetic skincare dropper bottle near cheek, showing genuine excited expression in bright vanity room, ${lightingPrompt}${engineSuffix}.`
            },
            {
                title: '4. Glamour / Editorial Poster Shot',
                purpose: `${isArtist ? 'Sampul Album Musik / Single' : 'Foto sampul promosi premium & cover poster'}`,
                prompt: `Dramatic editorial magazine cover portrait of ${charName}, wearing a sophisticated modern black tailored blazer, dramatic rim lighting, dark moody studio backdrop, high fashion pose${engineSuffix}.`
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
            vocal_timbre: isFemale
                ? 'Sweet warm airy soprano with gentle acoustic vibrato, similar to Niki / Olivia Rodrigo acoustic style.'
                : 'Warm baritone with smooth emotional tone, similar to wave to earth / Keshi vibe.',
            music_genre: 'Indie Pop, Bedroom Pop, Lo-Fi R&B Acoustic',
            suno_prompt: `Acoustic indie pop ballad, soft emotional ${isFemale ? 'female' : 'male'} vocals, acoustic guitar fingerpicking, subtle reverb, warm intimate bedroom recording, poetic lyrics, 85 bpm.`
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
