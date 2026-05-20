/**
 * dashboard.js - User dashboard logic and pesticide tracking
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const currentUser = window.SmartFarm.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update welcome message
    const welcomeUser = document.getElementById('welcome-user');
    if (welcomeUser) {
        welcomeUser.textContent = currentUser.name;
    }
    
    // Initial display
    displayPesticideLogs();
    updateDashboardStats();
    
    // Setup logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Setup new log form
    const newLogForm = document.getElementById('new-log-form');
    if (newLogForm) {
        newLogForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const plant = document.getElementById('log-plant').value;
            const pesticide = document.getElementById('log-pesticide').value;
            const amount = document.getElementById('log-amount').value;
            const area = document.getElementById('log-area').value;
            const notes = document.getElementById('log-notes').value;
            
            if (plant && pesticide && amount) {
                window.SmartFarm.logPesticideUsage(plant, pesticide, amount, area, notes);
                
                displayPesticideLogs();
                updateDashboardStats();
                
                this.reset();
            }
        });
    }

    // Make global functions available to inline event handlers in HTML
    window.clearLogs = clearLogs;
    window.exportData = exportData;
    window.showAnalytics = showAnalytics;
    window.setupReminders = setupReminders;
});

/**
 * Logs out the current user
 */
function handleLogout() {
    localStorage.removeItem('currentUser');
    window.SmartFarm.showMessage('Logged out successfully!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

/**
 * Displays user's pesticide logs in the dashboard
 */
function displayPesticideLogs() {
    const logContainer = document.getElementById('pesticide-logs');
    const currentUser = window.SmartFarm.getCurrentUser();
    
    if (!logContainer || !currentUser) return;
    
    const logs = window.SmartFarm.getPesticideLogs();
    const userLogs = logs.filter(log => log.userId === currentUser.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10); // Show last 10 entries
    
    if (userLogs.length === 0) {
        logContainer.innerHTML = '<p class="text-center">No pesticide usage logged yet.</p>';
        return;
    }
    
    logContainer.innerHTML = userLogs.map(log => {
        const date = new Date(log.date).toLocaleDateString();
        const time = new Date(log.date).toLocaleTimeString();
        
        return `
            <div class="log-entry" style="padding: 10px; border-bottom: 1px solid #eee; margin-bottom: 10px;">
                <div class="log-date" style="font-size: 0.85em; color: #666;">${date} at ${time}</div>
                <div class="log-details" style="font-weight: 500;">
                    <i class="fas fa-leaf" style="color:#2c7a2c;"></i> <strong>${log.plantName}</strong> - ${log.pesticide} (${log.amount})
                </div>
                ${log.area ? `<div style="font-size: 0.9em; color:#555;">Area: ${log.area}</div>` : ''}
                ${log.notes ? `<div style="font-size: 0.9em; font-style: italic;">Notes: ${log.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Updates dashboard statistics (total, monitored, monthly)
 */
function updateDashboardStats() {
    const currentUser = window.SmartFarm.getCurrentUser();
    if (!currentUser) return;

    const logs = window.SmartFarm.getPesticideLogs();
    const userLogs = logs.filter(log => log.userId === currentUser.id);
    
    // Update total applications
    const totalApplications = document.getElementById('total-applications');
    if (totalApplications) {
        totalApplications.textContent = userLogs.length;
    }
    
    // Update plants monitored
    const uniquePlants = [...new Set(userLogs.map(log => log.plantName))];
    const plantsMonitored = document.getElementById('plants-monitored');
    if (plantsMonitored) {
        plantsMonitored.textContent = uniquePlants.length;
    }
    
    // Update this month's applications
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyLogs = userLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getMonth() === thisMonth && logDate.getFullYear() === thisYear;
    });
    
    const monthlyApplications = document.getElementById('monthly-applications');
    if (monthlyApplications) {
        monthlyApplications.textContent = monthlyLogs.length;
    }
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all your pesticide logs?')) {
        const currentUser = window.SmartFarm.getCurrentUser();
        let allLogs = window.SmartFarm.getPesticideLogs();
        
        // Keep logs of other users, remove current user's logs
        allLogs = allLogs.filter(log => log.userId !== currentUser.id);
        
        localStorage.setItem('pesticideLogs', JSON.stringify(allLogs));
        
        displayPesticideLogs();
        updateDashboardStats();
        
        window.SmartFarm.showMessage('All your logs cleared successfully!', 'success');
    }
}

window.dashboardChart = null;

function exportData(format = 'csv') {
    const currentUser = window.SmartFarm.getCurrentUser();
    const allLogs = window.SmartFarm.getPesticideLogs();
    const userLogs = allLogs.filter(log => log.userId === currentUser.id);
    
    if (userLogs.length === 0) {
        window.SmartFarm.showMessage('No data to export!', 'error');
        return;
    }
    
    if (format === 'csv') {
        let csvContent = 'Date,Plant,Pesticide,Amount,Area,Notes\n';
        
        userLogs.forEach(log => {
            const date = new Date(log.date).toLocaleDateString();
            const safeNotes = log.notes ? log.notes.replace(/"/g, '""') : '';
            const safeArea = log.area ? log.area.replace(/"/g, '""') : '';
            
            csvContent += `${date},"${log.plantName}","${log.pesticide}","${log.amount}","${safeArea}","${safeNotes}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pesticide-records.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        
        window.SmartFarm.showMessage('CSV exported successfully!', 'success');
    } else if (format === 'pdf') {
        const element = document.getElementById('pesticide-logs');
        const opt = {
            margin:       1,
            filename:     'pesticide-records.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            window.SmartFarm.showMessage('PDF exported successfully!', 'success');
        });
    }
}

function showAnalytics() {
    const currentUser = window.SmartFarm.getCurrentUser();
    const allLogs = window.SmartFarm.getPesticideLogs();
    const userLogs = allLogs.filter(log => log.userId === currentUser.id);
    
    if (userLogs.length === 0) {
        window.SmartFarm.showMessage('No data available for analytics.', 'error');
        return;
    }

    const analyticsSection = document.getElementById('analytics-section');
    analyticsSection.style.display = 'block';
    analyticsSection.scrollIntoView({ behavior: 'smooth' });

    // Group by plant name
    const plantCounts = {};
    userLogs.forEach(log => {
        plantCounts[log.plantName] = (plantCounts[log.plantName] || 0) + 1;
    });

    const labels = Object.keys(plantCounts);
    const data = Object.values(plantCounts);

    const ctx = document.getElementById('pesticideChart').getContext('2d');
    
    if (window.dashboardChart) {
        window.dashboardChart.destroy();
    }

    window.dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Applications',
                data: data,
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function setupReminders() {
    if (!("Notification" in window)) {
        window.SmartFarm.showMessage("This browser does not support desktop notification", "error");
        return;
    }

    if (Notification.permission === "granted") {
        scheduleDemoNotification();
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                scheduleDemoNotification();
            }
        });
    } else {
        window.SmartFarm.showMessage("Notification permissions denied.", "error");
    }
}

function scheduleDemoNotification() {
    window.SmartFarm.showMessage("Demo reminder scheduled! You will receive a notification in 5 seconds.", "success");
    setTimeout(() => {
        const notification = new Notification("SmartFarm Alert", {
            body: "Time to check your crops and apply scheduled pesticide!",
            icon: "https://cdn-icons-png.flaticon.com/512/683/683566.png"
        });
        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }, 5000);
}

// Leaflet Map Initialization
let farmMap = null;
function initFarmMap() {
    const mapEl = document.getElementById('farmMap');
    if (!mapEl || typeof L === 'undefined') return;

    // Default location: Central India (Nagpur approx) as generic rural center
    const defaultLocation = [21.1458, 79.0882];
    
    farmMap = L.map('farmMap').setView(defaultLocation, 15);
    
    // Satellite view using Esri World Imagery
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(farmMap);

    // Add Robot Location Marker
    const robotIcon = L.divIcon({
        html: '<i class="fas fa-robot fa-2x" style="color: #00b0ff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>',
        className: 'custom-leaflet-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    L.marker(defaultLocation, {icon: robotIcon}).addTo(farmMap)
        .bindPopup('<b>IoT Robot</b><br>Status: Active<br>Last Scan: 2 mins ago')
        .openPopup();
        
    // Add a recent pesticide application marker
    const sprayIcon = L.divIcon({
        html: '<i class="fas fa-spray-can fa-2x" style="color: #4CAF50; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>',
        className: 'custom-leaflet-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    const sprayLocation = [21.1465, 79.0870];
    L.marker(sprayLocation, {icon: sprayIcon}).addTo(farmMap)
        .bindPopup('<b>Recent Application</b><br>Tomato Crop<br>Neem Oil');

    // Fix map sizing issues if container was hidden initially
    setTimeout(() => {
        farmMap.invalidateSize();
    }, 100);
}

// Ensure map is initialized
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Leaflet to be ready
    setTimeout(initFarmMap, 500);
});

// Web Bluetooth API Simulator for ESP32 Robot
async function pairRobot() {
    const statusEl = document.getElementById('bt-status');
    const btnIcon = document.querySelector('#pairBtn i');
    
    if (!navigator.bluetooth) {
        statusEl.innerHTML = '<span style="color: red;"><i class="fas fa-times-circle"></i> Web Bluetooth API is not available in your browser. (Requires HTTPS/Localhost and Chrome/Edge)</span>';
        return;
    }

    try {
        statusEl.innerHTML = 'Scanning for SmartFarm ESP32...';
        btnIcon.className = 'fas fa-spinner fa-spin';

        // Request Bluetooth device (filtering by common ESP32 services or name)
        // In a real scenario, you'd use a specific service UUID. 
        // Here we use acceptAllDevices for demonstration purposes so it actually prompts.
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['battery_service']
        });

        statusEl.innerHTML = `Found device: <b>${device.name || 'Unknown Device'}</b>. Connecting...`;

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        statusEl.innerHTML = `<span style="color: #4CAF50;"><i class="fas fa-check-circle"></i> Successfully connected to ${device.name || 'SmartFarm Robot'}!</span>`;
        btnIcon.className = 'fas fa-link';
        document.getElementById('pairBtn').classList.replace('btn-primary', 'btn-secondary');
        document.getElementById('pairBtn').innerHTML = '<i class="fas fa-unlink"></i> Disconnect';
        
        window.SmartFarm.showMessage("Hardware synchronized successfully.", "success");

    } catch (error) {
        console.error(error);
        statusEl.innerHTML = `<span style="color: red;"><i class="fas fa-exclamation-triangle"></i> Pairing cancelled or failed.</span>`;
        btnIcon.className = 'fas fa-link';
    }
}

// Machine Learning Crop Predictor Mock
function predictYield() {
    const mlResult = document.getElementById('ml-result');
    const btn = document.querySelector('button[onclick="predictYield()"]');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Data...';
    btn.disabled = true;
    mlResult.style.display = 'none';

    // Simulate ML processing time
    setTimeout(() => {
        const currentUser = window.SmartFarm.getCurrentUser();
        const allLogs = window.SmartFarm.getPesticideLogs();
        const userLogs = allLogs.filter(log => log.userId === currentUser.id);

        let prediction = "";
        let confidence = Math.floor(Math.random() * (98 - 85 + 1)) + 85;
        let estYieldTons = (Math.random() * 5 + 10).toFixed(2); // Mock tons

        if (userLogs.length === 0) {
            prediction = `<strong>Insufficient Data:</strong> Please add pesticide logs to generate a valid prediction model. Baseline estimated yield: Average.`;
        } else if (userLogs.length < 3) {
            prediction = `<strong>Model Output:</strong> Based on minimal historical data, your current soil health and recent pesticide applications indicate a <strong>Moderate Yield (+5%)</strong> compared to last season.`;
        } else {
            // Find most treated plant
            const plantCounts = {};
            userLogs.forEach(l => plantCounts[l.plantName] = (plantCounts[l.plantName] || 0) + 1);
            const topPlant = Object.keys(plantCounts).reduce((a, b) => plantCounts[a] > plantCounts[b] ? a : b);
            
            prediction = `<strong>Model Output:</strong> Optimal pesticide management detected for <strong>${topPlant}</strong>. Combined with simulated weather patterns (adequate rainfall, moderate temp), the neural network predicts a <strong>High Yield (+18%)</strong>. Risk of pest-related crop loss is minimal (< 4%).`;
        }

        mlResult.innerHTML = `
            <h4 style="margin-bottom: 10px;"><i class="fas fa-chart-line"></i> Prediction Results (Confidence: ${confidence}%)</h4>
            <p>${prediction}</p>
            <div style="margin-top: 10px; font-weight: bold; font-size: 1.1em;">Estimated Yield: ${estYieldTons} Tons/Acre</div>
        `;
        mlResult.style.display = 'block';
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        window.SmartFarm.showMessage("AI Prediction Complete", "success");
    }, 2000);
}