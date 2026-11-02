/**
 * KawanDigi Creator Studio - Google Gemini, Imagen, & Omni Video API Client
 * 100% Client-Side (BYOK: Bring Your Own Key) - Zero VPS / Serverless
 */

const GEMINI_STORAGE_KEY = 'kawandigi_gemini_api_key';

export function getSavedApiKey() {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
}

export function saveApiKey(key) {
    if (!key) {
        localStorage.removeItem(GEMINI_STORAGE_KEY);
    } else {
        localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    }
}

/**
 * Multi-tier model fallback list to prevent "high demand" / 503 / 429 errors
 */
const FALLBACK_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
];

/**
 * Call Google Gemini with Automatic Model Fallback on High Demand / Spikes
 * Supports both Text and Multimodal Image Inputs (Screenshots, Photos, etc.)
 */
export async function callGemini(prompt, systemInstruction = '', preferredModel = 'gemini-3.8-flash', tools = null, inlineData = null) {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        throw new Error('API Key Google AI Studio belum diisi. Silakan masukkan API Key Anda di menu Pengaturan.');
    }

    const modelsToTry = [
        preferredModel,
        ...FALLBACK_MODELS.filter(m => m !== preferredModel)
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

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: parts
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 4096
            }
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s generous timeout for rich creative generation

            const response = await fetch(endpoint, {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

                // Check for high demand / temporary spike / rate limit
                const isHighDemand = response.status === 503 || response.status === 429 || /high demand|temporarily unavailable|overloaded|spikes in demand|resource_exhausted/i.test(errMsg);
                
                if (isHighDemand && i < modelsToTry.length - 1) {
                    const nextModel = modelsToTry[i + 1];
                    console.warn(`[KawanDigi AI] Model ${currentModel} sedang sibuk (${errMsg}). Beralih otomatis ke fallback ${nextModel}...`);
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
                if (i < modelsToTry.length - 1) {
                    console.warn(`[KawanDigi AI] Timeout pada model ${currentModel}, mencoba model cadangan ${modelsToTry[i + 1]}...`);
                    continue;
                }
                throw new Error('Koneksi ke Google AI Studio melebihi batas waktu (timeout). Silakan periksa koneksi internet Anda atau coba klik Generate kembali.');
            }
            if (i < modelsToTry.length - 1 && /high demand|temporarily unavailable|overloaded|spikes in demand|503|429/i.test(err.message)) {
                continue;
            }
            throw err;
        }
    }

    throw lastError || new Error('Gagal menghubungi Google Gemini AI setelah mencoba server cadangan.');
}

/**
 * Generate Real Video with Google Gemini Omni Flash (gemini-omni-1.1-flash)
 * Produces native MP4 video directly without leaving the app!
 */
export async function generateOmniVideo(prompt, aspectRatio = '9:16') {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        throw new Error('API Key Google AI Studio belum diisi.');
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

    // Parse steps in REST response for video data
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
    const apiKey = getSavedApiKey();

    // 1. Try Gemini Nano Banana 2.1 via Interactions API if user has a paid API key
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

    // 2. 100% Free Tier Fallback: High-Quality instant visual generation (No paid key required)
    const width = aspectRatio === '16:9' ? 1280 : 720;
    const height = aspectRatio === '16:9' ? 720 : 1280;
    const cleanPrompt = encodeURIComponent(prompt.slice(0, 300));
    const freeImageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

    return freeImageUrl;
}

// Backwards compatibility alias
export const generateImagen3 = generateVisualImage;
