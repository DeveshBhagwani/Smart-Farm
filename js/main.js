// Main JavaScript file for SmartFarm website

// Global variables for user management
let currentUser = null;
let users = [];
let pesticideLogs = [];

// Initialize the application when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    // Load saved data from memory
    loadUserData();
    checkAuthStatus();
    
    // Set up navigation
    setupNavigation();
    
    // Set up page-specific functionality
    setupPageFunctionality();
    
    // Add smooth scrolling
    setupSmoothScrolling();
    
    // Add animation triggers
    setupAnimationTriggers();
}

// Navigation Setup
function setupNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger
            const spans = hamburger.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (navMenu.classList.contains('active')) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                }
            });
        });
    }
    
    // Close mobile menu when clicking on links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
        });
    });
}

// Page-specific functionality setup
function setupPageFunctionality() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch(currentPage) {
        case 'weather.html':
            setupWeatherPage();
            break;
        case 'plant-health.html':
            setupPlantHealthPage();
            break;
        case 'know-your-plant.html':
            setupKnowYourPlantPage();
            break;
        case 'login.html':
            setupLoginPage();
            break;
        case 'dashboard.html':
            setupDashboardPage();
            break;
        case 'team.html':
            setupTeamPage();
            break;
        case 'live-data.html':
            setupLiveDataPage();
            break;
        default:
            setupHomePage();
    }
}

// Home page setup
function setupHomePage() {
    // Add counter animation for statistics
    animateCounters();
    
    // Add intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    // Observe animated elements
    document.querySelectorAll('.slide-up, .slide-up-delay, .slide-up-delay-2').forEach(el => {
        observer.observe(el);
    });
}

// Weather page functionality
function setupWeatherPage() {
    const weatherForm = document.getElementById('weather-form');
    const weatherResult = document.getElementById('weather-result');
    
    if (weatherForm) {
        weatherForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const city = document.getElementById('city').value.trim();
            
            if (city) {
                showLoading(weatherForm.querySelector('button'));
                fetchWeatherData(city);
            }
        });
    }
}

// Fetch weather data (simulation)
async function fetchWeatherData(city) {
    // --- THIS IS THE MODIFIED SECTION ---
    // 1. Get your free API key from https://www.weatherapi.com/
    const API_KEY = "378c3a0c2fe14729b27154049251011"; 

    if (API_KEY === "PASTE_YOUR_WEATHERAPI_KEY_HERE") {
        showMessage("Please add your WeatherAPI.com API key to javascript.js", "error");
        hideLoading();
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

        // Map the API data to the object structure your page expects
        const weatherData = {
            city: data.location.name,
            temperature: data.current.temp_c.toFixed(1),
            humidity: data.current.humidity,
            windSpeed: data.current.wind_kph.toFixed(1),
            condition: data.current.condition.text,
            precipitation: data.current.precip_mm,
            visibility: data.current.vis_km.toFixed(1),
            icon: data.current.condition.icon // Icon URL (partial)
        };
        
        displayWeatherData(weatherData);
        hideLoading();
        
    } catch (error) {
        showMessage(error.message, 'error');
        hideLoading();
    }
    // --- END OF MODIFIED SECTION ---
}

// Display weather data
function displayWeatherData(data) {
    const weatherResult = document.getElementById('weather-result');
    
    if (weatherResult) {
        // --- THIS SECTION IS MODIFIED TO ADD THE ICON ---
        // WeatherAPI provides a URL protocol, so we add https:
        const iconUrl = "https:" + data.icon;

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
        // --- END OF MODIFIED SECTION ---
        
        weatherResult.classList.add('show');
        weatherResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Plant health page functionality
function setupPlantHealthPage() {
    const healthForm = document.getElementById('plant-health-form');
    const fileInput = document.getElementById('plant-image');
    const fileLabel = document.querySelector('.file-upload-label');
    
    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name;
            if (fileName) {
                fileLabel.innerHTML = `<i class="fas fa-check"></i> ${fileName}`;
                fileLabel.style.background = '#d4edda';
                fileLabel.style.color = '#155724';
            }
        });
    }
    
    if (healthForm) {
        healthForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(healthForm);
            const imageFile = formData.get('plant-image');
            
            if (imageFile && imageFile.size > 0) {
                showLoading(healthForm.querySelector('button'));
                analyzePlantHealth();
            } else {
                showMessage('Please select an image to analyze.', 'error');
            }
        });
    }
}

// Analyze plant health (simulation)
async function analyzePlantHealth() {
    try {
        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate random analysis results
        const healthScenarios = [
            {
                status: 'healthy',
                health: 'Healthy',
                confidence: 92,
                issues: 'No significant issues detected',
                recommendations: 'Continue current care routine. Maintain proper watering schedule.',
                icon: 'fa-check-circle'
            },
            {
                status: 'warning',
                health: 'Mild Concern',
                confidence: 78,
                issues: 'Possible nutrient deficiency detected',
                recommendations: 'Consider adding nitrogen-rich fertilizer. Monitor soil pH levels.',
                icon: 'fa-exclamation-triangle'
            },
            {
                status: 'danger',
                health: 'Needs Attention',
                confidence: 85,
                issues: 'Signs of pest damage and leaf spot disease',
                recommendations: 'Apply appropriate pesticide and fungicide. Improve air circulation.',
                icon: 'fa-exclamation-circle'
            }
        ];
        
        const result = healthScenarios[Math.floor(Math.random() * healthScenarios.length)];
        displayPlantHealthResult(result);
        hideLoading();
        
    } catch (error) {
        showMessage('Error analyzing plant health. Please try again.', 'error');
        hideLoading();
    }
}

// Display plant health analysis result
function displayPlantHealthResult(result) {
    const analysisResult = document.getElementById('analysis-result');
    
    if (analysisResult) {
        analysisResult.innerHTML = `
            <div class="health-status">
                <div class="status-icon status-${result.status}">
                    <i class="fas ${result.icon}"></i>
                </div>
                <div>
                    <h3>Plant Health: ${result.health}</h3>
                    <p>Confidence: ${result.confidence}%</p>
                </div>
            </div>
            <div class="analysis-details">
                <div class="detail-section">
                    <h4><i class="fas fa-search"></i> Issues Detected</h4>
                    <p>${result.issues}</p>
                </div>
                <div class="detail-section">
                    <h4><i class="fas fa-lightbulb"></i> Recommendations</h4>
                    <p>${result.recommendations}</p>
                </div>
            </div>
        `;
        
        analysisResult.classList.add('show');
        analysisResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Know Your Plant page functionality
function setupKnowYourPlantPage() {
    const searchInput = document.getElementById('plant-search');
    const plantGrid = document.getElementById('plant-grid');
    
    // Sample plant data
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
            icon: 'fa-corn',
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
    
    // Search functionality
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
    
    function displayPlants(plants) {
        if (plantGrid) {
            plantGrid.innerHTML = plants.map(plant => {
                // Check if an image path exists, otherwise use the icon
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
                            <button class="btn-primary" onclick="SmartFarm.logPesticideUsage('${plant.name}', '${plant.pesticide}', '${plant.amount}')">
                                Log Usage
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Login page functionality
function setupLoginPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    
    if (showSignupBtn && signupForm && loginForm) {
        showSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });
    }
    
    if (showLoginBtn && signupForm && loginForm) {
        showLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSignup();
        });
    }
}

// Handle user login
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    // Check if user exists
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        showMessage('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        showMessage('Invalid email or password.', 'error');
    }
}

// Handle user signup
function handleSignup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        showMessage('User already exists with this email.', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: password,
        joinDate: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUserData();
    
    showMessage('Account created successfully! Please login.', 'success');
    
    // Switch to login form
    setTimeout(() => {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }, 1500);
}

// Dashboard functionality
function setupDashboardPage() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update welcome message
    const welcomeUser = document.getElementById('welcome-user');
    if (welcomeUser) {
        welcomeUser.textContent = currentUser.name;
    }
    
    // Load pesticide logs
    displayPesticideLogs();
    
    // Setup logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Update dashboard stats
    updateDashboardStats();
}

// Team page setup
function setupTeamPage() {
    // Add any team-specific functionality here
    console.log('Team page loaded');
}

// Function to fetch data for Water Level, Distances, and Servo
async function getAllData() {
    const ipAddress = 'http://10.96.133.197';
    const url = `${ipAddress}/alldata`;
    const frontElement = document.getElementById('front-distance-value');
    const backElement = document.getElementById('back-distance-value');
    const waterElement = document.getElementById('water-level-value');
    const servoElement = document.getElementById('servo-motor-value');

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        frontElement.innerText = data.front + ' cm';
        backElement.innerText = data.back + ' cm';
        waterElement.innerText = data.water + ' %';
        servoElement.innerText = data.servo;

    } catch (error) {
        console.error('Could not fetch all data:', error);
        frontElement.innerText = 'Error';
        backElement.innerText = 'Error';
        waterElement.innerText = 'Error';
        servoElement.innerText = 'Error';
    }
}

// Live Data page functionality
function setupLiveDataPage() {
    // Check if all required elements exist before proceeding
    const requiredIds = ['temperature-value', 'humidity-value', 'front-distance-value', 'back-distance-value', 'water-level-value', 'servo-motor-value', 'last-updated'];
    const elementsExist = requiredIds.every(id => document.getElementById(id));

    if (elementsExist) {
        // --- Initialize all data fetches ---

        // 1. For Temp/Humidity (from WeatherAPI)
        updateSensorData();
        setInterval(updateSensorData, 10000); // Fetches every 10 seconds

        // 2. For Distances, Water Level, and Servo (from other ESP)
        getAllData();
        setInterval(getAllData, 2000); // Fetches every 2 seconds
    }
}

// Helper function to fetch and display sensor data (Temp/Humidity + Simulated Moisture)
async function updateSensorData() {
    // --- REAL WEATHER DATA FETCH (REPLACING ESP32) ---
    const API_KEY = "378c3a0c2fe14729b27154049251011"; // Your WeatherAPI Key
    const city = "Chennai"; // Fetching weather for Chennai as requested
    const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}`;

    const temperatureElement = document.getElementById("temperature-value");
    const humidityElement = document.getElementById("humidity-value");

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        temperatureElement.textContent = data.current.temp_c.toFixed(1) + " °C";
        humidityElement.textContent = data.current.humidity.toFixed(1) + " %";
    } catch (error) {
        console.error("Failed to fetch weather data:", error);
        temperatureElement.textContent = "Error";
        humidityElement.textContent = "Error";
    }
    
    // --- UPDATE TIMESTAMP AND VISUALS ---
    const lastUpdatedEl = document.getElementById('last-updated');
    lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    // Add a subtle flash effect to show update
    document.querySelectorAll('.live-data-card .data-value').forEach(el => {
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 500);
    });
}


// Utility Functions

// Show loading state
function showLoading(button) {
    if (button) {
        button.setAttribute('data-original-text', button.innerHTML);
        button.innerHTML = '<span class="loading"></span> Processing...';
        button.disabled = true;
    }
}

// Hide loading state
function hideLoading() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.innerHTML.includes('loading')) {
            button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
            button.disabled = false;
        }
    });
}

// Show message
function showMessage(text, type = 'info') {
    let messageContainer = document.getElementById('message-container');
    
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        document.body.appendChild(messageContainer);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    messageContainer.appendChild(messageDiv);
    
    // Show message
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageContainer.contains(messageDiv)) {
                messageContainer.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Animate counters
function animateCounters() {
    const counters = document.querySelectorAll('.objective-number, .outcome-stat');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace(/\D/g, ''));
        const suffix = counter.textContent.replace(/\d/g, '');
        let current = 0;
        const increment = target / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target + suffix;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + suffix;
            }
        }, 50);
    });
}

// Setup smooth scrolling
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Setup animation triggers
function setupAnimationTriggers() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                entry.target.style.opacity = '1';
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.slide-up, .fade-in, .problem-card, .objective-item').forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
}

// Log pesticide usage
function logPesticideUsage(plantName, pesticide, amount) {
    if (!currentUser) {
        showMessage('Please login to log pesticide usage.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    const logEntry = {
        id: Date.now(),
        userId: currentUser.id,
        plantName: plantName,
        pesticide: pesticide,
        amount: amount,
        date: new Date().toISOString(),
        notes: ''
    };
    
    pesticideLogs.push(logEntry);
    saveUserData();
    
    showMessage(`Pesticide usage logged for ${plantName}!`, 'success');
}

// Display pesticide logs
function displayPesticideLogs() {
    const logContainer = document.getElementById('pesticide-logs');
    
    if (!logContainer || !currentUser) return;
    
    const userLogs = pesticideLogs.filter(log => log.userId === currentUser.id)
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
            <div class="log-entry">
                <div class="log-date">${date} at ${time}</div>
                <div class="log-details">
                    <strong>${log.plantName}</strong> - ${log.pesticide} (${log.amount})
                </div>
            </div>
        `;
    }).join('');
}

// Update dashboard stats
function updateDashboardStats() {
    if (!currentUser) return;
    const userLogs = pesticideLogs.filter(log => log.userId === currentUser.id);
    
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

// Handle logout
function handleLogout() {
    currentUser = null;
    showMessage('Logged out successfully!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// Data Management Functions

// Load user data from memory (simulating localStorage)
function loadUserData() {
    // In a real application, this would load from localStorage or a database
    // For this demo, we'll use temporary data
    if (users.length === 0) {
        // Add some demo users
        users = [
            {
                id: 1,
                name: 'Demo User',
                email: 'demo@smartfarm.com',
                password: 'demo123',
                joinDate: new Date().toISOString()
            }
        ];
        
        // Add some demo pesticide logs
        pesticideLogs = [
            {
                id: 1,
                userId: 1,
                plantName: 'Tomato',
                pesticide: 'Neem Oil',
                amount: '2ml per liter',
                date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                notes: ''
            },
            {
                id: 2,
                userId: 1,
                plantName: 'Wheat',
                pesticide: 'Malathion',
                amount: '1ml per liter',
                date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                notes: ''
            }
        ];
    }
}

// Save user data to memory (simulating localStorage)
function saveUserData() {
    // In a real application, this would save to localStorage or send to a server
    console.log('User data saved:', { users, pesticideLogs });
}

// Check authentication status
function checkAuthStatus() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Check if user is trying to access dashboard without login
    if (currentPage === 'dashboard.html' && !currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update navigation for logged-in users
    updateNavigation();
}

// Update navigation based on auth status
function updateNavigation() {
    const loginLink = document.querySelector('a[href="login.html"]');
    
    if (loginLink && currentUser) {
        loginLink.textContent = 'Dashboard';
        loginLink.href = 'dashboard.html';
        loginLink.innerHTML = '<i class="fas fa-user"></i> Dashboard';
    }
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effect to cards
    const cards = document.querySelectorAll('.problem-card, .outcome-card, .team-card, .plant-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add CSS for ripple effect and message container
    const style = document.createElement('style');
    style.textContent = `
        .btn-primary, .btn-secondary {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        #message-container {
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 10000;
        }

        .message {
            min-width: 300px;
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 5px;
            color: #fff;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }

        .message.show {
            opacity: 1;
            transform: translateX(0);
        }

        .message.success { background-color: #28a745; }
        .message.error { background-color: #dc3545; }
        .message.info { background-color: #17a2b8; }
    `;
    document.head.appendChild(style);
});

// Scroll-based navbar background change
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
    }
});

// Form validation helpers
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Weather API integration placeholder (for real implementation)
function getWeatherFromAPI(city) {
    // In a real application, you would use a weather API like OpenWeatherMap
    // const apiKey = 'your-api-key';
    // const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    // return fetch(url).then(response => response.json());
    
    // For now, we use the simulation in fetchWeatherData()
    console.log('Weather API integration would go here for:', city);
}

// Plant disease detection AI integration placeholder
function detectPlantDisease(imageFile) {
    // In a real application, you would integrate with a plant disease detection API
    // or use a machine learning model like TensorFlow.js
    console.log('Plant disease detection would analyze:', imageFile.name);
    
    // For now, we use the simulation in analyzePlantHealth()
}

// Export functions for use in other files (if needed)
window.SmartFarm = {
    logPesticideUsage,
    showMessage,
    currentUser: () => currentUser,
    users: () => users,
    pesticideLogs: () => pesticideLogs
};