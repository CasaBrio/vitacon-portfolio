'use strict';
// Vitrine de oportunidades.
// Lista oficial do mês: /vitrine/oportunidades.json (gerado a partir do catálogo em PDF do mês).
// Apresentação e book de cada empreendimento: catalogo-projetos.js e materiais-publicos.js da Central.
(() => {
  const WA = '5511998885850';
  const APRESENTACAO = slug => `https://luigi.sperandeoluis.chatgpt.site/empreendimentos/${slug}/?origem=parceiros`;
  const S = {pronto: 'Pronto', obras: 'Em obras', lanc: 'Lançamento'};
  const KEEP = new Set(['ON', 'VN', 'H']);
  const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const nice = name => String(name).split(/\s+/).map((w, i) => {
    if (KEEP.has(w)) return w;
    const l = w.toLocaleLowerCase('pt-BR');
    if (i > 0 && SMALL.has(l)) return l;
    return l.charAt(0).toLocaleUpperCase('pt-BR') + l.slice(1);
  }).join(' ');
  const m2 = n => Number(n).toLocaleString('pt-BR', {maximumFractionDigits: 2});
  const brl = v => v >= 1e6
    ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', {maximumFractionDigits: 2}) + ' mi'
    : 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + ' mil';
  const pct = v => Math.round(v * 100) + '%';
  const slugOf = n => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Taxas de comissão do programa de parcerias (mesmas da tabela da página).
  const COMISSAO = {estoque: {pf: 0.03, pj: 0.045}, lanc: {pf: 0.03, pj: 0.04}};
  const reais = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const comissao = e => { const t = COMISSAO[e.st === 'lanc' ? 'lanc' : 'estoque']; return {pf: e.preco * t.pf, pj: e.preco * t.pj, t}; };
  const wa = text => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  const waVisita = n => wa(`Olá Luigi, sou corretor(a) parceiro(a) e quero agendar uma visita ao ${n} com o meu cliente.\nMeu nome: \nData e horário de preferência: \nPerfil do cliente (morar ou investir): `);
  const waTabela = n => wa(`Olá Luigi, sou parceiro e tenho cliente com perfil para o ${n}. Pode me enviar a tabela e a disponibilidade atualizadas?`);

  const catalog = Array.isArray(window.CATALOGO_PROJETOS) ? window.CATALOGO_PROJETOS : [];
  const books = window.MATERIAL_PUBLICO || {};
  const byName = new Map(catalog.map(p => [p.name, p]));

  let D = [];
  let st = 'all';
  let defaultPara = 'SELEÇÃO PARA PARCEIROS';

  function build(data) {
    D = (data.itens || []).map((it, i) => {
      const c = byName.get(it.catalogo) || {};
      const slug = c.slug || '';
      return {
        id: 'e' + i,
        nome: it.nome,
        bairro: it.bairro,
        endereco: it.endereco,
        st: S[it.status] ? it.status : 'obras',
        categorias: it.categorias,
        tipologias: it.tipologias,
        min: it.metragemMin, max: it.metragemMax,
        preco: it.aPartirDe,
        desconto: it.descontoMax || 0,
        ultimas: !!it.ultimasUnidades,
        mapa: it.mapa, pasta: it.pasta, tabela: it.tabela,
        explorar: slug && c.presentationAvailable !== false ? APRESENTACAO(slug) : '',
        book: slug ? books[slug] || '' : ''
      };
    });
  }

  function header(data) {
    const n = D.length, mes = data.mes || '';
    const cheapest = [...D].sort((a, b) => a.preco - b.preco)[0];
    const maxDisc = Math.max(0, ...D.map(e => e.desconto));
    const count = k => D.filter(e => e.st === k).length;
    $('h1-n').textContent = n;
    $('lede').textContent = cheapest
      ? `${n} empreendimentos selecionados, a partir de ${brl(cheapest.preco)} no ${cheapest.nome}${cheapest.nome.toLowerCase().includes(cheapest.bairro.toLowerCase()) ? '' : ` (${cheapest.bairro})`}. Cada andar da torre é um empreendimento: toque para ver.`
      : 'Cada andar da torre é um empreendimento. Toque para ver.';
    $('vit-month').textContent = mes ? `Valores de ${mes.toLowerCase()}` : 'Valores do mês';
    defaultPara = mes ? `CATÁLOGO ${mes.toUpperCase()} · SELEÇÃO PARA PARCEIROS` : 'SELEÇÃO PARA PARCEIROS';
    $('note').textContent = `${data.aviso || 'Estoque, valores e condições sujeitos a confirmação.'} Valores do catálogo ${mes}. Material de uso exclusivo de corretores e imobiliárias parceiras.`;
    const stats = [
      [n, 'empreendimentos'],
      [count('pronto'), 'prontos para morar'],
      [count('obras'), 'em obras'],
      ['até ' + pct(maxDisc), 'de desconto']
    ];
    $('stats').innerHTML = stats.map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');
    ['pronto', 'obras', 'lanc'].forEach(k => { $('st-' + k).hidden = !count(k); });
    document.querySelectorAll('[data-pdf]').forEach(a => {
      if (data.pdf) { a.href = data.pdf; a.hidden = false; } else a.hidden = true;
    });
    const label = $('pdf-label');
    if (label && mes) label.textContent = `Catálogo ${mes} em PDF`;
  }

  function picks() {
    if (!D.length) { $('picks').closest('section').hidden = true; return; }
    const by = (f, desc) => [...D].sort((a, b) => desc ? f(b) - f(a) : f(a) - f(b))[0];
    const items = [
      ['Menor ticket', by(e => e.preco), e => `${S[e.st]} · ${e.bairro} · a partir de ${brl(e.preco)}`],
      ['Maior desconto', by(e => e.desconto, true), e => `até ${pct(e.desconto)} off · ${e.bairro} · a partir de ${brl(e.preco)}`],
      ['Últimas unidades', D.find(e => e.ultimas), e => `${S[e.st]} · ${e.bairro} · a partir de ${brl(e.preco)}`],
      ['Maior metragem', by(e => e.max || 0, true), e => `até ${m2(e.max)} m² · ${e.bairro} · a partir de ${brl(e.preco)}`]
    ];
    const seen = new Set();
    $('picks').innerHTML = items.filter(([, e]) => e && !seen.has(e.id) && seen.add(e.id)).map(([t, e, f]) =>
      `<button type="button" class="pick" data-id="${e.id}"><div class="eyebrow">${esc(t)}</div><strong>${esc(e.nome)}</strong><span>${esc(f(e))}</span></button>`).join('');
    $('picks').querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => focusCard(D.find(e => e.id === b.dataset.id))));
  }

  function launches() {
    const L = catalog.filter(p => p.featuredLaunch);
    if (!L.length) { $('lanc-sec').hidden = true; return; }
    $('launches').innerHTML = L.map(p => {
      const n = nice(p.name), slug = p.slug;
      const inList = D.find(e => byName.get(p.name) && e.nome.toLowerCase() === n.toLowerCase());
      const from = inList ? ` · a partir de ${brl(inList.preco)}` : '';
      const btns = [
        p.launchUrl && `<a class="btn btn-primary" href="${esc(p.launchUrl)}" target="_blank" rel="noopener">Materiais ↗</a>`,
        slug && p.presentationAvailable !== false && `<a class="btn btn-ghost" href="${esc(APRESENTACAO(slug))}" target="_blank" rel="noopener">Explorar projeto ↗</a>`,
        slug && books[slug] && `<a class="btn btn-ghost" href="${esc(books[slug])}" target="_blank" rel="noopener">Book ↗</a>`,
        `<a class="btn btn-ghost" href="${esc(wa(`Olá Luigi, sou parceiro e gostaria de solicitar as tabelas e os espelhos de vendas atualizados do ${n}.`))}" target="_blank" rel="noopener">Pedir tabela e espelho</a>`
      ].filter(Boolean).join('');
      return `<article class="launch"><div class="eyebrow">Lançamento · ${esc(p.publicDistrict || '')}</div><h3>${esc(n)}</h3>
        <p>${esc([p.area, p.address].filter(Boolean).join(' · '))}${esc(from)}</p><div class="row">${btns}</div></article>`;
    }).join('');
  }

  /* Torre 3D: um andar por empreendimento, o mais barato na base.
     A rotação é feita em JavaScript (funciona no iPhone e no Android) e dá para girar arrastando o dedo. */
  const tower = $('tower'), tag = $('tag'), stage = $('stage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let angle = -32, holdUntil = 0, hovering = false, drag = null, last = 0;
  const SPEED = reduce ? 4 : 14; // graus por segundo
  const paint = () => { tower.style.transform = `rotateX(-18deg) rotateY(${angle}deg)`; };
  function tick(t) {
    const dt = last ? Math.min(64, t - last) / 1000 : 0; last = t;
    if (!drag && !hovering && performance.now() > holdUntil) { angle += SPEED * dt; paint(); }
    requestAnimationFrame(tick);
  }
  if (fine) {
    stage.addEventListener('mouseenter', () => { hovering = true; });
    stage.addEventListener('mouseleave', () => { hovering = false; });
  }
  // No celular: ao tocar ou deslizar o dedo sobre a torre, mostra o andar que está sob o dedo.
  const floorAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('.floor');
  const touchShow = ev => {
    if (ev.pointerType === 'mouse') return;
    const f = floorAt(ev.clientX, ev.clientY);
    if (f && f._show) { f._show(true); holdUntil = performance.now() + 5000; }
  };
  stage.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.tag')) return;
    drag = {x: ev.clientX, a: angle, moved: false};
    touchShow(ev);
  });
  addEventListener('pointermove', ev => {
    if (!drag) return;
    const dx = ev.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    angle = drag.a + dx * 0.5; paint();
    touchShow(ev);
  });
  const endDrag = () => { if (drag?.moved) holdUntil = performance.now() + 1500; drag = null; };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);

  function buildTower() {
    const floors = [...D].sort((a, b) => a.preco - b.preco);
    tower.style.setProperty('--n', floors.length);
    tower.style.height = `calc(var(--h) * ${floors.length})`;
    tower.innerHTML = '';
    floors.forEach((e, i) => {
      const f = document.createElement('div');
      f.className = 'floor'; f.dataset.s = e.st; f.dataset.id = e.id; f.tabIndex = 0;
      f.setAttribute('role', 'button');
      f.setAttribute('aria-label', `${e.nome}, ${e.bairro}, a partir de ${brl(e.preco)}`);
      f.style.bottom = `calc(var(--h) * ${i})`;
      f.style.animationDelay = (0.15 + i * 0.05) + 's';
      f.innerHTML = '<div class="face f-front"></div><div class="face f-back"></div><div class="face f-left"></div><div class="face f-right"></div>' + (i === floors.length - 1 ? '<div class="roof"></div>' : '');
      const show = (withLink) => {
        tag.innerHTML = `<b>${esc(e.nome)}</b><small>${esc(e.bairro)}<span class="t-st"> · ${S[e.st]}</span> · <span class="t-long">a partir de</span><span class="t-short">desde</span> ${brl(e.preco)}</small>` +
          (withLink ? `<button type="button" class="tag-go">Ver detalhes ↓</button>` : '');
        tag.classList.toggle('has-go', !!withLink);
        const b = tag.querySelector('.tag-go');
        if (b) b.addEventListener('click', () => focusCard(e));
        tower.querySelectorAll('.floor').forEach(x => x.classList.toggle('on', x === f));
      };
      f._show = show;
      // Computador: clicar leva ao card. Celular: o toque mostra o nome e o botão "Ver detalhes".
      const go = () => { if (drag?.moved) return; holdUntil = performance.now() + 5000; if (fine) { show(); focusCard(e); } else show(true); };
      if (fine) f.addEventListener('mouseenter', show);
      f.addEventListener('focus', show); f.addEventListener('click', go);
      f.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      tower.append(f);
    });
    paint();
    requestAnimationFrame(tick);
  }

  /* Vitrine */
  const grid = $('grid'), count = $('count'), fB = $('f-bairro'), fT = $('f-ticket'), fS = $('f-sort');
  function list() {
    const r = D.filter(e => (st === 'all' || e.st === st) && (!fB.value || e.bairro === fB.value) && (!fT.value || e.preco <= +fT.value));
    const s = fS.value;
    return r.sort(
      s === 'bairro' ? (a, b) => a.bairro.localeCompare(b.bairro, 'pt') || a.preco - b.preco
      : s === 'metragem' ? (a, b) => (b.max || 0) - (a.max || 0)
      : s === 'desconto' ? (a, b) => b.desconto - a.desconto
      : (a, b) => a.preco - b.preco);
  }
  function render() {
    const r = list(), ids = new Set(r.map(e => e.id));
    tower.querySelectorAll('.floor').forEach(f => f.classList.toggle('dim', !ids.has(f.dataset.id)));
    count.textContent = `${r.length} de ${D.length} empreendimentos`;
    grid.innerHTML = r.length ? r.map(e => `
      <article class="card" id="card-${e.id}">
        <div class="card-top"><div><h3>${esc(e.nome)}</h3><div class="bairro">${esc(e.bairro)}</div></div>
        <div class="pills"><span class="pill ${e.st}">${S[e.st]}</span>${e.ultimas ? '<span class="pill last">Últimas unidades</span>' : ''}</div></div>
        ${e.endereco ? `<a class="addr" href="${esc(e.mapa)}" target="_blank" rel="noopener">${esc(e.endereco)} ↗</a>` : ''}
        <div class="nums">
          <div><small>Metragem</small><b>${e.min === e.max ? m2(e.min) : m2(e.min) + '–' + m2(e.max)} m²</b></div>
          <div class="price"><small>A partir de</small><b>${brl(e.preco)}</b></div>
        </div>
        <div class="meta">${esc(e.tipologias)}${e.desconto ? ` · <b>até ${pct(e.desconto)} de desconto</b>` : ''}</div>
        <div class="meta cat">${esc(e.categorias)}</div>
        ${(c => `<div class="card-comm" title="Estimativa sobre o valor a partir de, sem bonificações de campanha">
          <span class="comm-label">Sua comissão a partir de</span>
          <span><small>PF ${pct(c.t.pf).replace('%', '')}%</small> <b>${reais(c.pf)}</b></span>
          <span><small>PJ ${(c.t.pj * 100).toLocaleString('pt-BR')}%</small> <b>${reais(c.pj)}</b></span>
        </div>`)(comissao(e))}
        <div class="links">
          <a class="card-links-visit" href="${esc(waVisita(e.nome))}" target="_blank" rel="noopener">Agendar visita ↗</a>
          ${e.tabela ? `<a href="${esc(e.tabela)}" target="_blank" rel="noopener">Tabela do mês ↗</a>` : ''}
          ${e.explorar ? `<a href="${esc(e.explorar)}" target="_blank" rel="noopener">Explorar projeto ↗</a>` : ''}
          ${e.book ? `<a href="${esc(e.book)}" target="_blank" rel="noopener">Book ↗</a>` : ''}
          ${e.pasta ? `<a href="${esc(e.pasta)}" target="_blank" rel="noopener">Materiais ↗</a>` : ''}
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="${esc(waTabela(e.nome))}" target="_blank" rel="noopener">Falar com o Luigi</a>
          <a class="send-client" href="/parceiro/?add=${encodeURIComponent(slugOf(e.nome))}" title="Monte uma página com este empreendimento para o seu cliente">Enviar ao cliente ↗</a>
        </div>
      </article>`).join('') : '<div class="empty">Nenhum empreendimento com esses filtros. Tente outro bairro ou ticket.</div>';
  }
  function setStatus(v) {
    st = v;
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.st === v)));
  }
  function focusCard(e) {
    if (!e) return;
    let c = $('card-' + e.id);
    if (!c) { setStatus('all'); fB.value = ''; fT.value = ''; render(); c = $('card-' + e.id); }
    c.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
    c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800);
  }

  /* Link personalizado: /vitrine/#para-nome-da-imobiliaria */
  function applyHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    const el = $('para');
    if (/^para-[a-z0-9-]+$/i.test(h)) {
      el.textContent = `PREPARADO PARA ${h.slice(5).split('-').filter(Boolean).join(' ').toUpperCase()}`;
    } else el.textContent = defaultPara;
  }

  $('copy-mail').addEventListener('click', ev => {
    const t = 'luigi@vitacon.com.br', b = ev.currentTarget;
    Promise.resolve(navigator.clipboard?.writeText(t)).then(() => { b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar e-mail'; }, 1500); })
      .catch(() => { const r = document.createRange(); r.selectNodeContents($('mail')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  });

  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) { const a = $('mbar-area'); if (a) a.hidden = false; }

  fetch('/vitrine/oportunidades.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    build(data);
    header(data); picks(); launches(); buildTower();
    [...new Set(D.map(e => e.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')).forEach(b => fB.add(new Option(b, b)));
    document.querySelector('.seg').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { setStatus(b.dataset.st); render(); } });
    [fB, fT, fS].forEach(s => s.addEventListener('change', render));
    render(); applyHash();
    addEventListener('hashchange', applyHash);
  }).catch(() => {
    grid.innerHTML = '<div class="empty">Não foi possível carregar as oportunidades agora. Abra a <a href="/central">Central de Parceiros</a> ou fale com o Luigi pelo WhatsApp.</div>';
    applyHash();
  });
})();
