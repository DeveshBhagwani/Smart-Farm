const PATH_PLANNER_GRID_SIZE = 10;

self.onmessage = (event) => {
    const request = event.data;

    if (!request || request.type !== 'plan') {
        return;
    }

    const plan = runPlanner(request);
    self.postMessage(plan);
};

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

function directionBetween(from, to) {
    return {
        x: Math.sign(to.x - from.x),
        y: Math.sign(to.y - from.y)
    };
}

function cellKey(cell) {
    return `${cell.x},${cell.y}`;
}
