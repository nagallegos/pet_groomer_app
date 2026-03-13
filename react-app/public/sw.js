self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open("barks-runtime-v1").then(async (cache) => {
      try {
        const response = await fetch(request);

        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }

        return response;
      } catch {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        throw new Error("Network unavailable and no cached response found.");
      }
    }),
  );
});
