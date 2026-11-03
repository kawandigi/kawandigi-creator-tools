import { getCurrentUser, getAdminEmail } from './auth_manager.js';
/**
 * KawanDigi Creator Studio - License & Tool Access Manager
 * Enables selling tools separately (A la Carte) or as All-Access VIP
 */

const LICENSE_STORAGE_KEY = 'kawandigi_user_licenses';
const USAGE_STORAGE_KEY = 'kawandigi_trial_usage';

// Default free trial limits before requiring a license key
export const FREE_TRIAL_LIMIT = 3;

export function getLicenses() {
    try {
        const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveLicenses(licenses) {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenses));
}

export function getTrialUsage(toolId) {
    try {
        const raw = localStorage.getItem(USAGE_STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        return data[toolId] || 0;
    } catch {
        return 0;
    }
}

export function incrementTrialUsage(toolId) {
    try {
        const raw = localStorage.getItem(USAGE_STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        data[toolId] = (data[toolId] || 0) + 1;
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(data));
        return data[toolId];
    } catch {
        return 1;
    }
}

export function resetTrialUsage() {
    localStorage.removeItem(USAGE_STORAGE_KEY);
}

export function clearLicenses() {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
}

/**
 * Check if the user has access to a specific tool (either active license or trial remaining)
 */
export function hasToolAccess(toolId) {
    // Superadmin has 100% full unlimited access to all features automatically
    const user = getCurrentUser();
    if (user && user.email) {
        const adminEmail = (typeof getAdminEmail === 'function' ? getAdminEmail() : 'admin.kawandigi@gmail.com').toLowerCase().trim();
        if (user.email.toLowerCase().trim() === adminEmail) {
            return { allowed: true, type: 'all_access', trialLeft: 9999 };
        }
    }

    const licenses = getLicenses();
    
    // Master All-Access VIP
    if (licenses['all_access'] && (!licenses['all_access'].expires || new Date(licenses['all_access'].expires) > new Date())) {
        return { allowed: true, type: 'all_access', trialLeft: 0 };
    }

    // Tool specific license
    if (licenses[toolId] && (!licenses[toolId].expires || new Date(licenses[toolId].expires) > new Date())) {
        return { allowed: true, type: 'licensed', trialLeft: 0 };
    }

    // Check free trial
    const used = getTrialUsage(toolId);
    const trialLeft = Math.max(0, FREE_TRIAL_LIMIT - used);
    if (trialLeft > 0) {
        return { allowed: true, type: 'trial', trialLeft: trialLeft };
    }

    return { allowed: false, type: 'expired', trialLeft: 0 };
}

/**
 * Verify and activate a license key entered by the user
 */
export function activateLicenseKey(rawKey) {
    if (!rawKey) return { success: false, message: 'Masukkan kode lisensi Anda.' };
    const key = rawKey.trim().toUpperCase();

    const licenses = getLicenses();

    // 1. Master Admin / Lifetime VIP
    if (key === 'KAWANDIGI-VIP-UNLIMITED' || key.startsWith('KD-VIP-')) {
        licenses['all_access'] = {
            active: true,
            tier: 'All-Access VIP',
            key: key,
            activatedAt: new Date().toISOString(),
            expires: null // Lifetime / 1 year
        };
        saveLicenses(licenses);
        return { success: true, message: 'Selamat! Lisensi All-Access VIP berhasil diaktifkan. Semua tools terbuka!' };
    }

    // 2. Tool UGC Affiliate License
    if (key === 'KAWANDIGI-UGC-PRO' || key.startsWith('KD-UGC-')) {
        licenses['ugc'] = {
            active: true,
            tier: 'AI UGC Affiliate Pro',
            key: key,
            activatedAt: new Date().toISOString(),
            expires: null
        };
        saveLicenses(licenses);
        return { success: true, message: 'Lisensi Tool AI UGC & Video Ads Creator berhasil diaktifkan!' };
    }

    // 3. Tool Drama Creator License
    if (key === 'KAWANDIGI-DRAMA-PRO' || key.startsWith('KD-DRAMA-')) {
        licenses['drama'] = {
            active: true,
            tier: 'AI Drama & Series Pro',
            key: key,
            activatedAt: new Date().toISOString(),
            expires: null
        };
        saveLicenses(licenses);
        return { success: true, message: 'Lisensi Tool AI Drama & Micro-Series Creator berhasil diaktifkan!' };
    }

    return { success: false, message: 'Kode lisensi tidak valid atau telah kedaluwarsa.' };
}
