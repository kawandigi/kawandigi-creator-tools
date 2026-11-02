/**
 * KawanDigi Creator Studio - Main Application Controller
 * Handles Navigation, State, Event Listeners, and Dynamic UI Rendering
 */

import { getSavedApiKey, saveApiKey, generateImagen3 } from './modules/gemini_api.js';
import { hasToolAccess, activateLicenseKey, getLicenses, getTrialUsage, FREE_TRIAL_LIMIT } from './modules/license_manager.js';
import { scrapeProductFromUrl, generateUgcCampaign } from './modules/ugc_creator.js';
import { generateDramaEpisode } from './modules/drama_creator.js';

// Global State
let selectedUgcDuration = 30; // 10, 20, 30, 60
let selectedDramaScenes = 3;  // 3 scenes (30s) or 6 scenes (60s)
let currentUgcCampaign = null;
let currentDramaEpisode = null;

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

// =========================================================================
// TAB NAVIGATION SYSTEM
// =========================================================================
function switchTab(tabId) {
    // Desktop Nav
    const desktopTabs = {
        'ugc': document.getElementById('nav-ugc'),
        'drama': document.getElementById('nav-drama'),
        'license': document.getElementById('nav-license')
    };

    // Mobile Nav
    const mobileTabs = {
        'ugc': document.getElementById('m-nav-ugc'),
        'drama': document.getElementById('m-nav-drama'),
        'license': document.getElementById('m-nav-license')
    };

    // Sections
    const sections = {
        'ugc': document.getElementById('section-ugc'),
        'drama': document.getElementById('section-drama'),
        'license': document.getElementById('section-license')
    };

    Object.keys(sections).forEach(id => {
        if (id === tabId) {
            sections[id].classList.remove('hidden');
            desktopTabs[id]?.classList.add('active');
            mobileTabs[id]?.classList.add('active');
            mobileTabs[id]?.classList.replace('text-slate-400', 'text-brand-400');
        } else {
            sections[id].classList.add('hidden');
            desktopTabs[id]?.classList.remove('active');
            mobileTabs[id]?.classList.remove('active');
            mobileTabs[id]?.classList.replace('text-brand-400', 'text-slate-400');
        }
    });

    if (window.lucide) window.lucide.createIcons();
}

function initNavigation() {
    // Desktop Nav buttons
    document.getElementById('nav-ugc')?.addEventListener('click', () => switchTab('ugc'));
    document.getElementById('nav-drama')?.addEventListener('click', () => switchTab('drama'));
    document.getElementById('nav-license')?.addEventListener('click', () => switchTab('license'));

    // Mobile Nav buttons
    document.getElementById('m-nav-ugc')?.addEventListener('click', () => switchTab('ugc'));
    document.getElementById('m-nav-drama')?.addEventListener('click', () => switchTab('drama'));
    document.getElementById('m-nav-license')?.addEventListener('click', () => switchTab('license'));
}

// =========================================================================
// API KEY MODAL & BYOK CONTROLLER
// =========================================================================
function updateApiStatusIndicator() {
    const key = getSavedApiKey();
    const statusText = document.getElementById('api-status-text');
    if (!statusText) return;

    if (key) {
        statusText.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>API Aktif`;
        statusText.classList.remove('text-amber-400');
        statusText.classList.add('text-emerald-400');
    } else {
        statusText.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>API Key: Belum Ada`;
        statusText.classList.remove('text-emerald-400');
        statusText.classList.add('text-amber-400');
    }
}

function openApiKeyModal() {
    const modal = document.getElementById('modal-api-key');
    const input = document.getElementById('input-api-key');
    if (modal && input) {
        input.value = getSavedApiKey();
        modal.classList.remove('hidden');
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
    const inputKey = document.getElementById('input-api-key');

    btnOpen?.addEventListener('click', openApiKeyModal);
    btnClose?.addEventListener('click', closeApiKeyModal);

    btnSave?.addEventListener('click', () => {
        const val = inputKey.value.trim();
        if (!val) {
            showToast('Masukkan API Key Google AI Studio Anda.', 'error');
            return;
        }
        saveApiKey(val);
        updateApiStatusIndicator();
        closeApiKeyModal();
        showToast('Google API Key berhasil disimpan di browser Anda!', 'success');
    });

    btnClear?.addEventListener('click', () => {
        saveApiKey('');
        inputKey.value = '';
        updateApiStatusIndicator();
        showToast('API Key telah dihapus.', 'info');
    });

    updateApiStatusIndicator();
}

// =========================================================================
// UGC AFFILIATE CREATOR CONTROLLER
// =========================================================================
function initUgcCreator() {
    // Duration Buttons
    const durationButtons = document.querySelectorAll('.btn-duration');
    const durationLabel = document.getElementById('ugc-duration-label');

    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            durationButtons.forEach(b => {
                b.classList.remove('active', 'bg-brand-500/20', 'border-brand-500', 'text-brand-300');
                b.classList.add('bg-slate-950', 'border-slate-800', 'text-slate-300');
            });
            btn.classList.add('active', 'bg-brand-500/20', 'border-brand-500', 'text-brand-300');
            btn.classList.remove('bg-slate-950', 'border-slate-800', 'text-slate-300');

            selectedUgcDuration = parseInt(btn.dataset.duration, 10);
            const sceneMap = { 10: '1 Scene', 20: '2 Scene', 30: '3 Scene', 60: '6 Scene' };
            if (durationLabel) {
                durationLabel.textContent = `${selectedUgcDuration} Detik (${sceneMap[selectedUgcDuration] || '3 Scene'})`;
            }
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
            showToast('Silakan tempelkan link produk terlebih dahulu.', 'error');
            return;
        }

        btnScrape.disabled = true;
        btnScrape.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Ekstrak...`;

        try {
            const rawContent = await scrapeProductFromUrl(url);
            showToast('Etalase produk berhasil dianalisis!', 'success');

            // Quick extraction heuristic: look for title / first non-empty lines
            const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith('http') && !l.startsWith('!['));
            if (lines.length > 0 && !nameInput.value) {
                nameInput.value = lines[0].replace(/[#*_]/g, '').slice(0, 100);
            }
            if (lines.length > 1 && !sellingInput.value) {
                sellingInput.value = lines.slice(1, 4).join(', ').replace(/[#*_]/g, '').slice(0, 200);
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

    // Copy All Prompts
    const btnCopyAll = document.getElementById('btn-copy-all-prompts');
    btnCopyAll?.addEventListener('click', () => {
        if (!currentUgcCampaign || !currentUgcCampaign.scenes) return;
        const allPrompts = currentUgcCampaign.scenes.map(s => `[SCENE ${s.scene_number}: ${s.scene_title} (${s.duration_seconds}s)]\n${s.google_flow_prompt}`).join('\n\n');
        copyToClipboard(allPrompts, 'Seluruh prompt scene berhasil disalin!');
    });
}

async function handleGenerateUgc() {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        showToast('Masukkan Google API Key Anda terlebih dahulu.', 'error');
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
            tone
        });

        currentUgcCampaign = campaign;
        renderUgcResults(campaign);
        updateLicenseCards();
        showToast('Storyboard UGC Affiliate berhasil dirancang!', 'success');
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

    resultsContainer.classList.remove('hidden');
    actionsHeader.classList.remove('hidden');

    const analysis = campaign.product_analysis || {};
    summaryCard.innerHTML = `
        <div class="flex items-center justify-between font-bold text-brand-300 text-xs pb-1 border-b border-brand-500/20">
            <span class="flex items-center gap-1.5"><i data-lucide="award" class="w-4 h-4 text-amber-400"></i> Strategi AIDA Konversi</span>
            <span class="px-2 py-0.5 rounded-full bg-brand-500/20 text-[10px] font-extrabold uppercase">${analysis.hook_angle || 'Problem Solver'}</span>
        </div>
        <div class="pt-1.5 text-slate-300 space-y-1 text-[11px]">
            <p><strong class="text-white">Produk:</strong> ${analysis.product_name || 'Produk Pilihan'}</p>
            <p><strong class="text-white">Target Pembeli:</strong> ${analysis.target_buyer || '-'}</p>
            <p><strong class="text-white">Call To Action:</strong> <span class="text-amber-300 font-semibold">${campaign.call_to_action || 'Klik keranjang sekarang!'}</span></p>
            <div class="pt-1 flex flex-wrap gap-1">
                ${(campaign.hashtags || []).map(h => `<span class="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-brand-400 font-mono">${h}</span>`).join('')}
            </div>
        </div>
    `;

    // Render Scene Cards
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
                    ⏱️ ${scene.duration_seconds || 10} Detik
                </span>
            </div>

            <!-- Visual Description -->
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Visual Adegan (9:16 Vertikal):</label>
                <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    ${scene.visual_description || '-'}
                </p>
            </div>

            <!-- Voiceover Script -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Naskah Suara (Voiceover):</label>
                    <button class="btn-copy-vo text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold">
                        <i data-lucide="copy" class="w-3 h-3"></i> Salin Naskah
                    </button>
                </div>
                <p class="text-xs text-amber-200 italic bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed">
                    "${scene.voiceover_script || '-'}"
                </p>
            </div>

            <!-- Caption / Overlay Text -->
            ${scene.caption_overlay ? `
            <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teks di Layar (Overlay):</label>
                <div class="inline-block px-2.5 py-1 bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded-lg text-xs font-black">
                    ${scene.caption_overlay}
                </div>
            </div>
            ` : ''}

            <!-- Google Flow Prompt Box -->
            <div class="pt-1">
                <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <i data-lucide="terminal" class="w-3 h-3"></i> Prompt Google Flow / Veo (10s Clip):
                    </label>
                    <button class="btn-copy-prompt text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold">
                        <i data-lucide="copy" class="w-3 h-3"></i> Salin Prompt
                    </button>
                </div>
                <div class="prompt-box p-2.5 text-[11px] text-slate-200 leading-relaxed font-mono select-all">
                    ${scene.google_flow_prompt}
                </div>
            </div>

            <!-- Imagen 3 Preview Generator -->
            <div class="pt-2 border-t border-slate-900 flex flex-col gap-2">
                <button class="btn-preview-imagen w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i>
                    <span>Generate Preview Gambar AI (Imagen 3)</span>
                </button>
                <div class="preview-image-container hidden text-center">
                    <img class="preview-img mx-auto rounded-xl border border-slate-700 max-h-80 object-cover shadow-lg" alt="AI Preview" />
                </div>
            </div>
        `;

        // Wire Copy Vo
        sceneCard.querySelector('.btn-copy-vo')?.addEventListener('click', () => {
            copyToClipboard(scene.voiceover_script, `Naskah Scene ${scene.scene_number} disalin!`);
        });

        // Wire Copy Prompt
        sceneCard.querySelector('.btn-copy-prompt')?.addEventListener('click', () => {
            copyToClipboard(scene.google_flow_prompt, `Prompt Google Flow Scene ${scene.scene_number} disalin!`);
        });

        // Wire Imagen Preview
        const btnImagen = sceneCard.querySelector('.btn-preview-imagen');
        const imgContainer = sceneCard.querySelector('.preview-image-container');
        const previewImg = sceneCard.querySelector('.preview-img');

        btnImagen?.addEventListener('click', async () => {
            btnImagen.disabled = true;
            btnImagen.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-accent-400 border-t-transparent rounded-full animate-spin"></div> Merender Gambar...`;
            try {
                const imgData = await generateImagen3(scene.google_flow_prompt, '9:16');
                previewImg.src = imgData;
                imgContainer.classList.remove('hidden');
                btnImagen.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-accent-400"></i> Render Ulang Gambar`;
                showToast(`Preview Gambar Scene ${scene.scene_number} siap!`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
                btnImagen.innerHTML = `<i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i> Generate Preview Gambar AI (Imagen 3)`;
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
// AI DRAMA & MICRO-SERIES CREATOR CONTROLLER
// =========================================================================
function initDramaCreator() {
    // Drama Duration Buttons
    const durationButtons = document.querySelectorAll('.btn-drama-duration');
    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            durationButtons.forEach(b => {
                b.classList.remove('active', 'bg-accent-500/20', 'border-accent-500', 'text-accent-300');
                b.classList.add('bg-slate-950', 'border-slate-800', 'text-slate-300');
            });
            btn.classList.add('active', 'bg-accent-500/20', 'border-accent-500', 'text-accent-300');
            btn.classList.remove('bg-slate-950', 'border-slate-800', 'text-slate-300');

            selectedDramaScenes = parseInt(btn.dataset.dramaScenes, 10);
        });
    });

    // Generate Drama Episode Button
    const btnGenerateDrama = document.getElementById('btn-generate-drama');
    btnGenerateDrama?.addEventListener('click', handleGenerateDrama);
}

async function handleGenerateDrama() {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        showToast('Masukkan Google API Key Anda terlebih dahulu.', 'error');
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
    const btnGenerate = document.getElementById('btn-generate-drama');

    emptyState?.classList.add('hidden');
    resultsContainer?.classList.add('hidden');
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
        updateLicenseCards();
        showToast(`Episode ${episodeNumber} berhasil ditulis dengan cliffhanger viral!`, 'success');
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
                    <button class="btn-copy-dialogue text-[10px] text-accent-400 hover:text-accent-300 flex items-center gap-1 font-semibold">
                        <i data-lucide="copy" class="w-3 h-3"></i> Salin Dialog
                    </button>
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

            <!-- Google Flow Prompt Box with Character Consistency -->
            <div class="pt-1">
                <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <i data-lucide="terminal" class="w-3 h-3"></i> Prompt Google Flow / Veo (Konsisten Tokoh):
                    </label>
                    <button class="btn-copy-prompt text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold">
                        <i data-lucide="copy" class="w-3 h-3"></i> Salin Prompt
                    </button>
                </div>
                <div class="prompt-box p-2.5 text-[11px] text-slate-200 leading-relaxed font-mono select-all">
                    ${scene.google_flow_prompt}
                </div>
            </div>

            <!-- Imagen 3 Preview Generator -->
            <div class="pt-2 border-t border-slate-900 flex flex-col gap-2">
                <button class="btn-preview-imagen w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i>
                    <span>Generate Preview Gambar AI (Imagen 3)</span>
                </button>
                <div class="preview-image-container hidden text-center">
                    <img class="preview-img mx-auto rounded-xl border border-slate-700 max-h-80 object-cover shadow-lg" alt="AI Preview" />
                </div>
            </div>
        `;

        // Wire Copy Dialogue
        sceneCard.querySelector('.btn-copy-dialogue')?.addEventListener('click', () => {
            copyToClipboard(scene.dialogue, `Dialog Scene ${scene.scene_number} disalin!`);
        });

        // Wire Copy Prompt
        sceneCard.querySelector('.btn-copy-prompt')?.addEventListener('click', () => {
            copyToClipboard(scene.google_flow_prompt, `Prompt Google Flow Scene ${scene.scene_number} disalin!`);
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
                btnImagen.innerHTML = `<i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i> Generate Preview Gambar AI (Imagen 3)`;
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
    const licenses = getLicenses();
    const isVip = licenses['all_access'] && (!licenses['all_access'].expires || new Date(licenses['all_access'].expires) > new Date());

    // 1. UGC Card Status
    const ugcStatusEl = document.getElementById('status-card-ugc');
    if (ugcStatusEl) {
        if (isVip || (licenses['ugc'] && (!licenses['ugc'].expires || new Date(licenses['ugc'].expires) > new Date()))) {
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
        if (isVip || (licenses['drama'] && (!licenses['drama'].expires || new Date(licenses['drama'].expires) > new Date()))) {
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
        if (isVip) {
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
// THEME TOGGLE CONTROLLER
// =========================================================================
function initThemeToggle() {
    const btnToggle = document.getElementById('btn-theme-toggle');
    btnToggle?.addEventListener('click', () => {
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            btnToggle.innerHTML = `<i data-lucide="moon" class="w-4 h-4"></i>`;
        } else {
            html.classList.add('dark');
            btnToggle.innerHTML = `<i data-lucide="sun" class="w-4 h-4"></i>`;
        }
        if (window.lucide) window.lucide.createIcons();
    });
}

// =========================================================================
// APPLICATION INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initApiKeyModal();
    initUgcCreator();
    initDramaCreator();
    initLicenseManager();
    initThemeToggle();

    // Check if API Key is configured on launch
    if (!getSavedApiKey()) {
        setTimeout(() => {
            showToast('Selamat datang! Masukkan Google AI Studio API Key untuk memulai.', 'info');
        }, 800);
    }
});
