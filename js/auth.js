/**
 * auth.js - Authentication and LocalStorage persistence
 */

window.SmartFarm = window.SmartFarm || {};

// Initialize mock database in LocalStorage if not exists
function initDatabase() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([
            {
                id: 1,
                name: 'Demo User',
                email: 'demo@smartfarm.com',
                password: 'demo123',
                joinDate: new Date().toISOString()
            }
        ]));
    }
    if (!localStorage.getItem('pesticideLogs')) {
        localStorage.setItem('pesticideLogs', JSON.stringify([
            {
                id: 1,
                userId: 1,
                plantName: 'Tomato',
                pesticide: 'Neem Oil',
                amount: '2ml per liter',
                area: 'Greenhouse 1',
                notes: 'Routine spray',
                date: new Date(Date.now() - 86400000).toISOString() // Yesterday
            }
        ]));
    }
}

// Data access helpers
window.SmartFarm.getUsers = () => JSON.parse(localStorage.getItem('users') || '[]');
window.SmartFarm.getCurrentUser = () => JSON.parse(localStorage.getItem('currentUser') || 'null');
window.SmartFarm.getPesticideLogs = () => JSON.parse(localStorage.getItem('pesticideLogs') || '[]');

document.addEventListener('DOMContentLoaded', function() {
    initDatabase();
    
    // Determine if we're on the login page
    if (document.getElementById('login-form')) {
        setupLoginPage();
    }
});

/**
 * Sets up event listeners for the login and signup forms
 */
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

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        window.SmartFarm.showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    const users = window.SmartFarm.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.SmartFarm.showMessage('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        window.SmartFarm.showMessage('Invalid email or password.', 'error');
    }
}

function handleSignup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        window.SmartFarm.showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        window.SmartFarm.showMessage('Passwords do not match.', 'error');
        return;
    }
    
    const users = window.SmartFarm.getUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        window.SmartFarm.showMessage('User already exists with this email.', 'error');
        return;
    }
    
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: password,
        joinDate: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    window.SmartFarm.showMessage('Account created successfully! Please login.', 'success');
    
    // Switch back to login view
    setTimeout(() => {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('login-email').value = email;
    }, 1500);
}

/**
 * Logs pesticide usage globally (used by Know Your Plant and Dashboard)
 */
window.SmartFarm.logPesticideUsage = function(plantName, pesticide, amount, area = '', notes = '') {
    const currentUser = window.SmartFarm.getCurrentUser();
    if (!currentUser) {
        window.SmartFarm.showMessage('Please login to log pesticide usage.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    const logs = window.SmartFarm.getPesticideLogs();
    
    const logEntry = {
        id: Date.now(),
        userId: currentUser.id,
        plantName: plantName,
        pesticide: pesticide,
        amount: amount,
        area: area,
        notes: notes,
        date: new Date().toISOString()
    };
    
    logs.push(logEntry);
    localStorage.setItem('pesticideLogs', JSON.stringify(logs));
    
    window.SmartFarm.showMessage(`Pesticide usage logged for ${plantName}!`, 'success');
};
