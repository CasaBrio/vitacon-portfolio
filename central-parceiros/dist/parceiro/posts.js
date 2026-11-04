'use strict';
// Gerador de posts com o nome do corretor (feed e stories), desenhado no navegador e baixado como PNG.
// Dados: catálogo do mês (vitrine/oportunidades.json) + unidades do tabelão (estoque.json) + perfil do parceiro.
(() => {
  const $ = id => document.getElementById(id);
  const {esc, brl, m2, fone} = window.VP;
  const C = {bg: '#2a1a45', bg2: '#3a2660', lilac: '#c9b6ff', soft: '#cdbff0', muted: '#9f8fc4', white: '#ffffff', ink: '#22143a', green: '#25d366'};
  const SIZES = {feed: [1080, 1350], stories: [1080, 1920]};
  const ST = {pronto: 'PRONTO PARA MORAR', obras: 'EM OBRAS', lanc: 'LANÇAMENTO'};
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const reais = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const unidade = u => { const d = String(u || '').match(/\d+/); return d ? String(Number(d[0])) : u; };
  const tipos = t => String(t || '').split(',').map(s => s.trim()).filter(Boolean).map((s, i) => i ? s : s.charAt(0).toUpperCase() + s.slice(1)).join(' · ');

  let base = null, recs = [], me = null, logo = null, ready = false;
  const cache = new Map();

  const loadImg = src => cache.get(src) || cache.set(src, new Promise((ok, no) => {
    const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src;
  })).get(src);

  async function init(profile) {
    me = profile;
    if (ready) return;
    ready = true;
    try {
      const [b, e] = await Promise.all([window.VP.oportunidades(), fetch('/estoque.json', {cache: 'no-store'}).then(r => r.json())]);
      base = b;
      recs = (e.records || []).filter(r => !r.historical && !r.duplicate && r.tablePrice && r.discountPrice && r.discountPrice < r.tablePrice);
    } catch (_) { base = {itens: []}; }
    logo = await loadImg('/parceiro/vitacon-logo.svg').catch(() => null);
    await Promise.all(['800 40px Unbounded', '600 40px Unbounded', '800 40px Manrope', '700 40px Manrope', '500 40px Manrope'].map(f => document.fonts.load(f).catch(() => null)));
    $('pg-emp').innerHTML = base.itens.map(i => `<option value="${esc(i.id)}">${esc(i.nome)} · ${esc(i.bairro)}</option>`).join('');
    ['pg-emp', 'pg-mod', 'pg-fmt', 'pg-uni'].forEach(id => $(id).addEventListener('change', () => { if (id === 'pg-emp' || id === 'pg-mod') units(); draw(); }));
    $('pg-down').addEventListener('click', download);
    $('pg-share').addEventListener('click', share);
    $('pg-copy').addEventListener('click', ev => window.VP.copy($('pg-cap').value, ev.currentTarget, $('pg-cap')));
    units(); draw();
  }

  const item = () => base.itens.find(i => i.id === $('pg-emp').value) || base.itens[0];
  const unitsOf = it => {
    const keys = [norm(it.catalogo), norm(it.nome)];
    return recs.filter(r => { const p = norm(r.project); return keys.some(k => k === p || k.startsWith(p + ' ') || p.startsWith(k)); })
      .sort((a, b) => b.discount - a.discount || a.discountPrice - b.discountPrice);
  };
  function units() {
    const it = item(), mod = $('pg-mod'), list = unitsOf(it);
    const oferta = mod.querySelector('option[value="oferta"]');
    oferta.disabled = !list.length;
    if (!list.length && mod.value === 'oferta') mod.value = 'destaque';
    $('pg-uni-wrap').hidden = mod.value !== 'oferta';
    $('pg-uni').innerHTML = list.map((r, k) => `<option value="${k}">Unidade ${esc(unidade(r.unit))} · ${m2(r.area)} m² · ${reais(r.discountPrice)} (${Math.round(r.discount * 100)}% off)</option>`).join('');
    $('pg-note').textContent = list.length ? '' : 'Este empreendimento não tem unidades com desconto no tabelão do mês. O modelo "Oferta de unidade" fica disponível quando houver.';
  }

  /* Desenho */
  function wrap(ctx, text, x, y, maxW, lh, maxLines = 3) {
    const words = String(text).split(' '); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const t = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = words[i]; if (++n >= maxLines - 1) { line = words.slice(i).join(' '); break; } }
      else line = t;
    }
    ctx.fillText(line, x, y); return y + lh;
  }
  function pill(ctx, text, x, y, {bg, fg, font, px = 22, h = 56, align = 'left'}) {
    ctx.font = font; const w = ctx.measureText(text).width + px * 2;
    const x0 = align === 'right' ? x - w : x;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x0, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + px, y + h / 2 + 1); ctx.textBaseline = 'alphabetic';
    return w;
  }
  function cover(ctx, img, x, y, w, h) {
    const r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }

  async function draw() {
    const it = item(); if (!it) return;
    const fmt = $('pg-fmt').value, mod = $('pg-mod').value, [W, H] = SIZES[fmt], st = fmt === 'stories';
    const cv = $('pg-canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), P = 64;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // Foto
    const PH = st ? 860 : 520;
    let photo = null; if (it.foto) photo = await loadImg(it.foto).catch(() => null);
    if (photo) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PH); ctx.clip(); cover(ctx, photo, 0, 0, W, PH); ctx.restore(); } else { ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, PH); }
    let g = ctx.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, 'rgba(20,10,35,.75)'); g.addColorStop(1, 'rgba(20,10,35,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 260);
    g = ctx.createLinearGradient(0, PH - 160, 0, PH); g.addColorStop(0, 'rgba(42,26,69,0)'); g.addColorStop(1, C.bg); ctx.fillStyle = g; ctx.fillRect(0, PH - 160, W, 161);
    if (logo) ctx.drawImage(logo, P, st ? 110 : 64, 300, 300 * 168 / 806);
    pill(ctx, ST[it.status] || '', W - P, st ? 112 : 66, {bg: C.white, fg: C.ink, font: '800 24px Manrope', align: 'right', h: 54});
    ctx.save(); ctx.translate(W - 30, PH - 30); ctx.rotate(-Math.PI / 2); ctx.font = '600 17px Manrope'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'right'; ctx.fillText('IMAGEM ILUSTRATIVA', 0, 0); ctx.restore();

    // Nome e local
    let y = PH + (st ? 100 : 76);
    ctx.fillStyle = C.white; ctx.font = `800 ${st ? 72 : 62}px Unbounded`;
    y = wrap(ctx, it.nome, P, y, W - P * 2, st ? 82 : 72, 2);
    ctx.font = '600 30px Manrope'; ctx.fillStyle = C.soft;
    ctx.fillText(`${it.bairro} · ${it.endereco}`.slice(0, 62), P, y - (st ? 18 : 22)); y += st ? 60 : 44;

    const list = unitsOf(it), u = list[+$('pg-uni').value || 0];
    let cap = '';
    if (mod === 'oferta' && u) {
      ctx.font = '600 36px Manrope'; ctx.fillStyle = C.muted;
      const de = 'DE ' + reais(u.tablePrice); ctx.fillText(de, P, y); const dw = ctx.measureText(de).width;
      ctx.strokeStyle = '#ff7a8a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(P + 62, y - 12); ctx.lineTo(P + dw, y - 12); ctx.stroke();
      y += st ? 112 : 96;
      ctx.font = '700 34px Manrope'; ctx.fillStyle = C.soft; ctx.fillText('POR', P, y - 8);
      ctx.font = `800 ${st ? 112 : 96}px Unbounded`; ctx.fillStyle = C.white; ctx.fillText(reais(u.discountPrice), P + 90, y);
      y += st ? 46 : 34;
      pill(ctx, `ECONOMIA DE ${reais(u.tablePrice - u.discountPrice)} · ${Math.round(u.discount * 100)}% OFF`, P, y, {bg: C.lilac, fg: C.ink, font: '800 28px Manrope', h: 62});
      y += st ? 122 : 106;
      ctx.font = '600 30px Manrope'; ctx.fillStyle = C.soft;
      ctx.fillText(`Unidade ${unidade(u.unit)} · ${m2(u.area)} m²`, P, y);
      cap = `🏙️ ${it.nome} | ${it.bairro}\n\nDe ${reais(u.tablePrice)} por ${reais(u.discountPrice)}: economia de ${reais(u.tablePrice - u.discountPrice)} (${Math.round(u.discount * 100)}% off) na unidade ${unidade(u.unit)}, com ${m2(u.area)} m².\n📍 ${it.endereco}`;
    } else if (mod === 'investidor') {
      ctx.font = `800 ${st ? 54 : 50}px Unbounded`; ctx.fillStyle = C.white;
      y = wrap(ctx, 'Invista com renda de locação', P, y + 6, W - P * 2, st ? 68 : 58, 2) + 4;
      ctx.font = '600 32px Manrope';
      ['Decoração completa com a Housi Decor', 'Gestão da locação pela Housi', `${tipos(it.tipologias)} · ${m2(it.metragemMin)} a ${m2(it.metragemMax)} m²`].forEach(t => {
        ctx.fillStyle = C.lilac; ctx.beginPath(); ctx.arc(P + 12, y - 11, 9, 0, 7); ctx.fill();
        ctx.fillStyle = C.soft; ctx.fillText(t.slice(0, 52), P + 40, y); y += st ? 58 : 46;
      });
      y += st ? 40 : 14;
      ctx.font = '700 30px Manrope'; ctx.fillStyle = C.soft; ctx.fillText('A PARTIR DE', P, y);
      ctx.font = `800 ${st ? 96 : 76}px Unbounded`; ctx.fillStyle = C.white; ctx.fillText(brl(it.aPartirDe), P, y + (st ? 100 : 80));
      cap = `💼 ${it.nome} | ${it.bairro}\n\nPara investir com renda de locação, com opção de decoração completa pela Housi Decor e gestão da locação pela Housi. A partir de ${brl(it.aPartirDe)}.\n📍 ${it.endereco}`;
    } else {
      ctx.font = `700 ${st ? 50 : 44}px Unbounded`; ctx.fillStyle = C.white;
      y = wrap(ctx, tipos(it.tipologias), P, y + 10, W - P * 2, st ? 60 : 54, 2);
      ctx.font = '600 34px Manrope'; ctx.fillStyle = C.soft; ctx.fillText(`${m2(it.metragemMin)} a ${m2(it.metragemMax)} m²`, P, y); y += st ? 96 : 76;
      ctx.font = '700 30px Manrope'; ctx.fillText('A PARTIR DE', P, y);
      ctx.font = `800 ${st ? 104 : 92}px Unbounded`; ctx.fillStyle = C.white; ctx.fillText(brl(it.aPartirDe), P, y + (st ? 108 : 96));
      y += st ? 150 : 128;
      if (it.descontoMax) pill(ctx, `ATÉ ${Math.round(it.descontoMax * 100)}% DE DESCONTO`, P, y, {bg: C.lilac, fg: C.ink, font: '800 28px Manrope', h: 60});
      if (it.ultimasUnidades) pill(ctx, 'ÚLTIMAS UNIDADES', it.descontoMax ? W - P : P, it.descontoMax ? y : y, {bg: C.white, fg: C.ink, font: '800 28px Manrope', h: 60, align: it.descontoMax ? 'right' : 'left'});
      cap = `🏙️ ${it.nome} | ${it.bairro}\n\n${tipos(it.tipologias)} de ${m2(it.metragemMin)} a ${m2(it.metragemMax)} m², a partir de ${brl(it.aPartirDe)}${it.descontoMax ? ` e com até ${Math.round(it.descontoMax * 100)}% de desconto` : ''}.\n📍 ${it.endereco}`;
    }

    // Rodapé com o corretor
    const FH = st ? 250 : 210, fy = H - FH;
    const legal = `Imagens ilustrativas. Valores de ${String(base.mes || '').toLowerCase()} sujeitos a alteração e disponibilidade.${it.status === 'lanc' ? ' Material preliminar sujeito a alterações.' : ''}`;
    ctx.font = '500 19px Manrope'; ctx.fillStyle = C.muted; wrap(ctx, legal, P, fy - (it.status === 'lanc' ? 50 : 26), W - P * 2, 24, 2);
    ctx.fillStyle = C.white; ctx.fillRect(0, fy, W, FH);
    ctx.fillStyle = C.bg; ctx.fillRect(0, fy, 14, FH);
    const k = me || {};
    ctx.fillStyle = C.ink; ctx.font = '800 38px Unbounded'; ctx.fillText(String(k.nome || 'Seu nome').slice(0, 34), P, fy + (st ? 78 : 66));
    ctx.font = '600 25px Manrope'; ctx.fillStyle = '#5b4b7a';
    ctx.fillText([k.imobiliaria, k.creci && 'CRECI ' + k.creci].filter(Boolean).join(' · ').slice(0, 60), P, fy + (st ? 122 : 106));
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(P + 16, fy + (st ? 178 : 156), 16, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = '800 36px Manrope'; ctx.fillText(fone(k.whatsapp || ''), P + 46, fy + (st ? 191 : 169));
    ctx.font = '700 22px Manrope'; ctx.fillStyle = '#5b4b7a'; ctx.textAlign = 'right'; ctx.fillText('Fale comigo no WhatsApp', W - P, fy + (st ? 191 : 169)); ctx.textAlign = 'left';

    $('pg-cap').value = `${cap}\n\nChame no WhatsApp: ${fone(k.whatsapp || '')}\n${k.nome || ''}${k.creci ? ' · CRECI ' + k.creci : ''}\n\n${legal}`;
  }

  const fileName = () => `${window.VP.slug(item().nome)}-${$('pg-mod').value}-${$('pg-fmt').value}.png`;
  const blob = () => new Promise(ok => $('pg-canvas').toBlob(ok, 'image/png'));
  async function download() {
    const b = await blob(), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = fileName(); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function share() {
    const b = await blob(), f = new File([b], fileName(), {type: 'image/png'});
    if (navigator.canShare && navigator.canShare({files: [f]})) {
      try { await navigator.share({files: [f], text: $('pg-cap').value}); } catch (_) {}
    } else download();
  }
  if (!(navigator.canShare && navigator.canShare({files: [new File([''], 'a.png', {type: 'image/png'})]}))) document.addEventListener('DOMContentLoaded', () => { const s = $('pg-share'); if (s) s.hidden = true; });

  window.VPPosts = {init};
})();
