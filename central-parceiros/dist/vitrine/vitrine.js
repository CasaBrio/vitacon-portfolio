'use strict';
// Vitrine de oportunidades: lê os mesmos dados da Central (estoque.json, catálogo e books).
// Ao atualizar estoque.json / catalogo-projetos.js / materiais-publicos.js, esta página se atualiza sozinha.
(() => {
  const WA = '5511998885850';
  const MATERIAIS = 'https://drive.google.com/drive/folders/1mW1RhbsVsEnTSjr0HLRZUS24s8Pnh1AQ';
  const APRESENTACAO = slug => `https://luigi.sperandeoluis.chatgpt.site/empreendimentos/${slug}/?origem=parceiros`;
  // Nomes do estoque que aparecem com outro nome no catálogo.
  const ALIASES = {'VITACON VENANCIO AIRES': 'VITACON VENÂNCIO AIRES 38'};
  const KEEP = new Set(['ON', 'VN', 'H', 'HIS', 'HMP']);
  const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const S = {pronto: 'Pronto', obras: 'Em obras', lanc: 'Lançamento', estoque: 'Em estoque'};

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
  const status = phase => {
    const p = String(phase || '').toLowerCase();
    if (p.includes('pronto')) return 'pronto';
    if (p.includes('obra')) return 'obras';
    if (p.includes('lançamento') || p.includes('lancamento')) return 'lanc';
    return 'estoque';
  };
  const wa = text => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  const waTabela = n => wa(`Olá Luigi, sou parceiro e tenho cliente com perfil para o ${n}. Pode me enviar a tabela e a disponibilidade atualizadas?`);

  const catalog = Array.isArray(window.CATALOGO_PROJETOS) ? window.CATALOGO_PROJETOS : [];
  const books = window.MATERIAL_PUBLICO || {};
  const byName = new Map(catalog.map(p => [p.name, p]));
  const lookup = (name, projects) => {
    let c = byName.get(name);
    if ((!c || !c.phase) && ALIASES[name]) c = byName.get(ALIASES[name]) || c;
    const base = projects.find(p => p.name === name) || {};
    return {...base, ...(c || {})};
  };

  let D = [];
  let st = 'all';

  function build(data) {
    const recs = (data.records || []).filter(r => !r.historical && !r.duplicate && (r.discountPrice || r.tablePrice));
    const groups = new Map();
    recs.forEach(r => { if (!groups.has(r.project)) groups.set(r.project, []); groups.get(r.project).push(r); });
    let i = 0;
    D = [...groups].map(([name, rs]) => {
      const c = lookup(name, data.projects || []);
      const prices = rs.map(r => r.discountPrice || r.tablePrice);
      const areas = rs.map(r => r.area).filter(Boolean);
      const slug = c.slug || '';
      return {
        id: 'e' + (i++),
        nome: nice(c.name || name),
        bairro: c.publicDistrict || rs[0].districtSource || '',
        st: status(c.phase),
        preco: Math.min(...prices),
        min: areas.length ? Math.min(...areas) : null,
        max: areas.length ? Math.max(...areas) : null,
        unidades: rs.length,
        desconto: Math.max(0, ...rs.map(r => r.discount || 0)),
        explorar: slug && c.presentationAvailable !== false ? APRESENTACAO(slug) : '',
        book: slug ? books[slug] || '' : ''
      };
    });
    return {month: data.month || '', units: recs.length, launches: catalog.filter(p => p.featuredLaunch), recs, groups};
  }

  function header(info) {
    const n = D.length, mes = info.month;
    const cheapest = [...D].sort((a, b) => a.preco - b.preco)[0];
    const maxDisc = Math.max(0, ...D.map(e => e.desconto));
    const count = k => D.filter(e => e.st === k).length;
    $('h1-n').textContent = n;
    $('lede').textContent = cheapest
      ? `${info.units} unidades em ${n} empreendimentos, a partir de ${brl(cheapest.preco)} no ${cheapest.nome}${cheapest.nome.toLowerCase().includes(cheapest.bairro.toLowerCase()) ? '' : ` (${cheapest.bairro})`}. Cada andar da torre é um empreendimento: toque para ver.`
      : 'Cada andar da torre é um empreendimento. Toque para ver.';
    $('vit-month').textContent = mes ? `Valores de ${mes.toLowerCase()}` : 'Valores do mês';
    defaultPara = mes ? `TABELÃO ${mes.toUpperCase()} · SELEÇÃO PARA PARCEIROS` : 'SELEÇÃO PARA PARCEIROS';
    $('note').textContent = `Valores com desconto da base ${mes || 'do mês'} da Central de Parceiros. Estoque, valores e condições sujeitos a confirmação antes de qualquer proposta. Material de uso exclusivo de corretores e imobiliárias parceiras.`;
    const stats = [
      [n, 'empreendimentos'],
      [info.units, 'unidades no tabelão'],
      [count('pronto'), 'prontos para morar'],
      ['até ' + pct(maxDisc), 'de desconto']
    ];
    $('stats').innerHTML = stats.map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');
    ['pronto', 'obras', 'lanc'].forEach(k => { $('st-' + k).hidden = !count(k); });
    if (D.some(e => e.st === 'estoque')) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'st-estoque'; b.dataset.st = 'estoque'; b.setAttribute('aria-pressed', 'false'); b.textContent = 'Em estoque';
      document.querySelector('.seg').append(b);
    }
  }

  function picks() {
    if (!D.length) { $('picks').closest('section').hidden = true; return; }
    const by = (f, desc) => [...D].sort((a, b) => desc ? f(b) - f(a) : f(a) - f(b))[0];
    const line = e => `${S[e.st]} · ${e.bairro} · a partir de ${brl(e.preco)}`;
    const items = [
      ['Menor ticket', by(e => e.preco)],
      ['Maior desconto', by(e => e.desconto, true), e => `até ${pct(e.desconto)} off · ${e.bairro} · a partir de ${brl(e.preco)}`],
      ['Mais unidades', by(e => e.unidades, true), e => `${e.unidades} unidades · ${e.bairro} · a partir de ${brl(e.preco)}`],
      ['Maior metragem', by(e => e.max || 0, true), e => `até ${m2(e.max)} m² · ${e.bairro} · a partir de ${brl(e.preco)}`]
    ];
    const seen = new Set();
    $('picks').innerHTML = items.filter(([, e]) => e && !seen.has(e.id) && seen.add(e.id)).map(([t, e, f]) =>
      `<button type="button" class="pick" data-id="${e.id}" style="text-align:left;color:inherit;font:inherit;cursor:pointer"><div class="eyebrow">${esc(t)}</div><strong>${esc(e.nome)}</strong><span>${esc((f || line)(e))}</span></button>`).join('');
    $('picks').querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => focusCard(D.find(e => e.id === b.dataset.id))));
  }

  function launches(info) {
    const L = info.launches;
    if (!L.length) { $('lanc-sec').hidden = true; return; }
    $('launches').innerHTML = L.map(p => {
      const n = nice(p.name), slug = p.slug;
      const inStock = info.groups.get(p.name);
      const from = inStock ? ` · a partir de ${brl(Math.min(...inStock.map(r => r.discountPrice || r.tablePrice)))}` : '';
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

  /* Torre: um andar por empreendimento, o mais barato na base */
  const tower = $('tower'), tag = $('tag'), stage = $('stage');
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
      f.style.animationDelay = (0.15 + i * 0.06) + 's';
      f.innerHTML = '<div class="face f-front"></div><div class="face f-back"></div><div class="face f-left"></div><div class="face f-right"></div>' + (i === floors.length - 1 ? '<div class="roof"></div>' : '');
      const show = () => {
        tag.innerHTML = `<b>${esc(e.nome)}</b><small>${esc(e.bairro)} · ${S[e.st]} · a partir de ${brl(e.preco)}</small>`;
        tower.querySelectorAll('.floor').forEach(x => x.classList.toggle('on', x === f));
      };
      const go = () => { show(); stage.classList.add('paused'); focusCard(e); };
      f.addEventListener('mouseenter', show); f.addEventListener('focus', show); f.addEventListener('click', go);
      f.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      tower.append(f);
    });
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
        <span class="pill ${e.st}">${S[e.st]}</span></div>
        <div class="nums">
          <div><small>Metragem</small><b>${e.min ? (e.min === e.max ? m2(e.min) : m2(e.min) + '–' + m2(e.max)) + ' m²' : '—'}</b></div>
          <div class="price"><small>A partir de</small><b>${brl(e.preco)}</b></div>
        </div>
        <div class="meta">${e.unidades} ${e.unidades === 1 ? 'unidade' : 'unidades'}${e.desconto ? ` · <b>até ${pct(e.desconto)} de desconto</b>` : ''}</div>
        <div class="links">
          ${e.explorar ? `<a href="${esc(e.explorar)}" target="_blank" rel="noopener">Explorar projeto ↗</a>` : ''}
          ${e.book ? `<a href="${esc(e.book)}" target="_blank" rel="noopener">Book ↗</a>` : ''}
          <a href="${MATERIAIS}" target="_blank" rel="noopener">Materiais ↗</a>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="${esc(waTabela(e.nome))}" target="_blank" rel="noopener">Pedir tabela ao Luigi</a>
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
    c.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center'});
    c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800);
  }

  /* Link personalizado: /vitrine/#para-nome-da-imobiliaria */
  let defaultPara = 'SELEÇÃO PARA PARCEIROS';
  function applyHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    const el = $('para');
    if (/^para-[a-z0-9-]+$/i.test(h)) {
      const nome = h.slice(5).split('-').filter(Boolean).join(' ');
      el.textContent = `PREPARADO PARA ${nome.toUpperCase()}`;
    } else el.textContent = defaultPara;
  }

  $('copy-mail').addEventListener('click', ev => {
    const t = 'luigi@vitacon.com.br', b = ev.currentTarget;
    Promise.resolve(navigator.clipboard?.writeText(t)).then(() => { b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar e-mail'; }, 1500); })
      .catch(() => { const r = document.createRange(); r.selectNodeContents($('mail')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  });

  fetch('/estoque.json', {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    const info = build(data);
    header(info); picks(); launches(info); buildTower();
    [...new Set(D.map(e => e.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')).forEach(b => fB.add(new Option(b, b)));
    document.querySelector('.seg').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { setStatus(b.dataset.st); render(); } });
    [fB, fT, fS].forEach(s => s.addEventListener('change', render));
    render(); applyHash();
    addEventListener('hashchange', applyHash);
  }).catch(() => {
    grid.innerHTML = '<div class="empty">Não foi possível carregar as oportunidades agora. Abra a <a href="/">Central de Parceiros</a> ou fale com o Luigi pelo WhatsApp.</div>';
    applyHash();
  });
})();
