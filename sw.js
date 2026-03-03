// Use absolute URLs so this works reliably on Vercel and ensures correct scope.
// Bump this when you deploy so phones stop serving old cached JS.
const CACHE_NAME = "top-daily-tips-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install",(event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",(event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",(event)=>{
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Network-first for the app shell so updates actually reach users.
  const isAppShell = isSameOrigin && (
    url.pathname === "/" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/styles.css")
  );

  if(isAppShell){
    event.respondWith(
      fetch(req)
        .then(res=>{
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
          return res;
        })
        .catch(()=>caches.match(req))
    );
    return;
  }

  // Cache-first for everything else.
  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(res=>{
        if(isSameOrigin){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
