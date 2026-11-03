/**
 * KawanDigi Creator Studio - Authentication & Member Management
 * Supports Google OAuth (Google Identity Services / GIS), User Dashboard, and Admin Member Management
 */

const STORAGE_USER_KEY = 'kawandigi_user_session';
const STORAGE_MEMBERS_KEY = 'kawandigi_member_records';
const STORAGE_ADMIN_PIN = 'kawandigi_admin_pin';
const STORAGE_GOOGLE_CLIENT_ID = 'kawandigi_google_client_id';

const DEFAULT_ADMIN_PIN = 'kawandigi88';

// Default initial members for demo & immediate administration
const DEFAULT_MEMBERS = [
    {
        id: 'user_101',
        name: 'Rian Pratama',
        email: 'rian.pratama92@gmail.com',
        whatsapp: '6281234567890',
        joinedAt: '2026-10-25T10:15:00.000Z',
        plan: 'VIP Master Lifetime',
        status: 'Active'
    },
    {
        id: 'user_102',
        name: 'Siti Rahmawati',
        email: 'siti.rahma.creators@gmail.com',
        whatsapp: '6285712345678',
        joinedAt: '2026-11-01T08:30:00.000Z',
        plan: 'Pro Creator (Bulanan)',
        status: 'Active'
    },
    {
        id: 'user_103',
        name: 'Budi Santoso',
        email: 'budi.santoso.affiliate@gmail.com',
        whatsapp: '6287890123456',
        joinedAt: '2026-11-02T14:20:00.000Z',
        plan: 'Free Trial',
        status: 'Active'
    }
];

/**
 * Decode JWT token payload from Google Identity Services
 */
export function decodeJwtResponse(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Gagal decode Google JWT token:', e);
        return null;
    }
}

/**
 * Get current user session
 */
export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(STORAGE_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Save user session and upsert into member records
 */
export function saveCurrentUser(user) {
    if (!user) {
        localStorage.removeItem(STORAGE_USER_KEY);
        return;
    }
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    upsertMemberRecord(user);
}

/**
 * Update current user profile fields (e.g. WhatsApp number)
 */
export function updateCurrentUserProfile(updates) {
    const user = getCurrentUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    saveCurrentUser(updated);
    return updated;
}

/**
 * Logout current user
 */
export function logoutUser() {
    localStorage.removeItem(STORAGE_USER_KEY);
}

/**
 * Member Database Management (Admin View)
 */
export function getMemberList() {
    try {
        const raw = localStorage.getItem(STORAGE_MEMBERS_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(DEFAULT_MEMBERS));
            return DEFAULT_MEMBERS;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_MEMBERS;
    }
}

export function saveMemberList(members) {
    localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));
}

export function upsertMemberRecord(user) {
    if (!user || !user.email) return;
    const members = getMemberList();
    const index = members.findIndex(m => m.email.toLowerCase() === user.email.toLowerCase());
    
    const memberData = {
        id: user.id || 'usr_' + Date.now(),
        name: user.name || 'Member KawanDigi',
        email: user.email,
        whatsapp: user.whatsapp || '',
        joinedAt: user.joinedAt || new Date().toISOString(),
        lastActive: new Date().toISOString(),
        plan: user.subscription?.plan || 'Free Trial',
        status: 'Active'
    };

    if (index >= 0) {
        // preserve joinedAt and previous whatsapp if not provided
        memberData.joinedAt = members[index].joinedAt || memberData.joinedAt;
        if (!memberData.whatsapp && members[index].whatsapp) {
            memberData.whatsapp = members[index].whatsapp;
        }
        members[index] = { ...members[index], ...memberData };
    } else {
        members.unshift(memberData);
    }

    saveMemberList(members);
}

export function deleteMemberRecord(email) {
    const members = getMemberList().filter(m => m.email.toLowerCase() !== email.toLowerCase());
    saveMemberList(members);
}

/**
 * WhatsApp & Email Direct Offer Helpers
 */
export function generateWhatsAppOfferUrl(phone, memberName, offerType = 'promo') {
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    else if (!cleanPhone.startsWith('62') && cleanPhone.length > 8) cleanPhone = '62' + cleanPhone;

    let message = '';
    if (offerType === 'promo') {
        message = `Halo Kak ${memberName || ''}, terima kasih sudah menggunakan KawanDigi Creator Studio!\n\nKami ada promo spesial diskon eksklusif untuk aktivasi Akun AI / Lisensi VIP Unlimited hari ini. Apakah Kakak tertarik untuk info lengkapnya? 😊`;
    } else if (offerType === 'tutorial') {
        message = `Halo Kak ${memberName || ''}! Video tutorial terbaru cara merancang storyboard iklan affiliate & Google Flow sudah rilis di KawanDigi Studio. Silakan akses sekarang ya!`;
    } else {
        message = `Halo Kak ${memberName || ''}! Ada yang bisa kami bantu terkait penggunaan tools AI di KawanDigi Creator Studio?`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function generateEmailOfferUrl(email, memberName, offerType = 'promo') {
    let subject = 'Penawaran Spesial KawanDigi Creator Studio';
    let body = `Halo Kak ${memberName || ''},\n\nTerima kasih telah bergabung di KawanDigi Creator Studio.\n\nKami memiliki penawaran eksklusif khusus member untuk meningkatkan produktivitas pembuatan konten AI Anda.\n\nSilakan balas email ini jika ada pertanyaan.\n\nSalam hangat,\nTim KawanDigi`;
    
    if (offerType === 'tutorial') {
        subject = 'Update Panduan & Video Tutorial Baru KawanDigi';
        body = `Halo Kak ${memberName || ''},\n\nTutorial video panduan terbaru sudah dapat Anda tonton di platform KawanDigi.\n\nSelamat berkarya!`;
    }

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Export members to CSV file for Excel / CRM
 */
export function exportMembersToCsv() {
    const members = getMemberList();
    let csv = 'ID,Nama Lengkap,Email,WhatsApp,Paket Langganan,Tanggal Bergabung,Status\n';
    members.forEach(m => {
        csv += `"${m.id}","${m.name}","${m.email}","${m.whatsapp || '-'}","${m.plan}","${m.joinedAt}","${m.status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kawandigi_members_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

/**
 * Admin Access & Security
 */
export function getAdminPin() {
    return localStorage.getItem(STORAGE_ADMIN_PIN) || DEFAULT_ADMIN_PIN;
}

export function setAdminPin(newPin) {
    if (newPin && newPin.trim().length >= 4) {
        localStorage.setItem(STORAGE_ADMIN_PIN, newPin.trim());
        return true;
    }
    return false;
}

export function verifyAdminPin(inputPin) {
    const current = getAdminPin();
    return (inputPin || '').trim() === current;
}

export function getGoogleClientId() {
    return localStorage.getItem(STORAGE_GOOGLE_CLIENT_ID) || '';
}

export function saveGoogleClientId(clientId) {
    localStorage.setItem(STORAGE_GOOGLE_CLIENT_ID, (clientId || '').trim());
}
