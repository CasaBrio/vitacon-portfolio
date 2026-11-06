'use strict';
// Seção de notícias da vitrine: manchetes do Google Notícias e indicadores do Banco Central via /api/noticias.
(() => {
  const box = document.getElementById('noticias');
  if (!box) return;
  const $ = s => box.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const pct = v => v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '%';
  const ago = iso => {
    const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
    if (m < 60) return `há ${m} min`;
    const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24); return d === 1 ? 'ontem' : `há ${d} dias`;
  };
  let data = null, tema = 'imobiliario';

  function render() {
    const t = data.temas[tema] || {itens: []};
    $('.nw-tabs').innerHTML = Object.entries(data.temas).filter(([, v]) => v.itens.length).map(([k, v]) =>
      `<button type="button" data-t="${k}" aria-pressed="${k === tema}">${esc(v.nome)}</button>`).join('');
    const [top, ...rest] = t.itens;
    $('.nw-list').innerHTML = top ? `
      <a class="nw-top" href="${esc(top.link)}" target="_blank" rel="noopener">
        <span class="nw-meta">${esc(top.fonte)} · ${ago(top.data)}</span>
        <b>${esc(top.titulo)}</b>
        <span class="nw-go">Ler no ${esc(top.fonte || 'site')} ↗</span>
      </a>
      <div class="nw-grid">${rest.slice(0, 8).map(n => `
        <a class="nw-item" href="${esc(n.link)}" target="_blank" rel="noopener">
          <span class="nw-meta">${esc(n.fonte)} · ${ago(n.data)}</span>
          <b>${esc(n.titulo)}</b>
        </a>`).join('')}</div>` : '<div class="empty">Nenhuma notícia recente neste tema. Tente outro.</div>';
    const ind = data.indicadores || {};
    $('.nw-ind').innerHTML = [
      ind.selic && `<div class="nw-chip"><small>Selic</small><b>${pct(ind.selic.valor)} a.a.</b><span>meta em vigor</span></div>`,
      ind.ipca12m && `<div class="nw-chip"><small>IPCA 12 meses</small><b>${pct(ind.ipca12m.valor)}</b><span>referência ${esc(String(ind.ipca12m.data).slice(3))}</span></div>`
    ].filter(Boolean).join('');
  }

  box.addEventListener('click', ev => {
    const b = ev.target.closest('.nw-tabs button'); if (!b) return;
    tema = b.dataset.t; render();
  });

  async function load() {
    try {
      const r = await fetch('/api/noticias');
      data = await r.json();
      if (!data.temas[tema]?.itens.length) tema = Object.keys(data.temas).find(k => data.temas[k].itens.length) || tema;
      render();
    } catch (_) {
      $('.nw-list').innerHTML = '<div class="empty">Não foi possível carregar as notícias agora. Tente de novo em alguns minutos.</div>';
    }
  }
  // Só busca quando a seção se aproxima da tela.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, {rootMargin: '600px 0px'});
    io.observe(box);
  } else load();
})();
