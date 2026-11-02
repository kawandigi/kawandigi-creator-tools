/**
 * KawanDigi Creator Studio - Google Gemini & Imagen API Client
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
 * Call Google Gemini 2.5 Flash for Structured Reasoning, Scriptwriting, and Storyboards
 */
export async function callGemini(prompt, systemInstruction = '', model = 'gemini-2.5-flash') {
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
 * Generate Visual Image with Google Imagen 3 via Gemini API
 */
export async function generateImagen3(prompt, aspectRatio = '9:16') {
    const apiKey = getSavedApiKey();
    if (!apiKey) {
        throw new Error('API Key Google AI Studio belum diisi.');
    }

    // Google Imagen 3 generate images endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const payload = {
        instances: [
            { prompt: prompt }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio === '9:16' ? '9:16' : (aspectRatio === '16:9' ? '16:9' : '1:1'),
            outputOptions: {
                mimeType: 'image/jpeg'
            }
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
        throw new Error(`Google Imagen 3 API Error: ${errMsg}`);
    }

    const data = await response.json();
    const prediction = data.predictions?.[0];
    if (prediction && prediction.bytesBase64Encoded) {
        return `data:image/jpeg;base64,${prediction.bytesBase64Encoded}`;
    }

    throw new Error('Google Imagen 3 tidak mengembalikan data gambar.');
}
