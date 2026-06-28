// Service worker minimal pour Atelier d'Or :
// rend l'app installable et lui permet de s'ouvrir meme hors-ligne.
// Ne touche QUE aux fichiers du site (meme origine, requetes GET).
// Les appels Supabase (autre origine, POST) passent intacts.

const CACHE = "atelierdor-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
