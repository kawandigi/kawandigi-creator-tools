/**
 * KAWANDIGI CREATOR TOOLS - CHARACTER VAULT (LOCAL INDEXEDDB STORAGE)
 * Module untuk menyimpan profil karakter, prompt character sheet, dan gambar render
 * secara lokal di perangkat pengguna (HP / PC) tanpa batasan kuota sempit localStorage.
 */

const DB_NAME = 'KawanDigi_CharacterVault_v1';
const DB_VERSION = 1;
const STORE_NAME = 'characters';

let dbInstance = null;

/**
 * Inisialisasi koneksi IndexedDB
 */
export function initCharacterVault() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        if (!window.indexedDB) {
            console.warn('[CharacterVault] IndexedDB tidak didukung oleh browser ini.');
            return resolve(null);
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('[CharacterVault] Gagal membuka IndexedDB:', event.target.error);
            resolve(null);
        };
    });
}

/**
 * Menyimpan karakter baru atau memperbarui karakter yang ada di Vault
 */
export async function saveCharacterToVault(character) {
    const db = await initCharacterVault();
    if (!db) {
        return saveToLocalStorageFallback(character);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const dataToSave = {
            ...character,
            updatedAt: new Date().toISOString()
        };
        if (!dataToSave.createdAt) {
            dataToSave.createdAt = new Date().toISOString();
        }

        const request = store.put(dataToSave);
        request.onsuccess = () => resolve(dataToSave);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Mengambil seluruh karakter yang tersimpan di Vault (Urut dari yang terbaru)
 */
export async function getAllCharactersFromVault() {
    const db = await initCharacterVault();
    if (!db) {
        return getFromLocalStorageFallback();
    }

    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const list = request.result || [];
            // Sort by createdAt descending
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            resolve(list);
        };

        request.onerror = () => {
            resolve([]);
        };
    });
}

/**
 * Mengambil karakter berdasarkan ID
 */
export async function getCharacterById(id) {
    const db = await initCharacterVault();
    if (!db) {
        const list = getFromLocalStorageFallback();
        return list.find(c => c.id === id) || null;
    }

    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

/**
 * Memperbarui gambar render / character sheet karakter di Vault
 */
export async function updateCharacterImage(id, imageDataUrl) {
    const character = await getCharacterById(id);
    if (!character) throw new Error('Karakter tidak ditemukan.');

    character.character_sheet_image = imageDataUrl;
    character.avatar_image = imageDataUrl;
    return await saveCharacterToVault(character);
}

/**
 * Menghapus karakter dari Vault
 */
export async function deleteCharacterFromVault(id) {
    const db = await initCharacterVault();
    if (!db) {
        const list = getFromLocalStorageFallback().filter(c => c.id !== id);
        localStorage.setItem('kd_characters_fallback_v1', JSON.stringify(list));
        return true;
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Mengunduh paket karakter lengkap ke penyimpanan lokal perangkat pengguna (HP / PC)
 * Menghasilkan file teks dokumentasi DNA & Character Sheet, serta mengunduh gambar jika tersedia.
 */
export function exportCharacterPackage(character) {
    if (!character) return;

    const safeName = (character.name || 'AI_Character').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // 1. Buat teks ringkasan DNA & Prompt
    let textContent = `========================================================================\n`;
    textContent += `KAWANDIGI CREATOR TOOLS - CHARACTER DNA & PROMPT SHEET\n`;
    textContent += `Nama Karakter: ${character.name || '-'}\n`;
    textContent += `Tipe: ${character.type === 'artist' ? 'AI Artist / Virtual Singer' : 'AI Influencer / Virtual KOL'}\n`;
    textContent += `Niche / Bidang: ${character.niche || '-'}\n`;
    textContent += `Dibuat Pada: ${new Date(character.createdAt || Date.now()).toLocaleString('id-ID')}\n`;
    textContent += `========================================================================\n\n`;

    textContent += `[1] MASTER DNA PROMPT (KUNCI KONSISTENSI WAJAH & FISIK)\n`;
    textContent += `Gunakan prompt ini sebagai basis konsistensi di Midjourney, Stable Diffusion, Flux, atau Leonardo AI:\n\n`;
    textContent += `${character.master_dna_prompt || '-'}\n\n`;

    textContent += `------------------------------------------------------------------------\n`;
    textContent += `[2] CHARACTER SHEET TURNAROUND PROMPT (GEMINI / IMAGEN 3 / FLUX)\n`;
    textContent += `Prompt multi-sudut (Front, 3/4, Profile, Facial Expressions):\n\n`;
    textContent += `${character.character_sheet_prompt || '-'}\n\n`;

    textContent += `------------------------------------------------------------------------\n`;
    textContent += `[3] PROMPT VIDEO MOTION 10s (GOOGLE FLOW / VEO AI)\n`;
    textContent += `Salin dan tempel di Google Flow (aitestkitchen.withgoogle.com/tools/video-fx):\n\n`;
    textContent += `${character.google_flow_video_prompt || '-'}\n\n`;

    if (Array.isArray(character.photo_variations) && character.photo_variations.length > 0) {
        textContent += `------------------------------------------------------------------------\n`;
        textContent += `[4] PAKET FOTO POSE MEDSOS SIAP PAKAI\n\n`;
        character.photo_variations.forEach((pv, idx) => {
            textContent += `Pose ${idx + 1} - ${pv.title || 'Pose'}:\n${pv.prompt || '-'}\n\n`;
        });
    }

    if (character.social_profile) {
        textContent += `------------------------------------------------------------------------\n`;
        textContent += `[5] BIODATA & PROFIL MEDIA SOSIAL (INSTAGRAM / TIKTOK)\n`;
        textContent += `Rekomendasi Username: ${(character.social_profile.suggested_usernames || []).join(', ')}\n`;
        textContent += `Sapaan Khas: ${character.social_profile.catchphrase || '-'}\n`;
        textContent += `Bio Media Sosial:\n${character.social_profile.instagram_bio || '-'}\n\n`;
        if (Array.isArray(character.social_profile.content_pillars)) {
            textContent += `Ide Konten Debut:\n`;
            character.social_profile.content_pillars.forEach((p, i) => {
                textContent += `  ${i + 1}. ${p}\n`;
            });
        }
        textContent += `\n`;
    }

    if (character.artist_specs) {
        textContent += `------------------------------------------------------------------------\n`;
        textContent += `[6] SPESIFIKASI MUSIK & VOKAL (AI ARTIST / SINGER)\n`;
        textContent += `Timbre Vokal: ${character.artist_specs.vocal_timbre || '-'}\n`;
        textContent += `Genre Musik: ${character.artist_specs.music_genre || '-'}\n`;
        textContent += `Prompt Suno / Udio AI:\n${character.artist_specs.suno_prompt || '-'}\n\n`;
    }

    // 2. Unduh file TXT ke perangkat
    downloadBlobAsFile(new Blob([textContent], { type: 'text/plain;charset=utf-8' }), `${safeName}_Character_DNA_Pack.txt`);

    // 3. Jika karakter memiliki gambar character sheet (Base64 atau URL), unduh juga gambarnya
    if (character.character_sheet_image && character.character_sheet_image.startsWith('data:image')) {
        setTimeout(() => {
            downloadDataUrlAsFile(character.character_sheet_image, `${safeName}_Character_Sheet.png`);
        }, 500);
    }
}

/**
 * Helper untuk mengunduh Blob menjadi file di perangkat
 */
function downloadBlobAsFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
}

/**
 * Helper untuk mengunduh data URL (Base64) menjadi file gambar
 */
function downloadDataUrlAsFile(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
    }, 200);
}

/* ========================================================================= */
/* LOCAL STORAGE FALLBACK                                                    */
/* ========================================================================= */
const FALLBACK_KEY = 'kd_characters_fallback_v1';

function saveToLocalStorageFallback(character) {
    try {
        const list = getFromLocalStorageFallback();
        const existingIdx = list.findIndex(c => c.id === character.id);
        const dataToSave = {
            ...character,
            updatedAt: new Date().toISOString()
        };
        if (!dataToSave.createdAt) dataToSave.createdAt = new Date().toISOString();

        if (existingIdx >= 0) {
            list[existingIdx] = dataToSave;
        } else {
            list.unshift(dataToSave);
        }
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
        return dataToSave;
    } catch (e) {
        console.warn('[CharacterVault] Gagal simpan ke localStorage fallback:', e);
        return character;
    }
}

function getFromLocalStorageFallback() {
    try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
