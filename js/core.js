/**
 * core.js - Global utilities, navigation, and UI interactions
 */

// Initialize global namespace
window.SmartFarm = window.SmartFarm || {};

document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    setupSmoothScrolling();
    setupAnimationTriggers();
    setupInteractiveEffects();
    updateNavigationAuth();
});

/**
 * Sets up mobile navigation hamburger menu
 */
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
            #message-container { position: fixed; top: 100px; right: 20px; z-index: 10000; }
            .message { min-width: 300px; margin-bottom: 10px; padding: 15px; border-radius: 5px; color: #fff; opacity: 0; transform: translateX(100%); transition: all 0.3s ease; }
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
        button.innerHTML = '<span class="loading"></span> Processing...';
        button.disabled = true;
    }
};

/**
 * Hides loading state from all buttons
 */
window.SmartFarm.hideLoading = function() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.innerHTML.includes('loading')) {
            button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
            button.disabled = false;
        }
    });
};

/**
 * Updates navbar login link if user is logged in
 */
function updateNavigationAuth() {
    const loginLink = document.querySelector('a[href="login.html"]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (loginLink && currentUser) {
        loginLink.textContent = 'Dashboard';
        loginLink.href = 'dashboard.html';
        loginLink.innerHTML = '<i class="fas fa-user"></i> Dashboard';
    }
}
