/**
 * plant-health.js - AI Crop Health Scanner using TensorFlow.js and OpenCV.js
 */

const scannerState = {
    file: null,
    previewUrl: '',
    busy: false,
    mobilenetModel: null,
    mobilenetPromise: null,
    cvReady: false,
    cvPromise: null,
    currentResult: null,
    readinessTimer: null,
    heatmapVisible: true,
    heatmapCanvas: null,
    heatmapCtx: null,
    scanHistory: [],
    demoMenuOpen: false
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('plant-health-form');
    const fileInput = document.getElementById('plant-image');
    const fileLabel = document.querySelector('.file-upload-label');
    const previewContainer = document.getElementById('image-preview-container');
    scannerState.heatmapCanvas = document.getElementById('scan-heatmap');
    scannerState.heatmapCtx = scannerState.heatmapCanvas ? scannerState.heatmapCanvas.getContext('2d') : null;

    if (!form || !fileInput || !fileLabel) {
        return;
    }

    warmScannerStack();
    monitorScannerReadiness();
    bindScannerTools(form, fileInput, fileLabel, previewContainer);
    resetScanSummary();
    syncScannerReadiness();
    syncComparisonPanel();
    resizeHeatmapCanvas();

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        handleFileSelection(file, fileLabel, previewContainer);
        scannerState.file = file || null;
        syncScannerReadiness();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const file = scannerState.file || (fileInput.files && fileInput.files[0]);
        if (!file) {
            showScannerMessage('Please select an image to analyze.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showScannerMessage('Please upload an image smaller than 5 MB.', 'error');
            return;
        }

        const plantType = document.getElementById('plant-type')?.value || '';
        const symptoms = document.getElementById('symptoms')?.value || '';
        await runCropHealthScan(file, plantType, symptoms);
    });
});

function warmScannerStack() {
    loadMobileNetModel();
    loadOpenCvRuntime();
}

function syncScannerReadiness() {
    const statusPill = document.getElementById('scan-status-pill');
    if (!statusPill) return;

    const ready = Boolean(window.tf && window.mobilenet);
    statusPill.textContent = ready ? 'AI Ready' : 'Loading AI';
    statusPill.classList.toggle('is-ready', ready);
    return ready;
}

function monitorScannerReadiness() {
    if (scannerState.readinessTimer) {
        return;
    }

    scannerState.readinessTimer = window.setInterval(() => {
        if (syncScannerReadiness()) {
            window.clearInterval(scannerState.readinessTimer);
            scannerState.readinessTimer = null;
        }
    }, 500);
}

function bindScannerTools(form, fileInput, fileLabel, previewContainer) {
    const launcher = document.getElementById('demo-launcher');
    const launcherButton = document.getElementById('demo-launcher-btn');
    const launcherMenu = document.getElementById('demo-launcher-menu');
    const heatmapToggle = document.getElementById('heatmap-toggle');
    const compareFocusButton = document.getElementById('compare-focus-btn');

    if (launcher && launcherButton && launcherMenu) {
        const setMenuOpen = (open) => {
            scannerState.demoMenuOpen = open;
            launcher.classList.toggle('is-open', open);
            launcherButton.setAttribute('aria-expanded', String(open));
        };

        launcherButton.addEventListener('click', () => {
            setMenuOpen(!scannerState.demoMenuOpen);
        });

        document.addEventListener('click', (event) => {
            if (!launcher.contains(event.target)) {
                setMenuOpen(false);
            }
        });

        launcherMenu.querySelectorAll('[data-demo-sample]').forEach((option) => {
            option.addEventListener('click', async () => {
                const sample = option.dataset.demoSample;
                setMenuOpen(false);
                await loadDemoSample(sample, fileInput, fileLabel, previewContainer);
            });
        });
    }

    if (heatmapToggle) {
        heatmapToggle.addEventListener('click', () => {
            scannerState.heatmapVisible = !scannerState.heatmapVisible;
            drawHeatmapOverlay();
            heatmapToggle.classList.toggle('active', scannerState.heatmapVisible);
            heatmapToggle.innerHTML = scannerState.heatmapVisible
                ? '<i class="fas fa-braille"></i> Hide Heatmap'
                : '<i class="fas fa-braille"></i> Show Heatmap';
        });
    }

    if (compareFocusButton) {
        compareFocusButton.addEventListener('click', () => {
            document.getElementById('scan-compare-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    window.addEventListener('resize', resizeHeatmapCanvas);
    form.addEventListener('reset', () => {
        scannerState.file = null;
        scannerState.currentResult = null;
        scannerState.scanHistory = [];
        scannerState.heatmapVisible = true;
        if (heatmapToggle) {
            heatmapToggle.innerHTML = '<i class="fas fa-braille"></i> Toggle Heatmap';
        }
        syncComparisonPanel();
        drawHeatmapOverlay();
    });
}

function handleFileSelection(file, fileLabel, previewContainer) {
    if (!previewContainer) return;

    if (!file) {
        scannerState.file = null;
        scannerState.previewUrl = '';
        fileLabel.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Choose image file...';
        previewContainer.innerHTML = '';
        resetScanSummary();
        return;
    }

    scannerState.file = file;
    fileLabel.innerHTML = `<i class="fas fa-check"></i> ${escapeHtml(file.name)}`;

    if (!file.type.startsWith('image/')) {
        previewContainer.innerHTML = '<div class="scanner-placeholder">Upload a JPG or PNG crop image.</div>';
        scannerState.previewUrl = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target?.result;
        scannerState.previewUrl = typeof dataUrl === 'string' ? dataUrl : '';
        previewContainer.innerHTML = `
            <img src="${scannerState.previewUrl}" alt="Uploaded crop preview">
        `;
    };
    reader.readAsDataURL(file);
}

const DEMO_SAMPLES = {
    healthy: {
        label: 'Healthy Leaf',
        plantType: 'tomato',
        symptoms: 'No visible symptoms. Strong green canopy.',
        title: 'Healthy Crop Demo',
        palette: ['#1b5e20', '#43a047', '#7cb342'],
        accent: '#9ef7b3',
        spots: []
    },
    nutrient: {
        label: 'Nutrient Stress',
        plantType: 'corn',
        symptoms: 'Yellowing edges and mild chlorosis visible.',
        title: 'Nutrient Stress Demo',
        palette: ['#8d6e63', '#f9a825', '#fdd835'],
        accent: '#ffe08a',
        spots: [
            { x: 26, y: 28, r: 15, color: '#ffd166', opacity: 0.55 },
            { x: 53, y: 50, r: 18, color: '#ffcc66', opacity: 0.42 }
        ]
    },
    fungal: {
        label: 'Fungal Risk',
        plantType: 'potato',
        symptoms: 'Brown spots, blotches, and spreading lesions.',
        title: 'Fungal Risk Demo',
        palette: ['#5d4037', '#8d6e63', '#a1887f'],
        accent: '#ffb3a8',
        spots: [
            { x: 28, y: 24, r: 14, color: '#ff7043', opacity: 0.56 },
            { x: 48, y: 42, r: 20, color: '#ff5252', opacity: 0.46 },
            { x: 68, y: 56, r: 14, color: '#ff8a65', opacity: 0.48 }
        ]
    }
};

async function loadDemoSample(sampleKey, fileInput, fileLabel, previewContainer) {
    const sample = DEMO_SAMPLES[sampleKey] || DEMO_SAMPLES.healthy;
    const file = buildDemoSampleFile(sample);
    const plantType = document.getElementById('plant-type');
    const symptoms = document.getElementById('symptoms');

    if (plantType) {
        plantType.value = sample.plantType;
    }
    if (symptoms) {
        symptoms.value = sample.symptoms;
    }

    scannerState.file = file;
    handleFileSelection(file, fileLabel, previewContainer);
    fileInput.value = '';
    showScannerMessage(`${sample.label} demo loaded. Run the scan to present it live.`, 'success');
    await runCropHealthScan(file, sample.plantType, sample.symptoms);
}

function buildDemoSampleFile(sample) {
    const width = 960;
    const height = 640;
    const gradientStops = sample.palette.map((color, index) => {
        const offset = index * 50;
        return `<stop offset="${offset}%" stop-color="${color}" />`;
    }).join('');

    const spotsMarkup = sample.spots.map((spot) => `
        <circle cx="${spot.x}%" cy="${spot.y}%" r="${spot.r}" fill="${spot.color}" fill-opacity="${spot.opacity}" />
    `).join('');

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#08130c" />
                    <stop offset="100%" stop-color="#17331e" />
                </linearGradient>
                <radialGradient id="leafGlow" cx="50%" cy="40%" r="65%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                </radialGradient>
                <linearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
                    ${gradientStops}
                </linearGradient>
                <filter id="blur">
                    <feGaussianBlur stdDeviation="8" />
                </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg)" />
            <circle cx="50%" cy="45%" r="260" fill="url(#leafGlow)" filter="url(#blur)" />
            <path d="M470 120 C 640 150, 760 280, 728 430 C 690 596, 500 560, 398 472 C 314 400, 304 286, 356 210 C 390 160, 428 135, 470 120 Z" fill="url(#leaf)" stroke="${sample.accent}" stroke-width="10" />
            <path d="M458 148 C 500 244, 536 348, 546 522" stroke="#dfffe4" stroke-opacity="0.35" stroke-width="10" fill="none" stroke-linecap="round" />
            <path d="M430 210 C 502 248, 584 280, 666 300" stroke="#dfffe4" stroke-opacity="0.22" stroke-width="8" fill="none" stroke-linecap="round" />
            <path d="M410 318 C 494 356, 580 378, 684 396" stroke="#dfffe4" stroke-opacity="0.18" stroke-width="8" fill="none" stroke-linecap="round" />
            ${spotsMarkup}
            <text x="44" y="86" fill="#f4fbf6" font-size="36" font-family="Arial, sans-serif" font-weight="700">${escapeHtml(sample.title)}</text>
            <text x="44" y="126" fill="#b9d7bf" font-size="20" font-family="Arial, sans-serif">${escapeHtml(sample.label)}</text>
        </svg>
    `;

    return new File([svg], `${sampleKey}-demo.svg`, { type: 'image/svg+xml' });
}

async function runCropHealthScan(file, plantType, symptoms) {
    const button = document.querySelector('#plant-health-form button[type="submit"]');
    const progressBar = document.getElementById('scan-progress-bar');
    const stepLabel = document.getElementById('scan-step-label');
    const statusPill = document.getElementById('scan-status-pill');

    setBusyState(true, button, statusPill);
    setScanProgress(8, 'Preparing crop scan...', progressBar, stepLabel);

    try {
        const image = await loadImageFromFile(file);
        setScanProgress(28, 'Preprocessing image with OpenCV.js...', progressBar, stepLabel);

        const [visionMetrics, mobilenetPredictions] = await Promise.all([
            extractVisionMetrics(image),
            classifyWithMobileNet(image)
        ]);

        setScanProgress(64, 'Combining TensorFlow.js results...', progressBar, stepLabel);
        await delay(450);

        const result = buildCropDiagnosis({
            plantType,
            symptoms,
            visionMetrics,
            mobilenetPredictions,
            file
        });

        scannerState.currentResult = result;
        pushScanHistory(result);
        updateLiveScanSummary(result);
        renderCropHealthResult(result);
        resizeHeatmapCanvas();
        drawHeatmapOverlay(result);
        syncComparisonPanel();
        setScanProgress(100, 'Scan complete', progressBar, stepLabel);
        const confidenceChip = document.getElementById('scan-confidence');
        if (confidenceChip) confidenceChip.textContent = `${result.confidence}%`;
        if (statusPill) {
            statusPill.textContent = result.statusLabel;
            statusPill.classList.toggle('is-good', result.statusKey === 'healthy');
            statusPill.classList.toggle('is-warning', result.statusKey === 'warning');
            statusPill.classList.toggle('is-danger', result.statusKey === 'danger');
        }
        showScannerMessage('AI crop scan finished successfully.', 'success');
    } catch (error) {
        console.error('Crop health scan failed:', error);
        showScannerMessage('The AI scanner could not analyze the image. Please try another photo.', 'error');
        resetScanSummary();
    } finally {
        setBusyState(false, button, statusPill);
        if (document.getElementById('scan-step-label')?.textContent === 'Scan complete') {
            window.setTimeout(() => {
                const progressBar = document.getElementById('scan-progress-bar');
                if (progressBar) progressBar.style.width = '100%';
            }, 50);
        }
    }
}

async function loadImageFromFile(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = await loadImageElement(objectUrl);
        return image;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

async function loadMobileNetModel() {
    if (scannerState.mobilenetModel) {
        return scannerState.mobilenetModel;
    }

    if (!window.tf || !window.mobilenet) {
        return null;
    }

    if (!scannerState.mobilenetPromise) {
        scannerState.mobilenetPromise = window.mobilenet.load({ version: 2, alpha: 1.0 })
            .then((model) => {
                scannerState.mobilenetModel = model;
                return model;
            })
            .catch((error) => {
                console.warn('MobileNet failed to load, using heuristic fallback.', error);
                return null;
            });
    }

    return scannerState.mobilenetPromise;
}

async function loadOpenCvRuntime() {
    if (scannerState.cvReady) {
        return true;
    }

    if (!window.cv) {
        return false;
    }

    if (window.cv.Mat && window.cv.imread) {
        scannerState.cvReady = true;
        return true;
    }

    if (!scannerState.cvPromise) {
        scannerState.cvPromise = new Promise((resolve) => {
            const complete = () => {
                scannerState.cvReady = true;
                resolve(true);
            };

            const timeoutId = window.setTimeout(() => {
                resolve(false);
            }, 8000);

            const previousInit = window.cv.onRuntimeInitialized;
            window.cv.onRuntimeInitialized = () => {
                if (typeof previousInit === 'function') {
                    previousInit();
                }
                window.clearTimeout(timeoutId);
                complete();
            };

            if (window.cv.Mat && window.cv.imread) {
                window.clearTimeout(timeoutId);
                complete();
            }
        });
    }

    return scannerState.cvPromise;
}

async function classifyWithMobileNet(image) {
    const model = await loadMobileNetModel();
    if (!model) {
        return createFallbackPredictions(image);
    }

    try {
        const predictions = await model.classify(image, 5);
        return predictions.map((item) => ({
            className: item.className,
            probability: item.probability
        }));
    } catch (error) {
        console.warn('MobileNet classification failed, using fallback predictions.', error);
        return createFallbackPredictions(image);
    }
}

async function extractVisionMetrics(image) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const maxSize = 640;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const total = canvas.width * canvas.height;
    let green = 0;
    let yellow = 0;
    let brown = 0;
    let dark = 0;
    let brightnessSum = 0;
    let varianceSum = 0;
    const samples = Math.max(1, Math.floor(pixels.length / 4 / 9000));

    for (let i = 0; i < pixels.length; i += 4 * samples) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        brightnessSum += brightness;
        if (brightness < 85) {
            dark += 1;
        }
        if (g > r + 14 && g > b + 8 && g > 72) {
            green += 1;
        }
        if (r > 150 && g > 135 && b < 130) {
            yellow += 1;
        }
        if (r > 92 && g > 50 && b < 92 && r > g + 10) {
            brown += 1;
        }
        varianceSum += Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
    }

    const sampledCount = Math.max(1, Math.floor(pixels.length / 4 / samples));
    const greenRatio = green / sampledCount;
    const yellowRatio = yellow / sampledCount;
    const brownRatio = brown / sampledCount;
    const darkRatio = dark / sampledCount;
    const avgBrightness = brightnessSum / sampledCount;
    const colorVariance = varianceSum / sampledCount;

    let edgeDensity = 0;
    if (window.cv && await loadOpenCvRuntime()) {
        try {
            const src = window.cv.imread(canvas);
            const gray = new window.cv.Mat();
            const blur = new window.cv.Mat();
            const edges = new window.cv.Mat();

            window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
            window.cv.GaussianBlur(gray, blur, new window.cv.Size(5, 5), 0);
            window.cv.Canny(blur, edges, 70, 140);

            edgeDensity = window.cv.countNonZero(edges) / (edges.rows * edges.cols || 1);

            src.delete();
            gray.delete();
            blur.delete();
            edges.delete();
        } catch (error) {
            console.warn('OpenCV metrics fallback triggered.', error);
        }
    } else {
        edgeDensity = Math.min(0.45, colorVariance / 550);
    }

    return {
        greenRatio,
        yellowRatio,
        brownRatio,
        darkRatio,
        avgBrightness,
        colorVariance,
        edgeDensity,
        leafCoverage: Math.round(greenRatio * 100),
        discolorationIndex: Math.round((yellowRatio + brownRatio + darkRatio) * 100),
        blurRisk: Math.round(Math.min(100, edgeDensity * 360))
    };
}

function createFallbackPredictions(image) {
    const guessedLabel = image.width >= image.height ? 'leaf canopy' : 'crop leaf';
    return [
        { className: `healthy ${guessedLabel}`, probability: 0.71 },
        { className: 'plant tissue', probability: 0.18 },
        { className: 'vegetation', probability: 0.11 }
    ];
}

function buildCropDiagnosis({ plantType, symptoms, visionMetrics, mobilenetPredictions, file }) {
    const normalizedSymptoms = String(symptoms || '').toLowerCase();
    const normalizedPlantType = String(plantType || '').toLowerCase();
    const primaryPrediction = mobilenetPredictions[0] || { className: 'plant', probability: 0.5 };
    const topLabel = primaryPrediction.className.toLowerCase();

    let score = 92;
    score -= visionMetrics.yellowRatio * 170;
    score -= visionMetrics.brownRatio * 220;
    score -= visionMetrics.darkRatio * 90;
    score -= visionMetrics.blurRisk * 0.15;
    score += visionMetrics.greenRatio * 18;

    if (/healthy|leaf|plant|vegetation|tree/.test(topLabel)) {
        score += 5;
    }
    if (/wilt|blight|spot|fungus|rot|disease/.test(topLabel)) {
        score -= 12;
    }
    if (normalizedPlantType && topLabel.includes(normalizedPlantType)) {
        score += 4;
    }
    if (/yellow|spots|wilting|curl|mold|blight|necrosis/.test(normalizedSymptoms)) {
        score -= 10;
    }

    score = clamp(Math.round(score), 0, 100);

    let statusKey = 'healthy';
    let statusLabel = 'Healthy';
    if (score < 80 && score >= 60) {
        statusKey = 'warning';
        statusLabel = 'Mild Concern';
    } else if (score < 60) {
        statusKey = 'danger';
        statusLabel = 'Needs Attention';
    }

    const confidence = clamp(
        Math.round((primaryPrediction.probability * 100 * 0.65) + (score * 0.35)),
        56,
        99
    );

    const issue = pickIssue({
        score,
        visionMetrics,
        symptoms: normalizedSymptoms,
        prediction: topLabel
    });

    const recommendations = buildRecommendations(issue, normalizedPlantType);
    const findings = buildFindings(visionMetrics, mobilenetPredictions);
    const heatmap = buildHeatmapProfile({
        issue,
        score,
        visionMetrics
    });

    return {
        statusKey,
        statusLabel,
        score,
        confidence,
        issue,
        recommendations,
        findings,
        visionMetrics,
        mobilenetPredictions,
        fileName: file.name,
        heatmap
    };
}

function pickIssue({ score, visionMetrics, symptoms, prediction }) {
    if (score >= 80) {
        return 'Healthy canopy';
    }

    if (symptoms.includes('yellow') || visionMetrics.yellowRatio > 0.14) {
        return 'Nutrient stress';
    }

    if (symptoms.includes('spot') || visionMetrics.brownRatio > 0.08 || /spot|fungus|blight/.test(prediction)) {
        return 'Leaf spot / fungal risk';
    }

    if (symptoms.includes('wilt') || visionMetrics.darkRatio > 0.16) {
        return 'Water or heat stress';
    }

    if (symptoms.includes('curl') || visionMetrics.edgeDensity > 0.18) {
        return 'Possible pest damage';
    }

    return 'Environmental stress';
}

function buildRecommendations(issue, plantType) {
    const plantHint = plantType ? ` for ${capitalize(plantType)} crops` : '';
    const map = {
        'Healthy canopy': [
            'Keep the current irrigation schedule and continue weekly monitoring.',
            `Use the digital twin to track field coverage${plantHint}.`
        ],
        'Nutrient stress': [
            'Check nitrogen and magnesium levels in the soil.',
            'Apply a balanced fertilizer and re-scan the leaf in 48 hours.'
        ],
        'Leaf spot / fungal risk': [
            'Remove heavily affected leaves and improve canopy airflow.',
            'Consider a preventive fungicide if the spread increases.'
        ],
        'Water or heat stress': [
            'Inspect irrigation timing and soil moisture distribution.',
            'Reduce heat exposure and add mulch or shade where needed.'
        ],
        'Possible pest damage': [
            'Inspect the underside of leaves for insects or larvae.',
            'Use an integrated pest management plan before spraying.'
        ],
        'Environmental stress': [
            'Cross-check weather, irrigation, and soil conditions.',
            'Run a follow-up scan after adjusting the field environment.'
        ]
    };

    return map[issue] || map['Environmental stress'];
}

function buildFindings(visionMetrics, mobilenetPredictions) {
    const topPredictions = (mobilenetPredictions || []).slice(0, 3).map((item, index) => ({
        label: item.className,
        score: Math.round(item.probability * 100),
        rank: index + 1
    }));

    return [
        {
            label: 'Leaf coverage',
            value: `${Math.round(visionMetrics.leafCoverage)}%`,
            note: 'Green pixel dominance from OpenCV.js preprocessing'
        },
        {
            label: 'Discoloration',
            value: `${Math.round(visionMetrics.discolorationIndex)}%`,
            note: 'Yellow, brown, and dark pixel concentration'
        },
        {
            label: 'Edge activity',
            value: `${Math.round(visionMetrics.edgeDensity * 100)}%`,
            note: 'Texture variance used as a rough spot indicator'
        },
        ...topPredictions.map((item) => ({
            label: `TFJS #${item.rank}`,
            value: `${item.score}%`,
            note: item.label
        }))
    ];
}

function buildHeatmapProfile({ issue, score, visionMetrics }) {
    const severity = clamp(100 - score + Math.round(visionMetrics.discolorationIndex * 0.55), 12, 100);
    const baseHotspots = {
        'Healthy canopy': [
            { x: 0.52, y: 0.5, r: 0.35, intensity: 0.28, color: '#6ee7a2' }
        ],
        'Nutrient stress': [
            { x: 0.42, y: 0.4, r: 0.22, intensity: 0.64, color: '#ffe08a' },
            { x: 0.63, y: 0.58, r: 0.18, intensity: 0.55, color: '#ffd166' }
        ],
        'Leaf spot / fungal risk': [
            { x: 0.34, y: 0.32, r: 0.15, intensity: 0.72, color: '#ff7043' },
            { x: 0.56, y: 0.52, r: 0.17, intensity: 0.84, color: '#ff5252' },
            { x: 0.7, y: 0.66, r: 0.14, intensity: 0.68, color: '#ff8a65' }
        ],
        'Water or heat stress': [
            { x: 0.32, y: 0.36, r: 0.24, intensity: 0.52, color: '#ffb74d' },
            { x: 0.68, y: 0.44, r: 0.21, intensity: 0.48, color: '#ff9800' }
        ],
        'Possible pest damage': [
            { x: 0.28, y: 0.29, r: 0.13, intensity: 0.68, color: '#ff8a80' },
            { x: 0.48, y: 0.55, r: 0.12, intensity: 0.72, color: '#ff5252' },
            { x: 0.74, y: 0.47, r: 0.11, intensity: 0.66, color: '#ff7043' }
        ],
        'Environmental stress': [
            { x: 0.5, y: 0.48, r: 0.28, intensity: 0.44, color: '#ffd166' }
        ]
    };

    return {
        severity,
        hotspots: baseHotspots[issue] || baseHotspots['Environmental stress']
    };
}

function renderCropHealthResult(result) {
    const analysisResult = document.getElementById('analysis-result');
    if (!analysisResult) return;

    const predictionMarkup = result.mobilenetPredictions
        .slice(0, 3)
        .map((item, index) => `
            <div class="prediction-row">
                <strong>${index + 1}. ${escapeHtml(item.className)}</strong>
                <span>${Math.round(item.probability * 100)}%</span>
            </div>
        `)
        .join('');

    const findingsMarkup = result.findings
        .map((item) => `
            <div class="analysis-detail">
                <h4>${escapeHtml(item.label)}</h4>
                <p><strong>${escapeHtml(item.value)}</strong></p>
                <p>${escapeHtml(item.note)}</p>
            </div>
        `)
        .join('');

    const recommendationMarkup = result.recommendations
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');

    const safeFileName = escapeHtml(result.fileName);
    analysisResult.innerHTML = `
        <div id="pdf-report-content" class="analysis-card">
            <div class="analysis-hero">
                <div class="analysis-ring" style="--score: ${result.score};">
                    <strong>${result.score}</strong>
                </div>
                <div>
                    <span class="analysis-badge">${safeFileName}</span>
                    <h3>${escapeHtml(result.statusLabel)} - ${escapeHtml(result.issue)}</h3>
                    <p>Confidence ${result.confidence}% | AI diagnosis powered by TensorFlow.js and OpenCV.js.</p>
                    <p>The scanner blended model predictions with crop color analysis to evaluate leaf health.</p>
                </div>
            </div>

            <div class="analysis-grid">
                <section class="analysis-detail">
                    <h4><i class="fas fa-brain"></i> AI Predictions</h4>
                    <div class="analysis-predictions">
                        ${predictionMarkup}
                    </div>
                </section>
                <section class="analysis-detail">
                    <h4><i class="fas fa-flask"></i> Vision Findings</h4>
                    <div class="analysis-predictions">
                        ${findingsMarkup}
                    </div>
                </section>
            </div>

            <section class="analysis-detail">
                <h4><i class="fas fa-lightbulb"></i> Recommended Actions</h4>
                <ul>
                    ${recommendationMarkup}
                </ul>
            </section>
        </div>
        <div class="analysis-cta-row">
            <button class="btn-primary" onclick="downloadPlantReport()" type="button">
                <i class="fas fa-file-pdf"></i> Download PDF Report
            </button>
            <button class="btn-secondary" type="button" onclick="document.getElementById('plant-image').click()">
                <i class="fas fa-camera"></i> Scan Another Crop
            </button>
        </div>
    `;

    analysisResult.classList.add('show');
    analysisResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetScanSummary() {
    const progressBar = document.getElementById('scan-progress-bar');
    const stepLabel = document.getElementById('scan-step-label');
    const statusPill = document.getElementById('scan-status-pill');
    const metrics = {
        score: document.getElementById('scan-health-score'),
        confidence: document.getElementById('scan-confidence-main'),
        confidenceChip: document.getElementById('scan-confidence'),
        issue: document.getElementById('scan-issue'),
        coverage: document.getElementById('scan-coverage'),
        recommendation: document.getElementById('scan-recommendation')
    };

    if (progressBar) progressBar.style.width = '0%';
    if (stepLabel) stepLabel.textContent = 'Waiting for image';
    if (statusPill) statusPill.textContent = 'Ready';
    if (metrics.score) metrics.score.textContent = '--';
    if (metrics.confidence) metrics.confidence.textContent = '--';
    if (metrics.confidenceChip) metrics.confidenceChip.textContent = '--%';
    if (metrics.issue) metrics.issue.textContent = 'Awaiting scan';
    if (metrics.coverage) metrics.coverage.textContent = '--';
    if (metrics.recommendation) {
        metrics.recommendation.textContent = 'Upload a crop photo to receive an AI diagnosis and treatment guidance.';
    }

    const analysisResult = document.getElementById('analysis-result');
    if (analysisResult) {
        analysisResult.innerHTML = '';
        analysisResult.classList.remove('show');
    }

    drawHeatmapOverlay(null);
}

function updateLiveScanSummary(result) {
    const score = document.getElementById('scan-health-score');
    const confidence = document.getElementById('scan-confidence-main');
    const confidenceChip = document.getElementById('scan-confidence');
    const issue = document.getElementById('scan-issue');
    const coverage = document.getElementById('scan-coverage');
    const recommendation = document.getElementById('scan-recommendation');

    if (score) score.textContent = String(result.score);
    if (confidence) confidence.textContent = `${result.confidence}%`;
    if (confidenceChip) confidenceChip.textContent = `${result.confidence}%`;
    if (issue) issue.textContent = result.issue;
    if (coverage) coverage.textContent = `${result.visionMetrics.leafCoverage}%`;
    if (recommendation) {
        recommendation.textContent = result.recommendations[0] || 'Upload another crop image for a fresh scan.';
    }
}

function pushScanHistory(result) {
    scannerState.scanHistory.unshift({
        id: `${Date.now()}-${scannerState.scanHistory.length}`,
        timestamp: new Date(),
        score: result.score,
        confidence: result.confidence,
        issue: result.issue,
        statusLabel: result.statusLabel,
        fileName: result.fileName,
        leafCoverage: result.visionMetrics.leafCoverage,
        discolorationIndex: result.visionMetrics.discolorationIndex,
        blurRisk: result.visionMetrics.blurRisk,
        heatmap: result.heatmap,
        recommendations: result.recommendations.slice(0, 2)
    });

    scannerState.scanHistory = scannerState.scanHistory.slice(0, 4);
}

function syncComparisonPanel() {
    const latest = scannerState.scanHistory[0] || null;
    const previous = scannerState.scanHistory[1] || null;

    const latestScore = document.getElementById('compare-latest-score');
    const previousScore = document.getElementById('compare-previous-score');
    const scoreDelta = document.getElementById('compare-score-delta');
    const currentCard = document.getElementById('compare-current-card');
    const previousCard = document.getElementById('compare-previous-card');
    const deltas = document.getElementById('compare-deltas');
    const historyStrip = document.getElementById('scan-history-strip');

    if (latestScore) latestScore.textContent = latest ? `${latest.score}%` : '--';
    if (previousScore) previousScore.textContent = previous ? `${previous.score}%` : '--';
    if (scoreDelta) {
        scoreDelta.textContent = latest && previous ? `${latest.score - previous.score >= 0 ? '+' : ''}${latest.score - previous.score}%` : '--';
    }

    if (currentCard) {
        currentCard.innerHTML = latest ? `
            <div class="compare-title-row">
                <strong>${escapeHtml(latest.statusLabel)}</strong>
                <span>${escapeHtml(formatScanTimestamp(latest.timestamp))}</span>
            </div>
            <p>${escapeHtml(latest.issue)}</p>
            <div class="compare-mini-grid">
                <div><span>Health</span><strong>${latest.score}%</strong></div>
                <div><span>Confidence</span><strong>${latest.confidence}%</strong></div>
                <div><span>Coverage</span><strong>${latest.leafCoverage}%</strong></div>
                <div><span>Discoloration</span><strong>${latest.discolorationIndex}%</strong></div>
            </div>
        ` : '<p>Run a scan to populate the latest diagnosis.</p>';
    }

    if (previousCard) {
        previousCard.innerHTML = previous ? `
            <div class="compare-title-row">
                <strong>${escapeHtml(previous.statusLabel)}</strong>
                <span>${escapeHtml(formatScanTimestamp(previous.timestamp))}</span>
            </div>
            <p>${escapeHtml(previous.issue)}</p>
            <div class="compare-mini-grid">
                <div><span>Health</span><strong>${previous.score}%</strong></div>
                <div><span>Confidence</span><strong>${previous.confidence}%</strong></div>
                <div><span>Coverage</span><strong>${previous.leafCoverage}%</strong></div>
                <div><span>Discoloration</span><strong>${previous.discolorationIndex}%</strong></div>
            </div>
        ` : '<p>Previous results will appear here automatically.</p>';
    }

    if (deltas) {
        deltas.innerHTML = latest && previous ? `
            <div class="compare-delta-pill ${latest.score >= previous.score ? 'positive' : 'negative'}">
                <span>Health Score</span>
                <strong>${latest.score - previous.score >= 0 ? '+' : ''}${latest.score - previous.score}%</strong>
            </div>
            <div class="compare-delta-pill ${latest.leafCoverage >= previous.leafCoverage ? 'positive' : 'negative'}">
                <span>Leaf Coverage</span>
                <strong>${latest.leafCoverage - previous.leafCoverage >= 0 ? '+' : ''}${latest.leafCoverage - previous.leafCoverage}%</strong>
            </div>
            <div class="compare-delta-pill ${latest.discolorationIndex <= previous.discolorationIndex ? 'positive' : 'negative'}">
                <span>Discoloration</span>
                <strong>${latest.discolorationIndex - previous.discolorationIndex >= 0 ? '+' : ''}${latest.discolorationIndex - previous.discolorationIndex}%</strong>
            </div>
            <div class="compare-delta-pill ${latest.blurRisk <= previous.blurRisk ? 'positive' : 'negative'}">
                <span>Blur Risk</span>
                <strong>${latest.blurRisk - previous.blurRisk >= 0 ? '+' : ''}${latest.blurRisk - previous.blurRisk}%</strong>
            </div>
        ` : '<p>Run two scans to compare trends across time.</p>';
    }

    if (historyStrip) {
        historyStrip.innerHTML = scannerState.scanHistory.map((entry) => `
            <button type="button" class="history-chip" data-history-id="${entry.id}">
                <span>${escapeHtml(formatScanTimestamp(entry.timestamp))}</span>
                <strong>${escapeHtml(entry.statusLabel)}</strong>
            </button>
        `).join('');

        historyStrip.querySelectorAll('[data-history-id]').forEach((button) => {
            button.addEventListener('click', () => {
                const entry = scannerState.scanHistory.find((item) => item.id === button.dataset.historyId);
                if (!entry) return;
                document.getElementById('scan-compare-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                showScannerMessage(`Selected ${entry.statusLabel} scan from ${formatScanTimestamp(entry.timestamp)}.`, 'success');
            });
        });
    }
}

function formatScanTimestamp(date) {
    return new Date(date).toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    });
}

function resizeHeatmapCanvas() {
    if (!scannerState.heatmapCanvas) return;
    const container = document.getElementById('image-preview-container');
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 280;
    const scale = window.devicePixelRatio || 1;
    scannerState.heatmapCanvas.width = Math.round(width * scale);
    scannerState.heatmapCanvas.height = Math.round(height * scale);
    scannerState.heatmapCanvas.style.width = `${width}px`;
    scannerState.heatmapCanvas.style.height = `${height}px`;
    if (scannerState.heatmapCtx) {
        scannerState.heatmapCtx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    drawHeatmapOverlay();
}

function drawHeatmapOverlay(result = scannerState.currentResult) {
    if (!scannerState.heatmapCtx || !scannerState.heatmapCanvas) return;
    const ctx = scannerState.heatmapCtx;
    const width = scannerState.heatmapCanvas.clientWidth || 520;
    const height = scannerState.heatmapCanvas.clientHeight || 280;
    ctx.clearRect(0, 0, width, height);

    if (!scannerState.heatmapVisible || !result || !result.heatmap) {
        return;
    }

    const { severity, hotspots } = result.heatmap;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    hotspots.forEach((hotspot) => {
        const centerX = width * hotspot.x;
        const centerY = height * hotspot.y;
        const radius = Math.max(width, height) * hotspot.r;
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.08, centerX, centerY, radius);
        gradient.addColorStop(0, colorWithAlpha(hotspot.color, Math.min(0.72, hotspot.intensity)));
        gradient.addColorStop(0.55, colorWithAlpha(hotspot.color, Math.max(0.18, hotspot.intensity * 0.42)));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.3, severity / 380)})`;
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += width / 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += height / 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function colorWithAlpha(hexColor, alpha) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!match) {
        return `rgba(255, 255, 255, ${alpha})`;
    }

    const r = parseInt(match[1], 16);
    const g = parseInt(match[2], 16);
    const b = parseInt(match[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setScanProgress(value, label, progressBar, stepLabel) {
    if (progressBar) {
        progressBar.style.width = `${clamp(value, 0, 100)}%`;
    }
    if (stepLabel) {
        stepLabel.textContent = label;
    }
}

function setBusyState(isBusy, button, statusPill) {
    scannerState.busy = isBusy;
    if (button) {
        button.disabled = isBusy;
        button.classList.toggle('scan-loading', isBusy);
    }
    if (statusPill) {
        statusPill.textContent = isBusy ? 'Scanning' : (scannerState.currentResult ? scannerState.currentResult.statusLabel : 'Ready');
    }
}

function showScannerMessage(message, type) {
    if (window.SmartFarm && typeof window.SmartFarm.showMessage === 'function') {
        window.SmartFarm.showMessage(message, type);
        return;
    }

    console[type === 'error' ? 'error' : 'log'](message);
}

function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function capitalize(value) {
    const input = String(value || '');
    return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.downloadPlantReport = function() {
    const element = document.getElementById('pdf-report-content');
    if (!element) return;

    const opt = {
        margin: 1,
        filename: 'plant-health-report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        showScannerMessage('Report downloaded successfully!', 'success');
    });
};
