const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);

const clients = new Set();

const state = {
    temperature: 28.4,
    humidity: 61,
    soilMoisture: 48,
    battery: 92,
    signal: 88,
    waterTank: 74,
    pumpActive: false,
    missionCoverage: 12,
    robotMode: 'Patrolling',
    manualMode: null,
    manualModeUntil: 0
};

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function buildSnapshot() {
    const manualActive = state.manualMode && Date.now() < state.manualModeUntil;

    state.temperature = clamp(state.temperature + randomFloat(-0.5, 0.7), 18, 42);
    state.humidity = clamp(state.humidity + randomFloat(-3, 3), 25, 98);
    state.soilMoisture = clamp(
        state.soilMoisture + (state.pumpActive ? randomFloat(1.2, 2.8) : randomFloat(-1.6, 0.4)),
        10,
        100
    );
    state.battery = clamp(state.battery - randomFloat(0.08, 0.24), 10, 100);
    state.signal = clamp(state.signal + randomFloat(-2, 2), 20, 100);
    state.waterTank = clamp(
        state.waterTank + (state.pumpActive ? randomFloat(-0.2, 0.1) : randomFloat(-0.1, 0.15)),
        0,
        100
    );
    state.missionCoverage = clamp(state.missionCoverage + randomFloat(0.7, 1.6), 0, 100);

    if (manualActive) {
        state.robotMode = state.manualMode;
        state.pumpActive = state.manualMode === 'Irrigating';
        if (state.manualMode === 'Standby') {
            state.pumpActive = false;
        }
    } else if (state.soilMoisture < 32) {
        state.robotMode = 'Irrigating';
        state.pumpActive = true;
    } else if (state.missionCoverage > 70) {
        state.robotMode = 'Scanning';
        state.pumpActive = false;
    } else {
        state.robotMode = 'Patrolling';
        state.pumpActive = false;
    }

    return {
        ...state,
        timestamp: Date.now(),
        streamMode: 'Node SSE Live'
    };
}

function applyCommand(command) {
    const snapshot = buildSnapshot();

    if (command === 'scan') {
        state.manualMode = 'Scanning';
        state.manualModeUntil = Date.now() + 6500;
        state.missionCoverage = clamp(state.missionCoverage + 4, 0, 100);
        snapshot.robotMode = 'Scanning';
        snapshot.missionCoverage = state.missionCoverage;
    } else if (command === 'irrigate') {
        state.manualMode = 'Irrigating';
        state.manualModeUntil = Date.now() + 6500;
        state.pumpActive = true;
        state.soilMoisture = clamp(state.soilMoisture + 8, 10, 100);
        state.waterTank = clamp(state.waterTank - 2, 0, 100);
        snapshot.robotMode = 'Irrigating';
        snapshot.soilMoisture = state.soilMoisture;
        snapshot.waterTank = state.waterTank;
    } else if (command === 'home') {
        state.manualMode = 'Returning';
        state.manualModeUntil = Date.now() + 6500;
        state.missionCoverage = clamp(state.missionCoverage + 1.5, 0, 100);
        snapshot.robotMode = 'Returning';
        snapshot.missionCoverage = state.missionCoverage;
    } else if (command === 'stop') {
        state.manualMode = 'Standby';
        state.manualModeUntil = Date.now() + 10000;
        state.pumpActive = false;
        snapshot.robotMode = 'Standby';
        snapshot.pumpActive = false;
    }

    return {
        snapshot: {
            ...state,
            timestamp: Date.now(),
            streamMode: 'Node SSE Live'
        },
        message: `Command ${command} accepted`
    };
}

function broadcast(snapshot) {
    const payload = `data: ${JSON.stringify(snapshot)}\n\n`;
    for (const res of clients) {
        res.write(payload);
    }
}

async function serveStatic(req, res, pathname) {
    let filePath = path.normalize(path.join(ROOT_DIR, pathname));

    if (pathname === '/' || pathname === '') {
        filePath = path.join(ROOT_DIR, 'index.html');
    }

    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        const data = await fs.readFile(filePath);
        const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': type,
            'Cache-Control': 'no-store'
        });
        res.end(data);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Body too large'));
            }
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/telemetry') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        const snapshot = buildSnapshot();
        res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/command') {
        try {
            const body = await readBody(req);
            const payload = body ? JSON.parse(body) : {};
            const command = String(payload.command || '').trim();
            const result = applyCommand(command);
            broadcast(result.snapshot);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ snapshot: buildSnapshot() }));
        return;
    }

    const pathname = decodeURIComponent(url.pathname);
    await serveStatic(req, res, pathname);
});

setInterval(() => {
    const snapshot = buildSnapshot();
    broadcast(snapshot);
}, 1800);

server.listen(PORT, '127.0.0.1', () => {
    console.log(`SmartFarm control room server running at http://127.0.0.1:${PORT}`);
});
