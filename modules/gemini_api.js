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
 * Call Google Gemini 3.8 Flash for Structured Reasoning, Scriptwriting, and Storyboards
 */
export async function callGemini(prompt, systemInstruction = '', model = 'gemini-3.8-flash') {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        throw new Error('API Key Google AI Studio belum diisi. Silakan masukkan API Key Anda di menu Pengaturan.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }]
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
        throw new Error(`Google Gemini API Error: ${errMsg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('Google Gemini tidak mengembalikan naskah teks yang valid.');
    }

    return candidate.content.parts[0].text;
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
 * Generate Visual Preview Image (Nano Banana 2.1 / Imagen)
 */
export async function generateVisualImage(prompt, aspectRatio = '9:16') {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        throw new Error('API Key Google AI Studio belum diisi.');
    }

    // Try Gemini Nano Banana 2.1 via Interactions API first
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
        // Fallback to legacy Imagen endpoint
    }

    // Legacy Imagen fallback
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const payload = {
        instances: [{ prompt: prompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio === '16:9' ? '16:9' : (aspectRatio === '1:1' ? '1:1' : '9:16'),
            outputOptions: { mimeType: 'image/jpeg' }
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Image Generation Error: ${errMsg}`);
    }

    const data = await response.json();
    const prediction = data.predictions?.[0];
    if (prediction && prediction.bytesBase64Encoded) {
        return `data:image/jpeg;base64,${prediction.bytesBase64Encoded}`;
    }

    throw new Error('Google AI tidak mengembalikan data gambar.');
}

// Backwards compatibility alias
export const generateImagen3 = generateVisualImage;
