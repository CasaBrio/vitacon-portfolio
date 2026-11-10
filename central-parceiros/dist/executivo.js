'use strict';
// Executivos de parcerias com link próprio: parceirosvitacon.com.br/<slug> (ex.: /titto).
// Só quem entra pelo link do executivo vê o contato dele; o endereço normal mostra apenas o Luigi.
// Nada fica guardado no aparelho: os links internos (mapa, Área do Parceiro, app) levam ?ex=<slug> adiante.
// Para um novo executivo: incluir abaixo, colocar a foto em /vitrine/<slug>.jpg e adicionar a rota /<slug> no vercel.json.
// Links com data-luigi continuam com o Luigi (ex.: senha esquecida, FAQ que cita o Luigi).
(() => {
  const LUIGI = '5511998885850', LUIGI_FONE = '(11) 99888-5850';
  const EXECUTIVOS = {
    titto: {nome: 'Titto', cargo: 'Coordenador de Parcerias', email: 'tito.aquino@executivoassociado.com.br',
      whatsapp: '5511916632424', fone: '(11) 91663-2424', foto: '/vitrine/titto.jpg'}
  };
  try { localStorage.removeItem('vitacon-executivo'); } catch (_) { /* versão anterior guardava o executivo */ }
  const q = (new URLSearchParams(location.search).get('ex') || '').toLowerCase();
  const seg = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  const slug = EXECUTIVOS[q] ? q : EXECUTIVOS[seg] ? seg : '';
  const ex = slug ? Object.freeze({slug, ...EXECUTIVOS[slug]}) : null;
  window.EXECUTIVO = ex;
  if (!ex) return;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const nome = s => s.replace(/\bLuigi\b/g, ex.nome).split(LUIGI_FONE).join(ex.fone);

  // Troca os WhatsApp do Luigi pelo do executivo, com a saudação no nome dele.
  const INTERNAS = /^\/(vitrine|mapa|parceiro|app)(\/|$)|^\/$/;
  const levar = root => {
    const as = root.matches?.('a[href]') ? [root] : [];
    as.push(...root.querySelectorAll('a[href]'));
    as.forEach(a => {
      let url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (_) { return; }
      if (url.origin !== location.origin || !INTERNAS.test(url.pathname) || url.searchParams.get('ex') === ex.slug) return;
      if (url.pathname === location.pathname && a.getAttribute('href').startsWith('#')) return;
      url.searchParams.set('ex', ex.slug);
      a.href = url.pathname + url.search + url.hash;
    });
  };
  const trocar = root => {
    if (!root.querySelectorAll) return;
    levar(root);
    const links = root.matches?.('a[href*="wa.me/' + LUIGI + '"]') ? [root] : [];
    links.push(...root.querySelectorAll('a[href*="wa.me/' + LUIGI + '"]'));
    links.forEach(a => {
      if (a.closest('[data-luigi]')) return;
      const t = new URL(a.href).searchParams.get('text');
      a.href = 'https://wa.me/' + ex.whatsapp + (t ? '?text=' + encodeURIComponent(nome(t)) : '');
      const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) walker.currentNode.nodeValue = nome(walker.currentNode.nodeValue);
      ['aria-label', 'title'].forEach(k => { if (a.hasAttribute(k)) a.setAttribute(k, nome(a.getAttribute(k))); });
    });
  };

  // Vitrine: cartão do executivo antes do cartão do Luigi.
  const cartao = () => {
    const sec = document.getElementById('gerente'), luigi = sec?.querySelector('.mgr');
    if (!luigi || document.getElementById('mgr-exec')) return;
    const msg = encodeURIComponent(`Olá ${ex.nome}, sou corretor e quero falar sobre a parceria Vitacon.`);
    const card = document.createElement('div');
    card.className = 'mgr'; card.id = 'mgr-exec';
    card.innerHTML = `<img src="${esc(ex.foto)}" alt="${esc(ex.nome + ', ' + ex.cargo)}">
      <div class="mgr-copy">
        <div class="eyebrow">Seu contato de parcerias</div>
        <h2>${esc(ex.nome)}</h2>
        <div class="role">${esc(ex.cargo)} · Vitacon</div>
        <p>Sou o seu contato no dia a dia da parceria:</p>
        <ul>
          <li>Envio tabelas, espelhos e unidades disponíveis</li>
          <li>Agendo a visita do seu cliente ao decorado ou à obra</li>
          <li>Acompanho a proposta junto com o Luigi até a assinatura</li>
        </ul>
        <div class="contact">
          <a class="btn btn-primary" href="https://wa.me/${ex.whatsapp}?text=${msg}" target="_blank" rel="noopener">WhatsApp ${esc(ex.fone)}</a>
          <span id="mail-exec">${esc(ex.email)}</span>
          <button type="button" id="copy-mail-exec">Copiar e-mail</button>
        </div>
      </div>`;
    luigi.before(card);
    sec.classList.add('dupla');
    const eb = luigi.querySelector('.eyebrow');
    if (eb) eb.textContent = 'Gerente responsável pelas parcerias';
    card.querySelector('#copy-mail-exec').addEventListener('click', ev => {
      const b = ev.currentTarget;
      Promise.resolve(navigator.clipboard?.writeText(ex.email)).then(() => { b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar e-mail'; }, 1500); }).catch(() => {});
    });
  };

  const iniciar = () => {
    cartao();
    trocar(document.body);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(trocar))).observe(document.body, {childList: true, subtree: true});
  };
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
