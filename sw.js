const CACHE_NAME = 'drawer-v81-settled-guide-transitions';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/card-redesign.css',
  '/card-reference.css',
  '/chat-calm.css',
  '/sidebar-calm.css',
  '/universe-interactions.css',
  '/atlas-view.css',
  '/world-window.css',
  '/design-tokens.css',
  '/capture-modal.css',
  '/localization.css',
  '/home-universe.css',
  '/idea-graph.css',
  '/card-density.css',
  '/script.js',
  '/semantic-space.js',
  '/atlas-space.js',
  '/atlas-view.js',
  '/world-window.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;1,300&family=Noto+Serif+SC:wght@300;400;700&family=Space+Mono&display=swap',
  'https://d3js.org/d3.v7.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Skip cross-origin requests and API calls
  if (!event.request.url.startsWith(self.location.origin)
      || event.request.url.includes('/api/')
      || event.request.url.includes('/__dev/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
