/**
 * path-planner.js - Autonomous path planning and visualization
 */

const PATH_PLANNER_GRID_SIZE = 10;
const PATH_PLANNER_CELL_SIZE = 60;
const PATH_PLANNER_MODES = {
    coverage: {
        label: 'Coverage Sweep',
        start: { x: 0, y: 0 },
        goal: { x: 9, y: 9 },
        speed: 3,
        obstacles: [
            { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
            { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
            { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }
        ]
    },
    'point-to-point': {
        label: 'Point to Point',
        start: { x: 1, y: 8 },
        goal: { x: 8, y: 1 },
        speed: 3,
        obstacles: [
            { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 },
            { x: 6, y: 5 }, { x: 7, y: 5 },
            { x: 4, y: 7 }, { x: 5, y: 7 }
        ]
    },
    irrigation: {
        label: 'Irrigation Run',
        start: { x: 0, y: 5 },
        goal: { x: 8, y: 7 },
        speed: 4,
        obstacles: [
            { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
            { x: 5, y: 5 }, { x: 5, y: 6 },
            { x: 7, y: 2 }, { x: 7, y: 3 }
        ]
    }
};

window.SmartFarmPathPlanner = window.SmartFarmPathPlanner || {};

const plannerState = {
    mode: 'coverage',
    obstacles: [],
    route: [],
    pathWorker: null,
    animationHandle: null,
    animationIndex: 0,
    animationStart: 0,
    animationDuration: 0,
    lastPlan: null
};

window.SmartFarmPathPlanner.state = plannerState;

document.addEventListener('DOMContentLoaded', () => {
    bootstrapPathPlanner();
});

function bootstrapPathPlanner() {
    bindControlChips();
    bindPlannerActions();
    bindSpeedSlider();
    bindWindowResize();
    ensureWorker();
    planAndRender('coverage');
}

function bindControlChips() {
    document.querySelectorAll('[data-plan-mode]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-plan-mode]').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            planAndRender(button.dataset.planMode);
        });
    });
}

function bindSpeedSlider() {
    const slider = document.getElementById('planner-speed');
    if (!slider) return;

    const update = () => {
        const plan = plannerState.lastPlan;
        if (!plan) return;
        const speed = Number(slider.value);
        animateRoute(plan.path, speed);
    };

    slider.addEventListener('input', update);
}

function bindPlannerActions() {
    document.querySelectorAll('[data-planner-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.plannerAction;

            if (action === 'replan') {
                logMission('Mission replanned from the current route preset.');
                planAndRender(plannerState.mode);
                return;
            }

            if (action === 'shuffle') {
                const preset = PATH_PLANNER_MODES[plannerState.mode] || PATH_PLANNER_MODES.coverage;
                const obstacles = generateDynamicObstacles(preset);
                logMission('Obstacle field randomized for a fresh route.');
                renderCustomPlan(plannerState.mode, obstacles);
                return;
            }

            if (action === 'reset') {
                plannerState.obstacleSeed = 0;
                logMission('Field reset to the default mission layout.');
                planAndRender(plannerState.mode);
            }
        });
    });
}

function bindWindowResize() {
    window.addEventListener('resize', () => {
        if (plannerState.lastPlan) {
            renderPlan(plannerState.lastPlan);
        }
    });
}

function ensureWorker() {
    if (plannerState.pathWorker || typeof Worker === 'undefined') return;

    try {
        const worker = new Worker('js/path-planner-worker.js');
        worker.onmessage = (event) => {
            const payload = event.data;
            if (payload.type === 'plan') {
                renderPlan(payload.plan);
            }
        };
        worker.onerror = (event) => {
            console.warn('Path planner worker error; falling back to main-thread planning.', event.message);
            plannerState.pathWorker = null;
            window.SmartFarmPathPlanner.worker = null;
        };
        plannerState.pathWorker = worker;
        window.SmartFarmPathPlanner.worker = worker;
    } catch (error) {
        console.warn('Path planner worker unavailable; using main-thread planning.', error);
    }
}

function planAndRender(mode) {
    const preset = PATH_PLANNER_MODES[mode] || PATH_PLANNER_MODES.coverage;
    renderCustomPlan(mode, preset.obstacles.slice());
}

function renderCustomPlan(mode, obstacles) {
    const preset = PATH_PLANNER_MODES[mode] || PATH_PLANNER_MODES.coverage;
    plannerState.mode = mode;
    plannerState.obstacles = obstacles.slice();

    updateModeSummary(preset);
    updateMissionHeader(preset, obstacles);

    const request = {
        type: 'plan',
        gridSize: PATH_PLANNER_GRID_SIZE,
        start: preset.start,
        goal: preset.goal,
        obstacles,
        allowDiagonal: false,
        mode
    };

    if (plannerState.pathWorker) {
        plannerState.pathWorker.postMessage(request);
    } else {
        const plan = runPlanner(request);
        renderPlan(plan);
    }
}

function updateModeSummary(preset) {
    const quality = document.getElementById('route-quality');
    const coverage = document.getElementById('coverage-stat');
    const turnStat = document.getElementById('turn-stat');

    if (quality) quality.textContent = `${preset.label}`;
    if (coverage) coverage.textContent = `${Math.round((preset.goal.x + preset.goal.y + 2) * 5)}%`;
    if (turnStat) turnStat.textContent = '—';
}

function runPlanner(request) {
    const blocked = new Set(request.obstacles.map(cellKey));
    const open = [];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const visited = new Set();
    const startKey = cellKey(request.start);
    const goalKey = cellKey(request.goal);

    const startNode = { ...request.start };
    open.push(startNode);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(request.start, request.goal));

    let explored = 0;

    while (open.length > 0) {
        open.sort((a, b) => (fScore.get(cellKey(a)) || Infinity) - (fScore.get(cellKey(b)) || Infinity));
        const current = open.shift();
        const currentKey = cellKey(current);

        if (visited.has(currentKey)) continue;
        visited.add(currentKey);
        explored += 1;

        if (currentKey === goalKey) {
            const path = reconstructPath(cameFrom, current);
            return buildPlanResponse(path, request, explored);
        }

        for (const neighbor of neighbors(current, request.gridSize, request.allowDiagonal)) {
            const neighborKey = cellKey(neighbor);
            if (blocked.has(neighborKey) || visited.has(neighborKey)) continue;

            const tentativeG = (gScore.get(currentKey) || Infinity) + movementCost(current, neighbor);
            if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeG);
                fScore.set(neighborKey, tentativeG + heuristic(neighbor, request.goal));
                open.push(neighbor);
            }
        }
    }

    return buildPlanResponse([], request, explored, false);
}

function buildPlanResponse(path, request, explored, success = true) {
    const turns = calculateTurns(path);
    const distance = Math.max(0, path.length - 1) * 6;
    const coverage = request.mode === 'coverage' ? 100 : Math.min(100, Math.round((path.length / 18) * 100));
    const risk = Math.max(0, 100 - Math.round((request.obstacles.length / 16) * 100));
    const score = success ? Math.max(40, 100 - Math.round((turns * 4) + (request.obstacles.length * 2))) : 0;

    return {
        type: 'plan',
        plan: {
            mode: request.mode,
            start: request.start,
            goal: request.goal,
            obstacles: request.obstacles.slice(),
            path,
            explored,
            turns,
            distance,
            coverage,
            risk,
            score,
            success
        }
    };
}

function renderPlan(plan) {
    plannerState.lastPlan = plan;
    plannerState.route = plan.path;

    drawObstacles(plan.obstacles);
    drawPoints(plan.start, plan.goal);
    drawPath(plan.path);
    drawStats(plan);
    animateRoute(plan.path, Number(document.getElementById('planner-speed')?.value || 3));
}

function drawObstacles(obstacles) {
    const layer = document.getElementById('planner-obstacles');
    if (!layer) return;

    layer.innerHTML = obstacles.map(cell => {
        const x = cell.x * PATH_PLANNER_CELL_SIZE;
        const y = cell.y * PATH_PLANNER_CELL_SIZE;
        return `<rect x="${x + 4}" y="${y + 4}" width="${PATH_PLANNER_CELL_SIZE - 8}" height="${PATH_PLANNER_CELL_SIZE - 8}" rx="12" fill="rgba(255, 143, 143, 0.28)" stroke="rgba(255, 143, 143, 0.55)" stroke-width="2"></rect>`;
    }).join('');
}

function drawPoints(start, goal) {
    const layer = document.getElementById('planner-points-layer');
    if (!layer) return;

    const startPoint = cellCenter(start);
    const goalPoint = cellCenter(goal);

    layer.innerHTML = `
        <circle cx="${startPoint.x}" cy="${startPoint.y}" r="14" fill="#7cf29d"></circle>
        <text x="${startPoint.x}" y="${startPoint.y + 5}" text-anchor="middle" font-size="12" fill="#08130c" font-weight="700">S</text>
        <circle cx="${goalPoint.x}" cy="${goalPoint.y}" r="14" fill="#58c9ff"></circle>
        <text x="${goalPoint.x}" y="${goalPoint.y + 5}" text-anchor="middle" font-size="12" fill="#08130c" font-weight="700">G</text>
    `;
}

function drawPath(path) {
    const layer = document.getElementById('planner-path-layer');
    if (!layer) return;

    if (!path.length) {
        layer.innerHTML = '';
        return;
    }

    const points = path.map(cell => {
        const center = cellCenter(cell);
        return `${center.x},${center.y}`;
    }).join(' ');

    const routeDots = path.map(cell => {
        const center = cellCenter(cell);
        return `<circle cx="${center.x}" cy="${center.y}" r="4.5" fill="#ffd166"></circle>`;
    }).join('');

    layer.innerHTML = `
        <polyline points="${points}" fill="none" stroke="url(#plannerGradient)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${routeDots}
    `;
}

function drawStats(plan) {
    const distance = document.getElementById('distance-stat');
    const time = document.getElementById('time-stat');
    const avoidance = document.getElementById('avoidance-stat');
    const coverage = document.getElementById('coverage-stat');
    const quality = document.getElementById('route-quality');
    const turnStat = document.getElementById('turn-stat');

    if (distance) distance.textContent = `${plan.distance} m`;
    if (time) time.textContent = `${estimateTime(plan.path.length)} min`;
    if (avoidance) avoidance.textContent = plan.success ? 'Active' : 'Blocked';
    if (coverage) coverage.textContent = `${plan.coverage}%`;
    if (quality) quality.textContent = plan.success ? `${plan.score}/100` : 'No Route';
    if (turnStat) turnStat.textContent = `${plan.turns} turns`;
}

function animateRoute(path, speed = 3) {
    const robot = document.getElementById('robot-node');
    if (!robot || !path.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
        const finalCell = path[path.length - 1];
        const finalCenter = cellCenter(finalCell);
        robot.setAttribute('cx', finalCenter.x);
        robot.setAttribute('cy', finalCenter.y);
        robot.setAttribute('transform', 'rotate(0)');
        return;
    }

    if (plannerState.animationHandle) {
        cancelAnimationFrame(plannerState.animationHandle);
        plannerState.animationHandle = null;
    }

    const duration = Math.max(2200, 7200 - (speed * 1100));
    plannerState.animationDuration = duration;
    plannerState.animationIndex = 0;
    plannerState.animationStart = performance.now();

    const step = (timestamp) => {
        const progress = Math.min(1, (timestamp - plannerState.animationStart) / duration);
        const index = Math.min(path.length - 1, Math.floor(progress * (path.length - 1)));
        const cell = path[index] || path[path.length - 1];
        const center = cellCenter(cell);

        robot.setAttribute('cx', center.x);
        robot.setAttribute('cy', center.y);

        const angle = headingAngle(path[index], path[Math.min(path.length - 1, index + 1)]);
        robot.setAttribute('transform', `rotate(${angle} ${center.x} ${center.y})`);

        if (progress < 1) {
            plannerState.animationHandle = requestAnimationFrame(step);
        }
    };

    plannerState.animationHandle = requestAnimationFrame(step);
}

function estimateTime(steps) {
    const minutes = Math.max(1, Math.round(steps * 0.35));
    return minutes;
}

function calculateTurns(path) {
    if (path.length < 3) return 0;

    let turns = 0;
    let prev = directionBetween(path[0], path[1]);

    for (let i = 2; i < path.length; i += 1) {
        const current = directionBetween(path[i - 1], path[i]);
        if (current.x !== prev.x || current.y !== prev.y) {
            turns += 1;
        }
        prev = current;
    }

    return turns;
}

function headingAngle(current, next) {
    if (!current || !next) return 0;
    return Math.atan2(next.y - current.y, next.x - current.x) * (180 / Math.PI);
}

function reconstructPath(cameFrom, current) {
    const path = [current];
    let key = cellKey(current);

    while (cameFrom.has(key)) {
        const previous = cameFrom.get(key);
        path.unshift(previous);
        key = cellKey(previous);
    }

    return path;
}

function neighbors(cell, gridSize, allowDiagonal) {
    const deltas = allowDiagonal
        ? [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
        ]
        : [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
        ];

    return deltas
        .map(delta => ({ x: cell.x + delta.x, y: cell.y + delta.y }))
        .filter(point => point.x >= 0 && point.y >= 0 && point.x < gridSize && point.y < gridSize);
}

function movementCost(current, next) {
    return current.x !== next.x && current.y !== next.y ? 1.4 : 1;
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function directionBetween(from, to) {
    return {
        x: Math.sign(to.x - from.x),
        y: Math.sign(to.y - from.y)
    };
}

function cellCenter(cell) {
    return {
        x: (cell.x * PATH_PLANNER_CELL_SIZE) + (PATH_PLANNER_CELL_SIZE / 2),
        y: (cell.y * PATH_PLANNER_CELL_SIZE) + (PATH_PLANNER_CELL_SIZE / 2)
    };
}

function cellKey(cell) {
    return `${cell.x},${cell.y}`;
}
