
const CACHE_NAME = "pinturas-miguel-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// Instalar y guardar los recursos locales básicos.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activar y eliminar cachés antiguas de esta aplicación.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pinturas-miguel-") &&
                             key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Navegación: probar la red primero y usar index.html como respaldo.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No interceptar peticiones a otros dominios.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) ||
                 (await caches.match("./index.html")) ||
                 new Response(
                   "<h1>Sin conexión</h1><p>Comprueba tu conexión e inténtalo de nuevo.</p>",
                   {
                     headers: { "Content-Type": "text/html; charset=utf-8" }
                   }
                 );
        })
    );
    return;
  }

  // Recursos locales: caché primero y red como alternativa.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
