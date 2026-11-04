/**
 * KawanDigi Creator Tools - Gamification & Activity Analytics Manager
 * Tracks Member Productive Habits, XP Points, Leaderboard Ranking, and 24-Hour Peak Usage Analytics
 */

import { getCurrentUser, updateCurrentUserProfile, getMemberList, saveMemberList } from './auth_manager.js';

const STORAGE_LOGS_KEY = 'kawandigi_activity_logs';

export const LEVEL_TIERS = [
    { minXp: 1500, title: 'Mythic Legend', icon: '👑', color: 'from-amber-400 to-yellow-500', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold' },
    { minXp: 701,  title: 'Diamond Creator', icon: '💎', color: 'from-cyan-400 to-blue-500', badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 font-bold' },
    { minXp: 301,  title: 'Pro Content Master', icon: '🥇', color: 'from-emerald-400 to-teal-500', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold' },
    { minXp: 101,  title: 'Rising Star', icon: '🥈', color: 'from-indigo-400 to-purple-500', badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold' },
    { minXp: 0,    title: 'Novice Creator', icon: '🥉', color: 'from-slate-400 to-slate-500', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-bold' }
];

// Default initial activity logs for demo analytics & peak hour preview
const DEFAULT_LOGS = [
    { id: 'act_1', email: 'rian.pratama92@gmail.com', name: 'Rian Pratama', tool: 'UGC Affiliate', detail: 'Kaos Polos Cotton Combed (30s)', timestamp: '2026-11-03T07:15:00.000Z', hourWib: 14, day: 'Selasa', xpEarned: 10 },
    { id: 'act_2', email: 'rian.pratama92@gmail.com', name: 'Rian Pratama', tool: 'Google Flow', detail: 'Export Prompt Veo Scene 1-3', timestamp: '2026-11-03T07:22:00.000Z', hourWib: 14, day: 'Selasa', xpEarned: 5 },
    { id: 'act_3', email: 'siti.rahma.creators@gmail.com', name: 'Siti Rahmawati', tool: 'AI Drama', detail: 'Rahasia Bos Menyamar (Ep. 2)', timestamp: '2026-11-03T08:10:00.000Z', hourWib: 15, day: 'Selasa', xpEarned: 15 },
    { id: 'act_4', email: 'budi.santoso.affiliate@gmail.com', name: 'Budi Santoso', tool: 'UGC Affiliate', detail: 'Serum Wajah Glowing (10s)', timestamp: '2026-11-03T13:40:00.000Z', hourWib: 20, day: 'Selasa', xpEarned: 10 },
    { id: 'act_5', email: 'dewi.lestari.ugc@gmail.com', name: 'Dewi Lestari', tool: 'UGC Affiliate', detail: 'Tote Bag Kanvas Vintage (20s)', timestamp: '2026-11-03T14:05:00.000Z', hourWib: 21, day: 'Selasa', xpEarned: 10 },
    { id: 'act_6', email: 'rian.pratama92@gmail.com', name: 'Rian Pratama', tool: 'AI Drama', detail: 'Cinta Sang Miliarder (Ep. 1)', timestamp: '2026-11-03T14:25:00.000Z', hourWib: 21, day: 'Selasa', xpEarned: 15 }
];

export function calculateLevel(xp) {
    const score = xp || 0;
    for (const tier of LEVEL_TIERS) {
        if (score >= tier.minXp) return tier;
    }
    return LEVEL_TIERS[LEVEL_TIERS.length - 1];
}

export function getActivityLogs() {
    try {
        const raw = localStorage.getItem(STORAGE_LOGS_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(DEFAULT_LOGS));
            return DEFAULT_LOGS;
        }
        return JSON.parse(raw);
    } catch {
        return DEFAULT_LOGS;
    }
}

export function saveActivityLogs(logs) {
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
}

/**
 * Track an activity event (UGC, Drama, Google Flow)
 * Awards XP to user, updates member record, and appends to 24-hour activity log
 */
export function trackActivity(tool, detail, customXp = null) {
    const user = getCurrentUser() || {
        id: 'guest_' + Date.now(),
        name: 'Tamu Kreator',
        email: 'tamu@kawandigi.local',
        picture: 'assets/icons/favicon.png',
        totalGenerates: 0,
        xp: 0
    };

    let xpBonus = customXp;
    if (xpBonus === null) {
        if (tool === 'UGC Affiliate') xpBonus = 10;
        else if (tool === 'AI Drama') xpBonus = 15;
        else if (tool === 'Google Flow') xpBonus = 5;
        else xpBonus = 5;
    }

    const newXp = (user.xp || 0) + xpBonus;
    const newGenerates = (user.totalGenerates || 0) + 1;
    const tier = calculateLevel(newXp);

    // Update user session
    if (user.email && !user.email.endsWith('@kawandigi.local')) {
        updateCurrentUserProfile({
            xp: newXp,
            totalGenerates: newGenerates,
            level: tier.title
        });
    }

    // Determine Indonesian time (WIB = UTC+7)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const hourWib = (utcHours + 7) % 24;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayWib = days[now.getUTCDay()];

    const logEntry = {
        id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        email: user.email,
        name: user.name,
        tool: tool,
        detail: detail,
        timestamp: now.toISOString(),
        hourWib: hourWib,
        day: dayWib,
        xpEarned: xpBonus
    };

    const logs = getActivityLogs();
    logs.unshift(logEntry);
    if (logs.length > 500) logs.pop(); // keep last 500 entries locally
    saveActivityLogs(logs);

    // Also update member list
    const members = getMemberList();
    const mIndex = members.findIndex(m => m.email.toLowerCase() === user.email.toLowerCase());
    if (mIndex >= 0) {
        members[mIndex].totalGenerates = (members[mIndex].totalGenerates || 0) + 1;
        members[mIndex].xp = (members[mIndex].xp || 0) + xpBonus;
        members[mIndex].level = tier.title;
        members[mIndex].lastActive = now.toISOString();
        saveMemberList(members);
    }

    // Proactively send activity track to Cloudflare D1
    if (user.email && !user.email.endsWith('@kawandigi.local')) {
        fetch('/api/activity/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email,
                name: user.name || 'Member',
                tool: tool,
                detail: detail || '',
                xp: xpBonus
            })
        }).catch(err => console.warn('[KawanDigi] Gagal kirim activity track ke server:', err));
    }

    return { xpEarned: xpBonus, newXp, tier };
}

/**
 * Get Leaderboard Ranking
 */
export function getLeaderboard(period = 'all') {
    const members = getMemberList();
    // Sort descending by XP
    const sorted = [...members].sort((a, b) => (b.xp || 0) - (a.xp || 0));

    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3, 50);

    const currentUser = getCurrentUser();
    let myRank = null;
    if (currentUser && currentUser.email) {
        const index = sorted.findIndex(m => m.email.toLowerCase() === currentUser.email.toLowerCase());
        if (index >= 0) {
            myRank = {
                position: index + 1,
                member: sorted[index],
                tier: calculateLevel(sorted[index].xp || 0)
            };
        }
    }

    return { top3, rest, myRank, totalParticipants: sorted.length };
}

/**
 * Get 24-Hour Usage Distribution for Admin Analytics
 * Returns an array of 24 objects: [{ hour: 0, count: 5, label: '00:00' }, ...]
 */
export function getActivityHourlyDistribution() {
    const logs = getActivityLogs();
    const distribution = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: (i < 10 ? '0' + i : '' + i) + ':00',
        count: 0
    }));

    logs.forEach(log => {
        const h = typeof log.hourWib === 'number' ? log.hourWib : new Date(log.timestamp).getHours();
        if (h >= 0 && h < 24) {
            distribution[h].count += 1;
        }
    });

    // Find peak hours
    const sortedByCount = [...distribution].sort((a, b) => b.count - a.count);
    const topPeak = sortedByCount[0] || { hour: 20, count: 0, label: '20:00' };
    const secondPeak = sortedByCount[1] || { hour: 14, count: 0, label: '14:00' };

    let peakSummary = '20:00 - 22:00 WIB';
    if (topPeak.count > 0) {
        const h1 = topPeak.hour;
        const h2 = (h1 + 2) % 24;
        peakSummary = `${topPeak.label} - ${(h2 < 10 ? '0' + h2 : h2)}:00 WIB (${topPeak.count} aktivitas)`;
    }

    return {
        distribution,
        peakSummary,
        topPeak,
        secondPeak,
        totalLogs: logs.length
    };
}
