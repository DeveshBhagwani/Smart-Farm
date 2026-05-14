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

function exportData() {
    const currentUser = window.SmartFarm.getCurrentUser();
    const allLogs = window.SmartFarm.getPesticideLogs();
    const userLogs = allLogs.filter(log => log.userId === currentUser.id);
    
    if (userLogs.length === 0) {
        window.SmartFarm.showMessage('No data to export!', 'error');
        return;
    }
    
    let csvContent = 'Date,Plant,Pesticide,Amount,Area,Notes\n';
    
    userLogs.forEach(log => {
        const date = new Date(log.date).toLocaleDateString();
        // Escape quotes to prevent CSV breaking
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
    
    window.SmartFarm.showMessage('Data exported successfully!', 'success');
}

function showAnalytics() {
    alert('Analytics feature would show detailed charts and graphs of your pesticide usage patterns, seasonal trends, and recommendations for optimization.');
}

function setupReminders() {
    alert('Reminder feature would allow you to set up notifications for next pesticide applications based on your usage history and plant requirements.');
}