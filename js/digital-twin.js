/**
 * digital-twin.js - Three.js-powered field digital twin
 */

const DIGITAL_TWIN_MODELS = {
    survey: {
        label: 'Survey Sweep',
        route: [
            [-10, 0, -10], [-6, 0, -6], [-2, 0, -8], [2, 0, -4],
            [6, 0, -9], [9, 0, -2], [5, 0, 3], [0, 0, 7], [-5, 0, 10], [-9, 0, 5]
        ],
        coverageRate: 0.8,
        batteryDrain: 0.24
    },
    irrigation: {
        label: 'Irrigation Pass',
        route: [
            [-10, 0, 6], [-6, 0, 4], [-3, 0, 1], [0, 0, 0],
            [4, 0, 2], [8, 0, 1], [10, 0, -3], [6, 0, -7], [2, 0, -9], [-3, 0, -7]
        ],
        coverageRate: 0.55,
        batteryDrain: 0.18
    },
    scan: {
        label: 'Disease Scan',
        route: [
            [-9, 0, -9], [-8, 0, -5], [-7, 0, -1], [-6, 0, 3],
            [-5, 0, 7], [-1, 0, 8], [3, 0, 7], [7, 0, 5], [9, 0, 0], [8, 0, -5]
        ],
        coverageRate: 0.7,
        batteryDrain: 0.2
    }
};

window.SmartFarmDigitalTwin = window.SmartFarmDigitalTwin || {};

const twinState = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    clock: null,
    heatmapCanvas: null,
    heatmapCtx: null,
    field: null,
    robot: null,
    robotFallback: null,
    routeLine: null,
    routeMarkers: [],
    sensorNodes: [],
    sensorRings: [],
    activeMode: 'survey',
    viewMode: 'overview',
    routeProgress: 0,
    playSpeed: 3,
    routePoints: [],
    routeCurve: null,
    missionFrames: [],
    replayIndex: 0,
    replayDuration: 240,
    playing: true,
    sensorsVisible: true,
    heatmapEnabled: true,
    heatmapGridSize: 24,
    heatmapTrail: [],
    telemetry: {
        coverage: 12,
        battery: 92,
        moisture: 48,
        heading: 0,
        distance: 0,
        delta: 0
    },
    ws: null,
    telemetryTimer: null,
    animationFrame: null,
    lastAlert: null,
    launcherOpen: false
};

window.SmartFarmDigitalTwin.state = twinState;

document.addEventListener('DOMContentLoaded', () => {
    bootstrapDigitalTwin();
});

function bootstrapDigitalTwin() {
    if (typeof THREE === 'undefined') {
        appendTwinEvent('Three.js missing', 'The 3D scene cannot initialize because Three.js is unavailable.');
        return;
    }

    initScene();
    bindControls();
    bindReplayControls();
    bindToolLauncher();
    bindResize();
    bindModeSelect();
    setConnectionState('Simulation', false);
    setMissionMode('survey', true);
    setCameraView('overview');
    appendTwinEvent('Digital twin ready', 'Three.js field replica initialized in simulation mode.');
    connectLiveTelemetry();
    startFallbackTelemetry();
    animate();
}

function initScene() {
    const mount = document.getElementById('twin-canvas');
    if (!mount) return;
    twinState.heatmapCanvas = document.getElementById('twin-heatmap');
    twinState.heatmapCtx = twinState.heatmapCanvas ? twinState.heatmapCanvas.getContext('2d') : null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09140d);
    scene.fog = new THREE.Fog(0x09140d, 18, 56);

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 560;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(18, 20, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 12;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2.05;

    const clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xb7ffbf, 0.35));

    const hemisphere = new THREE.HemisphereLight(0xa5ffca, 0x1a231b, 1.15);
    scene.add(hemisphere);

    const directional = new THREE.DirectionalLight(0xffffff, 1.25);
    directional.position.set(12, 22, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    scene.add(directional);

    scene.add(new THREE.GridHelper(40, 40, 0x3ddc84, 0x1d3a25));

    const field = buildField();
    scene.add(field);

    const robotGroup = buildRobotFallback();
    robotGroup.position.set(-10, 0.45, -10);
    scene.add(robotGroup);

    const sensorSetup = buildSensors();
    sensorSetup.group.position.set(0, 0.02, 0);
    scene.add(sensorSetup.group);

    twinState.scene = scene;
    twinState.camera = camera;
    twinState.renderer = renderer;
    twinState.controls = controls;
    twinState.clock = clock;
    twinState.field = field;
    twinState.robot = robotGroup;
    twinState.robotFallback = robotGroup;
    twinState.sensorNodes = sensorSetup.nodes;
    twinState.sensorRings = sensorSetup.rings;

    loadRobotModel();
    resizeHeatmapCanvas();
    window.addEventListener('resize', resizeScene);
}

function buildField() {
    const group = new THREE.Group();

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.MeshStandardMaterial({
            color: 0x12351f,
            roughness: 1,
            metalness: 0
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    const laneMaterial = new THREE.MeshStandardMaterial({
        color: 0x2f7d32,
        roughness: 0.95
    });
    const bedMaterial = new THREE.MeshStandardMaterial({
        color: 0x4caf50,
        roughness: 0.9
    });

    const lanes = [
        [-11, -8], [-11, -4], [-11, 0], [-11, 4], [-11, 8]
    ];

    lanes.forEach(([x, z]) => {
        const lane = new THREE.Mesh(new THREE.BoxGeometry(22, 0.08, 1.2), laneMaterial);
        lane.position.set(x, 0.04, z);
        lane.receiveShadow = true;
        group.add(lane);
    });

    for (let row = -8; row <= 8; row += 4) {
        for (let col = -9; col <= 9; col += 4) {
            const crop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), bedMaterial);
            crop.position.set(col, 0.22, row);
            crop.castShadow = true;
            crop.receiveShadow = true;
            group.add(crop);
        }
    }

    const waterTank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.25, 3, 24),
        new THREE.MeshStandardMaterial({ color: 0x58c9ff, roughness: 0.25, metalness: 0.1 })
    );
    waterTank.position.set(12, 1.5, 10);
    group.add(waterTank);

    const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x8fd8ff, roughness: 0.35, metalness: 0.2 })
    );
    tower.position.set(12, 3, 10);
    group.add(tower);

    return group;
}

function buildRobotFallback() {
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.35, metalness: 0.2 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x0f1a11, roughness: 0.8 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x89f49d, roughness: 0.3, metalness: 0.15 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 2), bodyMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.y = 0.35;
    group.add(base);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.95, 1.45), darkMaterial);
    cabin.position.set(0, 1.02, 0);
    cabin.castShadow = true;
    group.add(cabin);

    const sensorMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.7, 10), accentMaterial);
    sensorMast.position.set(0.9, 1.9, 0);
    group.add(sensorMast);

    const sensorHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshStandardMaterial({ color: 0x58c9ff }));
    sensorHead.position.set(0.9, 2.75, 0);
    group.add(sensorHead);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wheelGeometry = new THREE.CylinderGeometry(0.33, 0.33, 0.28, 20);
    [[-1.1, 0.1, 0.8], [1.1, 0.1, 0.8], [-1.1, 0.1, -0.8], [1.1, 0.1, -0.8]].forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        wheel.castShadow = true;
        group.add(wheel);
    });

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.45 }));
    beacon.position.set(0, 1.8, 0.95);
    group.add(beacon);

    return group;
}

function buildSensors() {
    const group = new THREE.Group();
    const nodes = [];
    const rings = [];
    const sensorPositions = [
        [-12, -12], [-6, -10], [0, -12], [7, -9], [11, -1], [8, 7], [1, 10], [-8, 8]
    ];

    sensorPositions.forEach(([x, z], index) => {
        const node = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 18, 18),
            new THREE.MeshStandardMaterial({
                color: index % 2 === 0 ? 0x58c9ff : 0x89f49d,
                emissive: index % 2 === 0 ? 0x58c9ff : 0x43a047,
                emissiveIntensity: 0.4
            })
        );
        node.position.set(x, 0.35, z);
        node.castShadow = true;
        group.add(node);
        nodes.push(node);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.55, 0.04, 12, 24),
            new THREE.MeshBasicMaterial({ color: 0xc8ffd1, transparent: true, opacity: 0.55 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 0.08, z);
        group.add(ring);
        rings.push(ring);
    });

    return { group, nodes, rings };
}

function loadRobotModel() {
    if (!THREE.GLTFLoader) {
        return;
    }

    try {
        const loader = new THREE.GLTFLoader();
        const candidates = ['assets/field-robot.glb', 'assets/robot.glb'];
        let loaded = false;

        candidates.forEach((url) => {
            loader.load(url, (gltf) => {
                if (loaded) return;
                loaded = true;
                const model = gltf.scene;
                model.scale.set(1.2, 1.2, 1.2);
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                replaceRobotModel(model);
            }, undefined, () => {
                // fallback remains active
            });
        });
    } catch (error) {
        console.warn('GLTF loader unavailable, using procedural robot.', error);
    }
}

function replaceRobotModel(model) {
    if (!twinState.scene || !twinState.robot) return;

    const current = twinState.robot;
    model.position.copy(current.position);
    model.rotation.copy(current.rotation);
    model.scale.copy(current.scale);
    twinState.scene.remove(current);
    twinState.scene.add(model);
    twinState.robot = model;
}

function bindControls() {
    document.querySelectorAll('[data-twin-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.twinAction;
            if (action === 'play') {
                if (twinState.routeProgress >= 1) {
                    twinState.routeProgress = 0;
                }
                twinState.playing = true;
                appendTwinEvent('Playback resumed', 'The robot route is moving again.');
                return;
            }
            if (action === 'pause') {
                twinState.playing = false;
                appendTwinEvent('Playback paused', 'The robot route is frozen in place.');
                return;
            }
            if (action === 'reset') {
                resetTwinView();
                return;
            }
            if (action === 'sensors') {
                twinState.sensorsVisible = !twinState.sensorsVisible;
                twinState.sensorNodes.forEach((node) => { node.visible = twinState.sensorsVisible; });
                twinState.sensorRings.forEach((ring) => { ring.visible = twinState.sensorsVisible; });
                appendTwinEvent(
                    twinState.sensorsVisible ? 'Sensors visible' : 'Sensors hidden',
                    'Sensor beacon layer toggled for a cleaner scene.'
                );
            }
        });
    });

    const speed = document.getElementById('twin-speed');
    if (speed) {
        speed.addEventListener('input', () => {
            twinState.playSpeed = Number(speed.value);
        });
    }
}

function bindModeSelect() {
    const select = document.getElementById('twin-field-mode');
    if (!select) return;

    select.addEventListener('change', () => {
        setMissionMode(select.value);
    });
}

function setMissionMode(mode, initial = false) {
    const preset = DIGITAL_TWIN_MODELS[mode] || DIGITAL_TWIN_MODELS.survey;
    twinState.activeMode = mode;
    twinState.routePoints = preset.route.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    twinState.routeCurve = new THREE.CatmullRomCurve3(twinState.routePoints, false, 'catmullrom', 0.2);
    twinState.replayDuration = mode === 'irrigation' ? 270 : mode === 'scan' ? 225 : 240;
    twinState.routeProgress = 0;
    twinState.replayIndex = 0;
    twinState.playing = true;
    twinState.lastAlert = null;
    rebuildRouteLine();
    updateTwinSummary(preset);
    buildMissionReplay(preset);
    syncMissionReplay(0, true);
    if (!initial) {
        appendTwinEvent(`Mission mode: ${preset.label}`, 'The digital twin route and metrics were reconfigured.');
    }
}

function rebuildRouteLine() {
    if (!twinState.scene) return;

    if (twinState.routeLine) {
        twinState.scene.remove(twinState.routeLine);
        twinState.routeLine.geometry.dispose();
        twinState.routeLine.material.dispose();
        twinState.routeLine = null;
    }

    twinState.routeMarkers.forEach((marker) => {
        twinState.scene.remove(marker);
        marker.geometry.dispose();
        marker.material.dispose();
    });
    twinState.routeMarkers = [];

    if (!twinState.routeCurve) return;

    const sampled = twinState.routeCurve.getPoints(120);
    const geometry = new THREE.BufferGeometry().setFromPoints(sampled);
    const material = new THREE.LineBasicMaterial({ color: 0x7cf29d, transparent: true, opacity: 0.95 });
    twinState.routeLine = new THREE.Line(geometry, material);
    twinState.scene.add(twinState.routeLine);

    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x996a00, emissiveIntensity: 0.3 });
    sampled.filter((_, index) => index % 24 === 0).forEach((point) => {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), markerMaterial.clone());
        marker.position.copy(point);
        marker.position.y = 0.32;
        twinState.scene.add(marker);
        twinState.routeMarkers.push(marker);
    });
}

function updateTwinSummary(preset) {
    const route = document.getElementById('twin-route');
    if (route) route.textContent = preset.label;

    const mission = document.getElementById('inspector-mission');
    if (mission) mission.textContent = preset.label;

    const modelState = document.getElementById('inspector-model-state');
    if (modelState) {
        modelState.textContent = `${preset.label} Ready`;
    }
}

function resetTwinView() {
    twinState.routeProgress = 0;
    twinState.playing = true;
    twinState.telemetry.distance = 0;
    twinState.telemetry.delta = 0;
    setMissionMode(twinState.activeMode, true);
    setCameraView('overview');
    syncMissionReplay(0, true, true);
    appendTwinEvent('Twin reset', 'Camera, route, and playback returned to the overview state.');
}

function setCameraView(view) {
    twinState.viewMode = view;
    document.querySelectorAll('[data-view]').forEach((button) => {
        const active = button.dataset.view === view;
        button.classList.toggle('active', active);
    });

    if (!twinState.camera || !twinState.controls) return;

    const presets = {
        overview: { pos: [18, 20, 22], target: [0, 0, 0] },
        orbit: { pos: [10, 14, 28], target: [0, 0, 0] },
        field: { pos: [-22, 12, 0], target: [0, 0, 0] },
        payload: { pos: [4, 6, 6], target: [0, 0.8, 0] }
    };

    const preset = presets[view] || presets.overview;
    twinState.camera.position.set(...preset.pos);
    twinState.controls.target.set(...preset.target);
    twinState.controls.update();
}

function bindResize() {
    window.addEventListener('resize', resizeScene);
}

function resizeScene() {
    if (!twinState.renderer || !twinState.camera) return;
    const mount = document.getElementById('twin-canvas');
    if (!mount) return;

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 560;
    twinState.camera.aspect = width / height;
    twinState.camera.updateProjectionMatrix();
    twinState.renderer.setSize(width, height);
    resizeHeatmapCanvas();
}

function bindToolLauncher() {
    const launcher = document.querySelector('.twin-tool-launcher');
    const button = document.getElementById('twin-tool-button');
    const menu = document.getElementById('twin-tool-menu');

    if (!launcher || !button || !menu) return;

    const setOpen = (open) => {
        twinState.launcherOpen = open;
        launcher.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
    };

    button.addEventListener('click', () => {
        setOpen(!twinState.launcherOpen);
    });

    document.addEventListener('click', (event) => {
        if (!launcher.contains(event.target)) {
            setOpen(false);
        }
    });

    menu.querySelectorAll('[data-tool-action]').forEach((option) => {
        option.addEventListener('click', () => {
            const action = option.dataset.toolAction;
            if (action === 'heatmap') {
                twinState.heatmapEnabled = !twinState.heatmapEnabled;
                drawHeatmap();
                appendTwinEvent(
                    twinState.heatmapEnabled ? 'Heatmap enabled' : 'Heatmap reduced',
                    'Coverage visualization was toggled from the launcher.'
                );
                flashTwinPanel('twin-canvas-shell');
            }
            if (action === 'inspector') {
                scrollToTwinPanel('robot-inspector');
            }
            if (action === 'replay') {
                scrollToTwinPanel('mission-replay');
            }
            setOpen(false);
        });
    });
}

function bindReplayControls() {
    const slider = document.getElementById('twin-replay');
    if (slider) {
        slider.addEventListener('input', () => {
            const index = Number(slider.value);
            seekReplay(index, true);
        });
    }

    document.querySelectorAll('[data-replay-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.replayAction;
            if (action === 'back') {
                seekReplay(twinState.replayIndex - 3, true);
                return;
            }
            if (action === 'toggle') {
                twinState.playing = !twinState.playing;
                appendTwinEvent(
                    twinState.playing ? 'Replay playing' : 'Replay paused',
                    'Mission playback was toggled from the scrubber controls.'
                );
                return;
            }
            if (action === 'live') {
                twinState.playing = true;
                seekReplay(twinState.missionFrames.length - 1, true);
                appendTwinEvent('Jumped to live', 'The replay scrubber snapped to the latest mission frame.');
            }
        });
    });
}

function buildMissionReplay(preset) {
    if (!twinState.routeCurve) return;

    const frameCount = 96;
    const duration = twinState.replayDuration || 240;
    const samples = twinState.routeCurve.getPoints(frameCount - 1);
    const trail = [];

    twinState.missionFrames = samples.map((point, index) => {
        const progress = frameCount > 1 ? index / (frameCount - 1) : 0;
        const tangent = twinState.routeCurve.getTangentAt(progress);
        const heading = (Math.atan2(tangent.x, tangent.z) * 180 / Math.PI + 360) % 360;
        const coverage = clamp(12 + (progress * 84 * (preset.coverageRate + 0.18)), 0, 100);
        const battery = clamp(100 - (progress * (24 + preset.batteryDrain * 68)), 8, 100);
        const moisture = clamp(
            preset.label === 'Irrigation Pass'
                ? 46 + Math.sin(progress * Math.PI * 2.4) * 8 + progress * 6
                : 48 - progress * 10 + Math.sin(progress * Math.PI * 3.2) * 2.5,
            10,
            100
        );

        trail.push({
            index,
            x: point.x,
            z: point.z,
            progress,
            strength: 0.4 + progress * 0.6
        });

        return {
            index,
            progress,
            point,
            heading,
            coverage,
            battery,
            moisture,
            distance: progress * (18 + preset.coverageRate * 24),
            timestamp: Math.round(progress * duration)
        };
    });

    twinState.heatmapTrail = trail;
    twinState.replayIndex = 0;
    renderReplayMarkers();
    updateReplayLabels();
    updateReplaySlider(0);
    updateInspector();
    drawHeatmap();
}

function renderReplayMarkers() {
    const markers = document.getElementById('replay-markers');
    if (!markers) return;

    const total = twinState.missionFrames.length;
    const positions = [0, 0.33, 0.66, 1];
    const labels = ['Launch', 'Mid Run', 'Approach', 'Landing'];

    markers.innerHTML = '';
    positions.forEach((position, index) => {
        const frameIndex = Math.min(total - 1, Math.round((total - 1) * position));
        const frame = twinState.missionFrames[frameIndex];
        if (!frame) return;

        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'replay-marker';
        marker.dataset.frame = String(frameIndex);
        marker.innerHTML = `
            <span>${formatReplayTime(frame.timestamp)}</span>
            <strong>${labels[index]}</strong>
        `;
        marker.addEventListener('click', () => {
            seekReplay(frameIndex, true);
        });
        markers.appendChild(marker);
    });
}

function seekReplay(index, pausePlayback = false) {
    if (!twinState.missionFrames.length) return;
    const nextIndex = clamp(Math.round(index), 0, twinState.missionFrames.length - 1);
    twinState.replayIndex = nextIndex;
    twinState.routeProgress = twinState.missionFrames[nextIndex].progress;
    if (pausePlayback) {
        twinState.playing = false;
    }
    syncMissionReplay(nextIndex, true, true);
}

function syncMissionReplay(index, updateTelemetry = false, lockRoute = false) {
    const frame = twinState.missionFrames[index] || twinState.missionFrames[twinState.replayIndex];
    if (!frame) {
        drawHeatmap();
        updateReplayLabels();
        updateInspector();
        return;
    }

    twinState.replayIndex = frame.index;
    if (lockRoute) {
        twinState.routeProgress = frame.progress;
    }

    if (updateTelemetry) {
        applyTelemetrySnapshot({
            coverage: frame.coverage,
            battery: frame.battery,
            moisture: frame.moisture,
            heading: frame.heading,
            distance: frame.distance,
            delta: frame.index === 0 ? 0 : frame.coverage - (twinState.telemetry.coverage || 0)
        }, 'Replay');
    }

    updateReplayLabels(frame);
    updateInspector(frame);
    drawHeatmap();
    updateReplaySlider(frame.index);
}

function updateReplayLabels(frame = twinState.missionFrames[twinState.replayIndex]) {
    const current = document.getElementById('replay-current-time');
    const windowLabel = document.getElementById('replay-window');
    const start = document.getElementById('replay-start-time');
    const end = document.getElementById('replay-end-time');
    const live = document.getElementById('replay-live-label');

    if (!frame) return;

    const total = twinState.replayDuration || 240;
    if (current) current.textContent = formatReplayTime(frame.timestamp);
    if (windowLabel) windowLabel.textContent = `${formatReplayTime(frame.timestamp)} / ${formatReplayTime(total)}`;
    if (start) start.textContent = '00:00';
    if (end) end.textContent = formatReplayTime(total);
    if (live) live.textContent = twinState.playing ? 'Live Playback' : 'Paused';
}

function updateReplaySlider(frameIndex) {
    const slider = document.getElementById('twin-replay');
    if (!slider) return;
    slider.max = String(Math.max(0, twinState.missionFrames.length - 1));
    slider.value = String(frameIndex);
}

function updateInspector(frame = twinState.missionFrames[twinState.replayIndex]) {
    if (!frame) return;

    const heading = document.getElementById('inspector-heading');
    const distance = document.getElementById('inspector-distance');
    const coverage = document.getElementById('inspector-coverage');
    const battery = document.getElementById('inspector-battery');
    const modelState = document.getElementById('inspector-model-state');

    if (heading) heading.textContent = `${Math.round(frame.heading)}°`;
    if (distance) distance.textContent = `${frame.distance.toFixed(1)} m`;
    if (coverage) coverage.textContent = `${Math.round(frame.coverage)}%`;
    if (battery) battery.textContent = `${Math.round(frame.battery)}%`;
    if (modelState) modelState.textContent = `${DIGITAL_TWIN_MODELS[twinState.activeMode].label} | ${formatReplayTime(frame.timestamp)}`;
}

function resizeHeatmapCanvas() {
    if (!twinState.heatmapCanvas) return;
    const mount = document.getElementById('twin-canvas');
    if (!mount) return;

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 560;
    const scale = window.devicePixelRatio || 1;
    twinState.heatmapCanvas.width = Math.floor(width * scale);
    twinState.heatmapCanvas.height = Math.floor(height * scale);
    twinState.heatmapCanvas.style.width = `${width}px`;
    twinState.heatmapCanvas.style.height = `${height}px`;
    if (twinState.heatmapCtx) {
        twinState.heatmapCtx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    drawHeatmap();
}

function drawHeatmap() {
    if (!twinState.heatmapCtx || !twinState.heatmapCanvas) return;

    const ctx = twinState.heatmapCtx;
    const width = twinState.heatmapCanvas.clientWidth || 900;
    const height = twinState.heatmapCanvas.clientHeight || 560;
    const grid = twinState.heatmapGridSize;
    const cellWidth = width / grid;
    const cellHeight = height / grid;
    const heat = Array.from({ length: grid }, () => Array(grid).fill(0));
    const visibleLimit = Math.max(0, twinState.replayIndex);

    if (twinState.heatmapEnabled) {
        twinState.heatmapTrail.slice(0, visibleLimit + 1).forEach((sample) => {
            const gx = Math.floor(((sample.x + 20) / 40) * grid);
            const gz = Math.floor(((sample.z + 20) / 40) * grid);
            const radius = sample.strength > 0.8 ? 2 : 1;

            for (let x = -radius; x <= radius; x += 1) {
                for (let z = -radius; z <= radius; z += 1) {
                    const ix = gx + x;
                    const iz = gz + z;
                    if (ix < 0 || iz < 0 || ix >= grid || iz >= grid) continue;
                    const weight = 1 - (Math.abs(x) + Math.abs(z)) / ((radius + 1) * 1.5);
                    heat[iz][ix] += Math.max(0.12, weight) * sample.strength;
                }
            }
        });
    }

    ctx.clearRect(0, 0, width, height);

    if (!twinState.heatmapEnabled) {
        return;
    }

    heat.forEach((row, z) => {
        row.forEach((value, x) => {
            if (value <= 0.05) return;
            const alpha = Math.min(0.55, value * 0.23);
            const tint = value > 1.2 ? [255, 122, 69] : value > 0.7 ? [255, 193, 73] : [100, 220, 132];
            ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha})`;
            ctx.fillRect(x * cellWidth, z * cellHeight, cellWidth + 1, cellHeight + 1);
        });
    });

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(92, 255, 160, 0.08)');
    gradient.addColorStop(0.5, 'rgba(255, 213, 79, 0.04)');
    gradient.addColorStop(1, 'rgba(255, 110, 64, 0.06)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function flashTwinPanel(selector) {
    const panel = document.querySelector(`.${selector}`) || document.getElementById(selector);
    if (!panel) return;
    panel.classList.add('is-highlighted');
    window.setTimeout(() => panel.classList.remove('is-highlighted'), 1100);
}

function scrollToTwinPanel(id) {
    const panel = document.getElementById(id);
    if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashTwinPanel(id);
    }
}

function formatReplayTime(seconds) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
    const remainder = String(safeSeconds % 60).padStart(2, '0');
    return `${minutes}:${remainder}`;
}

function connectLiveTelemetry() {
    if (typeof WebSocket === 'undefined') {
        return;
    }

    try {
        const socket = new WebSocket('ws://127.0.0.1:8080/digital-twin');
        twinState.ws = socket;

        socket.onopen = () => {
            setConnectionState('Live Stream', true);
            appendTwinEvent('WebSocket connected', 'The digital twin is now ready for live telemetry.');
            stopFallbackTelemetry();
        };

        socket.onmessage = (event) => {
            try {
                const snapshot = JSON.parse(event.data);
                applyTelemetrySnapshot(snapshot, 'Live Stream');
            } catch (error) {
                console.warn('Could not parse digital twin snapshot.', error);
            }
        };

        socket.onerror = () => {
            setConnectionState('Simulation', false);
        };

        socket.onclose = () => {
            setConnectionState('Simulation', false);
            startFallbackTelemetry();
        };
    } catch (error) {
        console.warn('Live telemetry unavailable, using simulation.', error);
        setConnectionState('Simulation', false);
    }
}

function startFallbackTelemetry() {
    if (twinState.telemetryTimer || (twinState.ws && twinState.ws.readyState === WebSocket.OPEN)) return;

    twinState.telemetryTimer = window.setInterval(() => {
        stepTelemetry();
    }, 1800);
}

function stopFallbackTelemetry() {
    if (twinState.telemetryTimer) {
        window.clearInterval(twinState.telemetryTimer);
        twinState.telemetryTimer = null;
    }
}

function stepTelemetry() {
    const preset = DIGITAL_TWIN_MODELS[twinState.activeMode] || DIGITAL_TWIN_MODELS.survey;
    const frame = twinState.missionFrames[twinState.replayIndex] || null;
    const coverageGain = twinState.playing ? preset.coverageRate * twinState.playSpeed * 0.08 : 0.02;
    const batteryDrift = twinState.playing ? preset.batteryDrain * twinState.playSpeed * 0.12 : 0.02;
    const moistureDelta = twinState.activeMode === 'irrigation' ? 0.5 : -0.15;

    const snapshot = frame
        ? {
            coverage: clamp(frame.coverage + coverageGain, 0, 100),
            battery: clamp(frame.battery - batteryDrift, 8, 100),
            moisture: clamp(frame.moisture + moistureDelta, 10, 100),
            heading: frame.heading,
            distance: frame.distance + (twinState.playing ? 0.15 * twinState.playSpeed : 0.05),
            delta: coverageGain
        }
        : {
            coverage: clamp(twinState.telemetry.coverage + coverageGain, 0, 100),
            battery: clamp(twinState.telemetry.battery - batteryDrift, 8, 100),
            moisture: clamp(twinState.telemetry.moisture + moistureDelta, 10, 100),
            heading: (twinState.telemetry.heading + 4.5 * twinState.playSpeed) % 360,
            distance: twinState.telemetry.distance + (twinState.playing ? 0.6 * twinState.playSpeed : 0.1),
            delta: coverageGain
        };

    applyTelemetrySnapshot(snapshot, 'Simulation');
    maybeAppendEvents(snapshot);
}

function applyTelemetrySnapshot(snapshot, source) {
    twinState.telemetry = { ...twinState.telemetry, ...snapshot };

    const coverageEl = document.getElementById('twin-coverage');
    const batteryEl = document.getElementById('twin-battery');
    const moistureEl = document.getElementById('twin-moisture');
    const headingEl = document.getElementById('twin-heading');
    const distanceEl = document.getElementById('twin-distance');
    const deltaEl = document.getElementById('twin-delta');

    if (coverageEl) coverageEl.textContent = `${Math.round(snapshot.coverage)}%`;
    if (batteryEl) batteryEl.textContent = `${Math.round(snapshot.battery)}%`;
    if (moistureEl) moistureEl.textContent = `${Math.round(snapshot.moisture)}%`;
    if (headingEl) headingEl.textContent = `${Math.round(snapshot.heading)}°`;
    if (distanceEl) distanceEl.textContent = `${snapshot.distance.toFixed(1)} m`;
    if (deltaEl) deltaEl.textContent = `${snapshot.delta >= 0 ? '+' : ''}${snapshot.delta.toFixed(1)}%`;

    const streamChip = document.getElementById('twin-stream-chip');
    if (streamChip) streamChip.textContent = source;

    const connection = document.getElementById('twin-connection');
    if (connection) connection.textContent = source;
}

function maybeAppendEvents(snapshot) {
    if (snapshot.coverage >= 70 && twinState.lastAlert !== 'coverage') {
        twinState.lastAlert = 'coverage';
        appendTwinEvent('Coverage milestone reached', 'The digital twin has crossed 70% field coverage.');
    }

    if (snapshot.battery <= 35 && twinState.lastAlert !== 'battery') {
        twinState.lastAlert = 'battery';
        appendTwinEvent('Battery dropping', 'The robot should consider a recharge or return-to-base cycle.');
    }

    if (snapshot.moisture <= 30 && twinState.lastAlert !== 'moisture') {
        twinState.lastAlert = 'moisture';
        appendTwinEvent('Soil drying detected', 'Irrigation recommendation triggered by the twin model.');
    }
}

function appendTwinEvent(title, body) {
    const stream = document.getElementById('twin-events');
    if (!stream) return;

    const item = document.createElement('div');
    item.className = 'event-item';
    item.innerHTML = `
        <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
    `;

    stream.prepend(item);

    while (stream.children.length > 6) {
        stream.removeChild(stream.lastElementChild);
    }
}

function animate() {
    twinState.animationFrame = requestAnimationFrame(animate);

    const delta = twinState.clock ? twinState.clock.getDelta() : 0.016;
    if (twinState.controls) {
        twinState.controls.update();
    }

    updateRobotPosition(delta);
    pulseSensors();

    if (twinState.renderer && twinState.scene && twinState.camera) {
        twinState.renderer.render(twinState.scene, twinState.camera);
    }
}

function updateRobotPosition(delta) {
    if (!twinState.robot || !twinState.routeCurve) return;

    if (twinState.playing) {
        twinState.routeProgress += delta * 0.045 * twinState.playSpeed;
    }

    const progress = Math.min(1, twinState.routeProgress);
    const point = twinState.routeCurve.getPointAt(progress);
    const tangent = twinState.routeCurve.getTangentAt(progress);

    twinState.robot.position.copy(point);
    twinState.robot.position.y = 0.45;
    twinState.robot.rotation.y = Math.atan2(tangent.x, tangent.z);
    if (twinState.missionFrames.length > 0) {
        const frameIndex = Math.min(
            twinState.missionFrames.length - 1,
            Math.round(progress * (twinState.missionFrames.length - 1))
        );
        syncMissionReplay(frameIndex, false, false);
    }

    if (progress >= 1) {
        twinState.playing = false;
    }
}

function pulseSensors() {
    const time = performance.now() * 0.001;
    twinState.sensorRings.forEach((ring, index) => {
        ring.scale.setScalar(1 + (Math.sin(time * 2 + index) * 0.12) + 0.05);
        ring.material.opacity = 0.35 + (Math.sin(time * 2 + index) * 0.12);
    });
}

function setConnectionState(label, live) {
    const chip = document.getElementById('twin-stream-chip');
    if (chip) {
        chip.textContent = label;
        chip.classList.toggle('success', live);
        chip.classList.toggle('warning', !live);
    }

    const connection = document.getElementById('twin-connection');
    if (connection) connection.textContent = label;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
