'use strict';
(() => {
  // Analytics reports stay in the authenticated Vercel dashboard.
  // Never collect search text, WhatsApp messages, unit prices or contact details.
  if (new URLSearchParams(location.search).get('analytics') === 'off' || navigator.doNotTrack === '1') return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va('beforeSend', event => {
    if (!event || !event.url) return event;
    const url = new URL(event.url, location.origin);
    url.search = ''; url.hash = '';
    return { ...event, url: url.href };
  });
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  const track = (name, data = {}) => {
    const safe = {};
    for (const [key, value] of Object.entries(data).slice(0, 2)) safe[key] = clean(value);
    try { window.va('event', { name, data: safe }); } catch (_) { /* Never block navigation. */ }
  };
  window.centralAnalytics = { track };
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
  document.addEventListener('click', event => {
    const a = event.target.closest('a');
    if (!a) return;
    let url;
    try { url = new URL(a.href, location.origin); } catch (_) { return; }
    const card = a.closest('.launch-card, .project-card');
    const project = clean(card?.querySelector('h2,h3')?.textContent);
    const text = clean(a.textContent);
    if (url.hostname === 'wa.me') {
      track(/tabelas e espelhos/i.test(text) ? 'Pedido de tabelas e espelhos' : 'Clique no WhatsApp', { empreendimento: project || 'Contato geral' });
    } else if (url.pathname.includes('/empreendimentos/')) {
      track('Projeto consultado', { empreendimento: project || url.pathname.split('/').filter(Boolean).pop() });
    } else if (/\.(pdf|xlsx|mp4)$/i.test(url.pathname)) {
      track('Material consultado', { material: url.pathname.split('/').pop(), acao: a.hasAttribute('download') ? 'Baixar' : 'Visualizar' });
    } else if (['drive.google.com', 'linktr.ee'].includes(url.hostname)) {
      track('Materiais externos', { empreendimento: project || 'Materiais gerais', origem: url.hostname === 'linktr.ee' ? 'Linktree' : 'Drive' });
    } else if (url.hostname === 'vitaconpartners.com.br' && url.pathname === '/acesso') {
      track('Cadastro de parceiro');
    } else if (url.searchParams.get('tab') === 'mapa') {
      track('Mapa consultado');
    }
  });
  const played = new WeakSet();
  document.addEventListener('play', event => {
    const video = event.target;
    if (video.tagName !== 'VIDEO' || played.has(video)) return;
    played.add(video);
    track('Video iniciado', { empreendimento: video.closest('.launch-card')?.querySelector('h3')?.textContent || 'Video do portal' });
  }, true);
})();
