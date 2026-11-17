// Service worker: só avisos de pedido novo. Não guarda dados nem respostas da API.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { corpo: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(d.titulo || 'Entrega Local', {
      body: d.corpo || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'novo-pedido',
      renotify: true,
      requireInteraction: true,
      data: { url: d.url || '/painel' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/painel';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ('focus' in j) return j.focus().then((w) => (w && 'navigate' in w ? w.navigate(url) : undefined));
      }
      return self.clients.openWindow(url);
    })
  );
});
