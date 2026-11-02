/**
 * KawanDigi Creator Studio - Main Application Controller
 * Handles Navigation, State, Event Listeners, and Dynamic UI Rendering
 */

import { getSavedApiKey, saveApiKey, generateImagen3, generateOmniVideo } from './modules/gemini_api.js';
import { hasToolAccess, activateLicenseKey, getLicenses, getTrialUsage, resetTrialUsage, FREE_TRIAL_LIMIT } from './modules/license_manager.js';
import { extractProductDetails, extractDetailsFromImage, generateUgcCampaign } from './modules/ugc_creator.js';
import { generateDramaEpisode } from './modules/drama_creator.js';
import { renderInAppSceneVideo } from './modules/video_renderer.js';

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
    const sceneMap = { 10: '3 Scene Kilat', 15: '4 Scene TikTok', 20: '4 Scene', 30: '6 Scene AIDA', 60: '8 Scene Story' };
    if (durationLabel) {
        durationLabel.textContent = `${dur} Detik (${sceneMap[dur] || '6 Scene'})`;
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

    // Screenshot Dropzone & Paste (Ctrl+V) handler
    const dropzone = document.getElementById('screenshot-dropzone');
    const screenshotInput = document.getElementById('ugc-screenshot-input');
    const dropzoneEmpty = document.getElementById('dropzone-empty');
    const dropzonePreview = document.getElementById('dropzone-preview');
    const screenshotImgPreview = document.getElementById('screenshot-img-preview');
    const screenshotFilename = document.getElementById('screenshot-filename');
    const screenshotStatus = document.getElementById('screenshot-status');
    const btnRemoveScreenshot = document.getElementById('btn-remove-screenshot');

    let currentScreenshotBase64 = null;
    let currentScreenshotMime = null;

    const handleScreenshotFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Unggah file gambar (PNG, JPG, WebP).', 'error');
            return;
        }

        const nameInput = document.getElementById('ugc-name');
        const catSelect = document.getElementById('ugc-category');
        const toneSelect = document.getElementById('ugc-tone');
        const sellingInput = document.getElementById('ugc-selling');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target.result;
            const [header, base64] = dataUrl.split(',');
            const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

            currentScreenshotBase64 = base64;
            currentScreenshotMime = mime;

            screenshotImgPreview.src = dataUrl;
            screenshotFilename.textContent = file.name || 'screenshot.png';
            screenshotStatus.innerHTML = `<div class="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin inline-block mr-1"></div> Menganalisis...`;
            dropzoneEmpty.classList.add('hidden');
            dropzonePreview.classList.remove('hidden');

            try {
                const details = await extractDetailsFromImage(base64, mime);
                screenshotStatus.innerHTML = `<i data-lucide="check-circle" class="w-3 h-3 text-emerald-400 inline-block mr-1"></i> Teranalisis Sukses`;

                if (details.product_name) nameInput.value = details.product_name;
                if (details.selling_points) sellingInput.value = details.selling_points;
                if (details.category) {
                    for (const opt of catSelect.options) {
                        if (opt.value === details.category || opt.text.includes(details.category) || details.category.includes(opt.value)) {
                            catSelect.value = opt.value;
                            break;
                        }
                    }
                }
                if (details.suggested_tone) {
                    for (const opt of toneSelect.options) {
                        if (opt.value === details.suggested_tone || opt.text.includes(details.suggested_tone)) {
                            toneSelect.value = opt.value;
                            break;
                        }
                    }
                }
                showToast(`Screenshot etalase berhasil dianalisis AI!`, 'success');
            } catch (err) {
                screenshotStatus.innerHTML = `<span class="text-rose-400">Gagal menganalisis</span>`;
                showToast(err.message, 'error');
            } finally {
                if (window.lucide) window.lucide.createIcons();
            }
        };
        reader.readAsDataURL(file);
    };

    dropzone?.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-remove-screenshot')) {
            screenshotInput?.click();
        }
    });

    screenshotInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleScreenshotFile(e.target.files[0]);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleScreenshotFile(e.dataTransfer.files[0]);
        }
    });

    // Global Paste (Ctrl+V) listener for screenshots
    window.addEventListener('paste', (e) => {
        // Only trigger if in UGC tab
        const ugcSection = document.getElementById('section-ugc');
        if (ugcSection && ugcSection.classList.contains('hidden')) return;

        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    handleScreenshotFile(file);
                    showToast('Screenshot ditempel dari clipboard!', 'info');
                    break;
                }
            }
        }
    });

    btnRemoveScreenshot?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentScreenshotBase64 = null;
        currentScreenshotMime = null;
        screenshotInput.value = '';
        dropzonePreview.classList.add('hidden');
        dropzoneEmpty.classList.remove('hidden');
        showToast('Screenshot dihapus.', 'info');
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

            if (product.category) {
                const catSelect = document.getElementById('ugc-category');
                if (catSelect) {
                    for (const opt of catSelect.options) {
                        if (opt.value === product.category || opt.text.includes(product.category) || product.category.includes(opt.value)) {
                            catSelect.value = opt.value;
                            break;
                        }
                    }
                }
            }

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
    const captionsContainer = document.getElementById('ugc-captions-container');
    const fullPromptCode = document.getElementById('ugc-full-prompt-code');
    const btnCopyFullPrompt = document.getElementById('btn-copy-full-prompt-block');

    resultsContainer.classList.remove('hidden');
    actionsHeader.classList.remove('hidden');

    const analysis = campaign.product_analysis || {};
    summaryCard.innerHTML = `
        <div class="flex items-center justify-between font-bold text-brand-300 text-xs pb-1 border-b border-brand-500/20">
            <span class="flex items-center gap-1.5"><i data-lucide="award" class="w-4 h-4 text-amber-400"></i> Hasil Analisis & Formula Konten UGC</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">Durasi Pas 10s • ${campaign.total_narasi_kata || 24} Kata</span>
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
        const textToDisplay = campaign.formatted_prompt_video || 
            `PROMPT VIDEO — ${analysis.product_name || 'Produk'}\nDurasi: 10 detik | Rasio: 9:16 | Kualitas: FHD\n\n` +
            (campaign.scenes || []).map(s => `ADEGAN ${s.scene_number} (${s.time_range || `${s.duration_seconds}s`}) — ${s.scene_title}\n- Visual: ${s.visual_description}\n- Kamera: ${s.camera_movement || 'Dynamic'}\n- Narasi: "${s.voiceover_script}"`).join('\n\n') +
            `\n\nTOTAL NARASI: ${campaign.total_narasi_kata || 24} kata\nGAYA VISUAL: UGC Realistis`;
        
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
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teks di Layar (Overlay):</label>
                <div class="inline-block px-2.5 py-1 bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded-lg text-xs font-black">
                    ${scene.caption_overlay}
                </div>
            </div>
            ` : ''}

            <!-- 1-Click Google Flow Bridge (Primary Workflow) -->
            <div class="mt-2 p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2.5 shadow-lg">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <i data-lucide="sparkles" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-bold text-emerald-300">Google Flow (Veo 10s Clip)</span>
                                <span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-bold">100% Gratis</span>
                            </div>
                            <p class="text-[10px] text-slate-400">1-Klik Salin prompt & buka studio Google Flow</p>
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
                    <button class="btn-render-inapp w-full py-2 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 transition">
                        <i data-lucide="play-circle" class="w-3.5 h-3.5 text-white"></i>
                        <span>Buat Video In-App (Tanpa Pindah Tab)</span>
                    </button>
                    <button class="btn-preview-imagen w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition">
                        <i data-lucide="image" class="w-3.5 h-3.5 text-accent-400"></i>
                        <span>Preview Gambar Visual</span>
                    </button>
                </div>

                <!-- Secondary Link: Google Gemini Omni Video API -->
                <button class="btn-generate-video text-[10px] text-slate-500 hover:text-slate-300 underline text-center block w-full py-0.5">
                    Coba Generate via Google Gemini Omni Video API (.mp4)
                </button>

                <!-- Video Player Container -->
                <div class="video-container hidden text-center space-y-2 pt-2 bg-slate-900/60 p-3 rounded-xl border border-brand-500/30">
                    <video class="scene-video-player mx-auto rounded-xl border border-brand-500/50 max-h-80 w-auto shadow-2xl" controls autoplay loop playsinline></video>
                    <div class="flex items-center justify-center gap-2 pt-1">
                        <a class="btn-download-video text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow transition" download="scene.webm">
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

        // Wire Copy Vo
        sceneCard.querySelector('.btn-copy-vo')?.addEventListener('click', () => {
            copyToClipboard(scene.voiceover_script, `Naskah Scene ${scene.scene_number} disalin!`);
        });

        // Wire Play Vo (Web Speech Audio)
        sceneCard.querySelector('.btn-play-vo')?.addEventListener('click', () => {
            speakVoiceover(scene.voiceover_script);
        });

        // Wire Copy Prompt
        sceneCard.querySelector('.btn-copy-prompt')?.addEventListener('click', () => {
            copyToClipboard(scene.google_flow_prompt, `Prompt Google Flow Scene ${scene.scene_number} disalin!`);
        });

        // Wire Google Flow 1-Click Bridge
        const btnFlow = sceneCard.querySelector('.btn-flow-render');
        const flowStatusMsg = sceneCard.querySelector('.flow-status-msg');
        btnFlow?.addEventListener('click', async () => {
            await copyToClipboard(scene.google_flow_prompt, `Prompt Scene ${scene.scene_number} disalin!`);
            window.open('https://aitestkitchen.withgoogle.com/tools/video-fx', '_blank');
            if (flowStatusMsg) flowStatusMsg.classList.remove('hidden');
            btnFlow.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Buka Ulang Google Flow`;
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
                speakVoiceover(scene.voiceover_script);

                // 3. Render animated video canvas
                const videoBlobUrl = await renderInAppSceneVideo({
                    imageUrl,
                    durationSeconds: scene.duration_seconds || 4,
                    captionText: scene.caption_overlay || scene.voiceover_script,
                    voiceoverText: scene.voiceover_script,
                    sceneNumber: scene.scene_number || (index + 1)
                });

                videoPlayer.src = videoBlobUrl;
                btnDownloadVideo.href = videoBlobUrl;
                btnDownloadVideo.download = `kawandigi-scene-${scene.scene_number || (index + 1)}.webm`;
                videoContainer.classList.remove('hidden');
                btnInApp.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-white"></i> Render Ulang Video`;
                showToast(`Video Scene ${scene.scene_number || (index + 1)} berhasil dibuat!`, 'success');
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
                btnDownloadVideo.download = `kawandigi-scene-${scene.scene_number || (index + 1)}.mp4`;
                videoContainer.classList.remove('hidden');
                showToast(`Video Scene ${scene.scene_number || (index + 1)} siap ditonton!`, 'success');
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
            btnImagen.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-accent-400 border-t-transparent rounded-full animate-spin"></div> Merender Gambar...`;
            try {
                const imgData = await generateImagen3(scene.google_flow_prompt, '9:16');
                previewImg.src = imgData;
                imgContainer.classList.remove('hidden');
                btnImagen.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-accent-400"></i> Render Ulang Gambar`;
                showToast(`Preview Gambar Scene ${scene.scene_number} siap!`, 'success');
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
        const allPrompts = currentDramaEpisode.scenes.map(s => `[SCENE ${s.scene_number}: ${s.scene_title} (${s.duration_seconds}s)]\n${s.google_flow_prompt}`).join('\n\n');
        copyToClipboard(allPrompts, 'Seluruh prompt drama berhasil disalin!');
    });
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
            await copyToClipboard(scene.google_flow_prompt, `Prompt Scene ${scene.scene_number} disalin!`);
            window.open('https://aitestkitchen.withgoogle.com/tools/video-fx', '_blank');
            if (flowStatusMsg) flowStatusMsg.classList.remove('hidden');
            btnFlow.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Buka Ulang Google Flow`;
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
    const btnQuickVip = document.getElementById('btn-quick-vip');
    const btnResetTrial = document.getElementById('btn-reset-trial');

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

    // Developer Quick VIP Button
    btnQuickVip?.addEventListener('click', () => {
        activateLicenseKey('KAWANDIGI-VIP-UNLIMITED');
        updateLicenseCards();
        showToast('👑 Mode VIP Developer Aktif! Seluruh tools terbuka tanpa batas.', 'success');
    });

    // Reset Trial Usage Button
    btnResetTrial?.addEventListener('click', () => {
        resetTrialUsage();
        updateLicenseCards();
        showToast('Kuota uji coba gratis (3x) berhasil di-reset!', 'info');
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

    // Check if API Key is configured on launch
    if (!getSavedApiKey()) {
        setTimeout(() => {
            showToast('Selamat datang! Masukkan Google AI Studio API Key untuk memulai.', 'info');
        }, 800);
    }
});
