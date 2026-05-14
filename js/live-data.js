/**
 * live-data.js - Fetching data from ESP32 Robot and Weather API
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if required elements exist
    const requiredIds = ['temperature-value', 'humidity-value', 'front-distance-value', 'back-distance-value', 'water-level-value', 'servo-motor-value', 'last-updated'];
    const elementsExist = requiredIds.every(id => document.getElementById(id));

    if (elementsExist) {
        // Init data fetches
        updateSensorData();
        setInterval(updateSensorData, 10000); // Fetch WeatherAPI every 10 seconds

        getAllData();
        setInterval(getAllData, 2000); // Fetch Robot data every 2 seconds
    }
});

/**
 * Fetches temperature and humidity from Weather API
 */
async function updateSensorData() {
    const API_KEY = "378c3a0c2fe14729b27154049251011"; 
    const city = "Chennai"; 
    const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}`;

    const temperatureElement = document.getElementById("temperature-value");
    const humidityElement = document.getElementById("humidity-value");

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        temperatureElement.textContent = data.current.temp_c.toFixed(1) + " °C";
        humidityElement.textContent = data.current.humidity.toFixed(1) + " %";
    } catch (error) {
        console.error("Failed to fetch weather data:", error);
        temperatureElement.textContent = "Error";
        humidityElement.textContent = "Error";
    }
    
    updateTimestampAndVisuals();
}

/**
 * Fetches robot state data from local ESP32 IP
 * Features a fallback mechanism to mock data if the robot is unreachable
 */
async function getAllData() {
    const ipAddress = 'http://10.96.133.197';
    const url = `${ipAddress}/alldata`;
    const frontElement = document.getElementById('front-distance-value');
    const backElement = document.getElementById('back-distance-value');
    const waterElement = document.getElementById('water-level-value');
    const servoElement = document.getElementById('servo-motor-value');

    try {
        // Try fetching with a small timeout so we can fallback quickly
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        
        frontElement.innerText = data.front + ' cm';
        backElement.innerText = data.back + ' cm';
        waterElement.innerText = data.water + ' %';
        servoElement.innerText = data.servo;

        document.getElementById('demo-mode-indicator')?.remove(); // Clear demo indicator if successful

    } catch (error) {
        // Connection failed, show mock data for demonstration purposes
        console.warn('Robot unreachable. Falling back to Demo Mode data.');
        
        // Mock randomized data
        frontElement.innerText = (Math.random() * 30 + 10).toFixed(1) + ' cm';
        backElement.innerText = (Math.random() * 30 + 10).toFixed(1) + ' cm';
        waterElement.innerText = (Math.random() * 40 + 40).toFixed(0) + ' %';
        servoElement.innerText = Math.random() > 0.5 ? 'ON' : 'OFF';

        // Show a discrete demo mode indicator so user knows it's mocked
        if (!document.getElementById('demo-mode-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'demo-mode-indicator';
            indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> Robot disconnected. Displaying Demo Data.';
            indicator.style.cssText = 'background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; text-align: center; margin-bottom: 20px; font-weight: 500;';
            const pageHeader = document.querySelector('.live-data-container') || document.querySelector('.container');
            if(pageHeader) {
                pageHeader.prepend(indicator);
            }
        }
    }
}

function updateTimestampAndVisuals() {
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    // Add a subtle flash effect to show data update
    document.querySelectorAll('.live-data-card .data-value').forEach(el => {
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 500);
    });
}
