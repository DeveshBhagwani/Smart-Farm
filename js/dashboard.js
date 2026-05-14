// Dashboard-specific functions
document.getElementById('new-log-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const plant = document.getElementById('log-plant').value;
    const pesticide = document.getElementById('log-pesticide').value;
    const amount = document.getElementById('log-amount').value;
    const area = document.getElementById('log-area').value;
    const notes = document.getElementById('log-notes').value;
    
    if (plant && pesticide && amount) {
        const logEntry = {
            id: Date.now(),
            userId: SmartFarm.currentUser()?.id,
            plantName: plant,
            pesticide: pesticide,
            amount: amount,
            area: area,
            notes: notes,
            date: new Date().toISOString()
        };
        
        // Add to logs (this would normally save to database)
        SmartFarm.pesticideLogs().push(logEntry);
        
        // Update display
        displayPesticideLogs();
        updateDashboardStats();
        
        // Clear form
        this.reset();
        
        showMessage('Application record added successfully!', 'success');
    }
});

function clearLogs() {
    if (confirm('Are you sure you want to clear all pesticide logs?')) {
        const currentUserId = SmartFarm.currentUser()?.id;
        const allLogs = SmartFarm.pesticideLogs();
        
        // Remove only current user's logs
        const filteredLogs = allLogs.filter(log => log.userId !== currentUserId);
        
        // Update logs array
        while(allLogs.length > 0) allLogs.pop();
        filteredLogs.forEach(log => allLogs.push(log));
        
        displayPesticideLogs();
        updateDashboardStats();
        
        showMessage('All logs cleared successfully!', 'success');
    }
}

function exportData() {
    const userLogs = SmartFarm.pesticideLogs().filter(log => log.userId === SmartFarm.currentUser()?.id);
    
    if (userLogs.length === 0) {
        showMessage('No data to export!', 'error');
        return;
    }
    
    let csvContent = 'Date,Plant,Pesticide,Amount,Area,Notes\n';
    
    userLogs.forEach(log => {
        const date = new Date(log.date).toLocaleDateString();
        csvContent += `${date},${log.plantName},${log.pesticide},${log.amount},${log.area || ''},${log.notes || ''}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pesticide-records.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    showMessage('Data exported successfully!', 'success');
}

function showAnalytics() {
    alert('Analytics feature would show detailed charts and graphs of your pesticide usage patterns, seasonal trends, and recommendations for optimization.');
}

function setupReminders() {
    alert('Reminder feature would allow you to set up notifications for next pesticide applications based on your usage history and plant requirements.');
}