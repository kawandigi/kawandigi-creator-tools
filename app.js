/**
 * KawanDigi Creator Studio - Main Application Controller
 * Handles Navigation, State, Event Listeners, and Dynamic UI Rendering
 */

import { 
    AI_PROVIDERS, 
    getActiveProvider, 
    setActiveProvider, 
    getSavedApiKey, 
    saveApiKey, 
    getSelectedModel, 
    saveSelectedModel, 
    getCustomBaseUrl, 
    saveCustomBaseUrl, 
    getCustomModel, 
    saveCustomModel, 
    generateImagen3, 
    generateOmniVideo 
} from './modules/gemini_api.js';
import { hasToolAccess, activateLicenseKey, getLicenses, getTrialUsage, resetTrialUsage, FREE_TRIAL_LIMIT } from './modules/license_manager.js';
import { extractProductDetails, extractDetailsFromImage, extractDetailsFromMultipleImages, generateUgcCampaign } from './modules/ugc_creator.js';
import { generateDramaEpisode } from './modules/drama_creator.js';
import { renderInAppSceneVideo } from './modules/video_renderer.js';
import { 
    getHistory, 
    saveProjectToHistory, 
    getHistoryById, 
    getLastActiveProjectId, 
    setLastActiveProjectId, 
    deleteHistoryItem, 
    clearAllHistory, 
    exportHistoryJson, 
    formatRelativeTime 
} from './modules/history_manager.js';
import {
    decodeJwtResponse,
    getCurrentUser,
    saveCurrentUser,
    updateCurrentUserProfile,
    logoutUser,
    getMemberList,
    upsertMemberRecord,
    deleteMemberRecord,
    generateEmailOfferUrl,
    exportMembersToCsv,
    getAdminPin,
    setAdminPin,
    verifyAdminPin,
    getGoogleClientId,
    saveGoogleClientId,
    fetchGoogleClientIdFromServer,
    saveGoogleClientIdToServer,
    getAdminEmail,
    saveAdminEmail
} from './modules/auth_manager.js';
import {
    getFeatureFlags,
    toggleToolStatus,
    isToolEnabled,
    getDigitalProducts,
    upsertDigitalProduct,
    deleteDigitalProduct,
    formatRupiah,
    generateProductWaLink,
    getTutorialVideos,
    upsertTutorialVideo,
    deleteTutorialVideo
} from './modules/catalog_manager.js';
import {
    trackActivity,
    getLeaderboard,
    getActivityHourlyDistribution,
    getActivityLogs,
    calculateLevel
} from './modules/gamification_manager.js';

// Global State
// Super Admin Email Whitelist (Access Control)
const SUPER_ADMIN_EMAIL = 'admin.kawandigi@gmail.com';

function isSuperAdmin(user) {
    if (!user || !user.email) return false;
    const adminEmail = (typeof getAdminEmail === 'function' ? getAdminEmail() : SUPER_ADMIN_EMAIL).toLowerCase().trim();
    return user.email.toLowerCase().trim() === adminEmail;
}

let selectedUgcDuration = 10; // 10s Utama, 20s (2 Klip), 30s (3 Klip)
let selectedDramaScenes = 3;  // 3 scenes (30s) or 6 scenes (60s)
let currentUgcCampaign = null;
let currentDramaEpisode = null;
let uploadedScreenshots = []; // Array of reference images: [{ id, base64, mimeType, name, previewUrl }]

// =========================================================================
// TOAST NOTIFICATION UTILITY
// =========================================================================
function showToast(message, type = 'info') {
    const existing = document.querySelectorAll('.kd-toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `kd-toast kd-toast-${type} fade-in`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Copy text to clipboard helper
async function copyToClipboard(text, successMessage = 'Teks berhasil disalin!') {
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, 'success');
    } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(successMessage, 'success');
    }
}

// Built-in Browser Voiceover Audio Player (TTS - Web Speech API, Rp 0)
function speakVoiceover(text) {
    if (!('speechSynthesis' in window)) {
        showToast('Browser Anda belum mendukung pemutar suara web.', 'error');
        return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
    showToast('Memutar suara narasi voiceover...', 'info');
}

// Modal Video Tier Handler
function openVideoTierModal(promptToCopy) {
    const modal = document.getElementById('modal-video-tier');
    const btnAction = document.getElementById('btn-flow-direct-action');
    if (!modal) return;

    modal.classList.remove('hidden');

    if (promptToCopy) {
        copyToClipboard(promptToCopy, 'Prompt scene telah disalin ke clipboard!');
    }

    if (btnAction) {
        btnAction.onclick = () => {
            if (promptToCopy) {
                copyToClipboard(promptToCopy, 'Prompt disalin! Silakan paste di Google Flow');
            }
            window.open('https://aitestkitchen.withgoogle.com/tools/video-fx', '_blank');
        };
    }
}

function initVideoTierModal() {
    const modal = document.getElementById('modal-video-tier');
    const btnClose = document.getElementById('btn-close-video-modal');
    btnClose?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

// =========================================================================
// TAB NAVIGATION SYSTEM
// =========================================================================
function switchTab(tabId) {
    // Sidebar Nav Tabs (Desktop & Drawer)
    const sidebarTabs = {
        'catalog': document.getElementById('sidebar-tab-catalog'),
        'ugc': document.getElementById('sidebar-tab-ugc'),
        'flow': document.getElementById('sidebar-tab-flow'),
        'drama': document.getElementById('sidebar-tab-drama'),
        'leaderboard': document.getElementById('sidebar-tab-leaderboard'),
        'tutorial': document.getElementById('sidebar-tab-tutorial'),
        'license': document.getElementById('sidebar-tab-license'),
        'admin': document.getElementById('drawer-admin-btn')
    };

    // Desktop Nav (if exists)
    const desktopTabs = {
        'catalog': document.getElementById('nav-catalog'),
        'leaderboard': document.getElementById('nav-leaderboard'),
        'ugc': document.getElementById('nav-ugc'),
        'flow': document.getElementById('nav-flow'),
        'drama': document.getElementById('nav-drama'),
        'tutorial': document.getElementById('nav-tutorial'),
        'license': document.getElementById('nav-license'),
        'admin': document.getElementById('nav-admin')
    };

    // Mobile Bottom Dock Nav
    const mobileTabs = {
        'catalog': document.getElementById('m-nav-catalog'),
        'leaderboard': document.getElementById('m-nav-leaderboard'),
        'ugc': document.getElementById('m-nav-ugc'),
        'flow': document.getElementById('m-nav-flow'),
        'drama': document.getElementById('m-nav-drama'),
        'tutorial': document.getElementById('m-nav-tutorial'),
        'license': document.getElementById('m-nav-license')
    };

    // Sections
    const sections = {
        'catalog': document.getElementById('section-catalog'),
        'leaderboard': document.getElementById('section-leaderboard'),
        'ugc': document.getElementById('section-ugc'),
        'flow': document.getElementById('section-flow'),
        'drama': document.getElementById('section-drama'),
        'tutorial': document.getElementById('section-tutorial'),
        'license': document.getElementById('section-license'),
        'admin': document.getElementById('section-admin')
    };

    // Feature Flag protection
    if (tabId === 'ugc' && !isToolEnabled('ugc')) {
        showToast('Tool AI UGC Affiliate sedang dalam pemeliharaan/dinonaktifkan oleh Admin.', 'warning');
        return;
    }
    if (tabId === 'drama' && !isToolEnabled('drama')) {
        showToast('Tool AI Drama Series sedang dalam pemeliharaan/dinonaktifkan oleh Admin.', 'warning');
        return;
    }
    if (tabId === 'flow' && !isToolEnabled('flow')) {
        showToast('Studio Google Flow sedang dalam pemeliharaan/dinonaktifkan oleh Admin.', 'warning');
        return;
    }

    Object.keys(sections).forEach(id => {
        if (!sections[id]) return;
        if (id === tabId) {
            sections[id].classList.remove('hidden');
            desktopTabs[id]?.classList.add('active');
            mobileTabs[id]?.classList.add('active');
            mobileTabs[id]?.classList.replace('text-slate-400', 'text-brand-400');

            if (sidebarTabs[id]) {
                sidebarTabs[id].classList.add('bg-brand-600', 'text-white', 'font-bold', 'shadow-md', 'shadow-brand-500/25');
                sidebarTabs[id].classList.remove('text-slate-300', 'hover:bg-slate-800');
            }
        } else {
            sections[id].classList.add('hidden');
            desktopTabs[id]?.classList.remove('active');
            mobileTabs[id]?.classList.remove('active');
            mobileTabs[id]?.classList.replace('text-brand-400', 'text-slate-400');

            if (sidebarTabs[id]) {
                sidebarTabs[id].classList.remove('bg-brand-600', 'text-white', 'font-bold', 'shadow-md', 'shadow-brand-500/25');
                sidebarTabs[id].classList.add('text-slate-300', 'hover:bg-slate-800');
            }
        }
    });

    // Update Desktop Breadcrumb Title
    const breadcrumb = document.getElementById('desktop-breadcrumb-title');
    const tabTitles = {
        'catalog': 'Overview & Beranda',
        'ugc': 'AI UGC Affiliate Video Creator',
        'flow': 'Google Flow Studio',
        'drama': 'AI Drama & Micro-Series',
        'leaderboard': 'Peringkat & Gamifikasi',
        'tutorial': 'Tutorial & Panduan Video',
        'admin': 'Console Admin KawanDigi',
        'license': 'Paket Langganan & Lisensi'
    };
    if (breadcrumb && tabTitles[tabId]) {
        breadcrumb.textContent = tabTitles[tabId];
    }

    if (tabId === 'catalog') {
        renderCatalog();
    } else if (tabId === 'leaderboard') {
        renderLeaderboard();
    } else if (tabId === 'tutorial') {
        renderTutorials();
    } else if (tabId === 'admin') {
        const currentUser = getCurrentUser();
        if (!isSuperAdmin(currentUser)) {
            showToast('Akses Ditolak: Hanya Superadmin (admin.kawandigi@gmail.com) yang dapat mengakses Console Admin.', 'error');
            switchTab('catalog');
            return;
        }
        renderAdminMembers();
        renderAdminAnalytics();
        renderAdminFlags();
        renderAdminProducts();
        renderAdminTutorials();
        loadAdminSettings();
    }

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.lucide) window.lucide.createIcons();
}

function openGoogleFlowPopup() {
    const screenWidth = window.screen.availWidth || window.screen.width || 1280;
    const screenHeight = window.screen.availHeight || window.screen.height || 800;
    const width = Math.min(1050, Math.round(screenWidth * 0.55));
    const height = screenHeight - 60;
    const left = screenWidth - width;
    const top = 30;

    window.open(
        'https://aitestkitchen.withgoogle.com/tools/video-fx',
        'GoogleFlowStudio',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,resizable=yes,scrollbars=yes`
    );
    showToast('Membuka Google Flow di samping layar...', 'info');
}

// =========================================================================
// SLIDING SIDEBAR DRAWER (REFERENCE: AMBILTIKETNYA.ONLINE)
// =========================================================================
function openDrawer() {
    if (window.innerWidth >= 1024) return;
    const drawer = document.getElementById('sidebar-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer || !backdrop) return;
    backdrop.classList.remove('hidden');
    void backdrop.offsetWidth; // Force reflow
    backdrop.classList.add('opacity-100');
    drawer.classList.remove('-translate-x-full');
    drawer.classList.add('translate-x-0');
}

function closeDrawer() {
    if (window.innerWidth >= 1024) return;
    const drawer = document.getElementById('sidebar-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer || !backdrop) return;
    drawer.classList.remove('translate-x-0');
    drawer.classList.add('-translate-x-full');
    backdrop.classList.remove('opacity-100');
    setTimeout(() => {
        backdrop.classList.add('hidden');
    }, 300);
}

function initNavigation() {
    // Desktop Nav buttons
    document.getElementById('nav-catalog')?.addEventListener('click', () => switchTab('catalog'));
    document.getElementById('nav-leaderboard')?.addEventListener('click', () => switchTab('leaderboard'));
    document.getElementById('m-nav-leaderboard')?.addEventListener('click', () => switchTab('leaderboard'));
    document.getElementById('nav-ugc')?.addEventListener('click', () => switchTab('ugc'));
    document.getElementById('nav-flow')?.addEventListener('click', () => switchTab('flow'));
    document.getElementById('nav-drama')?.addEventListener('click', () => switchTab('drama'));
    document.getElementById('nav-tutorial')?.addEventListener('click', () => switchTab('tutorial'));
    document.getElementById('nav-license')?.addEventListener('click', () => switchTab('license'));
    document.getElementById('nav-admin')?.addEventListener('click', () => window.kdOpenAdminConsole());

    // Mobile Nav buttons
    document.getElementById('m-nav-catalog')?.addEventListener('click', () => switchTab('catalog'));
    document.getElementById('m-nav-ugc')?.addEventListener('click', () => switchTab('ugc'));
    document.getElementById('m-nav-flow')?.addEventListener('click', () => switchTab('flow'));
    document.getElementById('m-nav-drama')?.addEventListener('click', () => switchTab('drama'));
    document.getElementById('m-nav-tutorial')?.addEventListener('click', () => switchTab('tutorial'));
    document.getElementById('m-nav-license')?.addEventListener('click', () => switchTab('license'));

    // Studio Google Flow side-by-side popup buttons
    document.getElementById('btn-open-flow-popup')?.addEventListener('click', openGoogleFlowPopup);
    document.getElementById('btn-flow-hero-popup')?.addEventListener('click', openGoogleFlowPopup);

    // Brand logo returns to Catalog view
    document.getElementById('btn-brand-home')?.addEventListener('click', () => switchTab('catalog'));
    
    // Sliding Drawer Event Listeners
    document.getElementById('btn-open-drawer')?.addEventListener('click', openDrawer);
    document.getElementById('btn-close-drawer')?.addEventListener('click', closeDrawer);
    document.getElementById('drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.getElementById('drawer-btn-api-key')?.addEventListener('click', () => {
        closeDrawer();
        document.getElementById('btn-api-key-modal')?.click();
    });
    document.getElementById('drawer-theme-toggle')?.addEventListener('click', () => {
        document.getElementById('btn-theme-toggle')?.click();
    });

    // Default view: Catalog
    switchTab('catalog');
}

/**
 * Populate prompts into Studio Google Flow Drawer (Left Panel)
 */
function populateGoogleFlowStudio(campaign) {
    const listContainer = document.getElementById('flow-prompt-list');
    const badge = document.getElementById('flow-prompt-badge');
    const emptyState = document.getElementById('flow-empty-prompts');
    if (!listContainer) return;

    if (!campaign || (!campaign.scenes && !campaign.parts)) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (badge) badge.textContent = '0 Adegan';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    listContainer.innerHTML = '';

    const dur = campaign.duration_seconds || campaign.video_duration || selectedUgcDuration || 10;
    const sceneCount = campaign.scenes?.length || 6;
    if (badge) {
        badge.textContent = `${dur} Detik • ${sceneCount} Adegan`;
    }

    // 1. If multi-part (e.g. 20s or 30s) or single-part (10s), render Klip 10s cards first
    if (Array.isArray(campaign.parts) && campaign.parts.length > 0) {
        const partsSection = document.createElement('div');
        partsSection.className = 'space-y-3 pb-3 border-b border-slate-800';
        const isMulti = campaign.parts.length > 1;

        partsSection.innerHTML = `
            <div class="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span class="flex items-center gap-1.5">
                    <i data-lucide="${isMulti ? 'scissors' : 'sparkles'}" class="w-3.5 h-3.5"></i>
                    ${isMulti ? `Klip Video 10 Detik (${campaign.parts.length} Klip):` : 'Prompt Video Utuh (10 Detik Siap Tempel):'}
                </span>
                <span class="text-[10px] text-slate-400 font-normal">
                    ${isMulti ? 'Render per klip 10s lalu gabungkan' : 'Langsung tempel di studio'}
                </span>
            </div>
        `;

        campaign.parts.forEach(part => {
            const card = document.createElement('div');
            card.className = 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/50 rounded-xl p-3.5 space-y-2.5 shadow-md';
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                            ${isMulti ? `KLIP ${part.part_number} (10s)` : 'PROMPT 10s UTUH'}
                        </span>
                        <span class="text-xs font-bold text-white">${part.part_title || part.title || (isMulti ? `Bagian ${part.part_number}` : 'Video UGC Siap Pakai')}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-medium">${part.scenes_included || '6 Tahapan UGC'}</span>
                </div>

                ${part.narasi_part ? `
                <div class="bg-amber-950/20 border border-amber-500/20 rounded-lg p-2 flex items-center justify-between gap-2">
                    <p class="text-[11px] text-amber-200 italic leading-relaxed">"${part.narasi_part}"</p>
                    <button class="btn-play-vo flex-shrink-0 text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
                        <i data-lucide="volume-2" class="w-3 h-3"></i> Putar
                    </button>
                </div>
                ` : ''}

                <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 space-y-2">
                    <label class="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Prompt Video AI (Google Flow / Veo):</label>
                    <p class="text-[11px] text-slate-300 font-mono leading-relaxed select-all">${part.google_flow_prompt}</p>
                    <button class="btn-copy-flow-clip w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Salin Prompt ${isMulti ? `Klip ${part.part_number}` : '10s Siap Tempel'}
                    </button>
                </div>
            `;

            card.querySelector('.btn-play-vo')?.addEventListener('click', () => {
                if (part.narasi_part) speakVoiceover(part.narasi_part);
            });

            card.querySelector('.btn-copy-flow-clip')?.addEventListener('click', () => {
                copyToClipboard(part.google_flow_prompt, `Prompt ${isMulti ? `Klip ${part.part_number}` : '10s'} berhasil disalin! Silakan tempel (Ctrl+V) di Google Flow.`);
            });

            partsSection.appendChild(card);
        });

        listContainer.appendChild(partsSection);
    }

    // 2. Render Scene Prompts
    const scenesHeader = document.createElement('div');
    scenesHeader.className = 'pt-1 flex items-center justify-between text-xs font-bold text-slate-300';
    scenesHeader.innerHTML = `
        <span class="flex items-center gap-1.5"><i data-lucide="film" class="w-3.5 h-3.5 text-brand-400"></i> Rincian Prompt Tiap Adegan:</span>
        <button id="btn-flow-copy-all" class="text-[10px] text-brand-400 hover:text-brand-300 underline font-semibold">Salin Seluruh Naskah</button>
    `;
    listContainer.appendChild(scenesHeader);

    scenesHeader.querySelector('#btn-flow-copy-all')?.addEventListener('click', () => {
        const allText = formatFullPromptVideoText(campaign);
        copyToClipboard(allText, 'Seluruh prompt dan storyboard disalin!');
    });

    const scenes = campaign.scenes || [];
    scenes.forEach((scene, idx) => {
        const item = document.createElement('div');
        item.className = 'bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3 space-y-2 transition';
        item.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-md bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center border border-brand-500/30">
                        ${scene.scene_number || (idx + 1)}
                    </span>
                    <h5 class="text-xs font-bold text-white uppercase">${scene.scene_title || `Scene ${idx + 1}`}</h5>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${scene.time_range || `${scene.duration_seconds || 1.5}s`}</span>
            </div>

            <p class="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">${scene.visual_description || '-'}</p>

            ${scene.voiceover_script ? `
            <div class="flex items-center justify-between bg-amber-950/20 border border-amber-500/20 rounded-lg px-2.5 py-1.5 text-[11px]">
                <span class="text-amber-200 italic line-clamp-2">"${scene.voiceover_script}"</span>
                <button class="btn-play-vo-sc flex-shrink-0 text-amber-400 hover:text-amber-300 text-[10px] font-bold ml-2">
                    <i data-lucide="volume-2" class="w-3 h-3"></i>
                </button>
            </div>
            ` : ''}

            <div class="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
                <p class="text-[10px] text-slate-400 font-mono leading-relaxed line-clamp-3 select-all">${scene.google_flow_prompt}</p>
                <div class="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span class="text-[9px] text-emerald-400 font-medium">Prompt Siap Tempel</span>
                    <button class="btn-copy-sc-prompt px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition">
                        <i data-lucide="copy" class="w-3 h-3"></i> Salin Prompt
                    </button>
                </div>
            </div>
        `;

        item.querySelector('.btn-play-vo-sc')?.addEventListener('click', () => {
            if (scene.voiceover_script) speakVoiceover(scene.voiceover_script);
        });

        item.querySelector('.btn-copy-sc-prompt')?.addEventListener('click', () => {
            copyToClipboard(scene.google_flow_prompt, `Prompt Adegan ${scene.scene_number || (idx + 1)} disalin! Silakan paste di Google Flow.`);
        });

        listContainer.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
}

// =========================================================================
// API KEY MODAL & BYOK CONTROLLER
// =========================================================================
function updateApiStatusIndicator() {
    const key = getSavedApiKey();
    const statusText = document.getElementById('api-status-text');
    if (!statusText) return;

    const providerId = getActiveProvider();
    const providerInfo = AI_PROVIDERS[providerId] || AI_PROVIDERS.gemini;

    if (key || providerId === 'custom') {
        statusText.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 animate-pulse"></span><span class="hidden sm:inline">${providerInfo.badge}: </span><span>Aktif</span>`;
        statusText.classList.remove('text-amber-400');
        statusText.classList.add('text-emerald-400');
    } else {
        statusText.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span><span class="hidden sm:inline">${providerInfo.badge}: Belum Ada Key</span><span class="sm:hidden">Set API</span>`;
        statusText.classList.remove('text-emerald-400');
        statusText.classList.add('text-amber-400');
    }
}

function syncModalProviderUI(providerId) {
    const provider = AI_PROVIDERS[providerId] || AI_PROVIDERS.gemini;
    const descEl = document.getElementById('provider-desc');
    const linkEl = document.getElementById('provider-link');
    const linkText = document.getElementById('provider-link-text');
    const modelContainer = document.getElementById('container-model-select');
    const modelSelect = document.getElementById('select-ai-model');
    const customContainer = document.getElementById('container-custom-fields');
    const inputKey = document.getElementById('input-api-key');
    const labelKey = document.getElementById('label-api-key');

    // 1. Desc & link
    if (descEl) descEl.textContent = provider.tagline;
    if (linkEl && linkText) {
        if (provider.keyUrl) {
            linkEl.href = provider.keyUrl;
            linkText.textContent = provider.keyUrlLabel || 'Ambil Kunci API';
            linkEl.classList.remove('hidden');
        } else {
            linkEl.classList.add('hidden');
        }
    }

    // 2. Populate models
    if (modelSelect) {
        modelSelect.innerHTML = '';
        if (provider.models && provider.models.length > 0) {
            provider.models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name;
                modelSelect.appendChild(opt);
            });
            const currentSelected = getSelectedModel(providerId);
            modelSelect.value = currentSelected || provider.defaultModel || provider.models[0].id;
            modelContainer?.classList.remove('hidden');
        } else {
            modelContainer?.classList.add('hidden');
        }
    }

    // 3. Custom fields (show only for 'custom')
    if (customContainer) {
        if (providerId === 'custom') {
            customContainer.classList.remove('hidden');
            const urlInput = document.getElementById('input-custom-url');
            const modelInput = document.getElementById('input-custom-model');
            if (urlInput) urlInput.value = getCustomBaseUrl();
            if (modelInput) modelInput.value = getCustomModel();
        } else {
            customContainer.classList.add('hidden');
        }
    }

    // 4. Input key
    if (inputKey) {
        inputKey.placeholder = provider.keyPlaceholder || 'Masukkan API Key...';
        inputKey.value = getSavedApiKey(providerId);
    }
    if (labelKey) {
        labelKey.textContent = `API Key ${provider.name}:`;
    }
}

function openApiKeyModal() {
    const modal = document.getElementById('modal-api-key');
    const providerSelect = document.getElementById('select-ai-provider');
    if (modal) {
        const currentProvider = getActiveProvider();
        if (providerSelect) providerSelect.value = currentProvider;
        syncModalProviderUI(currentProvider);
        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }
}

function closeApiKeyModal() {
    const modal = document.getElementById('modal-api-key');
    if (modal) modal.classList.add('hidden');
}

function initApiKeyModal() {
    const btnOpen = document.getElementById('btn-api-key-modal');
    const btnClose = document.getElementById('btn-close-api-modal');
    const btnSave = document.getElementById('btn-save-api-key');
    const btnClear = document.getElementById('btn-clear-api-key');
    const providerSelect = document.getElementById('select-ai-provider');
    const modelSelect = document.getElementById('select-ai-model');
    const inputKey = document.getElementById('input-api-key');
    const btnToggleVis = document.getElementById('btn-toggle-key-visibility');

    btnOpen?.addEventListener('click', openApiKeyModal);
    btnClose?.addEventListener('click', closeApiKeyModal);

    // Switch provider in modal
    providerSelect?.addEventListener('change', () => {
        syncModalProviderUI(providerSelect.value);
    });

    // Toggle key visibility
    btnToggleVis?.addEventListener('click', () => {
        if (!inputKey) return;
        const isPassword = inputKey.type === 'password';
        inputKey.type = isPassword ? 'text' : 'password';
        btnToggleVis.innerHTML = isPassword 
            ? '<i data-lucide="eye-off" class="w-4 h-4"></i>'
            : '<i data-lucide="eye" class="w-4 h-4"></i>';
        if (window.lucide) window.lucide.createIcons();
    });

    // Save button
    btnSave?.addEventListener('click', () => {
        const selectedProvider = providerSelect?.value || 'gemini';
        const keyVal = inputKey ? inputKey.value.trim() : '';

        if (!keyVal && selectedProvider !== 'custom') {
            const pName = AI_PROVIDERS[selectedProvider]?.name || selectedProvider;
            showToast(`Masukkan API Key ${pName} Anda.`, 'error');
            return;
        }

        setActiveProvider(selectedProvider);
        saveApiKey(keyVal, selectedProvider);

        if (modelSelect && modelSelect.value) {
            saveSelectedModel(modelSelect.value, selectedProvider);
        }

        if (selectedProvider === 'custom') {
            const urlInput = document.getElementById('input-custom-url');
            const modelInput = document.getElementById('input-custom-model');
            if (urlInput) saveCustomBaseUrl(urlInput.value.trim());
            if (modelInput) saveCustomModel(modelInput.value.trim());
        }

        updateApiStatusIndicator();
        closeApiKeyModal();
        const pName = AI_PROVIDERS[selectedProvider]?.name || selectedProvider;
        showToast(`Provider AI ${pName} berhasil diatur & disimpan!`, 'success');
    });

    // Clear key button
    btnClear?.addEventListener('click', () => {
        const selectedProvider = providerSelect?.value || 'gemini';
        saveApiKey('', selectedProvider);
        if (inputKey) inputKey.value = '';
        updateApiStatusIndicator();
        showToast(`API Key ${AI_PROVIDERS[selectedProvider]?.name || selectedProvider} telah dihapus.`, 'info');
    });

    updateApiStatusIndicator();
}

// =========================================================================
// PRESET DEMO DATA (FOR EASY TESTING & FAST EXPERIMENTATION)
// =========================================================================
let currentUgcPresetIndex = 0;
const UGC_PRESETS = [
    {
        name: 'Glow Serum 10x Niacinamide & Alpha Arbutin',
        url: 'https://shopee.co.id/example-glow-serum-viral',
        category: '💄 Skincare & Kecantikan',
        tone: 'Casual & Ceria (Gen Z)',
        duration: 30,
        selling: 'Beli 1 Gratis 1 promo gajian, memudarkan flek hitam & bekas jerawat dalam 7 hari, bersertifikat BPOM & Halal, tekstur watery cepat meresap.'
    },
    {
        name: 'TWS Bass ANC Wireless Earbuds Pro',
        url: 'https://vt.tiktok.com/example-tws-earbuds',
        category: '📱 Gadget & Elektronik',
        tone: 'FOMO & Urgensi Diskon',
        duration: 30,
        selling: 'Flash sale diskon 65% sisa 20 unit terakhir, baterai tahan 36 jam, audio Bass Booster surround, anti air IPX5 cocok buat olahraga.'
    },
    {
        name: 'Loose Korean Oversized Knit Cardigan',
        url: 'https://shopee.co.id/example-knit-cardigan',
        category: '👗 Fashion & OOTD',
        tone: 'Elegan & Mewah',
        duration: 20,
        selling: 'Bahan rajut katun import premium anti gerah, potongan drop shoulder bikin postur ramping, tersedia 5 warna pastel estetik.'
    }
];

let currentDramaPresetIndex = 0;
const DRAMA_PRESETS = [
    {
        title: 'Rahasia Bos Menyamar',
        episode: 1,
        genre: '👑 CEO Konglomerat Menyamar',
        premise: 'Adrian sengaja menyamar menjadi OB di kantor cabangnya sendiri untuk menyelidiki korupsi. Namun, manager arogan Pak Hendra menyiramkan kopi ke seragam Adrian dan memfitnahnya mencuri dokumen proyek 100 Miliar.',
        heroName: 'Adrian (27 thn)',
        heroDesc: 'Pria Asia 27 tahun, wajah tampan berkarisma, rambut hitam belah samping rapi, mengenakan seragam OB abu-abu sederhana, tatapan tajam penuh wibawa tersembunyi.',
        villainName: 'Pak Hendra (45 thn)',
        villainDesc: 'Pria 45 tahun, berbadan tambun, mengenakan setelan jas abu-abu mengilap yang terlalu ketat, jam tangan emas mencolok, senyum sinis merendahkan.',
        scenes: 3
    },
    {
        title: 'Kembalinya Menantu Naga',
        episode: 1,
        genre: '⚔️ Balas Dendam Menantu / Underdog',
        premise: 'Selama 3 tahun, Arya dihina sebagai benalu miskin oleh mertua konglomerat. Saat perayaan ulang tahun Nenek, Arya diusir dan dipermalukan di depan semua tamu undangan, tepat sebelum iring-iringan 10 mobil Rolls-Royce tiba menjemput Arya sebagai pewaris Grup Dragon Corp.',
        heroName: 'Arya (28 thn)',
        heroDesc: 'Pria muda 28 tahun, berkaus oblong putih polos dan celana jeans pudar, tubuh tegap atletis, wajah tenang tanpa amarah namun aura kepemimpinan luar biasa.',
        villainName: 'Ibu Sandra (50 thn)',
        villainDesc: 'Wanita paruh baya 50 tahun sosialita, bergaun merah mewah dengan kalung berlian mencolok, riasan tebal angkuh, tatapan mata memandang rendah.',
        scenes: 3
    },
    {
        title: 'Cinta Diam-Diam Pak Direktur',
        episode: 1,
        genre: '💖 Romansa Kantor & Cinta Segitiga',
        premise: 'Clarissa, anak magang yang ceroboh tapi pekerja keras, terjebak di lift kantor yang macet bersama Gavin, Direktur Utama yang terkenal sangat dingin dan benci disentuh. Namun di tengah kegelapan, Gavin justru panik karena claustrophobia dan memeluk Clarissa.',
        heroName: 'Clarissa (22 thn)',
        heroDesc: 'Gadis muda 22 tahun manis berambut sebahu diikat rapi, kemeja putih kasual dan rok span hitam, tas selempang canvas, kacamata bulat frame tipis.',
        villainName: 'Gavin (29 thn)',
        villainDesc: 'Pria dingin 29 tahun, berpostur tinggi atletis, setelan jas hitam tailor-made rapi tanpa cela, tatapan dingin berwajah stoic namun mulai memperlihatkan kerapuhan emosional.',
        scenes: 3
    }
];

function setUgcDuration(dur) {
    selectedUgcDuration = dur;
    const durationButtons = document.querySelectorAll('.btn-duration');
    const durationLabel = document.getElementById('ugc-duration-label');
    durationButtons.forEach(btn => {
        if (parseInt(btn.dataset.duration, 10) === dur) {
            btn.classList.add('active', 'bg-brand-500/20', 'border-brand-500', 'text-brand-300');
            btn.classList.remove('bg-slate-950', 'border-slate-800', 'text-slate-300');
        } else {
            btn.classList.remove('active', 'bg-brand-500/20', 'border-brand-500', 'text-brand-300');
            btn.classList.add('bg-slate-950', 'border-slate-800', 'text-slate-300');
        }
    });
    const labelMap = { 
        10: '10 Detik (1 Klip — Utama)', 
        20: '20 Detik (2 Klip @ 10s)', 
        30: '30 Detik (3 Klip @ 10s)' 
    };
    if (durationLabel) {
        durationLabel.textContent = labelMap[dur] || `${dur} Detik`;
    }
}

function setDramaScenes(scenes) {
    selectedDramaScenes = scenes;
    const durationButtons = document.querySelectorAll('.btn-drama-duration');
    durationButtons.forEach(btn => {
        if (parseInt(btn.dataset.dramaScenes, 10) === scenes) {
            btn.classList.add('active', 'bg-accent-500/20', 'border-accent-500', 'text-accent-300');
            btn.classList.remove('bg-slate-950', 'border-slate-800', 'text-slate-300');
        } else {
            btn.classList.remove('active', 'bg-accent-500/20', 'border-accent-500', 'text-accent-300');
            btn.classList.add('bg-slate-950', 'border-slate-800', 'text-slate-300');
        }
    });
}

// =========================================================================
// UGC AFFILIATE CREATOR CONTROLLER
// =========================================================================
// Helper: Formatter Prompt Video Lengkap (Sesuai Standar Kawan Digital Skill v2.0)
function formatFullPromptVideoText(campaign) {
    if (!campaign) return '';
    const analysis = campaign.product_analysis || {};
    const title = analysis.product_name || document.getElementById('ugc-name')?.value || 'Produk Pilihan';
    const dur = campaign.duration_seconds || campaign.video_duration || selectedUgcDuration || 10;
    
    let text = `==========================================================\n`;
    text += `PROMPT VIDEO UGC AFFILIATE LENGKAP — ${title.toUpperCase()}\n`;
    text += `Durasi Total: ${dur} Detik | Rasio: 9:16 Vertikal | Kualitas: FHD 1080p, 30fps\n`;
    text += `Formula: 6 Tahapan UGC (Hook, Problem, Pengenalan, Demonstrasi, Review, CTA)\n`;
    text += `Bahasa: 100% Bahasa Indonesia Alami (Tanpa Kata Bahasa Inggris)\n`;
    text += `==========================================================\n\n`;

    // 1. Google Flow 10s Video Ready-to-Use Prompt Block
    const partCount = dur <= 10 ? 1 : (dur <= 20 ? 2 : 3);
    
    // Pastikan jika durasi 20s atau 30s, parts selalu terisi sesuai partCount
    if (partCount > 1 && (!campaign.parts || campaign.parts.length < partCount)) {
        const scenes = campaign.scenes || [];
        if (dur === 30) {
            campaign.parts = [
                {
                    part_number: 1,
                    part_title: "KLIP 1: HOOK & PROBLEM RELATABLE",
                    duration_seconds: 10,
                    scenes_included: "Adegan 1 - 2 (0–10 Detik)",
                    narasi_part: `${scenes[0]?.voiceover_script || ''} ${scenes[1]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[0]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                },
                {
                    part_number: 2,
                    part_title: "KLIP 2: PENGENALAN PRODUK & DEMONSTRASI FITUR",
                    duration_seconds: 10,
                    scenes_included: "Adegan 3 - 4 (10–20 Detik)",
                    narasi_part: `${scenes[2]?.voiceover_script || ''} ${scenes[3]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[2]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                },
                {
                    part_number: 3,
                    part_title: "KLIP 3: HONEST REVIEW & CALL TO ACTION",
                    duration_seconds: 10,
                    scenes_included: "Adegan 5 - 6 (20–30 Detik)",
                    narasi_part: `${scenes[4]?.voiceover_script || ''} ${scenes[5]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[4]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                }
            ];
        } else if (dur === 20) {
            campaign.parts = [
                {
                    part_number: 1,
                    part_title: "KLIP 1: HOOK, PROBLEM & PENGENALAN SOLUSI",
                    duration_seconds: 10,
                    scenes_included: "Adegan 1 - 3 (0–10 Detik)",
                    narasi_part: `${scenes[0]?.voiceover_script || ''} ${scenes[1]?.voiceover_script || ''} ${scenes[2]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[0]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                },
                {
                    part_number: 2,
                    part_title: "KLIP 2: DEMONSTRASI, REVIEW & CALL TO ACTION",
                    duration_seconds: 10,
                    scenes_included: "Adegan 4 - 6 (10–20 Detik)",
                    narasi_part: `${scenes[3]?.voiceover_script || ''} ${scenes[4]?.voiceover_script || ''} ${scenes[5]?.voiceover_script || ''}`.trim(),
                    google_flow_prompt: scenes[3]?.google_flow_prompt || 'Video UGC vertikal 9:16 kualitas FHD.'
                }
            ];
        }
    }

    if (campaign.parts && campaign.parts.length > 1) {
        text += `✂️ PEMBAGIAN KLIP VIDEO GOOGLE FLOW (${campaign.parts.length} KLIP @ 10s — TOTAL ${dur} DETIK):\n`;
        text += `(Render per klip 10 detik di Google Flow / Veo, lalu satukan di CapCut atau Premiere)\n\n`;
        
        campaign.parts.forEach(part => {
            text += `----------------------------------------------------------\n`;
            text += `KLIP ${part.part_number} (${part.duration_seconds || 10} DETIK) — ${part.part_title || part.title || `BAGIAN ${part.part_number}`}\n`;
            if (part.scenes_included) {
                text += `Adegan Termasuk: ${part.scenes_included}\n`;
            }
            if (part.narasi_part) {
                text += `Voiceover Bahasa Indonesia: "${part.narasi_part}"\n`;
            }
            text += `PROMPT GOOGLE FLOW / VEO / KLING:\n${part.google_flow_prompt}\n`;
            text += `----------------------------------------------------------\n\n`;
        });
    } else {
        // Single 10-second Unified Prompt
        const singlePrompt = (campaign.parts && campaign.parts[0]?.google_flow_prompt)
            || (campaign.scenes && campaign.scenes[0]?.google_flow_prompt)
            || `Video UGC vertikal 9:16 kualitas FHD. Talent: orang muda Indonesia berpenampilan natural ramah, pencahayaan alami kamar estetik. Visual adegan: Gadis muda Indonesia tersenyum ceria menunjukkan ${title} ke arah kamera, ekspresi antusias mencoba produk, detail fitur unggulan, dan gestur ramah mengajak klik keranjang. Voiceover bahasa Indonesia: "${(campaign.scenes || []).map(s => s.voiceover_script).filter(Boolean).join(' ')}". Teks subtitle di layar bahasa Indonesia. Wajib Bahasa Indonesia, tanpa kata bahasa Inggris, tanpa watermark.`;

        text += `🎬 PROMPT UTUH SIAP PAKAI GOOGLE FLOW (10 DETIK):\n`;
        text += `(Salin prompt di bawah ini lalu tempel / Ctrl+V di Google Flow / Veo)\n\n`;
        text += `${singlePrompt}\n\n`;
    }

    text += `==========================================================\n`;
    text += `📋 RINCIAN STORYBOARD & NASKAH (6 TAHAPAN LENGKAP):\n`;
    text += `==========================================================\n\n`;

    const scenes = campaign.scenes || [];
    scenes.forEach((s) => {
        const timeRange = s.time_range || `${s.duration_seconds || 1.5} detik`;
        const titleUpper = (s.scene_title || `ADEGAN ${s.scene_number}`).toUpperCase();
        text += `[ADEGAN ${s.scene_number}: ${titleUpper} (${timeRange})]\n`;
        text += `Visual: ${s.visual_description || '-'}\n`;
        if (s.camera_movement) {
            text += `Kamera: ${s.camera_movement}\n`;
        }
        text += `Voiceover (Naskah Suara): "${s.voiceover_script || '-'}"\n`;
        if (s.caption_overlay) {
            text += `Teks di Layar (Safe Zone): ${s.caption_overlay}\n`;
        }
        text += `\n`;
    });

    text += `TOTAL ESTIMASI KATA: ${campaign.total_narasi_kata || 24} kata\n`;
    text += `CTA NETRAL: "${campaign.call_to_action || 'Yuk, langsung klik keranjang di bawah video ini ya!'}"`;

    return text.trim();
}
window.formatFullPromptVideoText = formatFullPromptVideoText;

/**
 * Gallery Renderer for Multi-Screenshot References
 */
function renderScreenshotsGallery() {
    const galleryContainer = document.getElementById('screenshots-gallery-container');
    const thumbnailGrid = document.getElementById('screenshots-thumbnail-grid');
    const countBadge = document.getElementById('screenshots-count');
    if (!galleryContainer || !thumbnailGrid) return;

    if (uploadedScreenshots.length === 0) {
        galleryContainer.classList.add('hidden');
        return;
    }

    galleryContainer.classList.remove('hidden');
    if (countBadge) countBadge.textContent = uploadedScreenshots.length;
    thumbnailGrid.innerHTML = '';

    uploadedScreenshots.forEach((item, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-square flex items-center justify-center';
        thumb.innerHTML = `
            <img src="${item.previewUrl}" class="w-full h-full object-cover" alt="${item.name}">
            <button type="button" class="btn-del-img absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-600 text-white rounded transition shadow" title="Hapus foto ini">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
            <span class="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-slate-300 px-1 py-0.5 truncate text-center">${item.name}</span>
        `;

        thumb.querySelector('.btn-del-img')?.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedScreenshots.splice(index, 1);
            renderScreenshotsGallery();
            showToast('Foto referensi dihapus.', 'info');
        });

        thumbnailGrid.appendChild(thumb);
    });

    if (window.lucide) window.lucide.createIcons();
}

/**
 * Append multiple screenshot files to the reference pool
 */
function compressImageFile(file, maxDimension = 1280, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const [header, base64] = dataUrl.split(',');
                resolve({ base64, mimeType: 'image/jpeg', previewUrl: dataUrl });
            };
            img.onerror = () => {
                const dataUrl = e.target.result;
                const [header, base64] = dataUrl.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                resolve({ base64, mimeType, previewUrl: dataUrl });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function addScreenshotFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    
    let addedCount = 0;
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    
    for (const file of validFiles) {
        addedCount++;
        const { base64, mimeType, previewUrl } = await compressImageFile(file);
        
        uploadedScreenshots.push({
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            base64,
            mimeType,
            name: file.name || `screenshot_${uploadedScreenshots.length + 1}.jpg`,
            previewUrl
        });
        renderScreenshotsGallery();
    }

    if (addedCount > 0) {
        showToast(`${addedCount} foto referensi ditambahkan & dioptimalkan! Tekan tombol 'Mulai Analisis Semua Gambar'.`, 'info');
    }
}

// Helper: Deteksi & Pilih Kategori Niche secara Cerdas
function autoSelectNicheCategory(detectedCategory, productName) {
    const catSelect = document.getElementById('ugc-category');
    if (!catSelect) return;

    const textToMatch = `${detectedCategory || ''} ${productName || ''}`.toLowerCase();

    // 1. Keyword-based classification patterns (Akurasi Tinggi)
    const patterns = [
        {
            value: '👗 Fashion & OOTD',
            regex: /\b(tas|ransel|backpack|tote|sling|baju|kaos|kemeja|celana|rok|dress|jaket|hoodie|sweater|sepatu|sandal|sneakers|heels|dompet|hijab|jilbab|kerudung|pakaian|fashion|ootd|outfit|jam tangan|kacamata|ikat pinggang|gesper|topi|distro|t-shirt)\b/i
        },
        {
            value: '💄 Skincare & Kecantikan',
            regex: /\b(skincare|serum|brightening|glowing|sunscreen|toner|facial|cleanser|sabun|lotion|moisturizer|lip|lipstick|lipbalm|liptint|cushion|bedak|foundation|concealer|masker|eye cream|body wash|body lotion|shampoo|parfum|perfume|kecantikan|beauty|kosmetik|niacinamide|retinol)\b/i
        },
        {
            value: '📱 Gadget & Elektronik',
            regex: /\b(hp|smartphone|case|casing|pelindung layar|tempered glass|charger|kabel data|powerbank|headset|headphone|earphone|tws|earbuds|speaker|bluetooth|wireless|laptop|mouse|keyboard|gadget|elektronik|smartwatch|kamera|tripod)\b/i
        },
        {
            value: '🍔 Kuliner & Makanan',
            regex: /\b(makanan|kuliner|snack|cemilan|keripik|biskuit|cookies|kopi|coffee|teh|tea|minuman|bumbu|sambal|pedas|frozen food|mie|noodle|cokelat|chocolate|abon|basreng|keju|rendang)\b/i
        },
        {
            value: '🏠 Kebutuhan Rumah Tangga',
            regex: /\b(rumah|tangga|dapur|sprei|bedcover|bantal|guling|selimut|sapu|pel|wajan|panci|blender|pisau|botol|tumbler|rak|gantungan|lampu|diffuser|aromaterapi|kebersihan|storage|organizer)\b/i
        },
        {
            value: '✨ Kesehatan & Kebugaran',
            regex: /\b(kesehatan|wellness|suplemen|vitamin|herbal|madu|jamu|obat|fitness|gym|olahraga|matras|dumbbell|protein)\b/i
        },
        {
            value: '🍼 Ibu & Anak',
            regex: /\b(bayi|baby|anak|kids|mainan|toy|popok|diaper|pampers|stroller|botol susu|pompa asi|baju bayi)\b/i
        },
        {
            value: '🚗 Otomotif & Aksesoris',
            regex: /\b(motor|mobil|otomotif|helm|oli|wiper|sarung motor|cover mobil|knalpot|spion|velg|ban|intercom|parfum mobil)\b/i
        }
    ];

    for (const p of patterns) {
        if (p.regex.test(textToMatch)) {
            catSelect.value = p.value;
            console.log(`[KawanDigi] Niche otomatis terdeteksi: ${p.value}`);
            return;
        }
    }

    // 2. Direct string matching against options
    if (detectedCategory) {
        for (const opt of catSelect.options) {
            if (opt.value.toLowerCase().includes(detectedCategory.toLowerCase()) || detectedCategory.toLowerCase().includes(opt.value.toLowerCase())) {
                catSelect.value = opt.value;
                return;
            }
        }
    }
}

function initUgcCreator() {
    // Preset Demo Button
    const btnUgcPreset = document.getElementById('btn-ugc-preset-demo');
    btnUgcPreset?.addEventListener('click', () => {
        const preset = UGC_PRESETS[currentUgcPresetIndex % UGC_PRESETS.length];
        currentUgcPresetIndex++;

        const nameInput = document.getElementById('ugc-name');
        const urlInput = document.getElementById('ugc-url');
        const catSelect = document.getElementById('ugc-category');
        const toneSelect = document.getElementById('ugc-tone');
        const sellingInput = document.getElementById('ugc-selling');

        if (nameInput) nameInput.value = preset.name;
        if (urlInput) urlInput.value = preset.url;
        if (catSelect) catSelect.value = preset.category;
        if (toneSelect) toneSelect.value = preset.tone;
        if (sellingInput) sellingInput.value = preset.selling;
        setUgcDuration(preset.duration);

        showToast(`Contoh dimuat: ${preset.name}`, 'info');
    });

    // Multi-Screenshot Dropzone & Paste (Ctrl+V) handler
    const dropzone = document.getElementById('screenshot-dropzone');
    const screenshotInput = document.getElementById('ugc-screenshot-input');
    const btnClearScreenshots = document.getElementById('btn-clear-all-screenshots');
    const btnAnalyzeScreenshots = document.getElementById('btn-analyze-screenshots');
    const btnAnalyzeText = document.getElementById('btn-analyze-text');

    dropzone?.addEventListener('click', () => {
        screenshotInput?.click();
    });

    screenshotInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            addScreenshotFiles(e.target.files);
            screenshotInput.value = ''; // Reset input to allow re-selecting same files
        }
    });

    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-brand-500', 'bg-brand-500/10');
    });

    dropzone?.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-brand-500', 'bg-brand-500/10');
    });

    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-brand-500', 'bg-brand-500/10');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addScreenshotFiles(e.dataTransfer.files);
        }
    });

    // Global Paste (Ctrl+V) listener for screenshots
    window.addEventListener('paste', (e) => {
        // Only trigger if in UGC tab
        const ugcSection = document.getElementById('section-ugc');
        if (ugcSection && ugcSection.classList.contains('hidden')) return;

        const items = e.clipboardData?.items;
        if (!items) return;
        const imageFiles = [];
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) imageFiles.push(file);
            }
        }
        if (imageFiles.length > 0) {
            addScreenshotFiles(imageFiles);
        }
    });

    // Clear all screenshots button
    btnClearScreenshots?.addEventListener('click', () => {
        uploadedScreenshots = [];
        renderScreenshotsGallery();
        showToast('Semua referensi foto telah dihapus.', 'info');
    });

    // Manual Analyze Button for Multi-Screenshots
    btnAnalyzeScreenshots?.addEventListener('click', async () => {
        if (uploadedScreenshots.length === 0) {
            showToast('Silakan unggah atau paste minimal satu gambar referensi etalase produk.', 'error');
            return;
        }

        btnAnalyzeScreenshots.disabled = true;
        if (btnAnalyzeText) btnAnalyzeText.textContent = `Menganalisis ${uploadedScreenshots.length} Foto...`;

        try {
            const details = await extractDetailsFromMultipleImages(uploadedScreenshots);
            const nameInput = document.getElementById('ugc-name');
            const catSelect = document.getElementById('ugc-category');
            const toneSelect = document.getElementById('ugc-tone');
            const sellingInput = document.getElementById('ugc-selling');

            if (details.product_name && nameInput) nameInput.value = details.product_name;
            if (details.selling_points && sellingInput) {
                let sText = details.selling_points;
                if (details.variant && details.variant !== 'Standar') {
                    sText += ` (Varian: ${details.variant})`;
                }
                sellingInput.value = sText;
            }
            // Otomatis tentukan niche kategori secara cerdas
            autoSelectNicheCategory(details.category, details.product_name);
            if (details.suggested_tone && toneSelect) {
                for (const opt of toneSelect.options) {
                    if (opt.value === details.suggested_tone || opt.text.includes(details.suggested_tone)) {
                        toneSelect.value = opt.value;
                        break;
                    }
                }
            }
            showToast(`Analisis ${uploadedScreenshots.length} gambar sukses! Kolom form otomatis terisi.`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btnAnalyzeScreenshots.disabled = false;
            if (btnAnalyzeText) btnAnalyzeText.textContent = 'Mulai Analisis Semua Gambar';
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Duration Buttons
    const durationButtons = document.querySelectorAll('.btn-duration');
    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const dur = parseInt(btn.dataset.duration, 10);
            setUgcDuration(dur);
        });
    });

    // Scrape URL button
    const btnScrape = document.getElementById('btn-scrape-url');
    const urlInput = document.getElementById('ugc-url');
    const nameInput = document.getElementById('ugc-name');
    const sellingInput = document.getElementById('ugc-selling');

    btnScrape?.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showToast('Silakan tempelkan link produk Shopee atau TikTok Shop terlebih dahulu.', 'error');
            return;
        }

        btnScrape.disabled = true;
        btnScrape.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menganalisis...`;

        try {
            const product = await extractProductDetails(url);
            showToast('Informasi produk berhasil dianalisis!', 'success');

            if (product.product_name) nameInput.value = product.product_name;
            if (product.selling_points) sellingInput.value = product.selling_points;

            // Otomatis tentukan niche kategori secara cerdas
            autoSelectNicheCategory(product.category, product.product_name);

            if (product.suggested_tone) {
                const toneSelect = document.getElementById('ugc-tone');
                if (toneSelect) {
                    for (const opt of toneSelect.options) {
                        if (opt.value === product.suggested_tone || opt.text.includes(product.suggested_tone)) {
                            toneSelect.value = opt.value;
                            break;
                        }
                    }
                }
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btnScrape.disabled = false;
            btnScrape.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-400"></i> Ekstrak`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Generate Campaign Storyboard
    const btnGenerate = document.getElementById('btn-generate-ugc');
    btnGenerate?.addEventListener('click', handleGenerateUgc);

    // Model / Visual Talent Preference Listener
    const talentSelect = document.getElementById('ugc-talent');
    const talentBadge = document.getElementById('talent-preference-badge');
    const talentHint = document.getElementById('ugc-talent-hint');

    talentSelect?.addEventListener('change', () => {
        const val = talentSelect.value;
        if (val === 'faceless') {
            if (talentBadge) talentBadge.textContent = '📦 Faceless (Unboxing / Hands Only)';
            if (talentHint) talentHint.innerHTML = '💡 Video berfokus penuh pada presentasi produk, POV tangan unboxing, dan close-up tanpa wajah model.';
        } else if (val === 'female') {
            if (talentBadge) talentBadge.textContent = '👩 Model Wanita Indonesia';
            if (talentHint) talentHint.innerHTML = '💡 Menggunakan talent wanita muda Indonesia yang natural, ceria, dan ekspresif.';
        } else if (val === 'male') {
            if (talentBadge) talentBadge.textContent = '👨 Model Pria Indonesia';
            if (talentHint) talentHint.innerHTML = '💡 Menggunakan talent pria muda Indonesia yang kasual, rapi, dan komunikatif.';
        } else {
            if (talentBadge) talentBadge.textContent = '🤖 Bebas / Rekomendasi AI';
            if (talentHint) talentHint.innerHTML = '💡 AI bebas berkreasi memilih gaya yang paling menjual sesuai jenis produk.';
        }
    });

    // Copy All Prompts
    const btnCopyAll = document.getElementById('btn-copy-all-prompts');
    btnCopyAll?.addEventListener('click', () => {
        if (!currentUgcCampaign) return;
        const allPrompts = formatFullPromptVideoText(currentUgcCampaign);
        copyToClipboard(allPrompts, 'Seluruh prompt video 10 detik lengkap berhasil disalin!');
    });
}

async function handleGenerateUgc() {
    const apiKey = getSavedApiKey();
    const provider = getActiveProvider();
    if (!apiKey && provider !== 'custom') {
        const pName = AI_PROVIDERS[provider]?.name || 'AI';
        showToast(`Masukkan API Key ${pName} Anda terlebih dahulu di Pengaturan API.`, 'error');
        openApiKeyModal();
        return;
    }

    const access = hasToolAccess('ugc');
    if (!access.allowed) {
        showToast('Batas trial UGC Affiliate habis. Silakan aktivasi lisensi di tab Lisensi.', 'error');
        switchTab('license');
        return;
    }

    const productName = document.getElementById('ugc-name').value.trim();
    const productUrl = document.getElementById('ugc-url').value.trim();
    const productCategory = document.getElementById('ugc-category').value;
    const tone = document.getElementById('ugc-tone').value;
    const talentPreference = document.getElementById('ugc-talent')?.value || 'auto';
    const sellingPoints = document.getElementById('ugc-selling').value.trim();

    if (!productName && !productUrl) {
        showToast('Masukkan nama produk atau link etalase produk.', 'error');
        return;
    }

    // UI state switch: show loading
    const emptyState = document.getElementById('ugc-empty-state');
    const loadingState = document.getElementById('ugc-loading-state');
    const resultsContainer = document.getElementById('ugc-results');
    const actionsHeader = document.getElementById('ugc-actions');
    const btnGenerate = document.getElementById('btn-generate-ugc');

    emptyState?.classList.add('hidden');
    resultsContainer?.classList.add('hidden');
    actionsHeader?.classList.add('hidden');
    loadingState?.classList.remove('hidden');
    btnGenerate.disabled = true;

    try {
        const campaign = await generateUgcCampaign({
            productUrl,
            productName,
            productCategory,
            sellingPoints,
            videoDuration: selectedUgcDuration,
            tone,
            talentPreference
        });

        currentUgcCampaign = campaign;
        renderUgcResults(campaign);
        populateGoogleFlowStudio(campaign);
        updateLicenseCards();

        // Save to History (Max 20 projects, persists across refresh)
        saveProjectToHistory({
            type: 'ugc',
            title: campaign.product_analysis?.product_name || productName || 'Produk Pilihan',
            category: campaign.product_analysis?.category || productCategory || 'Affiliate',
            duration: selectedUgcDuration || 10,
            tone: tone,
            talentPreference: talentPreference,
            previewText: campaign.scenes?.[0]?.voiceover_script || campaign.scenes?.[0]?.visual_description || '',
            inputs: {
                productUrl,
                productName,
                productCategory,
                tone,
                talentPreference,
                videoDuration: selectedUgcDuration,
                sellingPoints
            },
            data: campaign
        });
        updateHistoryBadge();

        showToast('Storyboard UGC Affiliate berhasil dirancang & disimpan ke Riwayat!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
        emptyState?.classList.remove('hidden');
    } finally {
        loadingState?.classList.add('hidden');
        btnGenerate.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}

function renderUgcResults(campaign) {
    const resultsContainer = document.getElementById('ugc-results');
    const actionsHeader = document.getElementById('ugc-actions');
    const summaryCard = document.getElementById('ugc-summary-card');
    const sceneList = document.getElementById('ugc-scene-list');
    const captionsContainer = document.getElementById('ugc-captions-container');
    const fullPromptCode = document.getElementById('ugc-full-prompt-code');
    const btnCopyFullPrompt = document.getElementById('btn-copy-full-prompt-block');

    resultsContainer.classList.remove('hidden');
    actionsHeader.classList.remove('hidden');

    const analysis = campaign.product_analysis || {};
    summaryCard.innerHTML = `
        <div class="flex items-center justify-between font-bold text-brand-300 text-xs pb-1 border-b border-brand-500/20">
            <span class="flex items-center gap-1.5"><i data-lucide="award" class="w-4 h-4 text-amber-400"></i> Hasil Analisis & Formula Konten UGC</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">Durasi ${campaign.duration_seconds || selectedUgcDuration || 10}s • ${campaign.total_narasi_kata || 24} Kata</span>
        </div>
        <div class="pt-1.5 text-slate-300 space-y-1 text-[11px]">
            <p><strong class="text-white">Produk/Tempat:</strong> ${analysis.product_name || 'Produk Pilihan'}</p>
            <p><strong class="text-white">Kategori:</strong> ${analysis.category || 'Affiliate Produk'}</p>
            <p><strong class="text-white">Target Pembeli:</strong> ${analysis.target_buyer || '-'}</p>
            <p><strong class="text-white">Keunggulan Utama:</strong> ${analysis.core_benefit || '-'}</p>
        </div>
    `;

    // 1. Render 3 Template Captions
    if (captionsContainer && campaign.captions) {
        captionsContainer.innerHTML = '';
        const capList = [
            { id: 'hard', title: '⚡ Hard-Selling', desc: 'To the point & urgensi', data: campaign.captions.hard_selling },
            { id: 'story', title: '📖 Storytelling', desc: 'Relatable & pengalaman', data: campaign.captions.storytelling },
            { id: 'soft', title: '💡 Soft-Selling', desc: 'Edukatif & halus', data: campaign.captions.soft_selling }
        ];

        capList.forEach(cap => {
            if (!cap.data) return;
            const fullText = cap.data.full_text || `${cap.data.hook}\n${cap.data.benefit}\n${cap.data.cta}\n${(cap.data.hashtags || []).join(' ')}`;
            const card = document.createElement('div');
            card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2';
            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span class="text-xs font-bold text-white">${cap.title}</span>
                        <span class="text-[10px] text-slate-400">${cap.desc}</span>
                    </div>
                    <p class="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">${fullText}</p>
                </div>
                <button type="button" class="btn-copy-cap w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="copy" class="w-3 h-3"></i> Salin Caption
                </button>
            `;
            card.querySelector('.btn-copy-cap')?.addEventListener('click', () => {
                copyToClipboard(fullText, `Caption ${cap.title} disalin!`);
            });
            captionsContainer.appendChild(card);
        });
    }

    // 2. Render Full Formatted Prompt Video Code Block
    if (fullPromptCode) {
        const textToDisplay = formatFullPromptVideoText(campaign);
        fullPromptCode.textContent = textToDisplay;

        btnCopyFullPrompt?.addEventListener('click', () => {
            copyToClipboard(textToDisplay, 'Prompt Video 10 Detik Lengkap disalin!');
        });
    }

    // 3. Render Scene Cards
    sceneList.innerHTML = '';
    const scenes = campaign.scenes || [];

    scenes.forEach((scene, index) => {
        const sceneCard = document.createElement('div');
        sceneCard.className = 'bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 fade-in hover:border-brand-500/40 transition';

        const sceneId = `ugc-scene-${index}`;

        sceneCard.innerHTML = `
            <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-brand-600/30 text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/30">
                        ${scene.scene_number || (index + 1)}
                    </span>
                    <h4 class="text-xs font-bold text-white tracking-wide uppercase">${scene.scene_title || `Scene ${index + 1}`}</h4>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                    ⏱️ ${scene.time_range || `${scene.duration_seconds || 1.5} Detik`}
                </span>
            </div>

            <!-- Visual Description & Camera -->
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Visual Adegan (9:16 Vertikal):</label>
                <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    ${scene.visual_description || '-'}
                </p>
                ${scene.camera_movement ? `
                <p class="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <i data-lucide="video" class="w-3 h-3 text-brand-400"></i> Kamera: <span class="text-slate-300">${scene.camera_movement}</span>
                </p>
                ` : ''}
            </div>

            <!-- Voiceover Script -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Naskah Suara (Voiceover):</label>
                    <div class="flex items-center gap-2">
                        <button class="btn-play-vo text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold">
                            <i data-lucide="volume-2" class="w-3 h-3"></i> Putar Suara
                        </button>
                        <button class="btn-copy-vo text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold">
                            <i data-lucide="copy" class="w-3 h-3"></i> Salin Naskah
                        </button>
                    </div>
                </div>
                <p class="text-xs text-amber-200 italic bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed">
                    "${scene.voiceover_script || '-'}"
                </p>
            </div>

            <!-- Caption / Overlay Text -->
            ${scene.caption_overlay ? `
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teks di Layar (Subtitle Safe Zone):</label>
                <div class="inline-block px-2.5 py-1 bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded-lg text-xs font-black">
                    ${scene.caption_overlay}
                </div>
            </div>
            ` : ''}
        `;

        // Wire Copy Vo
        sceneCard.querySelector('.btn-copy-vo')?.addEventListener('click', () => {
            copyToClipboard(scene.voiceover_script, `Naskah Scene ${scene.scene_number || (index + 1)} disalin!`);
        });

        // Wire Play Vo (Web Speech Audio)
        sceneCard.querySelector('.btn-play-vo')?.addEventListener('click', () => {
            speakVoiceover(scene.voiceover_script);
        });

        sceneList.appendChild(sceneCard);
    });

    if (window.lucide) window.lucide.createIcons();
}

// =========================================================================
// AI DRAMA & MICRO-SERIES CREATOR CONTROLLER
// =========================================================================
function initDramaCreator() {
    // Preset Demo Button
    const btnDramaPreset = document.getElementById('btn-drama-preset-demo');
    btnDramaPreset?.addEventListener('click', () => {
        const preset = DRAMA_PRESETS[currentDramaPresetIndex % DRAMA_PRESETS.length];
        currentDramaPresetIndex++;

        const titleInput = document.getElementById('drama-title');
        const epInput = document.getElementById('drama-episode-num');
        const genreSelect = document.getElementById('drama-genre');
        const premiseInput = document.getElementById('drama-premise');
        const heroNameInput = document.getElementById('drama-hero-name');
        const heroDescInput = document.getElementById('drama-hero-desc');
        const villainNameInput = document.getElementById('drama-villain-name');
        const villainDescInput = document.getElementById('drama-villain-desc');

        if (titleInput) titleInput.value = preset.title;
        if (epInput) epInput.value = preset.episode;
        if (genreSelect) genreSelect.value = preset.genre;
        if (premiseInput) premiseInput.value = preset.premise;
        if (heroNameInput) heroNameInput.value = preset.heroName;
        if (heroDescInput) heroDescInput.value = preset.heroDesc;
        if (villainNameInput) villainNameInput.value = preset.villainName;
        if (villainDescInput) villainDescInput.value = preset.villainDesc;
        setDramaScenes(preset.scenes);

        showToast(`Contoh dimuat: ${preset.title}`, 'info');
    });

    // Drama Duration Buttons
    const durationButtons = document.querySelectorAll('.btn-drama-duration');
    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const scenes = parseInt(btn.dataset.dramaScenes, 10);
            setDramaScenes(scenes);
        });
    });

    // Generate Drama Episode Button
    const btnGenerateDrama = document.getElementById('btn-generate-drama');
    btnGenerateDrama?.addEventListener('click', handleGenerateDrama);

    // Copy All Drama Prompts
    const btnCopyAllDrama = document.getElementById('btn-copy-all-drama-prompts');
    btnCopyAllDrama?.addEventListener('click', () => {
        if (!currentDramaEpisode || !currentDramaEpisode.scenes) return;
        const ep = currentDramaEpisode.episode_info || {};
        let text = `NASKAH DRAMA PRODUKSI — ${ep.series_title || 'Serial'} (Episode ${ep.episode_number || 1}: ${ep.episode_title || '-'})\n`;
        text += `Genre: ${ep.genre || 'Drama'} | Logline: ${ep.logline || '-'}\n\n`;

        (currentDramaEpisode.scenes || []).forEach(s => {
            text += `ADEGAN ${s.scene_number} (${s.duration_seconds || 10}s) — ${s.scene_title || 'SCENE'}\n`;
            text += `- Visual & Karakter: ${s.visual_direction || '-'}\n`;
            text += `- Dialog: "${s.dialogue || '-'}"\n`;
            if (s.sound_fx) text += `- Sound FX / Musik: ${s.sound_fx}\n`;
            if (s.google_flow_prompt) text += `- Prompt Google Flow (Konsisten Tokoh): ${s.google_flow_prompt}\n`;
            text += `\n`;
        });

        if (currentDramaEpisode.cliffhanger_hook) {
            text += `🔥 CLIFFHANGER HOOK AKHIR: "${currentDramaEpisode.cliffhanger_hook}"\n`;
        }

        copyToClipboard(text.trim(), 'Seluruh naskah & prompt drama berhasil disalin!');
    });
}

async function handleGenerateDrama() {
    const apiKey = getSavedApiKey();
    const provider = getActiveProvider();
    if (!apiKey && provider !== 'custom') {
        const pName = AI_PROVIDERS[provider]?.name || 'AI';
        showToast(`Masukkan API Key ${pName} Anda terlebih dahulu di Pengaturan API.`, 'error');
        openApiKeyModal();
        return;
    }

    const access = hasToolAccess('drama');
    if (!access.allowed) {
        showToast('Batas trial AI Drama habis. Silakan aktivasi lisensi di tab Lisensi.', 'error');
        switchTab('license');
        return;
    }

    const seriesTitle = document.getElementById('drama-title').value.trim();
    const episodeNumber = parseInt(document.getElementById('drama-episode-num').value, 10) || 1;
    const genre = document.getElementById('drama-genre').value;
    const storyPremise = document.getElementById('drama-premise').value.trim();

    const heroName = document.getElementById('drama-hero-name').value.trim();
    const heroDesc = document.getElementById('drama-hero-desc').value.trim();
    const villainName = document.getElementById('drama-villain-name').value.trim();
    const villainDesc = document.getElementById('drama-villain-desc').value.trim();

    // UI state switch: show loading
    const emptyState = document.getElementById('drama-empty-state');
    const loadingState = document.getElementById('drama-loading-state');
    const resultsContainer = document.getElementById('drama-results');
    const actionsHeader = document.getElementById('drama-actions');
    const btnGenerate = document.getElementById('btn-generate-drama');

    emptyState?.classList.add('hidden');
    resultsContainer?.classList.add('hidden');
    actionsHeader?.classList.add('hidden');
    loadingState?.classList.remove('hidden');
    btnGenerate.disabled = true;

    try {
        const drama = await generateDramaEpisode({
            seriesTitle,
            genre,
            episodeNumber,
            storyPremise,
            protagonist: {
                name: heroName,
                role: 'Tokoh Utama Protagonis',
                visual: heroDesc
            },
            antagonist: {
                name: villainName,
                role: 'Tokoh Lawan Antagonis',
                visual: villainDesc
            },
            sceneCount: selectedDramaScenes
        });

        currentDramaEpisode = drama;
        renderDramaResults(drama);
        actionsHeader?.classList.remove('hidden');
        updateLicenseCards();

        // Save to History (Max 20 projects, persists across refresh)
        saveProjectToHistory({
            type: 'drama',
            title: drama.series_title ? `${drama.series_title} (Ep. ${drama.episode_number || episodeNumber})` : seriesTitle,
            category: genre,
            duration: (drama.scenes?.length || selectedDramaScenes) * 15,
            tone: genre,
            previewText: drama.logline || drama.scenes?.[0]?.voiceover || '',
            inputs: {
                seriesTitle,
                genre,
                episodeNumber,
                storyPremise,
                heroName,
                heroDesc,
                villainName,
                villainDesc,
                sceneCount: selectedDramaScenes
            },
            data: drama
        });
        updateHistoryBadge();

        showToast(`Episode ${episodeNumber} berhasil ditulis & disimpan ke Riwayat!`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
        emptyState?.classList.remove('hidden');
    } finally {
        loadingState?.classList.add('hidden');
        btnGenerate.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}

function renderDramaResults(drama) {
    const resultsContainer = document.getElementById('drama-results');
    const summaryCard = document.getElementById('drama-summary-card');
    const sceneList = document.getElementById('drama-scene-list');

    resultsContainer.classList.remove('hidden');

    const ep = drama.episode_info || {};
    summaryCard.innerHTML = `
        <div class="flex items-center justify-between font-bold text-accent-300 text-xs pb-1 border-b border-accent-500/20">
            <span class="flex items-center gap-1.5"><i data-lucide="clapperboard" class="w-4 h-4 text-accent-400"></i> ${ep.series_title || 'Serial'} • Episode ${ep.episode_number || 1}</span>
            <span class="px-2 py-0.5 rounded-full bg-accent-500/20 text-[10px] font-extrabold uppercase">${ep.genre || 'Drama'}</span>
        </div>
        <div class="pt-1.5 text-slate-300 space-y-1 text-[11px]">
            <p><strong class="text-white">Judul Episode:</strong> ${ep.episode_title || '-'}</p>
            <p><strong class="text-white">Logline:</strong> ${ep.logline || '-'}</p>
            <div class="p-2 bg-accent-950/40 border border-accent-500/30 rounded-lg text-accent-200 mt-2">
                <span class="font-bold text-white text-[10px] uppercase block mb-0.5">🔥 Cliffhanger Hook Akhir:</span>
                "${drama.cliffhanger_hook || 'Saksikan kelanjutannya di Episode berikutnya!'}"
            </div>
        </div>
    `;

    // Render Scene Cards
    sceneList.innerHTML = '';
    const scenes = drama.scenes || [];

    scenes.forEach((scene, index) => {
        const sceneCard = document.createElement('div');
        sceneCard.className = 'bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 fade-in hover:border-accent-500/40 transition';

        sceneCard.innerHTML = `
            <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-accent-600/30 text-accent-400 font-bold text-xs flex items-center justify-center border border-accent-500/30">
                        ${scene.scene_number || (index + 1)}
                    </span>
                    <h4 class="text-xs font-bold text-white tracking-wide uppercase">${scene.scene_name || `Scene ${index + 1}`}</h4>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                    ⏱️ ${scene.duration_seconds || 10} Detik
                </span>
            </div>

            <!-- Action Description -->
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Aksi & Situasi Adegan:</label>
                <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    ${scene.action_description || '-'}
                </p>
            </div>

            <!-- Dialogue -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dialog Karakter:</label>
                    <div class="flex items-center gap-2">
                        <button class="btn-play-dialogue text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold">
                            <i data-lucide="volume-2" class="w-3 h-3"></i> Putar Dialog
                        </button>
                        <button class="btn-copy-dialogue text-[10px] text-accent-400 hover:text-accent-300 flex items-center gap-1 font-semibold">
                            <i data-lucide="copy" class="w-3 h-3"></i> Salin Dialog
                        </button>
                    </div>
                </div>
                <p class="text-xs text-white font-medium bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg leading-relaxed">
                    ${scene.dialogue || '-'}
                </p>
            </div>

            ${scene.sound_fx ? `
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sound FX / Music Cue:</label>
                <div class="text-[11px] text-slate-400 italic">
                    🎵 ${scene.sound_fx}
                </div>
            </div>
            ` : ''}

            <!-- 1-Click Google Flow Bridge (Character Consistency) -->
            <div class="mt-2 p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2.5 shadow-lg">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <i data-lucide="sparkles" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-bold text-emerald-300">Google Flow (Veo Drama Scene)</span>
                                <span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-bold">100% Gratis</span>
                            </div>
                            <p class="text-[10px] text-slate-400">Konsistensi karakter & sinematik drama 9:16 vertikal</p>
                        </div>
                    </div>
                    <button class="btn-flow-render px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition transform active:scale-95 flex-shrink-0">
                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                        <span>Buka di Google Flow</span>
                    </button>
                </div>

                <!-- Prompt box with Copy button -->
                <div class="bg-slate-950/80 border border-emerald-500/20 rounded-lg p-2.5 flex items-start justify-between gap-2">
                    <p class="prompt-text text-[11px] text-slate-300 font-mono leading-relaxed select-all">
                        ${scene.google_flow_prompt}
                    </p>
                    <button class="btn-copy-prompt text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-1 flex-shrink-0 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded">
                        <i data-lucide="copy" class="w-3 h-3"></i> Salin
                    </button>
                </div>
                <div class="flow-status-msg hidden text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg flex items-center gap-1.5">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"></i>
                    <span>Prompt tersalin di clipboard! Di tab Google Flow, tinggal tekan Ctrl+V (Paste) lalu klik Generate.</span>
                </div>
            </div>

            <!-- Video & Visual Generator Controls -->
            <div class="pt-2 border-t border-slate-900 space-y-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button class="btn-render-inapp w-full py-2 bg-gradient-to-r from-accent-600 to-brand-600 hover:from-accent-500 hover:to-brand-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-accent-500/20 transition">
                        <i data-lucide="play-circle" class="w-3.5 h-3.5 text-white"></i>
                        <span>Buat Video In-App (Tanpa Pindah Tab)</span>
                    </button>
                    <button class="btn-preview-imagen w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition">
                        <i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i>
                        <span>Preview Gambar Tokoh</span>
                    </button>
                </div>

                <!-- Secondary Link: Google Gemini Omni Video API -->
                <button class="btn-generate-video text-[10px] text-slate-500 hover:text-slate-300 underline text-center block w-full py-0.5">
                    Coba Generate via Google Gemini Omni Video API (.mp4)
                </button>

                <!-- Video Player Container -->
                <div class="video-container hidden text-center space-y-2 pt-2 bg-slate-900/60 p-3 rounded-xl border border-accent-500/30">
                    <video class="scene-video-player mx-auto rounded-xl border border-accent-500/50 max-h-80 w-auto shadow-2xl" controls autoplay loop playsinline></video>
                    <div class="flex items-center justify-center gap-2 pt-1">
                        <a class="btn-download-video text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow transition" download="drama-scene.webm">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Unduh Video (.webm)
                        </a>
                    </div>
                </div>

                <!-- Image Preview Container -->
                <div class="preview-image-container hidden text-center pt-1">
                    <img class="preview-img mx-auto rounded-xl border border-slate-700 max-h-80 object-cover shadow-lg" alt="AI Preview" />
                </div>
            </div>
        `;

        // Wire Copy Dialogue
        sceneCard.querySelector('.btn-copy-dialogue')?.addEventListener('click', () => {
            copyToClipboard(scene.dialogue, `Dialog Scene ${scene.scene_number} disalin!`);
        });

        // Wire Play Dialogue (Web Speech Audio)
        sceneCard.querySelector('.btn-play-dialogue')?.addEventListener('click', () => {
            speakVoiceover(scene.dialogue);
        });

        // Wire Copy Prompt
        sceneCard.querySelector('.btn-copy-prompt')?.addEventListener('click', () => {
            copyToClipboard(scene.google_flow_prompt, `Prompt Google Flow Scene ${scene.scene_number} disalin!`);
        });

        // Wire Google Flow 1-Click Bridge
        const btnFlow = sceneCard.querySelector('.btn-flow-render');
        const flowStatusMsg = sceneCard.querySelector('.flow-status-msg');
        btnFlow?.addEventListener('click', async () => {
            await copyToClipboard(scene.google_flow_prompt, `Prompt Adegan ${scene.scene_number || (index + 1)} disalin! Beralih ke Studio Google Flow...`);
            switchTab('flow');
            if (flowStatusMsg) flowStatusMsg.classList.remove('hidden');
            btnFlow.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Buka di Studio Flow`;
            if (window.lucide) window.lucide.createIcons();
        });

        // Wire In-App Video Renderer (Canvas + Pollinations + MediaRecorder)
        const btnInApp = sceneCard.querySelector('.btn-render-inapp');
        const videoContainer = sceneCard.querySelector('.video-container');
        const videoPlayer = sceneCard.querySelector('.scene-video-player');
        const btnDownloadVideo = sceneCard.querySelector('.btn-download-video');

        btnInApp?.addEventListener('click', async () => {
            btnInApp.disabled = true;
            btnInApp.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Merender Video...`;

            try {
                // 1. Get visual artwork
                const imageUrl = await generateImagen3(scene.google_flow_prompt, '9:16');

                // 2. Play speech audio in sync
                speakVoiceover(scene.dialogue);

                // 3. Render animated video canvas
                const videoBlobUrl = await renderInAppSceneVideo({
                    imageUrl,
                    durationSeconds: scene.duration_seconds || 5,
                    captionText: scene.dialogue,
                    voiceoverText: scene.dialogue,
                    sceneNumber: scene.scene_number || (index + 1)
                });

                videoPlayer.src = videoBlobUrl;
                btnDownloadVideo.href = videoBlobUrl;
                btnDownloadVideo.download = `kawandigi-drama-ep${drama.episode_info?.episode_number || 1}-sc${scene.scene_number || (index + 1)}.webm`;
                videoContainer.classList.remove('hidden');
                btnInApp.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-white"></i> Render Ulang Video`;
                showToast(`Video Episode ${drama.episode_info?.episode_number || 1} Scene ${scene.scene_number || (index + 1)} berhasil dibuat!`, 'success');
            } catch (err) {
                showToast('Gagal merender video: ' + err.message, 'error');
                btnInApp.innerHTML = `<i data-lucide="play-circle" class="w-3.5 h-3.5 text-white"></i> Buat Video In-App`;
            } finally {
                btnInApp.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }
        });

        // Wire Gemini Omni Video API (for accounts with Cloud billing)
        const btnVideo = sceneCard.querySelector('.btn-generate-video');
        btnVideo?.addEventListener('click', async () => {
            btnVideo.disabled = true;
            btnVideo.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block mr-1"></div> Menghubungi Gemini Omni API...`;
            try {
                const videoDataUrl = await generateOmniVideo(scene.google_flow_prompt, '9:16');
                videoPlayer.src = videoDataUrl;
                btnDownloadVideo.href = videoDataUrl;
                btnDownloadVideo.download = `kawandigi-drama-ep${drama.episode_info?.episode_number || 1}-sc${scene.scene_number || (index + 1)}.mp4`;
                videoContainer.classList.remove('hidden');
                showToast(`Video Episode ${drama.episode_info?.episode_number || 1} Scene ${scene.scene_number || (index + 1)} siap ditonton!`, 'success');
            } catch (err) {
                if (err.message === 'FREE_TIER_VIDEO_LIMIT') {
                    openVideoTierModal(scene.google_flow_prompt);
                } else {
                    showToast(err.message, 'error');
                }
            } finally {
                btnVideo.disabled = false;
                btnVideo.textContent = 'Coba Generate via Google Gemini Omni Video API (.mp4)';
                if (window.lucide) window.lucide.createIcons();
            }
        });

        // Wire Imagen Preview
        const btnImagen = sceneCard.querySelector('.btn-preview-imagen');
        const imgContainer = sceneCard.querySelector('.preview-image-container');
        const previewImg = sceneCard.querySelector('.preview-img');

        btnImagen?.addEventListener('click', async () => {
            btnImagen.disabled = true;
            btnImagen.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-accent-400 border-t-transparent rounded-full animate-spin"></div> Merender Karakter...`;
            try {
                const imgData = await generateImagen3(scene.google_flow_prompt, '9:16');
                previewImg.src = imgData;
                imgContainer.classList.remove('hidden');
                btnImagen.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-accent-400"></i> Render Ulang Gambar`;
                showToast(`Visual Preview Scene ${scene.scene_number} siap!`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
                btnImagen.innerHTML = `<i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i> Preview Gambar`;
            } finally {
                btnImagen.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }
        });

        sceneList.appendChild(sceneCard);
    });

    if (window.lucide) window.lucide.createIcons();
}

// =========================================================================
// LICENSE & ACCESS CONTROLLER
// =========================================================================
function updateLicenseCards() {
    const user = getCurrentUser();
    const isLoggedIn = user && user.email;
    const isSuper = isSuperAdmin(user);

    const guestPrompt = document.getElementById('license-guest-prompt');
    const inputContainer = document.getElementById('license-input-container');
    const adminNotice = document.getElementById('license-admin-notice');
    const formArea = document.getElementById('license-form-area');

    if (isLoggedIn) {
        if (guestPrompt) guestPrompt.classList.add('hidden');
        if (inputContainer) inputContainer.classList.remove('hidden');

        if (isSuper) {
            if (adminNotice) adminNotice.classList.remove('hidden');
            if (formArea) formArea.classList.add('hidden');
        } else {
            if (adminNotice) adminNotice.classList.add('hidden');
            if (formArea) formArea.classList.remove('hidden');
        }
    } else {
        if (guestPrompt) guestPrompt.classList.remove('hidden');
        if (inputContainer) inputContainer.classList.add('hidden');
        if (adminNotice) adminNotice.classList.add('hidden');
    }

    const licenses = getLicenses();
    const isVip = isSuper || (licenses['all_access'] && (!licenses['all_access'].expires || new Date(licenses['all_access'].expires) > new Date()));

    // 1. UGC Card Status
    const ugcStatusEl = document.getElementById('status-card-ugc');
    if (ugcStatusEl) {
        if (isSuper) {
            ugcStatusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Akses Superadmin</span>`;
        } else if (isVip || (licenses['ugc'] && (!licenses['ugc'].expires || new Date(licenses['ugc'].expires) > new Date()))) {
            ugcStatusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs"><i data-lucide="check" class="w-3.5 h-3.5"></i> Lisensi Aktif</span>`;
        } else {
            const used = getTrialUsage('ugc');
            const left = Math.max(0, FREE_TRIAL_LIMIT - used);
            ugcStatusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Trial: Sisa ${left}x Coba</span>`;
        }
    }

    // 2. Drama Card Status
    const dramaStatusEl = document.getElementById('status-card-drama');
    if (dramaStatusEl) {
        if (isSuper) {
            dramaStatusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Akses Superadmin</span>`;
        } else if (isVip || (licenses['drama'] && (!licenses['drama'].expires || new Date(licenses['drama'].expires) > new Date()))) {
            dramaStatusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs"><i data-lucide="check" class="w-3.5 h-3.5"></i> Lisensi Aktif</span>`;
        } else {
            const used = getTrialUsage('drama');
            const left = Math.max(0, FREE_TRIAL_LIMIT - used);
            dramaStatusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Trial: Sisa ${left}x Coba</span>`;
        }
    }

    // 3. VIP Card Status
    const vipStatusEl = document.getElementById('status-card-vip');
    if (vipStatusEl) {
        if (isSuper) {
            vipStatusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs"><i data-lucide="crown" class="w-3.5 h-3.5"></i> Superadmin Unlimited</span>`;
        } else if (isVip) {
            vipStatusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs"><i data-lucide="check-check" class="w-3.5 h-3.5"></i> All-Access VIP Aktif</span>`;
        } else {
            vipStatusEl.innerHTML = `<span class="text-xs text-slate-400">Belum Berlangganan VIP</span>`;
        }
    }

    if (window.lucide) window.lucide.createIcons();
}

function initLicenseManager() {
    const btnActivate = document.getElementById('btn-activate-license');
    const inputKey = document.getElementById('license-key-input');
    const alertBox = document.getElementById('license-alert');

    btnActivate?.addEventListener('click', () => {
        const raw = inputKey.value.trim();
        const res = activateLicenseKey(raw);

        alertBox.classList.remove('hidden', 'bg-emerald-950/40', 'border-emerald-500/40', 'text-emerald-300', 'bg-rose-950/40', 'border-rose-500/40', 'text-rose-300');

        if (res.success) {
            alertBox.classList.add('bg-emerald-950/40', 'border', 'border-emerald-500/40', 'text-emerald-300');
            alertBox.innerHTML = `✓ ${res.message}`;
            inputKey.value = '';
            showToast(res.message, 'success');
        } else {
            alertBox.classList.add('bg-rose-950/40', 'border', 'border-rose-500/40', 'text-rose-300');
            alertBox.innerHTML = `⚠️ ${res.message}`;
            showToast(res.message, 'error');
        }

        updateLicenseCards();
    });

    updateLicenseCards();
}

// =========================================================================
// THEME TOGGLE CONTROLLER (Dark, Light, System)
// =========================================================================
function getStoredTheme() {
    return localStorage.getItem('kawandigi_theme') || 'dark';
}

function applyTheme(theme) {
    const html = document.documentElement;
    const btnToggle = document.getElementById('btn-theme-toggle');
    let effectiveDark = true;

    if (theme === 'light') {
        effectiveDark = false;
    } else if (theme === 'dark') {
        effectiveDark = true;
    } else if (theme === 'system') {
        effectiveDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (effectiveDark) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }

    if (btnToggle) {
        if (theme === 'dark') {
            btnToggle.innerHTML = `<i data-lucide="moon" class="w-4 h-4 text-brand-400"></i>`;
            btnToggle.title = 'Tema: Mode Gelap (Klik ganti ke Mode Terang)';
        } else if (theme === 'light') {
            btnToggle.innerHTML = `<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>`;
            btnToggle.title = 'Tema: Mode Terang (Klik ganti ke Sesuai Sistem)';
        } else {
            btnToggle.innerHTML = `<i data-lucide="laptop" class="w-4 h-4 text-emerald-400"></i>`;
            btnToggle.title = 'Tema: Sesuai Sistem Device (Klik ganti ke Mode Gelap)';
        }
    }
    if (window.lucide) window.lucide.createIcons();
}

function cycleTheme() {
    const current = getStoredTheme();
    let next = 'dark';
    if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'system';
    else if (current === 'system') next = 'dark';

    localStorage.setItem('kawandigi_theme', next);
    applyTheme(next);
    
    const labelMap = { dark: 'Mode Gelap', light: 'Mode Terang', system: 'Sesuai Sistem Device' };
    showToast(`Tema diubah: ${labelMap[next]}`, 'info');
}

function initThemeToggle() {
    const btnToggle = document.getElementById('btn-theme-toggle');
    btnToggle?.addEventListener('click', cycleTheme);

    // Watch for OS theme changes if user selected 'system'
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (getStoredTheme() === 'system') {
                applyTheme('system');
            }
        });
    }

    applyTheme(getStoredTheme());
}

// =========================================================================
// PROJECT HISTORY CONTROLLER (Max 20 Projects, Browser Local Storage)
// =========================================================================
function updateHistoryBadge() {
    const list = getHistory();
    const count = list.length;
    const headerBadge = document.getElementById('history-counter-badge');
    const drawerBadge = document.getElementById('drawer-count-badge');
    const mobileBadge = document.getElementById('m-history-badge');

    if (headerBadge) headerBadge.textContent = count;
    if (drawerBadge) drawerBadge.textContent = `${count} / 20`;
    if (mobileBadge) {
        mobileBadge.textContent = count;
        if (count > 0) mobileBadge.classList.remove('hidden');
        else mobileBadge.classList.add('hidden');
    }
}

function openHistoryDrawer() {
    const drawer = document.getElementById('drawer-history');
    if (!drawer) return;
    drawer.classList.remove('hidden');
    setTimeout(() => {
        drawer.classList.add('open');
    }, 10);
    renderHistoryList(document.getElementById('history-search-input')?.value || '');
}

function closeHistoryDrawer() {
    const drawer = document.getElementById('drawer-history');
    if (!drawer) return;
    drawer.classList.remove('open');
    setTimeout(() => {
        drawer.classList.add('hidden');
    }, 300);
}

function renderHistoryList(filterQuery = '') {
    const container = document.getElementById('history-list-container');
    const emptyState = document.getElementById('history-empty-state');
    if (!container) return;

    updateHistoryBadge();
    const all = getHistory();

    let items = all;
    if (filterQuery && filterQuery.trim()) {
        const q = filterQuery.trim().toLowerCase();
        items = all.filter(it => 
            (it.title && it.title.toLowerCase().includes(q)) ||
            (it.category && it.category.toLowerCase().includes(q)) ||
            (it.previewText && it.previewText.toLowerCase().includes(q))
        );
    }

    if (items.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    container.innerHTML = '';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-item-card bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-xl p-3.5 space-y-2.5 transition shadow-sm';
        card.dataset.id = item.id;

        const isDrama = item.type === 'drama';
        const typeBadgeClass = isDrama 
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
            : 'bg-brand-500/20 text-brand-300 border-brand-500/30';
        const typeBadgeText = isDrama ? '🎬 AI Drama' : '🛍️ UGC Affiliate';

        card.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadgeClass}">
                        ${typeBadgeText}
                    </span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                        ⏱️ ${item.duration}s
                    </span>
                    <span class="text-[10px] text-slate-400 font-medium">
                        ${formatRelativeTime(item.timestamp)}
                    </span>
                </div>
                <button class="btn-delete-item text-slate-500 hover:text-rose-400 p-1 rounded transition" title="Hapus dari riwayat">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>

            <div>
                <h4 class="text-xs font-bold text-white line-clamp-1">${item.title || 'Project Tanpa Judul'}</h4>
                <p class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Kategori: <span class="text-slate-300">${item.category || '-'}</span></p>
            </div>

            ${item.previewText ? `
            <p class="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 line-clamp-2 italic leading-relaxed">
                "${item.previewText}"
            </p>
            ` : ''}

            <div class="flex items-center gap-2 pt-1">
                <button class="btn-load-item flex-1 py-1.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95">
                    <i data-lucide="folder-open" class="w-3.5 h-3.5"></i>
                    <span>Buka Project</span>
                </button>
                <button class="btn-copy-prompt-item px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 transition" title="Salin Prompt Video Siap Pakai">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                    <span>Prompt</span>
                </button>
            </div>
        `;

        // Wire Load
        card.querySelector('.btn-load-item')?.addEventListener('click', () => {
            loadProject(item);
        });

        // Wire Copy Prompt
        card.querySelector('.btn-copy-prompt-item')?.addEventListener('click', () => {
            if (isDrama) {
                const text = item.data?.formatted_script || JSON.stringify(item.data, null, 2);
                copyToClipboard(text, `Naskah Drama "${item.title}" disalin!`);
            } else {
                const text = formatFullPromptVideoText(item.data);
                copyToClipboard(text, `Prompt Video "${item.title}" disalin!`);
            }
        });

        // Wire Delete
        card.querySelector('.btn-delete-item')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Hapus project "${item.title}" dari riwayat?`)) {
                deleteHistoryItem(item.id);
                renderHistoryList(document.getElementById('history-search-input')?.value || '');
                showToast(`Project "${item.title}" dihapus dari riwayat`, 'info');
            }
        });

        container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}

function loadProject(item, quiet = false) {
    if (!item || !item.data) return;

    if (item.type === 'drama') {
        // Switch to Drama tab
        const navDrama = document.getElementById('nav-drama');
        navDrama?.click();

        // Restore inputs
        if (item.inputs) {
            const titleInput = document.getElementById('drama-title');
            const epInput = document.getElementById('drama-episode-num');
            const genreSelect = document.getElementById('drama-genre');
            const premiseInput = document.getElementById('drama-premise');
            const heroNameInput = document.getElementById('drama-hero-name');
            const heroDescInput = document.getElementById('drama-hero-desc');
            const villainNameInput = document.getElementById('drama-villain-name');
            const villainDescInput = document.getElementById('drama-villain-desc');

            if (titleInput && item.inputs.seriesTitle) titleInput.value = item.inputs.seriesTitle;
            if (epInput && item.inputs.episodeNumber) epInput.value = item.inputs.episodeNumber;
            if (genreSelect && item.inputs.genre) genreSelect.value = item.inputs.genre;
            if (premiseInput && item.inputs.storyPremise) premiseInput.value = item.inputs.storyPremise;
            if (heroNameInput && item.inputs.heroName) heroNameInput.value = item.inputs.heroName;
            if (heroDescInput && item.inputs.heroDesc) heroDescInput.value = item.inputs.heroDesc;
            if (villainNameInput && item.inputs.villainName) villainNameInput.value = item.inputs.villainName;
            if (villainDescInput && item.inputs.villainDesc) villainDescInput.value = item.inputs.villainDesc;
            if (item.inputs.sceneCount) setDramaScenes(item.inputs.sceneCount);
        }

        currentDramaEpisode = item.data;
        renderDramaResults(item.data);
        document.getElementById('drama-actions')?.classList.remove('hidden');
    } else {
        // Default UGC Affiliate
        const navUgc = document.getElementById('nav-ugc');
        navUgc?.click();

        // Restore inputs
        if (item.inputs) {
            const urlInput = document.getElementById('ugc-url');
            const nameInput = document.getElementById('ugc-name');
            const catSelect = document.getElementById('ugc-category');
            const toneSelect = document.getElementById('ugc-tone');
            const talentSelect = document.getElementById('ugc-talent');
            const promoInput = document.getElementById('ugc-selling');

            if (urlInput && item.inputs.productUrl) urlInput.value = item.inputs.productUrl;
            if (nameInput && item.inputs.productName) nameInput.value = item.inputs.productName;
            if (catSelect && item.inputs.productCategory) catSelect.value = item.inputs.productCategory;
            if (toneSelect && item.inputs.tone) toneSelect.value = item.inputs.tone;
            if (talentSelect && item.inputs.talentPreference) {
                talentSelect.value = item.inputs.talentPreference;
                talentSelect.dispatchEvent(new Event('change'));
            }
            if (promoInput && item.inputs.sellingPoints) promoInput.value = item.inputs.sellingPoints;
            if (item.inputs.videoDuration) setUgcDuration(item.inputs.videoDuration);
        }

        currentUgcCampaign = item.data;
        renderUgcResults(item.data);
        populateGoogleFlowStudio(item.data);
    }

    setLastActiveProjectId(item.id);
    closeHistoryDrawer();

    if (!quiet) {
        showToast(`Project "${item.title}" berhasil dimuat kembali!`, 'success');
    }
}

function initHistoryManager() {
    // Buttons to open drawer
    document.getElementById('btn-open-history')?.addEventListener('click', openHistoryDrawer);
    document.getElementById('m-nav-history')?.addEventListener('click', openHistoryDrawer);

    // Buttons to close drawer
    document.getElementById('btn-close-history')?.addEventListener('click', closeHistoryDrawer);
    document.getElementById('drawer-history-backdrop')?.addEventListener('click', closeHistoryDrawer);

    // Search filter
    const searchInput = document.getElementById('history-search-input');
    searchInput?.addEventListener('input', (e) => {
        renderHistoryList(e.target.value);
    });

    // Clear all history
    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
        const count = getHistory().length;
        if (count === 0) {
            showToast('Riwayat masih kosong', 'info');
            return;
        }
        if (confirm(`Yakin ingin menghapus seluruh ${count} riwayat project? Tindakan ini tidak dapat dibatalkan.`)) {
            clearAllHistory();
            renderHistoryList();
            showToast('Seluruh riwayat project telah dibersihkan', 'info');
        }
    });

    // Export backup JSON
    document.getElementById('btn-export-history')?.addEventListener('click', () => {
        const count = getHistory().length;
        if (count === 0) {
            showToast('Tidak ada riwayat untuk di-backup', 'info');
            return;
        }
        exportHistoryJson();
        showToast(`Backup ${count} riwayat berhasil diunduh!`, 'success');
    });

    updateHistoryBadge();

    // Start with a clean/fresh project slate upon refresh as requested by user.
    // Existing projects remain fully accessible in the Riwayat drawer.
    console.log('[KawanDigi] Kanvas bersih diinisialisasi. Riwayat tersimpan rapi di drawer.');
}


// =========================================================================
// COLLAPSIBLE HERO BANNERS (MOBILE OPTIMIZATION)
// =========================================================================
function initCollapsibleBanners() {
    // UGC Hero Banner Toggle
    const btnToggleUgc = document.getElementById('btn-toggle-ugc-banner');
    const ugcBanner = document.getElementById('ugc-hero-banner');
    const ugcText = document.getElementById('btn-toggle-ugc-text');
    if (btnToggleUgc && ugcBanner) {
        btnToggleUgc.addEventListener('click', () => {
            const isHidden = ugcBanner.classList.contains('hidden');
            if (isHidden) {
                ugcBanner.classList.remove('hidden');
                if (ugcText) ugcText.textContent = 'Tutup Info ▴';
            } else {
                ugcBanner.classList.add('hidden');
                if (ugcText) ugcText.textContent = 'Panduan Tool ▾';
            }
        });
    }

    // Drama Hero Banner Toggle
    const btnToggleDrama = document.getElementById('btn-toggle-drama-banner');
    const dramaBanner = document.getElementById('drama-hero-banner');
    const dramaText = document.getElementById('btn-toggle-drama-text');
    if (btnToggleDrama && dramaBanner) {
        btnToggleDrama.addEventListener('click', () => {
            const isHidden = dramaBanner.classList.contains('hidden');
            if (isHidden) {
                dramaBanner.classList.remove('hidden');
                if (dramaText) dramaText.textContent = 'Tutup Info ▴';
            } else {
                dramaBanner.classList.add('hidden');
                if (dramaText) dramaText.textContent = 'Panduan Tool ▾';
            }
        });
    }
}

// =========================================================================
// CATALOG & STORE RENDERING
// =========================================================================
function renderCatalog() {
    renderToolsCatalog();
    renderProductsCatalog();
    if (window.lucide) window.lucide.createIcons();
}

function renderToolsCatalog() {
    const grid = document.getElementById('catalog-tools-grid');
    const countBadge = document.getElementById('catalog-tools-count');
    if (!grid) return;

    const tools = getFeatureFlags();
    if (countBadge) countBadge.textContent = `${tools.length} Tools`;

    grid.innerHTML = tools.map(tool => {
        const enabled = tool.enabled;
        const iconName = tool.icon || 'sparkles';
        const badgeColor = enabled 
            ? 'bg-brand-500/20 text-brand-300 border-brand-500/30' 
            : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

        const actionButton = enabled && tool.actionTab
            ? `<button type="button" onclick="window.kdSwitchTab('${tool.actionTab}')" class="w-full py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center gap-1.5 transition">
                <span>Buka Tool</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
               </button>`
            : `<button type="button" disabled class="w-full py-2.5 bg-slate-800 text-slate-500 cursor-not-allowed font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700/60">
                <i data-lucide="clock" class="w-4 h-4"></i>
                <span>${tool.badge || 'Segera Hadir'}</span>
               </button>`;

        return `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition group shadow-sm ${!enabled ? 'opacity-75' : ''}">
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold border border-brand-500/30">
                            <i data-lucide="${iconName}" class="w-5 h-5"></i>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}">
                            ${tool.badge}
                        </span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 font-medium">${tool.category}</span>
                        <h4 class="text-sm font-bold text-white group-hover:text-brand-300 transition">${tool.name}</h4>
                    </div>
                    <p class="text-xs text-slate-400 leading-relaxed">${tool.description}</p>
                </div>
                <div class="pt-4 border-t border-slate-800/80 mt-4">
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

function renderProductsCatalog() {
    const grid = document.getElementById('catalog-products-grid');
    if (!grid) return;

    const products = getDigitalProducts();
    grid.innerHTML = products.map(prod => {
        const waLink = generateProductWaLink(prod);
        return `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition group shadow-md">
                <div class="space-y-3">
                    <div class="relative w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <img src="${prod.thumbnail || 'assets/icons/logo.png'}" alt="${prod.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.src='assets/icons/logo.png'">
                        ${prod.badge ? `<span class="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black shadow-md">${prod.badge}</span>` : ''}
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-white group-hover:text-amber-300 transition leading-snug">${prod.title}</h4>
                        <div class="flex items-baseline gap-2 mt-1.5">
                            <span class="text-base font-black text-emerald-400">${formatRupiah(prod.price)}</span>
                            ${prod.originalPrice ? `<span class="text-xs text-slate-500 line-through">${formatRupiah(prod.originalPrice)}</span>` : ''}
                        </div>
                    </div>
                    <p class="text-xs text-slate-400 leading-relaxed">${prod.description}</p>
                </div>
                <div class="pt-4 border-t border-slate-800/80 mt-4">
                    <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                        <span>Beli via WhatsApp</span>
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// =========================================================================
// TUTORIALS RENDERING
// =========================================================================
function renderTutorials() {
    const grid = document.getElementById('tutorial-videos-grid');
    if (!grid) return;

    const tutorials = getTutorialVideos();
    grid.innerHTML = tutorials.map(tut => {
        let embed = tut.embedUrl || '';
        if (embed.includes('watch?v=')) {
            embed = embed.replace('watch?v=', 'embed/');
        }
        return `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-indigo-500/40 transition group shadow-md">
                <div>
                    <div class="relative w-full aspect-video bg-black">
                        <iframe src="${embed}" title="${tut.title}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                    <div class="p-4 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${tut.category || 'Tutorial'}</span>
                            <span class="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <i data-lucide="clock" class="w-3.5 h-3.5"></i> ${tut.duration || '08:00'}
                            </span>
                        </div>
                        <h4 class="text-sm font-bold text-white group-hover:text-indigo-300 transition leading-snug">${tut.title}</h4>
                        <p class="text-xs text-slate-400 leading-relaxed">${tut.summary || ''}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
}


// =========================================================================
// LEADERBOARD & GAMIFICATION RENDERING
// =========================================================================
function renderLeaderboard() {
    const podiumGrid = document.getElementById('podium-top3-grid');
    const tableBody = document.getElementById('leaderboard-table-body');
    const myRankPos = document.getElementById('my-rank-position');
    const myRankLevel = document.getElementById('my-rank-level');
    const myRankXp = document.getElementById('my-rank-xp');
    const myRankAvatar = document.getElementById('my-rank-avatar');

    const { top3, rest, myRank, totalParticipants } = getLeaderboard();

    // Render Top 3 Podium
    if (podiumGrid) {
        const medals = [
            { 
                rank: 1, 
                medal: '🥇 Juara 1', 
                crown: '👑', 
                border: 'border-amber-400 dark:border-amber-500 shadow-amber-500/10 dark:shadow-amber-500/20', 
                badgeBg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-slate-900 dark:border-slate-700 dark:text-amber-300' 
            },
            { 
                rank: 2, 
                medal: '🥈 Juara 2', 
                crown: '🥈', 
                border: 'border-slate-300 dark:border-slate-600 shadow-slate-400/10 dark:shadow-slate-500/10', 
                badgeBg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300' 
            },
            { 
                rank: 3, 
                medal: '🥉 Juara 3', 
                crown: '🥉', 
                border: 'border-amber-600/40 dark:border-amber-700 shadow-orange-500/10 dark:shadow-amber-800/10', 
                badgeBg: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-slate-900 dark:border-slate-700 dark:text-orange-300' 
            }
        ];

        podiumGrid.innerHTML = top3.map((m, idx) => {
            const config = medals[idx] || medals[2];
            const levelInfo = calculateLevel(m.xp || 0);

            return `
                <div class="podium-card bg-white dark:bg-slate-900 border-2 ${config.border} rounded-2xl p-5 flex flex-col justify-between text-center relative shadow-lg transform ${idx === 0 ? 'md:-translate-y-2' : ''}">
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full ${config.badgeBg} border text-xs font-black">
                        ${config.medal}
                    </div>
                    <div class="pt-3 space-y-2">
                        <div class="relative inline-block mx-auto">
                            <img src="${m.picture || 'assets/icons/favicon.png'}" alt="${m.name}" class="w-16 h-16 rounded-2xl mx-auto object-cover border-2 border-amber-400/60 shadow-md">
                            <span class="absolute -bottom-1 -right-1 text-base">${levelInfo.icon}</span>
                        </div>
                        <div>
                            <h4 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">${m.name}</h4>
                            <span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelInfo.badgeClass}">
                                ${levelInfo.title}
                            </span>
                        </div>
                        <div class="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-around text-xs">
                            <div>
                                <span class="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Video Dibuat</span>
                                <span class="font-bold text-slate-800 dark:text-white">${m.totalGenerates || 0}</span>
                            </div>
                            <div class="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                            <div>
                                <span class="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Total XP</span>
                                <span class="font-black text-emerald-600 dark:text-emerald-400 font-mono">${m.xp || 0} XP</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render Ranks 4 to 50
    if (tableBody) {
        if (rest.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 dark:text-slate-400">Belum ada peserta tambahan di peringkat ini.</td></tr>`;
        } else {
            tableBody.innerHTML = rest.map((m, idx) => {
                const rankNum = idx + 4;
                const levelInfo = calculateLevel(m.xp || 0);

                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td class="p-3.5 text-center font-bold text-slate-600 dark:text-slate-400 font-mono">#${rankNum}</td>
                        <td class="p-3.5 flex items-center gap-2.5">
                            <img src="${m.picture || 'assets/icons/favicon.png'}" alt="${m.name}" class="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800">
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white text-xs">${m.name}</div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400">${m.email ? m.email.split('@')[0] + '@***' : 'Kreator'}</div>
                            </div>
                        </td>
                        <td class="p-3.5">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${levelInfo.badgeClass}">
                                <span>${levelInfo.icon}</span> ${levelInfo.title}
                            </span>
                        </td>
                        <td class="p-3.5 text-center font-bold text-slate-800 dark:text-white font-mono">${m.totalGenerates || 0}</td>
                        <td class="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">${m.xp || 0} XP</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Update Current User Sticky Bar
    if (myRank) {
        if (myRankPos) myRankPos.textContent = `#${myRank.position}`;
        if (myRankLevel) {
            myRankLevel.textContent = `${myRank.tier.icon} ${myRank.tier.title}`;
            myRankLevel.className = `text-[10px] px-2 py-0.5 rounded-full border ${myRank.tier.badgeClass}`;
        }
        if (myRankXp) myRankXp.textContent = `${myRank.member.xp || 0} XP`;
        if (myRankAvatar) myRankAvatar.src = myRank.member.picture || 'assets/icons/favicon.png';
    } else {
        const cur = getCurrentUser();
        if (myRankPos) myRankPos.textContent = '#-- (Tamu)';
        if (myRankLevel) myRankLevel.textContent = '🥉 Novice Creator';
        if (myRankXp) myRankXp.textContent = `${cur?.xp || 0} XP`;
        if (myRankAvatar) myRankAvatar.src = cur?.picture || 'assets/icons/favicon.png';
    }

    if (window.lucide) window.lucide.createIcons();
}

// =========================================================================
// ADMIN 24-HOUR ANALYTICS & PEAK USAGE CHART
// =========================================================================
function renderAdminAnalytics() {
    const peakHoursEl = document.getElementById('analytics-peak-hours');
    const totalLogsEl = document.getElementById('analytics-total-logs');
    const topCreatorEl = document.getElementById('analytics-top-creator');
    const chartContainer = document.getElementById('analytics-24h-chart');
    const logsBody = document.getElementById('analytics-live-logs-body');

    const { distribution, peakSummary, totalLogs, topPeak } = getActivityHourlyDistribution();
    const members = getMemberList();
    const topMember = [...members].sort((a, b) => (b.totalGenerates || 0) - (a.totalGenerates || 0))[0];

    if (peakHoursEl) peakHoursEl.textContent = peakSummary;
    if (totalLogsEl) totalLogsEl.textContent = `${totalLogs} Aktivitas`;
    if (topCreatorEl && topMember) topCreatorEl.textContent = `${topMember.name} (${topMember.totalGenerates || 0}x)`;

    // Render 24-Hour CSS Bar Chart
    if (chartContainer) {
        const maxCount = Math.max(...distribution.map(d => d.count), 1);

        chartContainer.innerHTML = distribution.map(d => {
            const heightPct = Math.max(12, Math.round((d.count / maxCount) * 100));
            const isPeak = d.count === topPeak.count && d.count > 0;
            const barBg = isPeak 
                ? 'bg-gradient-to-t from-amber-500 to-yellow-400 shadow-md shadow-amber-500/30' 
                : (d.count > 0 ? 'bg-gradient-to-t from-emerald-600 to-teal-400' : 'bg-slate-800/80');

            return `
                <div class="flex-1 flex flex-col items-center justify-end h-full group relative" title="Pukul ${d.label} WIB: ${d.count} kali generate">
                    <span class="opacity-0 group-hover:opacity-100 transition absolute -top-6 text-[9px] font-mono font-bold bg-slate-900 border border-slate-700 text-white px-1 rounded z-10 whitespace-nowrap">
                        ${d.label}: ${d.count}x
                    </span>
                    <div class="w-full rounded-t-sm transition-all duration-300 ${barBg}" style="height: ${heightPct}%;"></div>
                </div>
            `;
        }).join('');
    }

    // Render Live Activity Stream
    if (logsBody) {
        const logs = getActivityLogs();
        if (logs.length === 0) {
            logsBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">Belum ada aktivitas tercatat hari ini.</td></tr>`;
        } else {
            logsBody.innerHTML = logs.slice(0, 15).map(log => {
                const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-';
                return `
                    <tr class="hover:bg-slate-900/60 transition">
                        <td class="p-2.5 font-mono text-[11px] text-slate-400">${dateStr}</td>
                        <td class="p-2.5">
                            <span class="font-bold text-white text-[11px]">${log.name || 'Member'}</span>
                        </td>
                        <td class="p-2.5">
                            <span class="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-bold">
                                ${log.tool}
                            </span>
                        </td>
                        <td class="p-2.5 text-[11px] text-slate-300 truncate max-w-xs">${log.detail}</td>
                        <td class="p-2.5 text-right font-mono font-bold text-emerald-400 text-[11px]">+${log.xpEarned || 10} XP</td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (window.lucide) window.lucide.createIcons();
}


// =========================================================================
// USER AUTHENTICATION & GOOGLE OAUTH / GIS
// =========================================================================
async function initAuthManager() {
    // 1. Centralized Google OAuth from Cloudflare backend
    await fetchGoogleClientIdFromServer();

    updateHeaderAuthUI();

    document.getElementById('btn-header-auth')?.addEventListener('click', () => {
        openUserProfileModal();
    });

    document.getElementById('btn-dock-profile')?.addEventListener('click', () => {
        openUserProfileModal();
    });

    document.getElementById('btn-close-profile-modal')?.addEventListener('click', () => {
        document.getElementById('modal-user-profile')?.classList.add('hidden');
    });

    document.getElementById('btn-save-profile-whatsapp')?.addEventListener('click', () => {
        const wa = document.getElementById('profile-input-whatsapp')?.value.trim();
        if (!wa) {
            showToast('Masukkan nomor WhatsApp yang valid.', 'warning');
            return;
        }
        updateCurrentUserProfile({ whatsapp: wa });
        showToast('Nomor WhatsApp profil berhasil diperbarui!', 'success');
        updateHeaderAuthUI();
    });

    document.getElementById('btn-logout-user')?.addEventListener('click', () => {
        logoutUser();
        sessionStorage.removeItem('kd_admin_unlocked');
        document.getElementById('modal-user-profile')?.classList.add('hidden');
        updateHeaderAuthUI();
        showToast('Anda telah keluar dari akun.', 'info');
    });

    document.getElementById('btn-submit-wa-prompt')?.addEventListener('click', () => {
        const wa = document.getElementById('input-wa-prompt')?.value.trim();
        if (!wa || wa.length < 8) {
            showToast('Mohon masukkan nomor WhatsApp yang valid (min. 8 digit).', 'warning');
            return;
        }
        updateCurrentUserProfile({ whatsapp: wa });
        document.getElementById('modal-whatsapp-prompt')?.classList.add('hidden');
        showToast('Nomor WhatsApp berhasil disimpan! Selamat datang di KawanDigi.', 'success');
        updateHeaderAuthUI();
    });

    initGoogleIdentityServices();
}

function updateHeaderAuthUI() {
    const user = getCurrentUser();
    const btn = document.getElementById('btn-header-auth');
    const avatar = document.getElementById('auth-user-avatar');
    const defaultIcon = document.getElementById('auth-default-icon');
    const nameEl = document.getElementById('auth-user-name');

    // Home & Drawer Elements (Matching ambiltiketnya.online)
    const greetingName = document.getElementById('home-greeting-name');
    const greetingRole = document.getElementById('home-greeting-role');
    const drawerName = document.getElementById('drawer-user-name');
    const drawerAvatar = document.getElementById('drawer-user-avatar');
    const drawerTier = document.getElementById('drawer-user-tier');
    const heroXp = document.getElementById('home-hero-xp');
    const heroPct = document.getElementById('home-hero-pct');
    const heroProgress = document.getElementById('home-hero-progress');
    const heroVids = document.getElementById('home-hero-vids');
    const statVids = document.getElementById('stat-card-vids');
    const statXp = document.getElementById('stat-card-xp');

    const xpVal = (user && typeof user.xp === 'number') ? user.xp : 1120;
    const vidsVal = (user && typeof user.totalGenerates === 'number') ? user.totalGenerates : 94;
    const levelInfo = calculateLevel(xpVal);

    // Toggle Admin Visibility: strictly only for active Superadmin
    const isSuper = isSuperAdmin(user);
    const navAdmin = document.getElementById('nav-admin');
    const headerAdmin = document.getElementById('btn-header-admin');
    const drawerAdmin = document.getElementById('drawer-admin-btn');

    if (isSuper) {
        if (navAdmin) { navAdmin.classList.remove('hidden'); navAdmin.classList.add('flex'); }
        if (headerAdmin) { headerAdmin.classList.remove('hidden'); headerAdmin.classList.add('flex'); }
        if (drawerAdmin) { drawerAdmin.classList.remove('hidden'); drawerAdmin.classList.add('flex'); }
    } else {
        if (navAdmin) { navAdmin.classList.add('hidden'); navAdmin.classList.remove('flex'); }
        if (headerAdmin) { headerAdmin.classList.add('hidden'); headerAdmin.classList.remove('flex'); }
        if (drawerAdmin) { drawerAdmin.classList.add('hidden'); drawerAdmin.classList.remove('flex'); }
    }

    if (user && user.email) {
        if (avatar) {
            avatar.src = user.picture || 'assets/icons/favicon.png';
            avatar.classList.remove('hidden');
        }
        if (defaultIcon) defaultIcon.classList.add('hidden');
        if (nameEl) {
            const firstName = (user.name || 'Member').split(' ')[0];
            nameEl.textContent = firstName;
        }
        if (btn) btn.title = `Akun: ${user.name} (${user.email})`;

        if (greetingName) greetingName.textContent = (user.name || 'KREATOR KAWANDIGI').toUpperCase();
        if (greetingRole) greetingRole.textContent = `${user.subscription?.plan || 'MEMBER VIP'} (AKTIF)`;
        if (drawerName) drawerName.textContent = user.name || 'Kreator KawanDigi';
        if (drawerAvatar && user.picture) drawerAvatar.src = user.picture;
        if (drawerTier) drawerTier.textContent = `${levelInfo.icon} ${levelInfo.title} • VIP`;
    } else {
        if (avatar) avatar.classList.add('hidden');
        if (defaultIcon) defaultIcon.classList.remove('hidden');
        if (nameEl) nameEl.textContent = 'Akun';
        if (btn) btn.title = 'Masuk Akun Google';

        if (greetingName) greetingName.textContent = 'KREATOR KAWANDIGI';
        if (greetingRole) greetingRole.textContent = 'TRIAL PENGUNJUNG';
        if (drawerName) drawerName.textContent = 'Tamu / Belum Masuk';
        if (drawerTier) drawerTier.textContent = 'Hubungkan Akun Google';
    }

    if (heroXp) heroXp.textContent = xpVal.toLocaleString('id-ID');
    const pct = Math.min(100, Math.round((xpVal / 1500) * 100));
    if (heroPct) heroPct.textContent = `${pct}%`;
    if (heroProgress) heroProgress.style.width = `${pct}%`;
    if (heroVids) heroVids.textContent = `${vidsVal} Klip`;
    if (statVids) statVids.textContent = vidsVal;
    if (statXp) statXp.textContent = xpVal.toLocaleString('id-ID');
    updateLicenseCards();
}

function openUserProfileModal() {
    const modal = document.getElementById('modal-user-profile');
    if (!modal) return;

    const user = getCurrentUser();
    const avatarEl = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const planBadge = document.getElementById('profile-plan-badge');
    const planName = document.getElementById('profile-plan-name');
    const levelEl = document.getElementById('profile-user-level');
    const xpEl = document.getElementById('profile-user-xp');
    const genEl = document.getElementById('profile-user-generates');
    const logoutContainer = document.getElementById('profile-logout-container');

    if (user && user.email) {
        const levelInfo = calculateLevel(user.xp || 0);
        if (avatarEl) avatarEl.src = user.picture || 'assets/icons/favicon.png';
        if (nameEl) nameEl.textContent = user.name || 'Member KawanDigi';
        if (emailEl) emailEl.textContent = user.email;
        if (planBadge) planBadge.textContent = user.subscription?.plan || 'VIP Master Lifetime';
        if (planName) planName.textContent = user.subscription?.plan || 'Akses Penuh Semua Tools';
        if (levelEl) {
            levelEl.textContent = `${levelInfo.icon} ${levelInfo.title}`;
            levelEl.className = `px-2 py-0.5 rounded-full font-bold text-[10px] border ${levelInfo.badgeClass}`;
        }
        if (xpEl) xpEl.textContent = `${user.xp || 10} XP`;
        if (genEl) genEl.textContent = `${user.totalGenerates || 0} Video Dibuat`;
        if (logoutContainer) logoutContainer.classList.remove('hidden');
    } else {
        if (avatarEl) avatarEl.src = 'assets/icons/favicon.png';
        if (nameEl) nameEl.textContent = 'Tamu / Belum Masuk';
        if (emailEl) emailEl.textContent = 'Silakan hubungkan akun Google Anda di bawah.';
        if (planBadge) planBadge.textContent = 'Trial Pengunjung';
        if (planName) planName.textContent = 'Fitur Terbatas';
        if (levelEl) levelEl.textContent = '🥉 Novice Creator';
        if (xpEl) xpEl.textContent = '0 XP';
        if (genEl) genEl.textContent = '0 Video Dibuat';
        if (logoutContainer) logoutContainer.classList.add('hidden');
    }

    modal.classList.remove('hidden');

    // Pastikan tombol Google OAuth ter-render rapi
    setTimeout(() => {
        renderGoogleSignInButton();
    }, 120);
}

function waitForGoogleGis(callback, maxAttempts = 30) {
    if (window.google?.accounts?.id) {
        callback();
        return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
            clearInterval(interval);
            callback();
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('[KawanDigi] Google Identity Services SDK timeout.');
        }
    }, 150);
}

function initGoogleIdentityServices() {
    const clientId = getGoogleClientId();
    if (!clientId) {
        console.info('[KawanDigi] Google Client ID belum dikonfigurasi di Cloudflare.');
        return;
    }

    waitForGoogleGis(() => {
        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    const payload = decodeJwtResponse(response.credential);
                    if (payload && payload.email) {
                        const currentUser = getCurrentUser() || {};
                        const isAdminUser = payload.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

                        const user = {
                            id: payload.sub,
                            name: payload.name || (isAdminUser ? 'Admin KawanDigi' : 'Member Google'),
                            email: payload.email,
                            picture: payload.picture || 'assets/icons/favicon.png',
                            whatsapp: currentUser.whatsapp || '',
                            joinedAt: currentUser.joinedAt || new Date().toISOString(),
                            role: isAdminUser ? 'superadmin' : 'member',
                            subscription: isAdminUser 
                                ? { plan: 'Superadmin Official Lifetime', active: true } 
                                : (currentUser.subscription || { plan: 'VIP Master Lifetime', active: true }),
                            level: isAdminUser ? 'Mythic Legend' : (currentUser.level || 'Diamond Creator'),
                            xp: isAdminUser ? Math.max(currentUser.xp || 0, 1500) : (currentUser.xp || 100)
                        };

                        saveCurrentUser(user);
                        updateHeaderAuthUI();
                        document.getElementById('modal-user-profile')?.classList.add('hidden');

                        // Sync session ke Cloudflare backend
                        fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(user)
                        }).catch(e => console.error('Cloudflare auth sync:', e));

                        if (isAdminUser) {
                            sessionStorage.setItem('kd_admin_unlocked', '1');
                            showToast(`Selamat datang Superadmin, ${user.name}!`, 'success');
                        } else {
                            showToast(`Selamat datang, ${user.name}!`, 'success');
                        }
                    }
                }
            });

            renderGoogleSignInButton();
        } catch (e) {
            console.error('[KawanDigi] Google Identity Services error:', e);
        }
    });
}

function renderGoogleSignInButton() {
    const btnContainer = document.getElementById('g_id_signin_button');
    if (!btnContainer) return;

    const clientId = getGoogleClientId();
    if (!clientId) {
        btnContainer.innerHTML = `
            <div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1.5 w-full">
                <div class="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs">
                    <i data-lucide="alert-circle" class="w-4 h-4"></i>
                    <span>Google OAuth Client ID Belum Terpasang</span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">
                    Pastikan variable <strong>GOOGLE_CLIENT_ID</strong> sudah di-Deploy di Cloudflare Dashboard &rarr; Variables and Secrets.
                </p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    waitForGoogleGis(() => {
        btnContainer.innerHTML = '';
        const isDark = document.documentElement.classList.contains('dark');
        try {
            window.google.accounts.id.renderButton(btnContainer, {
                theme: isDark ? 'filled_black' : 'outline',
                size: 'large',
                shape: 'pill',
                width: Math.min(window.innerWidth - 64, 280),
                text: 'signin_with',
                locale: 'id'
            });
        } catch (e) {
            console.error('[KawanDigi] Gagal render tombol Google GIS:', e);
            btnContainer.innerHTML = `
                <div class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center text-xs text-rose-300">
                    Gagal memuat tombol Google. Silakan refresh halaman.
                </div>
            `;
        }
    });
}

// =========================================================================
// ADMIN CONSOLE MANAGEMENT
// =========================================================================
function initAdminConsole() {
    document.getElementById('btn-header-admin')?.addEventListener('click', () => {
        window.kdOpenAdminConsole();
    });

    document.getElementById('btn-close-admin-console')?.addEventListener('click', () => {
        document.getElementById('modal-admin-console')?.classList.add('hidden');
    });

    const atabs = {
        'members': { btn: document.getElementById('btn-atab-members'), panel: document.getElementById('admin-section-members') },
        'analytics': { btn: document.getElementById('btn-atab-analytics'), panel: document.getElementById('admin-section-analytics') },
        'flags': { btn: document.getElementById('btn-atab-flags'), panel: document.getElementById('admin-section-flags') },
        'products': { btn: document.getElementById('btn-atab-products'), panel: document.getElementById('admin-section-products') },
        'tutorials': { btn: document.getElementById('btn-atab-tutorials'), panel: document.getElementById('admin-section-tutorials') },
        'settings': { btn: document.getElementById('btn-atab-settings'), panel: document.getElementById('admin-section-settings') }
    };

    function switchAdminTab(targetTab) {
        Object.keys(atabs).forEach(key => {
            const item = atabs[key];
            if (key === targetTab) {
                item.panel?.classList.remove('hidden');
                item.btn?.classList.add('active', 'bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/30');
                item.btn?.classList.remove('text-slate-400');
            } else {
                item.panel?.classList.add('hidden');
                item.btn?.classList.remove('active', 'bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/30');
                item.btn?.classList.add('text-slate-400');
            }
        });
        if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('btn-atab-members')?.addEventListener('click', () => {
        switchAdminTab('members');
        renderAdminMembers();
    });
    document.getElementById('btn-atab-analytics')?.addEventListener('click', () => {
        switchAdminTab('analytics');
        renderAdminAnalytics();
    });
    document.getElementById('btn-atab-flags')?.addEventListener('click', () => {
        switchAdminTab('flags');
        renderAdminFlags();
    });
    document.getElementById('btn-atab-products')?.addEventListener('click', () => {
        switchAdminTab('products');
        renderAdminProducts();
    });
    document.getElementById('btn-atab-tutorials')?.addEventListener('click', () => {
        switchAdminTab('tutorials');
        renderAdminTutorials();
    });
    document.getElementById('btn-atab-settings')?.addEventListener('click', () => {
        switchAdminTab('settings');
        loadAdminSettings();
    });

    document.getElementById('admin-search-members')?.addEventListener('input', (e) => {
        renderAdminMembers(e.target.value);
    });
    document.getElementById('btn-export-members-csv')?.addEventListener('click', () => {
        exportMembersToCsv();
        showToast('Database member berhasil di-export ke CSV!', 'success');
    });

    document.getElementById('btn-save-admin-pin')?.addEventListener('click', () => {
        const newPin = document.getElementById('admin-new-pin')?.value;
        if (setAdminPin(newPin)) {
            showToast('PIN Admin berhasil diperbarui!', 'success');
            document.getElementById('admin-new-pin').value = '';
        } else {
            showToast('PIN minimal 4 karakter.', 'warning');
        }
    });

    document.getElementById('btn-save-google-client-id')?.addEventListener('click', async () => {
        const cid = document.getElementById('admin-google-client-id')?.value.trim();
        if (!cid) {
            showToast('Silakan masukkan Google Client ID yang valid.', 'warning');
            return;
        }
        showToast('Menyimpan Google Client ID ke Cloudflare...', 'info');
        const ok = await saveGoogleClientIdToServer(cid);
        if (ok) {
            showToast('Google Client ID berhasil disimpan ke Cloudflare! Aktif untuk semua HP & PC.', 'success');
        } else {
            showToast('Tersimpan di browser lokal. Pastikan Cloudflare terhubung.', 'info');
        }
        initGoogleIdentityServices();
        renderGoogleSignInButton();
    });

    document.getElementById('btn-add-digital-product')?.addEventListener('click', () => {
        openProductEditor();
    });
    document.getElementById('btn-close-product-editor')?.addEventListener('click', () => {
        document.getElementById('modal-product-editor')?.classList.add('hidden');
    });
    document.getElementById('btn-save-product-editor')?.addEventListener('click', saveProductFromEditor);

    document.getElementById('btn-add-tutorial-video')?.addEventListener('click', () => {
        openTutorialEditor();
    });
    document.getElementById('btn-close-tutorial-editor')?.addEventListener('click', () => {
        document.getElementById('modal-tutorial-editor')?.classList.add('hidden');
    });
    document.getElementById('btn-save-tutorial-editor')?.addEventListener('click', saveTutorialFromEditor);
}

function openAdminConsole() {
    switchTab('admin');
    renderAdminMembers();
    renderAdminAnalytics();
    renderAdminFlags();
    renderAdminProducts();
    renderAdminTutorials();
    loadAdminSettings();
    if (window.lucide) window.lucide.createIcons();
}

function renderAdminMembers(filter = '') {
    const tbody = document.getElementById('admin-member-table-body');
    const badgeCount = document.getElementById('admin-member-count');
    if (!tbody) return;

    let members = getMemberList();
    if (badgeCount) badgeCount.textContent = members.length;

    if (filter) {
        const q = filter.toLowerCase();
        members = members.filter(m => 
            (m.name || '').toLowerCase().includes(q) || 
            (m.email || '').toLowerCase().includes(q)
        );
    }

    if (members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">Tidak ada member yang cocok dengan pencarian.</td></tr>`;
        return;
    }

    tbody.innerHTML = members.map(m => {
        const emailUrl = generateEmailOfferUrl(m.email, m.name, 'promo');
        const dateStr = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
        const levelInfo = calculateLevel(m.xp || 0);

        return `
            <tr class="hover:bg-slate-800/40 transition">
                <td class="p-3">
                    <div class="font-bold text-white flex items-center gap-2">
                        <img src="${m.picture || 'assets/icons/favicon.png'}" class="w-6 h-6 rounded-full object-cover border border-slate-700">
                        <span>${m.name}</span>
                    </div>
                    <div class="text-[11px] text-slate-400 font-mono ml-8">${m.email}</div>
                </td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-bold">
                        ${m.plan || 'Free Trial'}
                    </span>
                </td>
                <td class="p-3 text-center font-bold text-white font-mono">${m.totalGenerates || 0}</td>
                <td class="p-3">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${levelInfo.badgeClass}">
                        <span>${levelInfo.icon}</span> ${m.xp || 0} XP
                    </span>
                </td>
                <td class="p-3 text-[11px] text-slate-400">${dateStr}</td>
                <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        <a href="${emailUrl}" class="px-2.5 py-1 bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/40 rounded text-[10px] font-bold flex items-center gap-1 transition" title="Kirim Email Penawaran">
                            <i data-lucide="mail" class="w-3 h-3"></i> Email Member
                        </a>
                        <button type="button" onclick="window.kdDeleteMember('${m.email}')" class="p-1 hover:text-rose-400 text-slate-500 transition" title="Hapus Member">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

function renderAdminFlags() {
    const list = document.getElementById('admin-flags-list');
    if (!list) return;

    const flags = getFeatureFlags();
    list.innerHTML = flags.map(f => {
        return `
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-slate-900 text-brand-400 flex items-center justify-center font-bold border border-slate-800">
                        <i data-lucide="${f.icon || 'sparkles'}" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h5 class="text-xs font-bold text-white">${f.name}</h5>
                            <span class="text-[9px] px-1.5 py-0.2 rounded-full ${f.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}">${f.category}</span>
                        </div>
                        <p class="text-[11px] text-slate-400 max-w-lg mt-0.5">${f.description}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                    <span class="text-[10px] font-bold ${f.enabled ? 'text-emerald-400' : 'text-slate-500'}">
                        ${f.enabled ? 'AKTIF (Dapat Diakses)' : 'NON-AKTIF (Segera Hadir)'}
                    </span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="window.kdToggleFlag('${f.id}', this.checked)" class="sr-only peer">
                        <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

function renderAdminProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;

    const products = getDigitalProducts();
    list.innerHTML = products.map(p => {
        return `
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div class="flex items-start gap-3">
                    <img src="${p.thumbnail || 'assets/icons/logo.png'}" class="w-16 h-16 rounded-lg object-cover border border-slate-800 flex-shrink-0" onerror="this.src='assets/icons/logo.png'">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                            <h5 class="text-xs font-bold text-white truncate">${p.title}</h5>
                        </div>
                        <div class="text-xs font-bold text-emerald-400 mt-1">${formatRupiah(p.price)}</div>
                        <p class="text-[11px] text-slate-400 line-clamp-2 mt-1">${p.description}</p>
                    </div>
                </div>
                <div class="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button type="button" onclick="window.kdEditProduct('${p.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition">
                        <i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit
                    </button>
                    <button type="button" onclick="window.kdDeleteProduct('${p.id}')" class="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

function renderAdminTutorials() {
    const list = document.getElementById('admin-tutorials-list');
    if (!list) return;

    const tutorials = getTutorialVideos();
    list.innerHTML = tutorials.map(t => {
        return `
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <h5 class="text-xs font-bold text-white">${t.title}</h5>
                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">${t.category || 'Tutorial'}</span>
                        <span class="text-[10px] text-slate-400 font-mono">${t.duration || ''}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 max-w-xl">${t.summary || ''}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onclick="window.kdEditTutorial('${t.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition">
                        <i data-lucide="edit" class="w-3.5 h-3.5"></i> Edit
                    </button>
                    <button type="button" onclick="window.kdDeleteTutorial('${t.id}')" class="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

async function loadAdminSettings() {
    const cidInput = document.getElementById('admin-google-client-id');
    const serverCid = await fetchGoogleClientIdFromServer();
    if (cidInput) cidInput.value = serverCid || getGoogleClientId();
}

function openProductEditor(product = null) {
    const modal = document.getElementById('modal-product-editor');
    if (!modal) return;

    const titleEl = document.getElementById('product-editor-title');
    const idEl = document.getElementById('prod-id');
    const titleIn = document.getElementById('prod-title');
    const priceIn = document.getElementById('prod-price');
    const origPriceIn = document.getElementById('prod-orig-price');
    const badgeIn = document.getElementById('prod-badge');
    const thumbIn = document.getElementById('prod-thumbnail');
    const descIn = document.getElementById('prod-desc');
    const waIn = document.getElementById('prod-wa');

    if (product) {
        if (titleEl) titleEl.textContent = 'Edit Produk Digital';
        idEl.value = product.id;
        titleIn.value = product.title || '';
        priceIn.value = product.price || '';
        origPriceIn.value = product.originalPrice || '';
        badgeIn.value = product.badge || '';
        thumbIn.value = product.thumbnail || '';
        descIn.value = product.description || '';
        waIn.value = product.contactWa || '';
    } else {
        if (titleEl) titleEl.textContent = 'Tambah Produk Digital Baru';
        idEl.value = '';
        titleIn.value = '';
        priceIn.value = '';
        origPriceIn.value = '';
        badgeIn.value = '🔥 Promo Baru';
        thumbIn.value = 'assets/icons/logo.png';
        descIn.value = '';
        waIn.value = '081234567890';
    }

    modal.classList.remove('hidden');
}

function saveProductFromEditor() {
    const id = document.getElementById('prod-id')?.value;
    const title = document.getElementById('prod-title')?.value.trim();
    const price = parseInt(document.getElementById('prod-price')?.value, 10) || 0;
    const origPrice = parseInt(document.getElementById('prod-orig-price')?.value, 10) || 0;
    const badge = document.getElementById('prod-badge')?.value.trim();
    const thumbnail = document.getElementById('prod-thumbnail')?.value.trim() || 'assets/icons/logo.png';
    const description = document.getElementById('prod-desc')?.value.trim();
    const contactWa = document.getElementById('prod-wa')?.value.trim();

    if (!title || price <= 0) {
        showToast('Judul dan harga jual wajib diisi.', 'warning');
        return;
    }

    upsertDigitalProduct({
        id: id || undefined,
        title,
        price,
        originalPrice: origPrice,
        badge,
        thumbnail,
        description,
        contactWa
    });

    document.getElementById('modal-product-editor')?.classList.add('hidden');
    renderAdminProducts();
    renderProductsCatalog();
    showToast('Produk digital berhasil disimpan ke katalog!', 'success');
}

function openTutorialEditor(tutorial = null) {
    const modal = document.getElementById('modal-tutorial-editor');
    if (!modal) return;

    const titleEl = document.getElementById('tutorial-editor-title');
    const idEl = document.getElementById('tut-id');
    const titleIn = document.getElementById('tut-title');
    const catIn = document.getElementById('tut-category');
    const durIn = document.getElementById('tut-duration');
    const embedIn = document.getElementById('tut-embed');
    const sumIn = document.getElementById('tut-summary');

    if (tutorial) {
        if (titleEl) titleEl.textContent = 'Edit Video Tutorial';
        idEl.value = tutorial.id;
        titleIn.value = tutorial.title || '';
        catIn.value = tutorial.category || '';
        durIn.value = tutorial.duration || '';
        embedIn.value = tutorial.embedUrl || '';
        sumIn.value = tutorial.summary || '';
    } else {
        if (titleEl) titleEl.textContent = 'Tambah Video Tutorial Baru';
        idEl.value = '';
        titleIn.value = '';
        catIn.value = 'Affiliate & Flow';
        durIn.value = '08:00';
        embedIn.value = '';
        sumIn.value = '';
    }

    modal.classList.remove('hidden');
}

function saveTutorialFromEditor() {
    const id = document.getElementById('tut-id')?.value;
    const title = document.getElementById('tut-title')?.value.trim();
    const category = document.getElementById('tut-category')?.value.trim() || 'Tutorial';
    const duration = document.getElementById('tut-duration')?.value.trim() || '05:00';
    let embedUrl = document.getElementById('tut-embed')?.value.trim();
    const summary = document.getElementById('tut-summary')?.value.trim();

    if (!title || !embedUrl) {
        showToast('Judul dan embed link YouTube wajib diisi.', 'warning');
        return;
    }

    if (embedUrl.includes('watch?v=')) {
        embedUrl = embedUrl.replace('watch?v=', 'embed/');
    }

    upsertTutorialVideo({
        id: id || undefined,
        title,
        category,
        duration,
        embedUrl,
        summary
    });

    document.getElementById('modal-tutorial-editor')?.classList.add('hidden');
    renderAdminTutorials();
    renderTutorials();
    showToast('Video tutorial berhasil disimpan!', 'success');
}

// Window global helper bindings for inline onclick handlers
window.kdSwitchTab = switchTab;
window.kdOpenDrawer = openDrawer;
window.kdCloseDrawer = closeDrawer;
window.kdOpenProfileModal = openUserProfileModal;
window.kdOpenAdminConsole = () => {
    const user = getCurrentUser();
    if (!isSuperAdmin(user)) {
        showToast('Akses Ditolak: Hanya Superadmin (admin.kawandigi@gmail.com) yang dapat mengakses Console Admin.', 'error');
        return;
    }
    openAdminConsole();
};
window.kdOpenHistory = () => {
    document.getElementById('modal-history-center')?.classList.remove('hidden');
    renderHistoryList();
};
window.kdDeleteMember = (email) => {
    if (confirm(`Hapus member ${email}?`)) {
        deleteMemberRecord(email);
        renderAdminMembers();
        showToast('Member dihapus.', 'info');
    }
};
window.kdToggleFlag = (toolId, state) => {
    toggleToolStatus(toolId, state);
    renderAdminFlags();
    renderToolsCatalog();
    showToast(`Status tool diperbarui: ${state ? 'Aktif' : 'Non-Aktif'}`, 'info');
};
window.kdEditProduct = (prodId) => {
    const p = getDigitalProducts().find(item => item.id === prodId);
    if (p) openProductEditor(p);
};
window.kdDeleteProduct = (prodId) => {
    if (confirm('Hapus produk ini dari katalog toko?')) {
        deleteDigitalProduct(prodId);
        renderAdminProducts();
        renderProductsCatalog();
        showToast('Produk dihapus.', 'info');
    }
};
window.kdEditTutorial = (tutId) => {
    const t = getTutorialVideos().find(item => item.id === tutId);
    if (t) openTutorialEditor(t);
};
window.kdDeleteTutorial = (tutId) => {
    if (confirm('Hapus tutorial ini?')) {
        deleteTutorialVideo(tutId);
        renderAdminTutorials();
        renderTutorials();
        showToast('Tutorial dihapus.', 'info');
    }
};


// =========================================================================
// APPLICATION INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Auto-unlock VIP Developer on localhost so the owner is never locked out!
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const lics = getLicenses();
        if (!lics['all_access']) {
            activateLicenseKey('KAWANDIGI-VIP-UNLIMITED');
            console.log('[KawanDigi] Mode Developer Localhost: Lisensi Master VIP Otomatis Aktif.');
        }
    }

    initNavigation();
    initApiKeyModal();
    initVideoTierModal();
    initUgcCreator();
    initDramaCreator();
    initLicenseManager();
    initThemeToggle();
    initHistoryManager();
    initCollapsibleBanners();
    initAuthManager();
    initAdminConsole();
    renderCatalog();

    // Check if API Key is configured on launch
    if (!getSavedApiKey() && getActiveProvider() !== 'custom') {
        setTimeout(() => {
            showToast('Selamat datang! Atur Provider AI Anda (Gemini, DeepSeek, OpenRouter, dll) di pojok kanan atas.', 'info');
        }, 800);
    }
});
