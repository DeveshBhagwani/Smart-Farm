/**
 * weather.js - Weather fetching and display logic
 */

document.addEventListener('DOMContentLoaded', function() {
    const weatherForm = document.getElementById('weather-form');
    
    if (weatherForm) {
        weatherForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const city = document.getElementById('city').value.trim();
            
            if (city) {
                window.SmartFarm.showLoading(weatherForm.querySelector('button'));
                fetchWeatherData(city);
            }
        });
    }
});

async function fetchWeatherData(city) {
    const API_KEY = "378c3a0c2fe14729b27154049251011"; 

    if (API_KEY === "PASTE_YOUR_WEATHERAPI_KEY_HERE") {
        window.SmartFarm.showMessage("Please add your WeatherAPI.com API key to weather.js", "error");
        window.SmartFarm.hideLoading();
        return;
    }

    const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || "City not found.");
        }
        
        const data = await response.json();

        // Map the API data
        const weatherData = {
            city: data.location.name,
            temperature: data.current.temp_c.toFixed(1),
            humidity: data.current.humidity,
            windSpeed: data.current.wind_kph.toFixed(1),
            condition: data.current.condition.text,
            precipitation: data.current.precip_mm,
            visibility: data.current.vis_km.toFixed(1),
            icon: data.current.condition.icon // partial URL
        };
        
        displayWeatherData(weatherData);
        window.SmartFarm.hideLoading();
        
    } catch (error) {
        window.SmartFarm.showMessage(error.message, 'error');
        window.SmartFarm.hideLoading();
    }
}

function displayWeatherData(data) {
    const weatherResult = document.getElementById('weather-result');
    
    if (weatherResult) {
        // Ensure https protocol for the icon
        const iconUrl = data.icon.startsWith('http') ? data.icon : "https:" + data.icon;

        weatherResult.innerHTML = `
            <div class="weather-card info-card">
                <h3><i class="fas fa-map-marker-alt"></i> ${data.city}</h3>
                <div class="weather-main">
                    <img src="${iconUrl}" alt="${data.condition}" style="width:100px; height:100px; margin: 0 auto;">
                    <div class="temperature">${data.temperature}°C</div>
                    <div class="condition" style="text-transform: capitalize;">${data.condition}</div>
                </div>
                <div class="weather-info">
                    <div class="weather-detail">
                        <i class="fas fa-tint"></i>
                        <div>Humidity</div>
                        <div>${data.humidity}%</div>
                    </div>
                    <div class="weather-detail">
                        <i class="fas fa-wind"></i>
                        <div>Wind Speed</div>
                        <div>${data.windSpeed} km/h</div>
                    </div>
                    <div class="weather-detail">
                        <i class="fas fa-cloud-rain"></i>
                        <div>Precipitation</div>
                        <div>${data.precipitation} mm</div>
                    </div>
                    <div class="weather-detail">
                        <i class="fas fa-eye"></i>
                        <div>Visibility</div>
                        <div>${data.visibility} km</div>
                    </div>
                </div>
            </div>
        `;
        
        weatherResult.classList.add('show');
        weatherResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
