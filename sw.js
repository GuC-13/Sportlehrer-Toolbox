const CACHE_NAME = "sportlehrer-cache-v3";
const FILES_TO_CACHE = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Sofort aus dem Cache antworten (funktioniert in der Halle ohne Netz), im Hintergrund die neue Version holen.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  event.respondWith(
    caches.match(req, { ignoreSearch: isPage }).then((cached) => {
      const fetchPromise = fetch(req)
        .then((response) => {
          // Nur gültige Antworten speichern – sonst würde eine Fehlerseite die App im Cache ersetzen
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => cached || (isPage ? caches.match("./index.html") : Response.error()));
      if (cached) {
        event.waitUntil(fetchPromise.catch(() => {}));
        return cached;
      }
      return fetchPromise;
    })
  );
});
