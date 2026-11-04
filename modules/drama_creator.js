/**
 * KawanDigi Creator Tools - AI Drama & Micro-Series Creator
 * Generates viral serialized short drama episodes with character consistency & cliffhanger engine
 */

import { callGemini } from './gemini_api.js';
import { hasToolAccess, incrementTrialUsage } from './license_manager.js';

export async function generateDramaEpisode({
    seriesTitle = '',
    genre = '👑 CEO Konglomerat Menyamar',
    episodeNumber = 1,
    storyPremise = '',
    protagonist = {
        name: 'Adrian',
        role: 'CEO Pewaris yang Menyamar Jadi Office Boy',
        visual: 'Pria Asia 27 tahun, wajah tampan berkarisma, rambut hitam rapi, memakai seragam OB abu-abu sederhana namun tatapan mata tajam penuh percaya diri'
    },
    antagonist = {
        name: 'Pak Hendra',
        role: 'Manager Cabang yang Sombong & Korup',
        visual: 'Pria paruh baya 45 tahun, bertubuh tambun, jas necis berlebihan, jam tangan emas mencolok, ekspresi meremehkan'
    },
    sceneCount = 3 // 3 scenes (30s) or 6 scenes (60s)
}) {
    // 1. License / Trial Check
    const access = hasToolAccess('drama');
    if (!access.allowed) {
        throw new Error('Akses Tool AI Drama Creator terkunci. Silakan masukkan kode lisensi di tab Lisensi untuk membuka akses.');
    }

    const systemPrompt = `Anda adalah Sutradara & Naskah Drama Pendek (*Micro-Drama / Sinetron Pendek TikTok & ReelShort*) kelas dunia.
Tugas Anda adalah menulis naskah episode drama pendek yang dramatis, penuh emosi, dan memiliki cliffhanger kuat di detik terakhir agar penonton wajib menonton episode selanjutnya.
SEMUA OUTPUT TEKS, DIALOG, DAN PROMPT VIDEO WAJIB 100% BAHASA INDONESIA!

ATURAN TEKNIS GOOGLE FLOW / VEO:
Video ini terdiri dari tepat ${sceneCount} scene, di mana tiap scene berdurasi MAKSIMAL 10 DETIK.
KONSISTENSI VISUAL KARAKTER:
Setiap prompt video untuk Google Flow HARUS secara eksplisit menyertakan deskripsi visual karakter protagonis dan antagonis yang sama persis dalam Bahasa Indonesia agar wajah dan pakaian mereka konsisten.

Keluarkan respon HANYA dalam format JSON valid (tanpa markdown backtick tambahan):
{
  "episode_info": {
    "series_title": "Judul Serial",
    "episode_number": ${episodeNumber},
    "episode_title": "Judul Episode yang Menggugah Penasaran",
    "genre": "${genre}",
    "logline": "1 kalimat ringkasan konflik utama episode ini"
  },
  "characters": {
    "protagonist": {
      "name": "${protagonist.name}",
      "character_prompt_tag": "Deskripsi visual pendek karakter dalam bahasa Indonesia untuk disematkan di tiap prompt video"
    },
    "antagonist": {
      "name": "${antagonist.name}",
      "character_prompt_tag": "Deskripsi visual antagonis dalam bahasa Indonesia"
    }
  },
  "scenes": [
    {
      "scene_number": 1,
      "duration_seconds": 10,
      "scene_name": "PENGENALAN / AWAL KONFLIK",
      "action_description": "Deskripsi aksi dramatis dalam bahasa Indonesia",
      "dialogue": "Dialog tokoh yang emosional dan tajam",
      "google_flow_prompt": "Video vertikal 9:16 sinematik gaya sinetron micro-drama dalam bahasa Indonesia, dengan detail visual karakter, pencahayaan dramatis, dan pergerakan kamera, fotorealistis FHD siap pakai untuk Google Flow / Veo",
      "sound_fx": "Efek suara / musik pengiring yang menegangkan"
    }
  ],
  "cliffhanger_hook": "Teks dramatis penutup episode (Contoh: Siapa sebenarnya cleaning service ini?! Lanjut Part 2!)"
}`;

    let userPrompt = `Buat naskah drama pendek untuk Episode ${episodeNumber}:\n`;
    if (seriesTitle) userPrompt += `- Judul Serial: ${seriesTitle}\n`;
    userPrompt += `- Genre: ${genre}\n`;
    if (storyPremise) userPrompt += `- Premis Cerita / Masalah: ${storyPremise}\n`;
    userPrompt += `- Tokoh Utama (Protagonis): ${protagonist.name} (${protagonist.role}), Penampilan: ${protagonist.visual}\n`;
    userPrompt += `- Tokoh Lawan (Antagonis): ${antagonist.name} (${antagonist.role}), Penampilan: ${antagonist.visual}\n`;
    userPrompt += `- Jumlah Scene: ${sceneCount} Scene (@ 10 detik per scene)\n`;

    const rawResponse = await callGemini(userPrompt, systemPrompt);

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
        const drama = JSON.parse(cleaned);
        if (access.type === 'trial') {
            incrementTrialUsage('drama');
        }
        return drama;
    } catch {
        throw new Error('Gagal memproses struktur naskah drama JSON dari AI. Silakan coba klik generate kembali.');
    }
}
