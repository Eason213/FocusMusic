const CACHE_NAME = 'focus-music-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // 圖示（用你自己的或直接借用 YTMusic 的）
  'https://raw.githubusercontent.com/YouTube/Music/main/icons/icon-192x192.png',
  'https://raw.githubusercontent.com/YouTube/Music/main/icons/icon-512x512.png',
  // 把你實際要放的音樂與縮圖也預先快取（範例放幾首）
  'https://cdn.focusmusic.app/lofi1.mp3',
  'https://cdn.focusmusic.app/rain.mp3',
  'https://cdn.focusmusic.app/deepfocus.mp3',
  'https://cdn.focusmusic.app/coffee.mp3',
  'https://i.imgur.com/7z1T0Yb.jpg',
  'https://i.imgur.com/5eJ0z1k.jpg',
  'https://i.imgur.com/xY3pQ9m.jpg',
  'https://i.imgur.com/2f3kL9p.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 網路優先，失敗再拿快取（音樂還是建議走網路優先，避免佔太多手機空間）
self.addEventListener('fetch', e => {
  if (e.request.url.includes('.mp3') || e.request.url.includes('imgur.com')) {
    // 音樂與圖片用「Cache First」策略（已經快取過就直接用）
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(networkResponse =>