/**
 * KawanDigi Creator Studio - Authentication & Member Management
 * Supports Google OAuth (Google Identity Services / GIS), User Dashboard, and Admin Member Management
 * Privacy-friendly: Does NOT store phone numbers or unnecessary personal data.
 */

const STORAGE_USER_KEY = 'kawandigi_user_session';
const STORAGE_MEMBERS_KEY = 'kawandigi_member_records';
const STORAGE_ADMIN_PIN = 'kawandigi_admin_pin';
const STORAGE_GOOGLE_CLIENT_ID = 'kawandigi_google_client_id';

const DEFAULT_ADMIN_PIN = 'kawandigi88';

// Default initial members for demo & leaderboard ranking
const DEFAULT_MEMBERS = [
    {
        id: 'user_101',
        name: 'Rian Pratama',
        email: 'rian.pratama92@gmail.com',
        picture: 'assets/icons/favicon.png',
        joinedAt: '2026-10-25T10:15:00.000Z',
        lastActive: '2026-11-03T14:30:00.000Z',
        plan: 'VIP Master Lifetime',
        totalGenerates: 94,
        xp: 1120,
        level: 'Diamond Creator',
        status: 'Active'
    },
    {
        id: 'user_102',
        name: 'Siti Rahmawati',
        email: 'siti.rahma.creators@gmail.com',
        picture: 'assets/icons/favicon.png',
        joinedAt: '2026-11-01T08:30:00.000Z',
        lastActive: '2026-11-03T15:10:00.000Z',
        plan: 'Pro Creator (Bulanan)',
        totalGenerates: 62,
        xp: 740,
        level: 'Diamond Creator',
        status: 'Active'
    },
    {
        id: 'user_103',
        name: 'Budi Santoso',
        email: 'budi.santoso.affiliate@gmail.com',
        picture: 'assets/icons/favicon.png',
        joinedAt: '2026-11-02T14:20:00.000Z',
        lastActive: '2026-11-03T11:45:00.000Z',
        plan: 'Free Trial',
        totalGenerates: 38,
        xp: 450,
        level: 'Pro Content Master',
        status: 'Active'
    },
    {
        id: 'user_104',
        name: 'Dewi Lestari',
        email: 'dewi.lestari.ugc@gmail.com',
        picture: 'assets/icons/favicon.png',
        joinedAt: '2026-11-02T16:00:00.000Z',
        lastActive: '2026-11-03T09:15:00.000Z',
        plan: 'Free Trial',
        totalGenerates: 21,
        xp: 250,
        level: 'Rising Star',
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
 * Update current user profile fields (e.g. XP, generates)
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
        picture: user.picture || 'assets/icons/favicon.png',
        joinedAt: user.joinedAt || new Date().toISOString(),
        lastActive: new Date().toISOString(),
        plan: user.subscription?.plan || 'Free Trial',
        totalGenerates: user.totalGenerates || 0,
        xp: user.xp || 10,
        level: user.level || 'Novice Creator',
        status: 'Active'
    };

    if (index >= 0) {
        memberData.joinedAt = members[index].joinedAt || memberData.joinedAt;
        memberData.totalGenerates = Math.max(members[index].totalGenerates || 0, memberData.totalGenerates);
        memberData.xp = Math.max(members[index].xp || 0, memberData.xp);
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
 * Direct Email Offer Helper
 */
export function generateEmailOfferUrl(email, memberName, offerType = 'promo') {
    let subject = 'Penawaran Spesial KawanDigi Creator Studio';
    let body = `Halo Kak ${memberName || ''},\n\nTerima kasih telah aktif berkarya di KawanDigi Creator Studio.\n\nKami memiliki penawaran eksklusif khusus member untuk meningkatkan produktivitas pembuatan konten AI Anda.\n\nSilakan balas email ini jika ada pertanyaan.\n\nSalam hangat,\nTim KawanDigi`;
    
    if (offerType === 'tutorial') {
        subject = 'Update Panduan & Video Tutorial Baru KawanDigi';
        body = `Halo Kak ${memberName || ''},\n\nTutorial video panduan terbaru sudah dapat Anda tonton di platform KawanDigi.\n\nSelamat berkarya!`;
    }

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Export members to CSV file for Excel / CRM (Zero phone numbers)
 */
export function exportMembersToCsv() {
    const members = getMemberList();
    let csv = 'ID,Nama Lengkap,Email,Paket Langganan,Total Generate,Skor XP,Level Rank,Tanggal Bergabung,Terakhir Aktif,Status\n';
    members.forEach(m => {
        csv += `"${m.id}","${m.name}","${m.email}","${m.plan}","${m.totalGenerates || 0}","${m.xp || 0}","${m.level || 'Novice'}","${m.joinedAt}","${m.lastActive || '-'}","${m.status}"\n`;
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
