/**
 * smart-irrigation.js - Smart Irrigation Brain scaffold
 */

window.SmartIrrigation = window.SmartIrrigation || {};

document.addEventListener('DOMContentLoaded', () => {
    const soilSlider = document.getElementById('irrigation-soil');
    const soilValue = document.getElementById('irrigation-soil-value');

    if (soilSlider && soilValue) {
        const syncSlider = () => {
            soilValue.textContent = `${soilSlider.value}%`;
        };

        soilSlider.addEventListener('input', syncSlider);
        syncSlider();
    }
});
