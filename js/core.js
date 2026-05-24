/**
 * core.js - Global utilities, navigation, and UI interactions
 */

// Initialize global namespace
window.SmartFarm = window.SmartFarm || {};

/**
 * Escapes user-provided text before injecting it into HTML.
 * Use this for anything that might come from localStorage, forms, or APIs.
 */
window.SmartFarm.escapeHtml = function(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

document.addEventListener('DOMContentLoaded', function() {
    setupTheme();
    setupNavigation();
    setupSmoothScrolling();
    setupAnimationTriggers();
    setupInteractiveEffects();
    updateNavigationAuth();
});

/**
 * Sets up Theme toggle and persistence
 */
function setupTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    const currentTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = currentTheme === 'dark' || (!currentTheme && prefersDarkScheme);
    
    // Apply theme on load
    document.body.classList.toggle('dark-mode', isDark);
    themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    themeToggleBtn.setAttribute('aria-pressed', String(isDark));

    // Toggle theme on click
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        let theme = 'light';
        if (document.body.classList.contains('dark-mode')) {
            theme = 'dark';
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
        themeToggleBtn.setAttribute('aria-pressed', String(theme === 'dark'));
        localStorage.setItem('theme', theme);
    });
}

/**
 * Sets up mobile navigation hamburger menu
 */
function setupNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (hamburger && navMenu) {
        hamburger.setAttribute('role', 'button');
        hamburger.setAttribute('tabindex', '0');
        hamburger.setAttribute('aria-label', 'Toggle navigation menu');
        hamburger.setAttribute('aria-expanded', 'false');

        const closeMenu = () => {
            navMenu.classList.remove('active');
            document.body.classList.remove('nav-open');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.querySelectorAll('span').forEach((span) => {
                span.style.transform = '';
                span.style.opacity = '';
            });
        };

        const toggleMenu = () => {
            navMenu.classList.toggle('active');
            const isOpen = navMenu.classList.contains('active');
            document.body.classList.toggle('nav-open', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
            
            // Animate hamburger
            const spans = hamburger.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (isOpen) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    span.style.transform = '';
                    span.style.opacity = '';
                }
            });
        };

        hamburger.addEventListener('click', function() {
            toggleMenu();
        });

        hamburger.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
            }
        });

        document.addEventListener('click', function(event) {
            if (!navMenu.contains(event.target) && !hamburger.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }
    
    // Close mobile menu when clicking on links
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) {
                navMenu.classList.remove('active');
                document.body.classList.remove('nav-open');
                if (hamburger) {
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });
}

/**
 * Smooth scrolling for anchor links
 */
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            e.preventDefault();
            
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

/**
 * Intersection Observer for scroll animations
 */
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
                // observer.unobserve(entry.target); // Unobserve if we only want it once
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.slide-up, .fade-in, .problem-card, .objective-item').forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });

    // Home page counters
    animateCounters();
}

/**
 * Animates numbers counting up
 */
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

/**
 * Setup button ripple effects and card hovers
 */
function setupInteractiveEffects() {
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
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add styles for ripple and messages dynamically
    if(!document.getElementById('core-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'core-dynamic-styles';
        style.textContent = `
            .btn-primary, .btn-secondary { position: relative; overflow: hidden; }
            .ripple {
                position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.4);
                transform: scale(0); animation: ripple-animation 0.6s linear; pointer-events: none;
            }
            @keyframes ripple-animation { to { transform: scale(4); opacity: 0; } }
            #message-container { position: fixed; top: 90px; right: 20px; z-index: 10000; display: grid; gap: 10px; }
            .message { min-width: min(320px, calc(100vw - 40px)); margin-bottom: 0; padding: 15px; border-radius: 14px; color: #fff; opacity: 0; transform: translateX(100%); transition: all 0.3s ease; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18); backdrop-filter: blur(10px); }
            .message.show { opacity: 1; transform: translateX(0); }
            .message.success { background-color: #28a745; }
            .message.error { background-color: #dc3545; }
            .message.info { background-color: #17a2b8; }
        `;
        document.head.appendChild(style);
    }
}

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

/**
 * Displays a toast message
 * @param {string} text - Message text
 * @param {string} type - 'info', 'success', or 'error'
 */
window.SmartFarm.showMessage = function(text, type = 'info') {
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
    
    setTimeout(() => messageDiv.classList.add('show'), 100);
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageContainer.contains(messageDiv)) {
                messageContainer.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
};

/**
 * Shows a loading state on a button
 */
window.SmartFarm.showLoading = function(button) {
    if (button) {
        button.setAttribute('data-original-text', button.innerHTML);
        button.setAttribute('data-loading', 'true');
        button.setAttribute('aria-busy', 'true');
        button.innerHTML = '<span class="loading"></span> Processing...';
        button.disabled = true;
    }
};

/**
 * Hides loading state from all buttons
 */
window.SmartFarm.hideLoading = function() {
    const buttons = document.querySelectorAll('button[data-loading="true"]');
    buttons.forEach(button => {
        button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
        button.removeAttribute('data-original-text');
        button.removeAttribute('data-loading');
        button.removeAttribute('aria-busy');
        button.disabled = false;
    });
};

/**
 * Updates navbar login link if user is logged in
 */
function updateNavigationAuth() {
    const loginLinks = document.querySelectorAll('a[href="login.html"]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    loginLinks.forEach((loginLink) => {
        if (!loginLink) return;
        if (currentUser) {
            loginLink.href = 'dashboard.html';
            loginLink.classList.add('dashboard-link');
            loginLink.innerHTML = '<i class="fas fa-user"></i> Dashboard';
        } else {
            loginLink.href = 'login.html';
            loginLink.classList.remove('dashboard-link');
        }
    });
    if (currentUser) {
        const activeLoginLink = document.querySelector('.nav-link.active.login-btn');
        if (activeLoginLink) {
            activeLoginLink.classList.remove('active');
        }
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    });
}

// Voice Command System (Web Speech API)
document.addEventListener('DOMContentLoaded', () => {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.style.display = 'none'; // Hide if not supported
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener('click', () => {
        voiceBtn.classList.add('listening');
        window.SmartFarm.showMessage("Listening... Say a command like 'Go to Weather'.", "info");
        recognition.start();
    });

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Voice Command Received: ', command);
        
        if (command.includes('weather')) {
            window.location.href = 'weather.html';
        } else if (command.includes('dashboard')) {
            window.location.href = 'dashboard.html';
        } else if (command.includes('plant') || command.includes('health')) {
            window.location.href = 'plant-health.html';
        } else if (command.includes('dark')) {
            const themeBtn = document.getElementById('theme-toggle');
            if(themeBtn && !document.body.classList.contains('dark-mode')) themeBtn.click();
            window.SmartFarm.showMessage("Dark Mode activated.", "success");
        } else if (command.includes('light')) {
            const themeBtn = document.getElementById('theme-toggle');
            if(themeBtn && document.body.classList.contains('dark-mode')) themeBtn.click();
            window.SmartFarm.showMessage("Light Mode activated.", "success");
        } else {
            window.SmartFarm.showMessage("Command not recognized.", "error");
        }
    };

    recognition.onspeechend = () => {
        recognition.stop();
        voiceBtn.classList.remove('listening');
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        voiceBtn.classList.remove('listening');
        if (event.error !== 'no-speech') {
            window.SmartFarm.showMessage("Voice recognition error: " + event.error, "error");
        }
    };
});
