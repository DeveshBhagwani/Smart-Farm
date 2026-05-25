/**
 * path-planner.js - Base boot logic for the Autonomous Path Planner
 */

window.SmartFarmPathPlanner = window.SmartFarmPathPlanner || {
    mode: 'coverage',
    ready: false
};

document.addEventListener('DOMContentLoaded', () => {
    const coverage = document.getElementById('coverage-stat');
    if (coverage) {
        coverage.textContent = 'Field Ready';
    }

    const quality = document.getElementById('route-quality');
    if (quality) {
        quality.textContent = 'Awaiting Plan';
    }

    const turnStat = document.getElementById('turn-stat');
    if (turnStat) {
        turnStat.textContent = '--';
    }
});
