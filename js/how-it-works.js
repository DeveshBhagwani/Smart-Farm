/**
 * how-it-works.js - Logic for the interactive robot simulator
 */

const ROWS = 4;
const COLS = 5;
const grid = document.getElementById('farm-grid');
const robot = document.getElementById('robot');
const logPanel = document.getElementById('sim-log');

let isSimulating = false;
let robotPos = { x: 0, y: 0 };
let currentStep = 0;

// Path defining which cells are plants
const plantCells = [
    {x: 1, y: 0}, {x: 3, y: 0},
    {x: 0, y: 2}, {x: 2, y: 2}, {x: 4, y: 2}
];

document.addEventListener('DOMContentLoaded', () => {
    initGrid();
});

function initGrid() {
    grid.innerHTML = '<div id="robot"><i class="fas fa-robot"></i></div>';
    const robotEl = document.getElementById('robot');
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.id = `cell-${x}-${y}`;
            
            // Check if it's a plant cell
            const isPlant = plantCells.some(p => p.x === x && p.y === y);
            if (isPlant) {
                cell.classList.add('plant');
            }
            
            grid.appendChild(cell);
        }
    }
    
    // Ensure robot stays on top
    grid.appendChild(robotEl);
    updateRobotPosition(0, 0);
}

function updateRobotPosition(x, y) {
    robotPos = { x, y };
    const robotEl = document.getElementById('robot');
    const cellWidth = 100 / COLS;
    const cellHeight = 100 / ROWS;
    
    robotEl.style.left = `calc(${x * cellWidth}% + 10px)`;
    robotEl.style.top = `calc(${y * cellHeight}% + 10px)`;
}

function logMsg(msg) {
    const p = document.createElement('p');
    p.textContent = `> ${msg}`;
    logPanel.appendChild(p);
    logPanel.scrollTop = logPanel.scrollHeight;
}

async function startSimulation() {
    if (isSimulating) return;
    isSimulating = true;
    logPanel.innerHTML = '<p>> Autonomous mode engaged.</p>';
    
    const robotEl = document.getElementById('robot');
    
    // Define a serpentine path covering the grid
    const path = [];
    for (let y = 0; y < ROWS; y++) {
        if (y % 2 === 0) {
            for (let x = 0; x < COLS; x++) path.push({x, y});
        } else {
            for (let x = COLS - 1; x >= 0; x--) path.push({x, y});
        }
    }

    for (let i = 0; i < path.length; i++) {
        if (!isSimulating) break;
        
        const pos = path[i];
        updateRobotPosition(pos.x, pos.y);
        logMsg(`Moving to Sector [${pos.x}, ${pos.y}]`);
        
        await sleep(800);
        
        const isPlant = plantCells.some(p => p.x === pos.x && p.y === pos.y);
        
        if (isPlant) {
            logMsg(`Plant detected at [${pos.x}, ${pos.y}]. Scanning soil...`);
            robotEl.classList.add('scanning');
            await sleep(1000);
            robotEl.classList.remove('scanning');
            
            // Randomly decide if it needs water
            const needsWater = Math.random() > 0.3;
            if (needsWater) {
                logMsg(`Soil moisture low (20%). Activating pump...`);
                robotEl.classList.add('watering');
                await sleep(1500);
                robotEl.classList.remove('watering');
                logMsg(`Irrigation complete.`);
            } else {
                logMsg(`Soil moisture optimal (65%). Skipping.`);
            }
        }
        await sleep(300);
    }
    
    if(isSimulating) {
        logMsg(`Farm sweep complete. Returning to base.`);
        updateRobotPosition(0, 0);
        isSimulating = false;
    }
}

function resetSimulation() {
    isSimulating = false;
    setTimeout(() => {
        updateRobotPosition(0, 0);
        logPanel.innerHTML = '<p>> System reset. Awaiting commands...</p>';
        const robotEl = document.getElementById('robot');
        robotEl.classList.remove('scanning', 'watering');
    }, 500);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
