// Offline support. Network-first so a new deploy is picked up immediately;
// the cache is only a fallback when there's no connection. API calls are never cached.

const CACHE = 'learn-lingala-v4';
const SHELL = [
  '/app/',
  '/app/app.css',
  '/app/manifest.webmanifest',
  '/app/icons/icon.svg',
  '/app/js/main.js',
  '/app/js/api.js',
  '/app/js/store.js',
  '/app/js/course.js',
  '/app/js/srs.js',
  '/app/js/answer.js',
  '/app/js/lesson.js',
  '/app/js/player.js',
  '/app/js/chat.js',
  '/app/js/chat-scenarios.js',
  '/app/js/translate.js',
  '/app/js/i18n.js',
  '/app/js/course-fr.js',
  '/app/js/icons.js',
  '/app/fonts/inter-latin.woff2',
  '/app/fonts/inter-latin-ext.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((hit) => hit || (event.request.mode === 'navigate' ? caches.match('/app/') : Response.error())),
      ),
  );
});
