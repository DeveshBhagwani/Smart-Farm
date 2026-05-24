/**
 * lang.js - Multi-language support (i18n)
 */

const translations = {
    en: {
        home: "Home",
        weather: "Weather",
        plant_health: "Plant Health",
        know_plant: "Know Your Plant",
        live_data: "Live Data",
        how_it_works: "How It Works",
        community_forum: "Community Forum",
        login: "Login",
        hero_title: "SmartFarm IoT Enabled Robot",
        hero_desc: "Revolutionizing agriculture with automated soil monitoring, precise irrigation, and intelligent plant health analysis.",
        get_started: "Get Started",
        learn_more: "Learn More",
        export_data: "Export Data",
        export_data_desc: "Download your pesticide application records",
        usage_analytics: "Usage Analytics",
        usage_analytics_desc: "View detailed analytics of your pesticide usage patterns",
        smart_reminders: "Smart Reminders",
        smart_reminders_desc: "Set up reminders for next pesticide applications",
        hardware_sync: "Hardware Sync",
        hardware_sync_desc: "Pair with your ESP32 Robot securely via Bluetooth.",
        ai_predictor: "AI Crop Predictor",
        ai_predictor_desc: "Use historical pesticide data and recent simulated weather patterns to forecast yield."
    },
    hi: {
        home: "होम",
        weather: "मौसम",
        plant_health: "पौधों का स्वास्थ्य",
        know_plant: "पौधे को जानें",
        live_data: "लाइव डेटा",
        how_it_works: "यह कैसे काम करता है",
        login: "लॉग इन",
        hero_title: "स्मार्टफार्म IoT सक्षम रोबोट",
        hero_desc: "स्वचालित मिट्टी की निगरानी, सटीक सिंचाई और बुद्धिमान पौधों के स्वास्थ्य विश्लेषण के साथ कृषि में क्रांति लाना।",
        get_started: "शुरू करें",
        learn_more: "और जानें",
        export_data: "डेटा निर्यात करें",
        export_data_desc: "अपना कीटनाशक आवेदन रिकॉर्ड डाउनलोड करें",
        usage_analytics: "उपयोग विश्लेषिकी",
        usage_analytics_desc: "अपने कीटनाशक उपयोग पैटर्न का विस्तृत विश्लेषण देखें",
        smart_reminders: "स्मार्ट अनुस्मारक",
        smart_reminders_desc: "अगले कीटनाशक अनुप्रयोगों के लिए अनुस्मारक सेट करें",
        hardware_sync: "हार्डवेयर सिंक",
        hardware_sync_desc: "ब्लूटूथ के माध्यम से अपने ESP32 रोबोट के साथ सुरक्षित रूप से पेयर करें।",
        ai_predictor: "एआई फसल भविष्यवक्ता",
        ai_predictor_desc: "ऐतिहासिक कीटनाशक डेटा और हाल के मौसम पैटर्न का उपयोग करके उपज की भविष्यवाणी करें।"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Inject Language Selector into the navbar
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        const langLi = document.createElement('li');
        langLi.style.display = 'flex';
        langLi.style.alignItems = 'center';
        langLi.style.marginLeft = '15px';
        
        langLi.innerHTML = `
            <select id="lang-selector" style="background: var(--card-bg); color: var(--text-color); border: 1px solid #ccc; border-radius: 4px; padding: 4px; cursor: pointer;">
                <option value="en">EN</option>
                <option value="hi">HI</option>
            </select>
        `;
        
        // Insert before the theme toggle
        const themeToggleBtn = document.querySelector('.theme-toggle');
        const themeToggleLi = themeToggleBtn ? themeToggleBtn.parentElement : null;
        if(themeToggleLi) {
            navMenu.insertBefore(langLi, themeToggleLi);
        } else {
            navMenu.appendChild(langLi);
        }

        const langSelector = document.getElementById('lang-selector');
        
        // Load saved language
        const currentLang = localStorage.getItem('appLang') || 'en';
        langSelector.value = currentLang;
        applyTranslations(currentLang);
        document.documentElement.lang = currentLang;

        langSelector.addEventListener('change', (e) => {
            const selectedLang = e.target.value;
            localStorage.setItem('appLang', selectedLang);
            document.documentElement.lang = selectedLang;
            applyTranslations(selectedLang);
        });
    }
});

function applyTranslations(lang) {
    const dict = translations[lang] || translations.en;
    const navMap = new Map([
        ['Home', dict.home],
        ['Weather', dict.weather],
        ['Plant Health', dict.plant_health],
        ['Know Your Plant', dict.know_plant],
        ['Live Data', dict.live_data],
        ['How It Works', dict.how_it_works]
    ]);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            // Keep inner HTML tags if they exist (like icons)
            const iconMatch = el.innerHTML.match(/<i.*?<\/i>/);
            if (iconMatch) {
                el.innerHTML = iconMatch[0] + ' ' + dict[key];
            } else {
                el.textContent = dict[key];
            }
        }
    });
    
    // Also translate nav links directly by identifying their text
    document.querySelectorAll('.nav-link').forEach(link => {
        if (navMap.has(link.textContent.trim())) {
            link.textContent = navMap.get(link.textContent.trim());
        }
        
        if(link.classList.contains('login-btn') && link.textContent.includes('Login')) link.textContent = dict.login;
    });
}
