'use strict';
// Página pública enviada pelo corretor ao cliente: /c/<código>.
// Mostra só o que o cliente deve ver (sem comissão, tabelas internas ou pastas de materiais).
(() => {
  const $ = id => document.getElementById(id);
  const {esc, brl, m2, S, zap, fone} = window.VP;
  const id = (location.pathname.match(/\/c\/([0-9a-f]{10})/) || [])[1];
  const previa = new URLSearchParams(location.search).has('previa');
  const catalog = Array.isArray(window.CATALOGO_PROJETOS) ? window.CATALOGO_PROJETOS : [];
  const books = window.MATERIAL_PUBLICO || {};
  const bookOf = it => { const c = catalog.find(p => p.name === it.catalogo); return c && books[c.slug] || ''; };
  const state = s => { ['st-load', 'st-404', 'st-ok'].forEach(k => { $(k).hidden = k !== s; }); };

  async function load() {
    if (!id) { state('st-404'); return; }
    const c = window.CENTRAL_CONFIG;
    const db = window.supabase.createClient(c.url, c.key, {auth: {persistSession: false, autoRefreshToken: false}});
    const [{data: page, error}, base] = await Promise.all([
      db.rpc('pagina_cliente', {p_id: id, p_contar: !previa}),
      window.VP.oportunidades().catch(() => ({itens: []}))
    ]);
    if (error || !page) { state('st-404'); return; }
    render(page, base);
    state('st-ok');
  }

  function render(p, base) {
    const k = p.corretor || {};
    const first = String(p.cliente || '').split(' ')[0];
    const num = zap(k.whatsapp);
    const wa = num ? `https://wa.me/${num.startsWith('55') ? num : '55' + num}` : '';
    const ask = n => wa + '?text=' + encodeURIComponent(n ? `Olá ${k.nome}, vi a seleção que você me enviou e tenho interesse no ${n}.` : `Olá ${k.nome}, vi a seleção de imóveis que você me enviou.`);
    document.title = `Seleção de imóveis para ${first} | Vitacon`;
    $('h-mes').textContent = base.mes ? `Valores de ${base.mes.toLowerCase()}` : '';
    $('c-eyebrow').textContent = `Seleção de imóveis · ${p.itens.length} ${p.itens.length === 1 ? 'opção' : 'opções'}`;
    $('c-title').innerHTML = `${esc(first)}, estes imóveis foram <em>selecionados para você</em>`;
    if (p.mensagem) { $('c-msg').hidden = false; $('c-msg').textContent = p.mensagem; }
    $('c-ini').textContent = String(k.nome || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    $('c-nome').textContent = k.nome || '';
    $('c-dados').textContent = [k.imobiliaria, k.creci && 'CRECI ' + k.creci].filter(Boolean).join(' · ');
    $('k-title').textContent = `Fale com ${String(k.nome || '').split(' ')[0]}`;
    $('k-num').textContent = num ? fone(num) : '';
    if (wa) $('k-wa').href = ask(''); else $('k-wa').hidden = true;

    $('c-grid').innerHTML = p.itens.map(slug => {
      const e = base.itens.find(i => i.id === slug);
      if (!e) return `<article class="card gone"><h3>Opção indisponível</h3><p class="muted">Este empreendimento saiu da seleção do mês. Fale com ${esc(k.nome)} para conhecer alternativas parecidas.</p></article>`;
      const book = bookOf(e);
      return `<article class="card">
        <div class="card-top"><div><h3>${esc(e.nome)}</h3><div class="bairro">${esc(e.bairro)}</div></div>
          <div class="pills"><span class="pill ${esc(e.status)}">${S[e.status] || ''}</span>${e.ultimasUnidades ? '<span class="pill last">Últimas unidades</span>' : ''}</div></div>
        ${e.endereco ? `<a class="addr" href="${esc(e.mapa)}" target="_blank" rel="noopener">${esc(e.endereco)} · ver no mapa ↗</a>` : ''}
        <div class="nums">
          <div><small>Metragem</small><b>${e.metragemMin === e.metragemMax ? m2(e.metragemMin) : m2(e.metragemMin) + '–' + m2(e.metragemMax)} m²</b></div>
          <div class="price"><small>A partir de</small><b>${brl(e.aPartirDe)}</b></div>
        </div>
        <div class="meta">${esc(e.tipologias)}${e.descontoMax ? ` · <b>até ${Math.round(e.descontoMax * 100)}% de desconto</b>` : ''}</div>
        ${book ? `<div class="links"><a href="${esc(book)}" target="_blank" rel="noopener">Ver apresentação do empreendimento ↗</a></div>` : ''}
        ${wa ? `<a class="btn btn-primary" href="${esc(ask(e.nome))}" target="_blank" rel="noopener" style="margin-top:auto">Tenho interesse</a>` : ''}
      </article>`;
    }).join('');
  }

  load().catch(() => state('st-404'));
})();
