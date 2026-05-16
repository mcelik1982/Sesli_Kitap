const CACHE_NAME = 'seslikitap-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((err) => console.log('Cache hatasi:', err))
  );
});

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini önbelleğe al
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Eğer önbellekte varsa onu döndür, yoksa internetten indir
        return response || fetch(event.request);
      })
  );
});
