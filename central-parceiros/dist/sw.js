// Service worker do app Vitacon Parceiros: deixa o site instalável e mostra um aviso quando o celular está sem internet.
// Não guarda páginas nem dados em cache, para que o corretor veja sempre os valores atualizados.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#10132d;color:#eef0ff;font:16px system-ui;padding:24px;text-align:center">' +
    '<div><p style="font-size:20px;font-weight:700;margin:0 0 8px">Sem conexão com a internet</p><p style="color:#a3a8d4;margin:0 0 18px">Conecte o celular e toque em tentar de novo.</p>' +
    '<button onclick="location.reload()" style="font:inherit;font-weight:700;padding:12px 18px;border:0;border-radius:10px;background:#ff8a3d;color:#1a0f05">Tentar de novo</button></div></body>',
    {headers: {'content-type': 'text/html; charset=utf-8'}})));
});
