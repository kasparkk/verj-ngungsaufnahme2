/* Haelt die App offline lauffaehig, ohne Updates zu blockieren.
   Die Datenbank-Aufrufe (Supabase) laufen bewusst NICHT über den Cache -
   sie brauchen Netz und scheitern sonst still.

   WICHTIG - index.html wird NETZ ZUERST geladen:
   Frueher galt auch fuer die Seite "Cache zuerst". Dadurch bekam man nach
   einem Update beim naechsten Start noch die alte Seite ausgeliefert, die auf
   das alte JS-Bundle verwies - man war dauerhaft eine Version hinterher und
   sah Aenderungen erst beim uebernaechsten Start. Die JS-Dateien tragen einen
   Hash im Namen und koennen deshalb gefahrlos aus dem Cache kommen. */
const CACHE = "verjuengung-v26";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Fremde Hosts (Supabase) und alles ausser GET: direkt ans Netz.
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;

  const istSeite =
    e.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html");

  if (istSeite) {
    e.respondWith(
      fetch(e.request)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
          return antwort;
        })
        // Offline: letzte bekannte Fassung aus dem Cache.
        .catch(() => caches.match(e.request).then((treffer) => treffer || caches.match("/index.html")))
    );
    return;
  }

  // Uebrige App-Dateien: Cache zuerst, sonst holen und ablegen.
  e.respondWith(
    caches.match(e.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(e.request).then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
        }
        return antwort;
      });
    })
  );
});
