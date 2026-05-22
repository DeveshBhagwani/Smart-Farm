/**
 * market.js - Real-time Market Price Tracker Simulation
 */

const commodities = [
    { name: 'Wheat', basePrice: 22.50, unit: '₹/kg' },
    { name: 'Rice (Basmati)', basePrice: 85.00, unit: '₹/kg' },
    { name: 'Cotton', basePrice: 60.00, unit: '₹/kg' },
    { name: 'Sugarcane', basePrice: 3.15, unit: '₹/kg' },
    { name: 'Soybean', basePrice: 45.20, unit: '₹/kg' },
    { name: 'Maize', basePrice: 18.90, unit: '₹/kg' }
];

function updateMarketPrices() {
    const container = document.getElementById('market-prices');
    if (!container) return;

    let html = '';
    
    commodities.forEach(item => {
        // Simulate a price change between -2% and +2%
        const fluctuation = (Math.random() * 0.04) - 0.02; 
        const currentPrice = (item.basePrice * (1 + fluctuation)).toFixed(2);
        const change = (currentPrice - item.basePrice).toFixed(2);
        
        const isUp = change >= 0;
        const color = isUp ? '#4CAF50' : '#e53935';
        const icon = isUp ? 'fa-arrow-up' : 'fa-arrow-down';
        const sign = isUp ? '+' : '';

        html += `
            <div style="display: flex; flex-direction: column; min-width: 120px;">
                <span style="color: var(--text-color); font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">${item.name}</span>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span style="font-size: 1.4em; font-weight: 700;">₹${currentPrice}</span>
                    <span style="color: ${color}; font-size: 0.85em;"><i class="fas ${icon}"></i> ${sign}${change}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Initialize and set interval to update every 5 seconds
document.addEventListener('DOMContentLoaded', () => {
    updateMarketPrices();
    setInterval(updateMarketPrices, 5000);
});
