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
  let visitorKey;
  try {
    const day = new Date().toLocaleDateString('en-CA', {timeZone:'America/Sao_Paulo'});
    const stored = JSON.parse(localStorage.getItem('central-visitor') || 'null');
    visitorKey = stored?.day === day ? stored.id : crypto.randomUUID();
    localStorage.setItem('central-visitor', JSON.stringify({day,id:visitorKey}));
  } catch (_) { visitorKey = crypto.randomUUID(); }
  let pending = 0, sent = 0;
  const record = (name,data) => {
    const config = window.CENTRAL_CONFIG;
    if (!config || pending >= 3 || sent >= 100) return;
    let host = null;
    try { host = document.referrer ? new URL(document.referrer).hostname.slice(0,100) : null; } catch (_) {}
    const source = new URLSearchParams(location.search).get('utm_source');
    const row = {id:crypto.randomUUID(),visitor_key:visitorKey,event_name:name,project_name:data.empreendimento || null,material:data.material || null,action_name:data.acao || data.secao || data.origem || null,device:window.innerWidth<768?'Celular':window.innerWidth<1100?'Tablet':'Computador',referrer_host:host,source:source && /^[a-zA-Z0-9_-]{1,50}$/.test(source)?source:null};
    pending++;sent++;
    fetch(config.url+'/rest/v1/central_analytics_events',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row),keepalive:true}).catch(()=>{}).finally(()=>pending--);
  };
  const track = (name, data = {}) => {
    const safe = {};
    for (const [key, value] of Object.entries(data).slice(0, 2)) safe[key] = clean(value);
    record(name,safe);
    try { window.va('event', { name, data: safe }); } catch (_) { /* Never block navigation. */ }
  };
  window.centralAnalytics = { track };
  record('Visita',{});
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

