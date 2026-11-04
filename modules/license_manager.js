import { getCurrentUser, getAdminEmail } from './auth_manager.js';

/**
 * KawanDigi Creator Studio - License & Tool Access Manager
 * Device-Locked Licensing Model: 1 License = 1 Physical Device.
 * Lifetime validity is tied to the customer's specific hardware device.
 * Multi-device usage requires purchasing a separate license per device.
 */

const LICENSE_STORAGE_KEY = 'kawandigi_user_licenses';
const USAGE_STORAGE_KEY = 'kawandigi_trial_usage';
const DEVICE_ID_KEY = 'kawandigi_device_id';

// Default free trial limit (3x per tool) before requiring a per-device license
export const FREE_TRIAL_LIMIT = 3;

/**
 * Generate or retrieve persistent hardware/device identifier for this browser
 */
export function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timePart = Date.now().toString(36).toUpperCase();
        id = `KD-DEV-${timePart}-${rand}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

/**
 * Detect friendly device name (e.g. "PC Windows (Chrome)", "Smartphone Android (Chrome)")
 */
export function getDeviceName() {
    const ua = navigator.userAgent || '';
    let os = 'Perangkat Web';
    if (/Windows/i.test(ua)) os = 'PC Windows';
    else if (/Android/i.test(ua)) os = 'Smartphone Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'Apple iOS';
    else if (/Mac/i.test(ua)) os = 'Apple Mac';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';

    return `${os} (${browser})`;
}

/**
 * Get active licenses strictly valid for THIS physical device
 */
export function getLicenses() {
    try {
        const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        const myDevId = getDeviceId();

        const validForThisDevice = {};
        for (const [tool, lic] of Object.entries(parsed)) {
            if (lic && lic.active) {
                // If legacy license has no boundDeviceId, lock it to this device now
                if (!lic.boundDeviceId) {
                    lic.boundDeviceId = myDevId;
                    lic.boundDeviceName = getDeviceName();
                    saveLicenses(parsed);
                }
                // Only treat license as active if it is bound to THIS device
                if (lic.boundDeviceId === myDevId) {
                    validForThisDevice[tool] = lic;
                }
            }
        }
        return validForThisDevice;
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
 * Check if the user has access to a specific tool on THIS physical device
 */
export function hasToolAccess(toolId) {
    // 1. Superadmin (admin.kawandigi@gmail.com) has 100% full unlimited access across all devices
    const user = getCurrentUser();
    if (user && user.email) {
        const adminEmail = (typeof getAdminEmail === 'function' ? getAdminEmail() : 'admin.kawandigi@gmail.com').toLowerCase().trim();
        if (user.email.toLowerCase().trim() === adminEmail) {
            return { allowed: true, type: 'all_access', trialLeft: 9999, isSuperadmin: true };
        }
    }

    const currentDeviceId = getDeviceId();
    const licenses = getLicenses();
    
    // 2. Master All-Access VIP (Locked to this device)
    const vip = licenses['all_access'];
    if (vip && vip.active && vip.boundDeviceId === currentDeviceId) {
        if (!vip.expires || new Date(vip.expires) > new Date()) {
            return { allowed: true, type: 'all_access', trialLeft: 0, deviceId: currentDeviceId };
        }
    }

    // 3. Tool Specific License (Locked to this device)
    const toolLic = licenses[toolId];
    if (toolLic && toolLic.active && toolLic.boundDeviceId === currentDeviceId) {
        if (!toolLic.expires || new Date(toolLic.expires) > new Date()) {
            return { allowed: true, type: 'licensed', trialLeft: 0, deviceId: currentDeviceId };
        }
    }

    // 4. Free Trial check on this device
    const used = getTrialUsage(toolId);
    const trialLeft = Math.max(0, FREE_TRIAL_LIMIT - used);
    if (trialLeft > 0) {
        return { allowed: true, type: 'trial', trialLeft: trialLeft, deviceId: currentDeviceId };
    }

    return { allowed: false, type: 'expired', trialLeft: 0, deviceId: currentDeviceId };
}

/**
 * Activate a license key and lock it to THIS physical device
 * Verifies with Cloudflare Backend to prevent the same key from being activated on a 2nd device
 */
export async function activateLicenseKey(rawKey) {
    if (!rawKey) return { success: false, message: 'Masukkan kode lisensi Anda.' };
    const key = rawKey.trim().toUpperCase();
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();
    const user = getCurrentUser();
    const email = user?.email || '';

    // Online verification with Cloudflare Backend (Device Binding Validation)
    try {
        const res = await fetch('/api/license/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: key,
                device_id: deviceId,
                device_name: deviceName,
                email: email
            })
        });

        const data = await res.json();
        if (!data.success) {
            return {
                success: false,
                code: data.code || 'ACTIVATION_ERROR',
                message: data.message || 'Kode lisensi tidak dapat diaktifkan.'
            };
        }

        // Successfully bound to this device in Cloudflare D1
        const rawLocal = localStorage.getItem(LICENSE_STORAGE_KEY);
        const allLicenses = rawLocal ? JSON.parse(rawLocal) : {};
        
        allLicenses[data.tier] = {
            active: true,
            tier: data.tierName || data.tier,
            key: key,
            boundDeviceId: deviceId,
            boundDeviceName: deviceName,
            activatedAt: new Date().toISOString(),
            expires: null // Lifetime validity tied to this device!
        };
        saveLicenses(allLicenses);

        // Update current user session plan on this device
        if (user) {
            user.subscription = {
                plan: `${data.tierName || 'All-Access VIP'} (Device Ini)`,
                active: true,
                boundDeviceId: deviceId
            };
            localStorage.setItem('kawandigi_user_session', JSON.stringify(user));
        }

        return {
            success: true,
            tier: data.tier,
            message: data.message || `Selamat! Lisensi ${data.tierName} berhasil diaktifkan dan dikunci khusus untuk perangkat ini (${deviceName}).`
        };

    } catch (err) {
        console.error('License activation API error:', err);
        return {
            success: false,
            message: 'Gagal menghubungi server lisensi. Pastikan koneksi internet aktif untuk aktivasi perangkat.'
        };
    }
}
