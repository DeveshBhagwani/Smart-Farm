const CACHE_NAME = 'smartfarm-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './weather.html',
  './plant-health.html',
  './know-your-plant.html',
  './live-data.html',
  './how-it-works.html',
  './login.html',
  './styles/main.css',
  './styles/dashboard.css',
  './styles/forum.css',
  './styles/how-it-works.css',
  './styles/kyp.css',
  './styles/login.css',
  './styles/plant-health.css',
  './styles/weather.css',
  './js/core.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/weather.js',
  './js/plant-health.js',
  './js/know-your-plant.js',
  './js/live-data.js',
  './js/how-it-works.js',
  './js/forum.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found, else fetch from network
        return response || fetch(event.request).catch(() => {
            // Fallback for failed network requests
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
