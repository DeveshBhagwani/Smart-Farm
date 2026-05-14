/**
 * know-your-plant.js - Plant database and search functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('plant-search');
    const plantGrid = document.getElementById('plant-grid');
    
    // Sample plant data database
    const plantDatabase = [
        {
            name: 'Tomato',
            type: 'Vegetable',
            pesticide: 'Neem Oil',
            amount: '2ml per liter',
            frequency: 'Weekly',
            icon: 'fa-seedling',
            image: 'img/tomato.jpeg' 
        },
        {
            name: 'Brinjal',
            type: 'Vegetable',
            pesticide: 'Neem Oil',
            amount: '3ml per liter',
            frequency: 'Weekly',
            icon: 'fa-seedling',
            image: 'img/brinjal.jpeg' 
        },
        {
            name: 'Bottle Gourd',
            type: 'Vegetable',
            pesticide: 'Copper Oxychloride',
            amount: '2g per liter',
            frequency: 'Bi-weekly',
            icon: 'fa-leaf',
            image: 'img/bottle_gourd.jpeg' 
        },
        {
            name: 'Corn',
            type: 'Grain',
            pesticide: 'Atrazine',
            amount: '2.5ml per liter',
            frequency: 'Bi-weekly',
            icon: 'fa-seedling',
            image: 'img/corn.jpeg' 
        },
        {
            name: 'Potato',
            type: 'Vegetable',
            pesticide: 'Copper Sulfate',
            amount: '3ml per liter',
            frequency: 'Weekly',
            icon: 'fa-apple-alt',
            image: 'img/potato.jpeg' 
        },
        {
            name: 'Lady Finger',
            type: 'Vegetable',
            pesticide: 'Spinosad',
            amount: '1ml per liter',
            frequency: 'Weekly',
            icon: 'fa-seedling',
            image: 'img/lady_finger.jpeg' 
        }
    ];
    
    // Display all plants initially
    displayPlants(plantDatabase);
    
    // Setup Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredPlants = plantDatabase.filter(plant => 
                plant.name.toLowerCase().includes(searchTerm) ||
                plant.type.toLowerCase().includes(searchTerm)
            );
            displayPlants(filteredPlants);
        });
    }
    
    /**
     * Renders plants into the grid
     */
    function displayPlants(plants) {
        if (plantGrid) {
            plantGrid.innerHTML = plants.map(plant => {
                // Check if an image path exists, otherwise fallback to the icon
                const imageContent = plant.image 
                    ? `<img src="${plant.image}" alt="${plant.name}" class="plant-img-src">`
                    : `<i class="fas ${plant.icon}"></i>`;

                return `
                    <div class="plant-card">
                        <div class="plant-image">
                            ${imageContent}
                        </div>
                        <div class="plant-info">
                            <h3>${plant.name}</h3>
                            <div class="plant-type">${plant.type}</div>
                            <div class="pesticide-info">
                                <h4>Recommended Pesticide:</h4>
                                <div class="pesticide-name">${plant.pesticide}</div>
                                <div class="pesticide-amount">Amount: ${plant.amount}</div>
                                <div class="pesticide-frequency">Frequency: ${plant.frequency}</div>
                            </div>
                            <button class="btn-primary" onclick="window.SmartFarm.logPesticideUsage('${plant.name}', '${plant.pesticide}', '${plant.amount}')">
                                Log Usage
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
});
