/* Cacht die App-Dateien, damit sie auch ohne Netz startet.
   Die Datenbank-Aufrufe (Supabase) laufen bewusst NICHT über den Cache -
   sie brauchen Netz und scheitern sonst still. */
const CACHE = "verjuengung-v8";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Supabase & andere fremde Hosts: immer direkt ans Netz, nie cachen.
  if (url.origin !== self.location.origin) return;

  // App-Dateien: erst Cache, dann Netz (und ins Cache nachlegen).
  e.respondWith(
    caches.match(e.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(e.request)
        .then((antwort) => {
          if (antwort.ok && e.request.method === "GET") {
            const kopie = antwort.clone();
            caches.open(CACHE).then((c) => c.put(e.request, kopie));
          }
          return antwort;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
