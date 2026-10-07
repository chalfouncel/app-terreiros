self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Permite que o app funcione puxando os dados da internet
    e.respondWith(
        fetch(e.request).catch(() => {
            return new Response('Sem conexão com a internet.');
        })
    );
});
