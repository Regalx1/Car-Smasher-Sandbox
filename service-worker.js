// Service worker for Car Smasher 3D PWA
const CACHE_NAME = 'car-smasher-3d-cache-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  // Activate service worker immediately without waiting
  self.skipWaiting();
});

// Activate event: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients to ensure the service worker controls all pages
  self.clients.claim();
});

// Fetch event: respond with cache first, fall back to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});