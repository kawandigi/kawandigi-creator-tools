/**
 * KawanDigi Creator Studio - Multi-Provider AI Gateway & Video API Client
 * Supports: Google Gemini, DeepSeek (Official), OpenRouter, Groq, & Custom OpenAI-Compatible
 * 100% Client-Side (BYOK: Bring Your Own Key) - Zero VPS / Serverless
 */

const STORAGE_PROVIDER_KEY = 'kawandigi_ai_provider';
const STORAGE_KEYS_PREFIX = 'kawandigi_key_';
const STORAGE_MODELS_PREFIX = 'kawandigi_model_';
const STORAGE_CUSTOM_URL = 'kawandigi_custom_url';
const STORAGE_CUSTOM_MODEL = 'kawandigi_custom_model';

export const AI_PROVIDERS = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        tagline: 'Google AI Studio • Tier Gratis 15 RPM • Multimodal Teks & Gambar',
        badge: '✨ Gemini',
        defaultModel: 'gemini-3.8-flash',
        models: [
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Super Cepat, Multimodal & Akurat — Rekomendasi Resmi Google)' },
            { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Ultra Cepat & Ringan)' },
            { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Generasi Baru)' }
        ],
        keyUrl: 'https://aistudio.google.com/app/apikey',
        keyUrlLabel: 'Ambil API Key Gratis di Google AI Studio',
        keyPlaceholder: 'AIzaSy...'
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek Official',
        tagline: 'DeepSeek-V3 & R1 • Sangat Murah & Pintar Merancang Naskah',
        badge: '⚡ DeepSeek',
        defaultModel: 'deepseek-chat',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek-V3 (deepseek-chat — Sangat Cepat & Pintar)' },
            { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (deepseek-reasoner — Penalaran Mendalam)' }
        ],
        endpoint: 'https://api.deepseek.com/chat/completions',
        keyUrl: 'https://platform.deepseek.com',
        keyUrlLabel: 'Daftar & Ambil API Key di Platform DeepSeek',
        keyPlaceholder: 'sk-...'
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        tagline: '1 API Key untuk Mengakses Semua Model AI (DeepSeek, Claude, Llama)',
        badge: '🌐 OpenRouter',
        defaultModel: 'deepseek/deepseek-chat',
        models: [
            { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (deepseek/deepseek-chat)' },
            { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (deepseek/deepseek-r1)' },
            { id: 'google/gemini-2.0-flash-001', name: 'Google Gemini 2.0 Flash' },
            { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct' }
        ],
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        keyUrl: 'https://openrouter.ai/keys',
        keyUrlLabel: 'Ambil API Key di OpenRouter',
        keyPlaceholder: 'sk-or-v1-...'
    },
    groq: {
        id: 'groq',
        name: 'Groq Cloud',
        tagline: 'Ultra Cepat (500+ tok/s) • Tier Gratis Tersedia',
        badge: '🚀 Groq',
        defaultModel: 'llama-3.3-70b-versatile',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
            { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' }
        ],
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        keyUrl: 'https://console.groq.com/keys',
        keyUrlLabel: 'Ambil API Key Gratis di Groq Console',
        keyPlaceholder: 'gsk_...'
    },
    custom: {
        id: 'custom',
        name: 'Kustom (OpenAI-Compatible)',
        tagline: 'Ollama Lokal / LM Studio / Together / Mistral / Proxy Pribadi',
        badge: '🛠️ Custom API',
        defaultModel: 'llama3',
        keyUrl: '',
        keyUrlLabel: '',
        keyPlaceholder: 'Kunci API (atau ketik dummy jika Ollama lokal)'
    }
};

export function getActiveProvider() {
    return localStorage.getItem(STORAGE_PROVIDER_KEY) || 'gemini';
}

export function setActiveProvider(providerId) {
    if (providerId && AI_PROVIDERS[providerId]) {
        localStorage.setItem(STORAGE_PROVIDER_KEY, providerId);
    }
}

export function getSavedApiKey(providerId = null) {
    const p = providerId || getActiveProvider();
    const specificKey = localStorage.getItem(STORAGE_KEYS_PREFIX + p);
    if (specificKey) return specificKey;
    if (p === 'gemini') {
        return localStorage.getItem('kawandigi_gemini_api_key') || '';
    }
    return '';
}

export function saveApiKey(key, providerId = null) {
    const p = providerId || getActiveProvider();
    const cleanKey = (key || '').trim();
    if (!cleanKey) {
        localStorage.removeItem(STORAGE_KEYS_PREFIX + p);
        if (p === 'gemini') localStorage.removeItem('kawandigi_gemini_api_key');
    } else {
        localStorage.setItem(STORAGE_KEYS_PREFIX + p, cleanKey);
        if (p === 'gemini') localStorage.setItem('kawandigi_gemini_api_key', cleanKey);
    }
}

export function getSelectedModel(providerId = null) {
    const p = providerId || getActiveProvider();
    const saved = localStorage.getItem(STORAGE_MODELS_PREFIX + p);
    if (saved) {
        if (p === 'gemini') {
            // Migrasi otomatis jika masih tersimpan model lawas gemini 2.x/1.x yang sudah dideprecate Google
            if (saved.startsWith('gemini-2.') || saved.startsWith('gemini-1.') || saved === 'gemini-2.5-flash' || saved === 'gemini-2.5-flash-lite') {
                localStorage.setItem(STORAGE_MODELS_PREFIX + 'gemini', 'gemini-3.8-flash');
                return 'gemini-3.8-flash';
            }
        }
        return saved;
    }
    return AI_PROVIDERS[p]?.defaultModel || '';
}

export function saveSelectedModel(model, providerId = null) {
    const p = providerId || getActiveProvider();
    if (model) {
        localStorage.setItem(STORAGE_MODELS_PREFIX + p, model);
    }
}

export function getCustomBaseUrl() {
    return localStorage.getItem(STORAGE_CUSTOM_URL) || 'http://localhost:11434/v1';
}

export function saveCustomBaseUrl(url) {
    localStorage.setItem(STORAGE_CUSTOM_URL, (url || '').trim());
}

export function getCustomModel() {
    return localStorage.getItem(STORAGE_CUSTOM_MODEL) || 'llama3';
}

export function saveCustomModel(model) {
    localStorage.setItem(STORAGE_CUSTOM_MODEL, (model || '').trim());
}

/**
 * Multi-tier model fallback list for Google Gemini
 */
const FALLBACK_GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
];

/**
 * Universal AI Caller (Gemini, DeepSeek, OpenRouter, Groq, Custom)
 */
export async function callAiProvider(prompt, systemInstruction = '', preferredModel = '', tools = null, inlineData = null, options = {}) {
    const provider = getActiveProvider();
    const apiKey = getSavedApiKey(provider);

    if (!apiKey && provider !== 'custom') {
        const providerName = AI_PROVIDERS[provider]?.name || provider;
        throw new Error(`API Key ${providerName} belum diisi. Silakan masukkan di menu Pengaturan API (pojok kanan atas).`);
    }

    const isJsonMode = options?.jsonMode || /format JSON|HANYA dalam format JSON|\"product_analysis\"|\"scenes\"|\"storyboard\"/i.test(systemInstruction + prompt);

    // =========================================================================
    // 1. GOOGLE GEMINI PROVIDER
    // =========================================================================
    if (provider === 'gemini') {
        let activeModel = (preferredModel && preferredModel.startsWith('gemini'))
            ? preferredModel
            : (getSelectedModel('gemini') || 'gemini-3.8-flash');

        // Normalisasi model warisan / terdeprecasi oleh Google
        if (activeModel.startsWith('gemini-2.') || activeModel.startsWith('gemini-1.') || activeModel === 'gemini-2.5-flash') {
            activeModel = 'gemini-3.8-flash';
        }

        const modelsToTry = [
            activeModel,
            ...FALLBACK_GEMINI_MODELS.filter(m => m !== activeModel)
        ];

        let lastError = null;

        for (let i = 0; i < modelsToTry.length; i++) {
            const currentModel = modelsToTry[i];
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

            const parts = [];
            if (inlineData) {
                if (Array.isArray(inlineData)) {
                    inlineData.forEach(img => parts.push({ inlineData: img }));
                } else {
                    parts.push({ inlineData: inlineData });
                }
            }
            parts.push({ text: prompt });

            const generationConfig = {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 4096
            };

            // Optimasi Kecepatan: Berikan level thinking low / budget 0
            if (options?.disableThinking !== false) {
                if (currentModel.includes('3.8') || currentModel.includes('3.5') || currentModel.includes('3.1')) {
                    generationConfig.thinkingConfig = { thinkingLevel: 'low' };
                } else if (currentModel.includes('2.5')) {
                    generationConfig.thinkingConfig = { thinkingBudget: 0 };
                }
            }

            if (isJsonMode) {
                generationConfig.responseMimeType = 'application/json';
            }

            const payload = {
                contents: [{ role: 'user', parts: parts }],
                generationConfig: generationConfig
            };

            if (systemInstruction) {
                payload.systemInstruction = {
                    parts: [{ text: systemInstruction }]
                };
            }

            if (tools && Array.isArray(tools)) {
                payload.tools = tools;
            }

            try {
                // Batas timeout dipercepat menjadi 25 detik agar tidak menggantung lama
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 25000);

                let response = await fetch(endpoint, {
                    signal: controller.signal,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // Jika model tidak mendukung parameter thinkingConfig (HTTP 400), otomatis coba ulang tanpa thinkingConfig
                if (!response.ok && response.status === 400 && generationConfig.thinkingConfig) {
                    delete generationConfig.thinkingConfig;
                    payload.generationConfig = generationConfig;
                    response = await fetch(endpoint, {
                        signal: controller.signal,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

                    const isDeprecatedOrNotFound = response.status === 404 || (response.status === 400 && /no longer available|not found|deprecated|Interactions API/i.test(errMsg));
                    const isHighDemand = response.status === 503 || response.status === 429 || /high demand|temporarily unavailable|overloaded|spikes in demand|resource_exhausted/i.test(errMsg);
                    
                    if ((isHighDemand || isDeprecatedOrNotFound) && i < modelsToTry.length - 1) {
                        const nextModel = modelsToTry[i + 1];
                        console.warn(`[KawanDigi AI] Model ${currentModel} dialihkan (${errMsg}). Beralih otomatis ke fallback ${nextModel}...`);
                        lastError = new Error(errMsg);
                        continue;
                    }

                    throw new Error(`Google Gemini API Error (${currentModel}): ${errMsg}`);
                }

                const data = await response.json();
                const candidate = data.candidates?.[0];
                if (!candidate || !candidate.content?.parts?.[0]?.text) {
                    if (i < modelsToTry.length - 1) continue;
                    throw new Error('Google Gemini tidak mengembalikan naskah teks yang valid.');
                }

                return candidate.content.parts[0].text;
            } catch (err) {
                lastError = err;
                if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
                    if (i < modelsToTry.length - 1) continue;
                    throw new Error('Koneksi ke Google Gemini melebihi batas waktu (timeout). Silakan periksa koneksi internet Anda atau coba lagi.');
                }
                if (i < modelsToTry.length - 1 && /high demand|temporarily unavailable|overloaded|spikes in demand|503|429/i.test(err.message)) {
                    continue;
                }
                throw err;
            }
        }

        throw lastError || new Error('Gagal menghubungi Google Gemini AI.');
    }

    // =========================================================================
    // 2. DEEPSEEK OFFICIAL PROVIDER
    // =========================================================================
    if (provider === 'deepseek') {
        const model = (!preferredModel || preferredModel.startsWith('gemini'))
            ? (getSelectedModel('deepseek') || 'deepseek-chat')
            : preferredModel;

        const endpoint = 'https://api.deepseek.com/chat/completions';

        // DeepSeek official API is text-only. Handle image fallback smoothly if available
        if (inlineData) {
            const geminiKey = getSavedApiKey('gemini');
            if (geminiKey) {
                console.info('[KawanDigi] Ekstraksi gambar dialihkan sementara ke Google Gemini Multimodal.');
                return callAiWithSpecificProvider('gemini', prompt, systemInstruction, 'gemini-3.8-flash', tools, inlineData);
            }
            throw new Error('DeepSeek API resmi adalah model teks. Masukkan Nama Produk / link etalase secara langsung, atau pasang API Key Gemini/OpenRouter untuk menganalisis screenshot gambar.');
        }

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const payload = {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(endpoint, {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const msg = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(`DeepSeek API Error: ${msg}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('DeepSeek API tidak mengembalikan konten respons.');
            }
            return content;
        } catch (err) {
            if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
                throw new Error('Koneksi ke DeepSeek API melebihi batas waktu (timeout). Silakan periksa koneksi internet Anda atau coba lagi.');
            }
            throw err;
        }
    }

    // =========================================================================
    // 3. OPENROUTER PROVIDER
    // =========================================================================
    if (provider === 'openrouter') {
        const model = (!preferredModel || preferredModel.startsWith('gemini'))
            ? (getSelectedModel('openrouter') || 'deepseek/deepseek-chat')
            : preferredModel;

        const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        if (inlineData) {
            const base64Str = inlineData.data;
            const mime = inlineData.mimeType || 'image/jpeg';
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${mime};base64,${base64Str}` } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: prompt });
        }

        const payload = {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(endpoint, {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin || 'http://localhost:8080',
                    'X-Title': 'KawanDigi Creator Studio'
                },
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const msg = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(`OpenRouter API Error: ${msg}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('OpenRouter API tidak mengembalikan konten respons.');
            }
            return content;
        } catch (err) {
            if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
                throw new Error('Koneksi ke OpenRouter melebihi batas waktu (timeout). Silakan periksa koneksi internet Anda atau coba lagi.');
            }
            throw err;
        }
    }

    // =========================================================================
    // 4. GROQ PROVIDER
    // =========================================================================
    if (provider === 'groq') {
        const model = (!preferredModel || preferredModel.startsWith('gemini'))
            ? (getSelectedModel('groq') || 'llama-3.3-70b-versatile')
            : preferredModel;

        const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const payload = {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(endpoint, {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const msg = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(`Groq API Error: ${msg}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('Groq API tidak mengembalikan konten respons.');
            }
            return content;
        } catch (err) {
            if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
                throw new Error('Koneksi ke Groq API melebihi batas waktu (timeout). Silakan periksa koneksi internet Anda atau coba lagi.');
            }
            throw err;
        }
    }

    // =========================================================================
    // 5. CUSTOM / OPENAI-COMPATIBLE PROVIDER
    // =========================================================================
    if (provider === 'custom') {
        const baseUrl = getCustomBaseUrl().replace(/\/+$/, '');
        const model = getCustomModel() || 'llama3';
        const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const payload = {
            model: model,
            messages: messages,
            temperature: 0.7
        };

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(endpoint, {
                signal: controller.signal,
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const msg = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(`Custom API Error: ${msg}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('Custom API tidak mengembalikan konten respons.');
            }
            return content;
        } catch (err) {
            if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
                throw new Error('Koneksi ke Custom API melebihi batas waktu (timeout). Silakan periksa koneksi internet atau periksa apakah server lokal Anda aktif.');
            }
            throw err;
        }
    }

    throw new Error(`Provider AI '${provider}' tidak didukung.`);
}

/**
 * Helper to call a specific provider explicitly
 */
export async function callAiWithSpecificProvider(specificProvider, prompt, systemInstruction = '', preferredModel = '', tools = null, inlineData = null) {
    const originalProvider = getActiveProvider();
    try {
        localStorage.setItem(STORAGE_PROVIDER_KEY, specificProvider);
        return await callAiProvider(prompt, systemInstruction, preferredModel, tools, inlineData);
    } finally {
        localStorage.setItem(STORAGE_PROVIDER_KEY, originalProvider);
    }
}

// Backwards compatibility alias
export const callGemini = callAiProvider;

/**
 * Generate Real Video with Google Gemini Omni Flash (gemini-omni-1.1-flash)
 */
export async function generateOmniVideo(prompt, aspectRatio = '9:16') {
    const apiKey = getSavedApiKey('gemini');
    if (!apiKey) {
        throw new Error('Fitur ini membutuhkan API Key Google AI Studio. Silakan masukkan di Pengaturan API.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

    const payload = {
        model: 'gemini-omni-1.1-flash',
        input: prompt,
        response_format: {
            type: 'video',
            aspect_ratio: aspectRatio === '16:9' ? '16:9' : '9:16'
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (/limit: 0 requests per day on Free Tier|Rate limit exceeded.*gemini-omni/i.test(errMsg)) {
            throw new Error('FREE_TIER_VIDEO_LIMIT');
        }

        throw new Error(`Google Omni Video Error: ${errMsg}`);
    }

    const data = await response.json();

    if (data.steps && Array.isArray(data.steps)) {
        for (const step of data.steps) {
            if (step.content && Array.isArray(step.content)) {
                for (const part of step.content) {
                    if (part.type === 'video' && part.data) {
                        return `data:${part.mime_type || 'video/mp4'};base64,${part.data}`;
                    }
                }
            }
        }
    }

    throw new Error('Google Omni Video tidak mengembalikan data video.');
}

/**
 * Generate Visual Preview Image (Nano Banana 2.1 with Free Tier Pollinations Fallback)
 */
export async function generateVisualImage(prompt, aspectRatio = '9:16') {
    const apiKey = getSavedApiKey('gemini');

    // 1. Try Gemini Nano Banana 2.1 via Interactions API if user has a paid Google key
    if (apiKey) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
            const payload = {
                model: 'gemini-nano-banana-2.1',
                input: prompt,
                response_format: {
                    type: 'image',
                    aspect_ratio: aspectRatio === '16:9' ? '16:9' : (aspectRatio === '1:1' ? '1:1' : '9:16')
                }
            };

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.steps && Array.isArray(data.steps)) {
                    for (const step of data.steps) {
                        if (step.content && Array.isArray(step.content)) {
                            for (const part of step.content) {
                                if (part.type === 'image' && part.data) {
                                    return `data:${part.mime_type || 'image/png'};base64,${part.data}`;
                                }
                            }
                        }
                    }
                }
            }
        } catch {
            // Proceed to free visual generator fallback
        }
    }

    // 2. 100% Free Tier Fallback: Instant visual generation (No key required)
    const width = aspectRatio === '16:9' ? 1280 : 720;
    const height = aspectRatio === '16:9' ? 720 : 1280;
    const cleanPrompt = encodeURIComponent(prompt.slice(0, 300));
    const freeImageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

    return freeImageUrl;
}

// Backwards compatibility alias
export const generateImagen3 = generateVisualImage;
