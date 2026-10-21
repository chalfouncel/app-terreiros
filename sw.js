self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Ignora requisições para o Supabase, CDN ou APIs externas para não corromper payloads JSON
    if (url.origin.includes('supabase.co') || url.origin.includes('jsdelivr.net') || url.origin.includes('tailwindcss.com') || url.origin.includes('cdnjs.cloudflare.com') || url.origin.includes('unpkg.com')) {
        return;
    }

    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return new Response('Sem conexão com a internet.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            });
        })
    );
});
