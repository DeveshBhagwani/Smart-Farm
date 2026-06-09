/**
 * smart-irrigation.js - Smart Irrigation Brain
 * WeatherAPI forecast + rules engine + Chart.js visualization
 */

const IRRIGATION_API_KEY = '378c3a0c2fe14729b27154049251011';
const PUMP_FLOW_RATE_LPM = 850;

const CROP_PROFILES = {
    tomato: { label: 'Tomato', baseNeedMm: 5.4, stageMultiplier: { seedling: 0.82, vegetative: 1.0, flowering: 1.16, fruiting: 1.22 }, sensitivity: 1.08 },
    potato: { label: 'Potato', baseNeedMm: 4.8, stageMultiplier: { seedling: 0.8, vegetative: 0.96, flowering: 1.08, fruiting: 1.12 }, sensitivity: 0.98 },
    corn: { label: 'Corn', baseNeedMm: 5.9, stageMultiplier: { seedling: 0.9, vegetative: 1.08, flowering: 1.2, fruiting: 1.14 }, sensitivity: 1.14 },
    wheat: { label: 'Wheat', baseNeedMm: 4.4, stageMultiplier: { seedling: 0.78, vegetative: 0.94, flowering: 1.02, fruiting: 1.0 }, sensitivity: 0.92 },
    rice: { label: 'Rice', baseNeedMm: 6.2, stageMultiplier: { seedling: 1.0, vegetative: 1.1, flowering: 1.18, fruiting: 1.14 }, sensitivity: 1.22 },
    sugarcane: { label: 'Sugarcane', baseNeedMm: 6.0, stageMultiplier: { seedling: 0.86, vegetative: 1.02, flowering: 1.1, fruiting: 1.16 }, sensitivity: 1.08 }
};

const irrigationState = {
    chart: null,
    latestPlan: null,
    latestForecast: null,
    weather: null
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('irrigation-form');
    const soilSlider = document.getElementById('irrigation-soil');
    const soilValue = document.getElementById('irrigation-soil-value');

    if (!form) return;

    syncSummaryPlaceholders();
    renderEmptyChart();

    if (soilSlider && soilValue) {
        const syncSlider = () => {
            soilValue.textContent = `${soilSlider.value}%`;
        };
        soilSlider.addEventListener('input', syncSlider);
        syncSlider();
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await generateIrrigationPlan();
    });
});

async function generateIrrigationPlan() {
    const city = document.getElementById('irrigation-city')?.value.trim();
    if (!city) {
        showIrrigationMessage('Please enter a location to generate the irrigation plan.', 'error');
        return;
    }

    const cropKey = document.getElementById('irrigation-crop')?.value || 'tomato';
    const stage = document.getElementById('irrigation-stage')?.value || 'vegetative';
    const soilMoisture = Number(document.getElementById('irrigation-soil')?.value || 42);
    const area = Number(document.getElementById('irrigation-area')?.value || 1.5);
    const submitButton = document.querySelector('#irrigation-form button[type="submit"]');
    const statusPill = document.getElementById('irrigation-status-pill');

    setLoadingState(true, submitButton, statusPill);

    try {
        const weather = await fetchIrrigationWeather(city);
        irrigationState.weather = weather;
        const plan = buildIrrigationPlan({ city, cropKey, stage, soilMoisture, area }, weather);
        irrigationState.latestPlan = plan;
        irrigationState.latestForecast = weather.forecastDays;
        renderWeatherSummary(weather);
        renderIrrigationPlan(plan, weather);
        renderForecastChart(plan, weather);
        showIrrigationMessage('Irrigation plan generated successfully.', 'success');
    } catch (error) {
        console.error('Irrigation planner failed:', error);
        showIrrigationMessage(error.message || 'Unable to generate irrigation plan right now.', 'error');
    } finally {
        setLoadingState(false, submitButton, statusPill);
    }
}

async function fetchIrrigationWeather(city) {
    if (!IRRIGATION_API_KEY || IRRIGATION_API_KEY === 'PASTE_YOUR_WEATHERAPI_KEY_HERE') {
        throw new Error('Please add a WeatherAPI.com API key to the irrigation planner.');
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${IRRIGATION_API_KEY}&q=${encodeURIComponent(city)}&days=3&aqi=no&alerts=no`;
    const response = await fetch(url);

    if (!response.ok) {
        let errorMessage = 'Unable to load weather data.';
        try {
            const errorData = await response.json();
            errorMessage = errorData?.error?.message || errorMessage;
        } catch (error) {
            console.warn('Could not parse weather API error.', error);
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
        city: data.location.name,
        region: data.location.region,
        country: data.location.country,
        current: {
            tempC: Number(data.current.temp_c),
            humidity: Number(data.current.humidity),
            windKph: Number(data.current.wind_kph),
            condition: data.current.condition.text,
            precipitationMm: Number(data.current.precip_mm),
            soilProxy: clamp(100 - Number(data.current.humidity) * 0.45, 0, 100)
        },
        forecastDays: (data.forecast?.forecastday || []).map((day) => ({
            date: day.date,
            label: formatForecastLabel(day.date),
            maxTemp: Number(day.day.maxtemp_c),
            minTemp: Number(day.day.mintemp_c),
            rainChance: Number(day.day.daily_chance_of_rain || 0),
            totalPrecipMm: Number(day.day.totalprecip_mm || 0),
            avgHumidity: Number(day.day.avghumidity || 0),
            avgWindKph: Number(day.day.maxwind_kph || 0),
            condition: day.day.condition.text
        }))
    };
}

function buildIrrigationPlan(inputs, weather) {
    const profile = CROP_PROFILES[inputs.cropKey] || CROP_PROFILES.tomato;
    const soil = clamp(inputs.soilMoisture, 0, 100);
    const stageMultiplier = profile.stageMultiplier[inputs.stage] || 1;
    const forecastDays = weather.forecastDays.length ? weather.forecastDays : [weather.current];
    const rainChance = average(forecastDays.map((day) => day.rainChance || 0));
    const precipitation = average(forecastDays.map((day) => day.totalPrecipMm || 0));
    const avgTemp = average(forecastDays.map((day) => day.maxTemp || weather.current.tempC));
    const avgHumidity = average(forecastDays.map((day) => day.avgHumidity || weather.current.humidity));
    const avgWind = average(forecastDays.map((day) => day.avgWindKph || weather.current.windKph));

    const drynessFactor = clamp((68 - soil) / 28, 0.55, 1.55);
    const weatherDrynessFactor = clamp(1 - (rainChance / 240) - (precipitation / 32), 0.62, 1.15);
    const temperatureFactor = clamp(1 + ((avgTemp - 28) / 75), 0.8, 1.22);
    const humidityFactor = clamp(1 - ((avgHumidity - 55) / 180), 0.8, 1.08);
    const windFactor = clamp(1 + (avgWind / 120), 0.88, 1.15);

    const rawNeed = profile.baseNeedMm * stageMultiplier * drynessFactor * weatherDrynessFactor * temperatureFactor * humidityFactor * windFactor;
    const waterNeedMm = clamp(roundTo(rawNeed, 1), 0.8, 12.5);
    const pumpMinutes = roundTo((waterNeedMm * inputs.area * 10000) / PUMP_FLOW_RATE_LPM, 1);
    const standardNeedMm = profile.baseNeedMm * stageMultiplier * 1.18;
    const savings = clamp(Math.round((1 - waterNeedMm / standardNeedMm) * 100), 0, 48);
    const riskScore = clamp(
        Math.round((rainChance * 0.45) + (avgTemp > 34 ? 18 : 0) + (avgWind > 20 ? 15 : 0) + ((100 - soil) * 0.22) + (precipitation > 2 ? 10 : 0)),
        0,
        100
    );

    const nextWindow = chooseNextWindow(forecastDays[0] || {}, weather.current, riskScore);
    const efficiency = clamp(Math.round(100 - riskScore * 0.58 + savings * 0.42), 35, 98);
    const recommendation = buildRecommendation({
        waterNeedMm,
        rainChance,
        precipitation,
        soil,
        avgTemp,
        avgHumidity,
        avgWind,
        stage: inputs.stage,
        crop: profile.label
    });

    return {
        cropLabel: profile.label,
        city: weather.city,
        region: weather.region,
        country: weather.country,
        waterNeedMm,
        pumpMinutes,
        nextWindow,
        savings,
        riskScore,
        efficiency,
        recommendation,
        forecastDays,
        metrics: {
            rainChance: Math.round(rainChance),
            temp: roundTo(avgTemp, 1),
            humidity: Math.round(avgHumidity),
            wind: roundTo(avgWind, 1),
            soil: soil
        },
        tags: buildTags({ riskScore, rainChance, soil, avgTemp, precipitation })
    };
}

function renderWeatherSummary(weather) {
    const summary = document.getElementById('irrigation-weather-summary');
    if (!summary) return;

    summary.innerHTML = `
        <div class="weather-summary-card">
            <h3>${escapeHtml(weather.city)}</h3>
            <p>${escapeHtml(weather.region || weather.country || '')}</p>
            <div class="weather-summary-grid">
                <div><span>Condition</span><strong>${escapeHtml(weather.current.condition)}</strong></div>
                <div><span>Temp</span><strong>${roundTo(weather.current.tempC, 1)}°C</strong></div>
                <div><span>Humidity</span><strong>${Math.round(weather.current.humidity)}%</strong></div>
                <div><span>Wind</span><strong>${roundTo(weather.current.windKph, 1)} km/h</strong></div>
            </div>
        </div>
    `;
}

function renderIrrigationPlan(plan, weather) {
    const statusPill = document.getElementById('irrigation-status-pill');
    const modeChip = document.getElementById('irrigation-mode-chip');
    const waterNeed = document.getElementById('result-water-amount');
    const pumpTime = document.getElementById('result-pump-time');
    const windowLabel = document.getElementById('result-window');
    const savings = document.getElementById('result-savings');
    const recommendationPanel = document.getElementById('recommendation-panel');

    if (statusPill) {
        statusPill.textContent = plan.riskScore > 65 ? 'High Attention' : plan.riskScore > 40 ? 'Balanced Plan' : 'Efficient Window';
    }
    if (modeChip) {
        modeChip.textContent = `${plan.cropLabel} | ${plan.city}`;
    }
    if (waterNeed) waterNeed.textContent = `${plan.waterNeedMm} mm`;
    if (pumpTime) pumpTime.textContent = `${plan.pumpMinutes} min`;
    if (windowLabel) windowLabel.textContent = plan.nextWindow;
    if (savings) savings.textContent = `${plan.savings}%`;

    const summaryWater = document.getElementById('summary-water-need');
    const summaryRisk = document.getElementById('summary-risk-level');
    const summaryWindow = document.getElementById('summary-next-window');
    const summaryEfficiency = document.getElementById('summary-efficiency');
    const summaryRain = document.getElementById('summary-rain');
    const summaryTemp = document.getElementById('summary-temp');
    const summaryHumidity = document.getElementById('summary-humidity');
    const summaryWind = document.getElementById('summary-wind');

    if (summaryWater) summaryWater.textContent = `${plan.waterNeedMm} mm`;
    if (summaryRisk) summaryRisk.textContent = riskLabel(plan.riskScore);
    if (summaryWindow) summaryWindow.textContent = plan.nextWindow;
    if (summaryEfficiency) summaryEfficiency.textContent = `${plan.efficiency}%`;
    if (summaryRain) summaryRain.textContent = `${plan.metrics.rainChance}%`;
    if (summaryTemp) summaryTemp.textContent = `${plan.metrics.temp}°C`;
    if (summaryHumidity) summaryHumidity.textContent = `${plan.metrics.humidity}%`;
    if (summaryWind) summaryWind.textContent = `${plan.metrics.wind} km/h`;

    if (recommendationPanel) {
        recommendationPanel.innerHTML = `
            <div class="recommendation-title">
                <strong>${escapeHtml(plan.cropLabel)} irrigation plan</strong>
                <span>${escapeHtml(formatForecastLabel(new Date().toISOString().slice(0, 10)))}</span>
            </div>
            <p>${escapeHtml(plan.recommendation.summary)}</p>
            <ul class="recommendation-list">
                ${plan.recommendation.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <div class="plan-tags">
                ${plan.tags.map((tag) => `<span class="plan-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="mini-forecast">
                ${plan.forecastDays.map((day) => `
                    <div class="mini-forecast-day">
                        <span>${escapeHtml(day.label)}</span>
                        <strong>${day.rainChance}% rain</strong>
                        <small>${day.condition}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    irrigationState.latestPlan = plan;
    irrigationState.latestForecast = weather.forecastDays;
}

function renderForecastChart(plan) {
    const canvas = document.getElementById('irrigation-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = plan.forecastDays.map((day) => day.label);
    const rainData = plan.forecastDays.map((day) => day.rainChance);
    const waterData = plan.forecastDays.map((day, index) => {
        const scale = index === 0 ? 1 : index === 1 ? 0.72 : 0.58;
        return roundTo(plan.waterNeedMm * scale, 1);
    });

    if (irrigationState.chart) {
        irrigationState.chart.destroy();
    }

    irrigationState.chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Water Need (mm)',
                    data: waterData,
                    borderColor: '#7cf29d',
                    backgroundColor: 'rgba(124, 242, 157, 0.14)',
                    tension: 0.35,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Rain Chance (%)',
                    data: rainData,
                    backgroundColor: 'rgba(77, 208, 123, 0.25)',
                    borderColor: 'rgba(77, 208, 123, 0.45)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: '#f5fbf6' }
                },
                tooltip: {
                    backgroundColor: 'rgba(7, 16, 10, 0.95)',
                    titleColor: '#f5fbf6',
                    bodyColor: '#e9f5eb'
                }
            },
            scales: {
                x: {
                    ticks: { color: '#e9f5eb' },
                    grid: { color: 'rgba(255, 255, 255, 0.06)' }
                },
                y: {
                    position: 'left',
                    beginAtZero: true,
                    ticks: { color: '#e9f5eb' },
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    title: { display: true, text: 'Water Need (mm)', color: '#e9f5eb' }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#e9f5eb' },
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Rain Chance (%)', color: '#e9f5eb' }
                }
            }
        }
    });
}

function renderEmptyChart() {
    const canvas = document.getElementById('irrigation-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    irrigationState.chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3'],
            datasets: [
                {
                    type: 'line',
                    label: 'Water Need (mm)',
                    data: [0, 0, 0],
                    borderColor: '#7cf29d',
                    tension: 0.35,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Rain Chance (%)',
                    data: [0, 0, 0],
                    backgroundColor: 'rgba(77, 208, 123, 0.2)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#f5fbf6' } } },
            scales: {
                x: { ticks: { color: '#e9f5eb' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                y: { ticks: { color: '#e9f5eb' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                y1: { position: 'right', beginAtZero: true, max: 100, ticks: { color: '#e9f5eb' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

function syncSummaryPlaceholders() {
    const modeChip = document.getElementById('irrigation-mode-chip');
    if (modeChip) modeChip.textContent = 'Awaiting plan';
}

function buildRecommendation({ waterNeedMm, rainChance, precipitation, soil, avgTemp, avgHumidity, avgWind, stage, crop }) {
    const items = [];
    const summaryParts = [];

    if (rainChance >= 65 || precipitation >= 1.5) {
        summaryParts.push('Rain is likely soon, so the brain recommends delaying irrigation to avoid waste.');
        items.push('Hold irrigation if rain arrives within the next 24 hours.');
    } else if (soil < 35) {
        summaryParts.push('The soil is drying quickly, so the field needs a near-term watering window.');
        items.push('Schedule irrigation within the next optimal weather window.');
    } else {
        summaryParts.push('Soil moisture and forecast signals are balanced, so the plan keeps watering efficient.');
        items.push('Use a moderate irrigation cycle and re-check soil moisture after watering.');
    }

    if (avgTemp >= 33) items.push('Prefer sunrise or evening watering to reduce evaporation.');
    if (avgWind >= 18) items.push('Avoid mid-day irrigation while wind speeds are high.');
    if (avgHumidity >= 75) items.push('Humidity is elevated, so a shorter pulse cycle is sufficient.');
    if (waterNeedMm <= 3) items.push('The crop only needs a light pulse, not a full cycle.');
    if (stage === 'flowering' || stage === 'fruiting') items.push(`Protect ${crop} yield by keeping the root zone stable during the ${stage} stage.`);

    items.push('Re-check the live weather and soil sensors before starting the pump.');

    return {
        summary: summaryParts.join(' '),
        items
    };
}

function buildTags({ riskScore, rainChance, soil, avgTemp, precipitation }) {
    const tags = [];
    tags.push(riskScore > 65 ? 'High vigilance' : riskScore > 40 ? 'Balanced risk' : 'Low risk');
    tags.push(soil < 35 ? 'Dry soil' : soil > 70 ? 'Wet soil' : 'Stable soil');
    tags.push(rainChance > 60 ? 'Rain likely' : 'No rain delay');
    tags.push(avgTemp > 32 ? 'Heat stress' : 'Temperature stable');
    if (precipitation > 2) tags.push('Rainfall detected');
    return tags;
}

function chooseNextWindow(forecastDay, current, riskScore) {
    const rainChance = Number(forecastDay.rainChance || 0);
    const rainText = rainChance >= 60 ? 'Delay 24-48h' : rainChance >= 35 ? 'Wait for morning update' : null;
    if (rainText) return rainText;

    const temp = Number(forecastDay.maxTemp || current.tempC || 28);
    const wind = Number(forecastDay.avgWindKph || current.windKph || 0);

    if (temp >= 34 || wind >= 20 || riskScore > 70) {
        return 'Today 6:00-8:00 PM';
    }
    if (temp >= 30) {
        return 'Tomorrow 5:30-7:00 AM';
    }
    return 'Today 5:00-6:30 AM';
}

function riskLabel(score) {
    if (score >= 70) return 'Critical';
    if (score >= 45) return 'Moderate';
    return 'Low';
}

function formatForecastLabel(dateValue) {
    const date = new Date(dateValue);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function setLoadingState(isLoading, button, statusPill) {
    if (button) {
        button.disabled = isLoading;
        button.classList.toggle('scan-loading', isLoading);
    }
    if (statusPill) {
        statusPill.textContent = isLoading ? 'Calculating...' : 'Planning Mode';
    }
}

function showIrrigationMessage(message, type) {
    if (window.SmartFarm && typeof window.SmartFarm.showMessage === 'function') {
        window.SmartFarm.showMessage(message, type);
        return;
    }
    console[type === 'error' ? 'error' : 'log'](message);
}

function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function roundTo(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
    return window.SmartFarm && typeof window.SmartFarm.escapeHtml === 'function'
        ? window.SmartFarm.escapeHtml(value)
        : String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}
