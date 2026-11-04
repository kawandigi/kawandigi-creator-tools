/**
 * KawanDigi Creator Tools - In-App Video Renderer
 * Generates an animated 9:16 vertical video clip directly in the user's browser
 * using HTML5 Canvas, Pollinations AI visual artwork, and the MediaRecorder API.
 * 100% Free, Zero VPS, Zero Cloud Video API Quotas!
 */

/**
 * Render an in-browser animated 9:16 scene video (.webm / .mp4)
 */
export async function renderInAppSceneVideo({
    imageUrl,
    durationSeconds = 4,
    captionText = '',
    voiceoverText = '',
    sceneNumber = 1,
    onProgress = null
}) {
    // 1. Create an offscreen canvas at 720x1280 (vertical 9:16)
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    // 2. Load the scene image with CORS anonymous support
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => {
            console.warn('[KawanDigi VideoRenderer] Image load failed or CORS restricted, using stylized gradient fallback.');
            resolve(false);
        };
        img.src = imageUrl;
    });

    // 3. Verify MediaRecorder and captureStream availability
    if (!window.MediaRecorder || !canvas.captureStream) {
        throw new Error('Browser Anda tidak mendukung perekaman video HTML5 Canvas langsung.');
    }

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
    }

    const stream = canvas.captureStream(30); // 30 fps
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    const completionPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            resolve(videoUrl);
        };
        recorder.onerror = (err) => reject(err);
    });

    recorder.start(100);

    // 4. Render animation frames (Smooth Ken Burns Slow Zoom + Overlays)
    const fps = 30;
    const totalFrames = Math.max(fps * 2, Math.min(fps * durationSeconds, fps * 8)); // 2s to 8s
    let currentFrame = 0;

    const renderLoop = () => {
        const progress = currentFrame / totalFrames; // 0.0 -> 1.0

        if (onProgress) {
            onProgress(Math.round(progress * 100));
        }

        // A. Clear background
        ctx.fillStyle = '#0a0d18';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // B. Draw image with cinematic push-in (zoom in 100% to 114%)
        if (img.complete && img.naturalWidth > 0) {
            const scale = 1.0 + (progress * 0.14);
            const scaledW = canvas.width * scale;
            const scaledH = canvas.height * scale;
            const offsetX = (canvas.width - scaledW) / 2;
            const offsetY = (canvas.height - scaledH) / 2;
            ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
        } else {
            // Elegant modern gradient background
            const grad = ctx.createLinearGradient(0, 0, 720, 1280);
            grad.addColorStop(0, '#1e1b4b');
            grad.addColorStop(0.5, '#4338ca');
            grad.addColorStop(1, '#0f172a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // C. Cinematic Vignette & Shadow Overlays for maximum text readability
        const topGrad = ctx.createLinearGradient(0, 0, 0, 240);
        topGrad.addColorStop(0, 'rgba(3, 7, 18, 0.85)');
        topGrad.addColorStop(1, 'rgba(3, 7, 18, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, 720, 240);

        const btmGrad = ctx.createLinearGradient(0, 780, 0, 1280);
        btmGrad.addColorStop(0, 'rgba(3, 7, 18, 0)');
        btmGrad.addColorStop(0.3, 'rgba(3, 7, 18, 0.7)');
        btmGrad.addColorStop(1, 'rgba(3, 7, 18, 0.96)');
        ctx.fillStyle = btmGrad;
        ctx.fillRect(0, 780, 720, 500);

        // D. Top Header Bar: Scene Pill & Watermark
        ctx.save();
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(40, 50, 180, 44, 22);
        } else {
            ctx.rect(40, 50, 180, 44);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`🎬 SCENE ${sceneNumber}`, 58, 80);

        // Brand tag
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('KawanDigi Creator Tools', 680, 80);
        ctx.restore();

        // E. Top Progress Timeline Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(40, 110, 640, 5);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(40, 110, 640 * progress, 5);

        // F. Subtitle / Overlay Text Banner at bottom
        const caption = (captionText || voiceoverText || '').trim();
        if (caption) {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.strokeStyle = '#4f46e5';
            ctx.lineWidth = 3;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(40, 1000, 640, 180, 24);
            } else {
                ctx.rect(40, 1000, 640, 180);
            }
            ctx.fill();
            ctx.stroke();

            // Render 1 or 2 lines of high-impact text
            const rawClean = caption.replace(/["'“”]/g, '').trim();
            const words = rawClean.split(' ');

            ctx.textAlign = 'center';
            if (words.length <= 6) {
                ctx.fillStyle = '#fef08a';
                ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(rawClean, 360, 1100);
            } else {
                const mid = Math.ceil(words.length / 2);
                const line1 = words.slice(0, mid).join(' ');
                const line2 = words.slice(mid).join(' ');

                ctx.fillStyle = '#fef08a';
                ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(line1, 360, 1075);

                ctx.fillStyle = '#ffffff';
                ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(line2, 360, 1125);
            }
            ctx.restore();
        }

        currentFrame++;
        if (currentFrame <= totalFrames) {
            setTimeout(renderLoop, 1000 / fps);
        } else {
            recorder.stop();
        }
    };

    renderLoop();

    return completionPromise;
}
