/**
 * control-room.js - Real-time telemetry simulation for the SmartFarm control room
 */

window.SmartFarmControlRoom = window.SmartFarmControlRoom || {};

const CONTROL_ROOM_HISTORY_LIMIT = 20;
const CONTROL_ROOM_CARDS = {
    robot: 'robot-status',
    connectivity: 'connectivity-status',
    coverage: 'mission-coverage',
    updatedAt: 'last-update'
};

const controlRoomState = {
    temperature: 28.4,
    humidity: 61,
    soilMoisture: 48,
    battery: 92,
    signal: 88,
    waterTank: 74,
    pumpActive: false,
    missionCoverage: 12,
    robotMode: 'Patrolling',
    streamMode: 'Simulated Stream',
    history: [],
    chart: null,
    timer: null,
    eventIds: new Set()
};

window.SmartFarmControlRoom.state = controlRoomState;

document.addEventListener('DOMContentLoaded', () => {
    const chartCanvas = document.getElementById('telemetry-chart');
    if (!chartCanvas || typeof Chart === 'undefined') return;

    seedHistory();
    renderTelemetry(controlRoomState);
    controlRoomState.chart = createChart(chartCanvas);
    controlRoomState.timer = window.setInterval(stepTelemetry, 1800);

    window.SmartFarmControlRoom.receiveSnapshot = receiveExternalSnapshot;
    window.SmartFarmControlRoom.setStreamMode = setStreamMode;
    window.SmartFarmControlRoom.stop = stopTelemetry;
});

function seedHistory() {
    const now = Date.now();
    const labels = [];

    for (let i = 11; i >= 0; i -= 1) {
        const snapshot = createSnapshot({
            temperature: controlRoomState.temperature + randomFloat(-0.6, 0.6),
            humidity: controlRoomState.humidity + randomFloat(-4, 4),
            soilMoisture: controlRoomState.soilMoisture + randomFloat(-2.5, 2.5),
            battery: controlRoomState.battery + randomFloat(-0.8, 0.2),
            signal: controlRoomState.signal + randomFloat(-3, 3),
            waterTank: controlRoomState.waterTank + randomFloat(-1.5, 1.5),
            missionCoverage: controlRoomState.missionCoverage + i * 0.45
        });

        snapshot.timestamp = now - i * 180000;
        labels.push(formatShortTime(snapshot.timestamp));
        controlRoomState.history.push(snapshot);
    }

    syncStateFromSnapshot(controlRoomState.history[controlRoomState.history.length - 1]);
    controlRoomState.history = controlRoomState.history.slice(-CONTROL_ROOM_HISTORY_LIMIT);
    controlRoomState.chartLabels = labels.slice(-CONTROL_ROOM_HISTORY_LIMIT);
}

function createChart(canvas) {
    const labels = controlRoomState.chartLabels || controlRoomState.history.map(item => formatShortTime(item.timestamp));
    const temperatures = controlRoomState.history.map(item => Number(item.temperature.toFixed(1)));
    const moisture = controlRoomState.history.map(item => Math.round(item.soilMoisture));
    const battery = controlRoomState.history.map(item => Math.round(item.battery));

    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: '#7cf29d',
                    backgroundColor: 'rgba(124, 242, 157, 0.12)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'Soil Moisture (%)',
                    data: moisture,
                    borderColor: '#5ecbff',
                    backgroundColor: 'rgba(94, 203, 255, 0.1)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'Battery (%)',
                    data: battery,
                    borderColor: '#ffd166',
                    backgroundColor: 'rgba(255, 209, 102, 0.08)',
                    fill: false,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 0,
                    borderDash: [6, 6]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e8f7ea'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 18, 12, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e8f7ea',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(232, 247, 234, 0.7)', maxRotation: 0, autoSkip: true },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    ticks: { color: 'rgba(232, 247, 234, 0.7)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function stepTelemetry() {
    const latest = controlRoomState.history[controlRoomState.history.length - 1] || createSnapshot(controlRoomState);
    const next = createSnapshot({
        temperature: latest.temperature + randomFloat(-0.5, 0.7),
        humidity: latest.humidity + randomFloat(-3, 3),
        soilMoisture: latest.soilMoisture + (latest.pumpActive ? randomFloat(1.2, 2.8) : randomFloat(-1.6, 0.4)),
        battery: latest.battery - randomFloat(0.08, 0.24),
        signal: latest.signal + randomFloat(-2, 2),
        waterTank: latest.waterTank + (latest.pumpActive ? randomFloat(-0.2, 0.1) : randomFloat(-0.1, 0.15)),
        missionCoverage: Math.min(100, latest.missionCoverage + randomFloat(0.7, 1.6)),
        pumpActive: latest.soilMoisture < 32 || (latest.pumpActive && latest.soilMoisture < 44),
        robotMode: 'Patrolling'
    });

    if (next.soilMoisture < 32) {
        next.pumpActive = true;
        next.robotMode = 'Irrigating';
    } else if (next.pumpActive) {
        next.robotMode = 'Irrigating';
    } else if (next.missionCoverage > 70) {
        next.robotMode = 'Scanning';
    }

    next.timestamp = Date.now();
    pushSnapshot(next);
}

function pushSnapshot(snapshot) {
    syncStateFromSnapshot(snapshot);
    controlRoomState.history.push(snapshot);
    controlRoomState.history = controlRoomState.history.slice(-CONTROL_ROOM_HISTORY_LIMIT);

    if (controlRoomState.chart) {
        controlRoomState.chart.data.labels.push(formatShortTime(snapshot.timestamp));
        controlRoomState.chart.data.labels = controlRoomState.chart.data.labels.slice(-CONTROL_ROOM_HISTORY_LIMIT);

        controlRoomState.chart.data.datasets[0].data.push(Number(snapshot.temperature.toFixed(1)));
        controlRoomState.chart.data.datasets[1].data.push(Math.round(snapshot.soilMoisture));
        controlRoomState.chart.data.datasets[2].data.push(Math.round(snapshot.battery));

        controlRoomState.chart.data.datasets.forEach(dataset => {
            dataset.data = dataset.data.slice(-CONTROL_ROOM_HISTORY_LIMIT);
        });

        controlRoomState.chart.update('none');
    }

    renderTelemetry(snapshot);
    maybeAppendEvent(snapshot);
}

function renderTelemetry(snapshot) {
    updateCard('robot-status', snapshot.robotMode);
    updateCard('connectivity-status', controlRoomState.streamMode);
    updateCard('mission-coverage', `${Math.round(snapshot.missionCoverage)}%`);
    updateCard('last-update', formatTime(snapshot.timestamp));

    renderMetric('telemetry-summary', [
        ['Temperature', `${snapshot.temperature.toFixed(1)} °C`],
        ['Humidity', `${Math.round(snapshot.humidity)} %`],
        ['Soil Moisture', `${Math.round(snapshot.soilMoisture)} %`],
        ['Battery', `${Math.round(snapshot.battery)} %`]
    ]);

    updateRouteBoard(snapshot.missionCoverage, snapshot.robotMode);
    updateDeviceCards(snapshot);
}

function renderMetric(containerId, metrics) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = metrics.map(([label, value]) => `
        <div class="metric-card">
            <span>${label}</span>
            <strong>${value}</strong>
        </div>
    `).join('');
}

function updateCard(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateRouteBoard(progress, mode) {
    const robot = document.querySelector('.point-robot');
    const scan = document.querySelector('.point-scan');
    const water = document.querySelector('.point-water');
    if (!robot || !scan || !water) return;

    const path = [
        { left: 12, top: 13 },
        { left: 26, top: 22 },
        { left: 42, top: 34 },
        { left: 58, top: 46 },
        { left: 70, top: 60 },
        { left: 56, top: 74 },
        { left: 40, top: 60 },
        { left: 28, top: 47 }
    ];
    const index = Math.min(path.length - 1, Math.floor((progress / 100) * (path.length - 1)));
    const nextIndex = Math.min(path.length - 1, index + 1);
    const blend = (progress / 100) * (path.length - 1) - index;
    const current = path[index];
    const next = path[nextIndex];

    const left = current.left + (next.left - current.left) * blend;
    const top = current.top + (next.top - current.top) * blend;

    robot.style.left = `${left}%`;
    robot.style.top = `${top}%`;
    robot.style.transform = `translate(-50%, -50%) ${mode === 'Irrigating' ? 'scale(1.08)' : 'scale(1)'}`;
    robot.innerHTML = `<i class="fas ${mode === 'Irrigating' ? 'fa-droplet' : 'fa-robot'}"></i>`;

    scan.style.opacity = progress > 45 ? '1' : '0.55';
    water.style.opacity = progress > 20 ? '1' : '0.55';
}

function updateDeviceCards(snapshot) {
    const cards = document.querySelectorAll('.device-card');
    if (!cards.length) return;

    const values = [
        ['ESP32 Controller', snapshot.signal > 55 ? 'Online' : 'Weak Link', snapshot.signal > 55 ? '#8ff09b' : '#ffd166'],
        ['Telemetry Bus', controlRoomState.streamMode, '#8fd8ff'],
        ['Camera + Vision', snapshot.robotMode === 'Scanning' ? 'Active' : 'Standby', snapshot.robotMode === 'Scanning' ? '#8ff09b' : '#ffd166']
    ];

    cards.forEach((card, index) => {
        const strong = card.querySelector('strong');
        const paragraph = card.querySelector('p');
        if (!strong || !paragraph) return;
        const item = values[index];
        if (!item) return;

        if (index === 0) {
            strong.textContent = item[0];
        }

        paragraph.textContent = item[1];
        card.style.borderColor = `${item[2]}33`;
    });
}

function maybeAppendEvent(snapshot) {
    const feed = document.getElementById('event-feed');
    if (!feed) return;

    const events = [];

    if (snapshot.soilMoisture < 32) {
        events.push({
            id: 'low-moisture',
            label: 'Low soil moisture detected',
            body: 'Irrigation threshold crossed. Pump cycle should begin.',
            tone: 'warning'
        });
    }

    if (snapshot.battery < 35) {
        events.push({
            id: 'low-battery',
            label: 'Battery reserve falling',
            body: 'Mission planner should consider a return-to-base route.',
            tone: 'warning'
        });
    }

    if (snapshot.signal < 50) {
        events.push({
            id: 'weak-signal',
            label: 'Weak connectivity observed',
            body: 'Telemetry link should move closer to the gateway.',
            tone: 'danger'
        });
    }

    if (snapshot.robotMode === 'Irrigating') {
        events.push({
            id: 'watering',
            label: 'Targeted irrigation running',
            body: 'Water output is aligned to the moisture threshold.',
            tone: 'success'
        });
    }

    events.forEach(event => {
        if (controlRoomState.eventIds.has(event.id)) return;
        controlRoomState.eventIds.add(event.id);

        const item = document.createElement('li');
        item.className = `placeholder-event event-${event.tone}`;
        item.innerHTML = `
            <span class="event-time">${formatTime(snapshot.timestamp)}</span>
            <div>
                <strong>${event.label}</strong>
                <p>${event.body}</p>
            </div>
        `;

        feed.prepend(item);
        while (feed.children.length > 5) {
            feed.removeChild(feed.lastElementChild);
        }
    });
}

function syncStateFromSnapshot(snapshot) {
    controlRoomState.temperature = snapshot.temperature;
    controlRoomState.humidity = snapshot.humidity;
    controlRoomState.soilMoisture = snapshot.soilMoisture;
    controlRoomState.battery = snapshot.battery;
    controlRoomState.signal = snapshot.signal;
    controlRoomState.waterTank = snapshot.waterTank;
    controlRoomState.pumpActive = snapshot.pumpActive;
    controlRoomState.missionCoverage = snapshot.missionCoverage;
    controlRoomState.robotMode = snapshot.robotMode;
}

function createSnapshot(overrides = {}) {
    return {
        temperature: clamp((overrides.temperature ?? controlRoomState.temperature), 18, 42),
        humidity: clamp((overrides.humidity ?? controlRoomState.humidity), 25, 98),
        soilMoisture: clamp((overrides.soilMoisture ?? controlRoomState.soilMoisture), 10, 100),
        battery: clamp((overrides.battery ?? controlRoomState.battery), 10, 100),
        signal: clamp((overrides.signal ?? controlRoomState.signal), 20, 100),
        waterTank: clamp((overrides.waterTank ?? controlRoomState.waterTank), 0, 100),
        pumpActive: overrides.pumpActive ?? controlRoomState.pumpActive,
        missionCoverage: clamp((overrides.missionCoverage ?? controlRoomState.missionCoverage), 0, 100),
        robotMode: overrides.robotMode ?? controlRoomState.robotMode,
        timestamp: overrides.timestamp ?? Date.now()
    };
}

function receiveExternalSnapshot(snapshot) {
    const normalized = createSnapshot(snapshot);
    normalized.timestamp = snapshot.timestamp ?? Date.now();
    normalized.robotMode = snapshot.robotMode || normalized.robotMode;
    normalized.pumpActive = Boolean(snapshot.pumpActive);
    normalized.missionCoverage = clamp(snapshot.missionCoverage ?? normalized.missionCoverage, 0, 100);
    setStreamMode(snapshot.streamMode || 'Live Stream');
    pushSnapshot(normalized);
}

function setStreamMode(mode) {
    controlRoomState.streamMode = mode;
    updateCard('connectivity-status', mode);
}

function stopTelemetry() {
    if (controlRoomState.timer) {
        window.clearInterval(controlRoomState.timer);
        controlRoomState.timer = null;
    }
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatShortTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}
