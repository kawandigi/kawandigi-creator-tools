/**
 * KAWANDIGI CREATOR TOOLS - HISTORY MANAGER
 * Module untuk menyimpan, mengelola, dan memulihkan riwayat project (maksimal 20 project).
 * Tersimpan secara lokal di browser (localStorage) sehingga data tidak hilang saat refresh.
 */

const STORAGE_KEY = 'kawandigi_project_history_v1';
const LAST_ACTIVE_KEY = 'kawandigi_last_active_project_id';
const MAX_HISTORY = 20;

/**
 * Format timestamp menjadi teks waktu yang ramah (contoh: "Baru saja", "5 menit lalu", "Hari ini, 09:12")
 */
export function formatRelativeTime(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 45) return 'Baru saja';
        if (diffMin < 60) return `${diffMin} menit yang lalu`;
        if (diffHour < 24 && date.getDate() === now.getDate()) {
            return `Hari ini, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (diffDay === 1) {
            return `Kemarin, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
}

/**
 * Mengambil seluruh riwayat project yang tersimpan
 * @returns {Array} List of project objects (terbaru di paling atas)
 */
export function getHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (err) {
        console.warn('Gagal membaca history dari localStorage:', err);
        return [];
    }
}

/**
 * Menyimpan project baru ke dalam riwayat (maksimal 20 item).
 * Menghapus data paling lama secara otomatis jika sudah melebihi 20.
 * @param {Object} project Data project
 * @returns {Object} Project yang baru disimpan
 */
export function saveProjectToHistory(project) {
    try {
        const history = getHistory();
        
        // Buat ID unik dan metadata waktu
        const id = project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = new Date().toISOString();

        // Buat objek project yang aman disimpan
        const newProject = {
            id,
            timestamp,
            type: project.type || 'ugc', // 'ugc' atau 'drama'
            title: project.title || 'Project Tanpa Judul',
            category: project.category || 'Umum',
            duration: project.duration || 10,
            tone: project.tone || 'Standar',
            previewText: project.previewText || '',
            inputs: {
                productUrl: project.inputs?.productUrl || '',
                productName: project.inputs?.productName || project.title || '',
                productCategory: project.inputs?.productCategory || project.category || '',
                tone: project.inputs?.tone || project.tone || '',
                videoDuration: project.inputs?.videoDuration || project.duration || 10,
                sellingPoints: project.inputs?.sellingPoints || '',
                // Series Drama inputs jika ada
                seriesTitle: project.inputs?.seriesTitle || '',
                genre: project.inputs?.genre || '',
                episodeNumber: project.inputs?.episodeNumber || 1,
                storyPremise: project.inputs?.storyPremise || '',
                heroName: project.inputs?.heroName || '',
                heroDesc: project.inputs?.heroDesc || '',
                villainName: project.inputs?.villainName || '',
                villainDesc: project.inputs?.villainDesc || '',
                sceneCount: project.inputs?.sceneCount || 6
            },
            data: project.data // Objek campaign/drama lengkap
        };

        // Filter jika ID yang sama sudah ada (update alih-alih duplikat)
        const filtered = history.filter(item => item.id !== id);

        // Sisipkan di posisi teratas (terbaru)
        filtered.unshift(newProject);

        // Batasi maksimal 20 item (FIFO)
        const trimmed = filtered.slice(0, MAX_HISTORY);

        // Simpan ke localStorage dengan penanganan kuota
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            localStorage.setItem(LAST_ACTIVE_KEY, id);
        } catch (storageErr) {
            // Jika melebihi kuota storage, coba hapus item tertua dan coba lagi
            if (trimmed.length > 5) {
                const reduced = trimmed.slice(0, 10);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
                localStorage.setItem(LAST_ACTIVE_KEY, id);
            } else {
                throw storageErr;
            }
        }

        return newProject;
    } catch (err) {
        console.error('Gagal menyimpan project ke riwayat:', err);
        return null;
    }
}

/**
 * Mengambil project berdasarkan ID
 * @param {string} id ID project
 * @returns {Object|null}
 */
export function getHistoryById(id) {
    const list = getHistory();
    return list.find(item => item.id === id) || null;
}

/**
 * Mengambil ID project yang terakhir aktif
 */
export function getLastActiveProjectId() {
    try {
        return localStorage.getItem(LAST_ACTIVE_KEY) || null;
    } catch {
        return null;
    }
}

/**
 * Menetapkan ID project yang sedang aktif
 */
export function setLastActiveProjectId(id) {
    try {
        if (id) {
            localStorage.setItem(LAST_ACTIVE_KEY, id);
        } else {
            localStorage.removeItem(LAST_ACTIVE_KEY);
        }
    } catch {}
}

/**
 * Menghapus 1 project dari riwayat
 * @param {string} id ID project
 */
export function deleteHistoryItem(id) {
    try {
        const history = getHistory();
        const updated = history.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Jika yang dihapus adalah yang terakhir aktif, bersihkan
        if (getLastActiveProjectId() === id) {
            setLastActiveProjectId(updated[0]?.id || null);
        }
        return true;
    } catch (err) {
        console.error('Gagal menghapus riwayat:', err);
        return false;
    }
}

/**
 * Menghapus seluruh riwayat project
 */
export function clearAllHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LAST_ACTIVE_KEY);
        return true;
    } catch (err) {
        console.error('Gagal membersihkan riwayat:', err);
        return false;
    }
}

/**
 * Export riwayat ke file JSON (Backup)
 */
export function exportHistoryJson() {
    const history = getHistory();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kawandigi-history-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}
