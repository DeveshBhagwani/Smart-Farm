/**
 * control-room.js - Bootstraps the Real-Time IoT Control Room scaffold
 */

window.SmartFarmControlRoom = window.SmartFarmControlRoom || {
    mode: 'scaffold'
};

document.addEventListener('DOMContentLoaded', () => {
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
});
