'use strict';
// Funções comuns da Área do parceiro, da página do cliente e da gestão de parceiros.
window.VP = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  // Identificador estável do empreendimento (vai salvo na página do cliente).
  const slug = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const m2 = n => Number(n).toLocaleString('pt-BR', {maximumFractionDigits: 2});
  const brl = v => v >= 1e6
    ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', {maximumFractionDigits: 2}) + ' mi'
    : 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + ' mil';
  const S = {pronto: 'Pronto', obras: 'Em obras', lanc: 'Lançamento'};
  const data = d => new Date(d).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'});
  const zap = n => String(n || '').replace(/\D/g, '');
  const fone = n => { const d = zap(n).replace(/^55/, ''); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : n; };
  async function oportunidades() {
    const r = await fetch('/vitrine/oportunidades.json', {cache: 'no-store'});
    if (!r.ok) throw new Error('oportunidades ' + r.status);
    const d = await r.json();
    d.itens = (d.itens || []).map(it => ({...it, id: slug(it.nome)}));
    return d;
  }
  function client(storageKey) {
    const c = window.CENTRAL_CONFIG;
    return window.supabase.createClient(c.url, c.key, {auth: {storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}});
  }
  async function copy(text, btn, fallbackEl) {
    try { await navigator.clipboard.writeText(text); const t = btn.textContent; btn.textContent = 'Copiado'; setTimeout(() => { btn.textContent = t; }, 1500); }
    catch (_) { if (fallbackEl) { const r = document.createRange(); r.selectNodeContents(fallbackEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  }
  function show(el, text, kind) { el.hidden = !text; el.textContent = text || ''; el.className = 'msg' + (kind ? ' ' + kind : ''); }
  return {esc, slug, m2, brl, S, data, zap, fone, oportunidades, client, copy, show};
})();
