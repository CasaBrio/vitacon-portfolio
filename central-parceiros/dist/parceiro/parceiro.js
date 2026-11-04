'use strict';
// Área do parceiro: login, troca de senha, criação e acompanhamento das páginas enviadas aos clientes.
(() => {
  const $ = id => document.getElementById(id);
  const {esc, brl, m2, S, data, show, copy} = window.VP;
  const MAX = 6;
  const db = window.VP.client('vitacon-parceiro');
  const views = ['v-login', 'v-senha', 'v-bloq', 'v-app'];
  const view = id => { views.forEach(v => { $(v).hidden = v !== id; }); $('btn-sair').hidden = id === 'v-login'; $('btn-senha').hidden = id !== 'v-app'; };

  let me = null, base = null, chosen = new Set(), recovery = false, appReady = false;
  const pre = new URLSearchParams(location.search).get('add');
  if (pre) chosen.add(pre);
  const linkFor = id => `${location.origin}/c/${id}`;

  async function route() {
    const {data: {session}} = await db.auth.getSession();
    if (!session) { view('v-login'); return; }
    if (recovery) { senhaView('recovery'); return; }
    const {data: p, error} = await db.from('parceiros').select('*').eq('user_id', session.user.id).maybeSingle();
    if (error || !p || !p.ativo) { view('v-bloq'); return; }
    me = p;
    if (p.trocar_senha) { senhaView('first'); return; }
    await app();
  }

  /* Login */
  $('f-login').addEventListener('submit', async ev => {
    ev.preventDefault();
    const b = $('l-go'); b.disabled = true; show($('l-msg'), '');
    const {error} = await db.auth.signInWithPassword({email: $('l-email').value.trim(), password: $('l-senha').value});
    b.disabled = false;
    if (error) { show($('l-msg'), 'E-mail ou senha incorretos. Confira os dados ou use "Esqueci a senha".', 'error'); return; }
    $('l-senha').value = '';
    route();
  });
  $('l-esqueci').addEventListener('click', () => {
    const email = $('l-email').value.trim();
    const msg = `Olá Luigi, esqueci a senha da Área do Parceiro${email ? ' (e-mail ' + email + ')' : ''}. Pode me enviar uma nova senha provisória?`;
    $('l-msg').hidden = false; $('l-msg').className = 'msg ok';
    $('l-msg').innerHTML = `O Luigi envia uma nova senha provisória pelo WhatsApp. <a href="https://wa.me/5511998885850?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" style="font-weight:700">Pedir nova senha ↗</a>`;
  });

  /* Senha */
  function senhaView(mode) {
    const t = {
      first: ['Primeiro acesso', 'Crie a sua senha', 'Troque a senha provisória que você recebeu por uma senha só sua.'],
      recovery: ['Recuperação de acesso', 'Crie uma nova senha', 'Escolha a nova senha da sua Área do Parceiro.'],
      change: ['Sua conta', 'Alterar senha', 'Escolha a nova senha da sua Área do Parceiro.']
    }[mode];
    $('s-eyebrow').textContent = t[0]; $('s-title').textContent = t[1]; $('s-text').textContent = t[2];
    $('s-cancel').hidden = mode !== 'change';
    $('f-senha').reset(); show($('s-msg'), '');
    view('v-senha');
  }
  $('f-senha').addEventListener('submit', async ev => {
    ev.preventDefault();
    const a = $('s-nova').value, c = $('s-conf').value;
    if (a.length < 8) { show($('s-msg'), 'A senha precisa ter pelo menos 8 caracteres.', 'error'); return; }
    if (a !== c) { show($('s-msg'), 'As duas senhas não são iguais.', 'error'); return; }
    const b = $('s-go'); b.disabled = true;
    const {error} = await db.auth.updateUser({password: a});
    if (!error) await db.rpc('parceiro_senha_trocada');
    b.disabled = false;
    if (error) { show($('s-msg'), 'Não foi possível salvar a senha. Tente uma senha diferente da anterior.', 'error'); return; }
    recovery = false;
    history.replaceState(null, '', location.pathname + location.search);
    route();
  });
  $('s-cancel').addEventListener('click', () => view('v-app'));
  $('btn-senha').addEventListener('click', () => senhaView('change'));
  $('btn-sair').addEventListener('click', async () => { await db.auth.signOut({scope: 'local'}); me = null; appReady = false; view('v-login'); });
  db.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') { recovery = true; route(); } });

  /* Área */
  async function app() {
    view('v-app');
    $('a-hello').textContent = `Olá, ${me.nome.split(' ')[0]}`;
    $('a-imob').textContent = [me.imobiliaria, me.creci && 'CRECI ' + me.creci].filter(Boolean).join(' · ') || 'Área do parceiro';
    if (!appReady) {
      appReady = true;
      if (!$('n-msg').value) $('n-msg').placeholder = 'Ex.: Separei estas opções que combinam com o que você procura. Qualquer dúvida, me chame no WhatsApp.';
      try { base = await window.VP.oportunidades(); } catch (_) { base = {itens: []}; }
      chosen = new Set([...chosen].filter(id => base.itens.some(i => i.id === id)));
      renderPicks();
    }
    loadPages();
    if (window.VPPosts) window.VPPosts.init(me);
  }
  function renderPicks() {
    const q = $('n-busca').value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const list = base.itens.filter(i => {
      const hay = [i.nome, i.bairro, S[i.status], i.tipologias, i.categorias].join(' ').toLowerCase();
      return chosen.has(i.id) || terms.every(t => hay.includes(t));
    }).sort((a, b) => (chosen.has(b.id) - chosen.has(a.id)) || a.aPartirDe - b.aPartirDe);
    $('n-lista').innerHTML = list.length ? list.map(i => `
      <label class="pick${chosen.has(i.id) ? ' on' : ''}" for="pk-${i.id}">
        <input type="checkbox" id="pk-${i.id}" value="${i.id}"${chosen.has(i.id) ? ' checked' : ''}>
        <span><b>${esc(i.nome)}</b><small>${esc(i.bairro)} · ${S[i.status] || ''} · a partir de ${brl(i.aPartirDe)} · ${m2(i.metragemMin)}–${m2(i.metragemMax)} m²</small></span>
      </label>`).join('') : '<div class="empty" style="grid-column:1/-1">Nenhum empreendimento encontrado.</div>';
    $('n-count').textContent = `${chosen.size} de ${MAX} selecionados`;
  }
  $('n-busca').addEventListener('input', renderPicks);
  $('n-lista').addEventListener('change', ev => {
    const cb = ev.target; if (cb.type !== 'checkbox') return;
    if (cb.checked && chosen.size >= MAX) { cb.checked = false; show($('n-msg-out'), `Escolha no máximo ${MAX} empreendimentos por página.`, 'error'); return; }
    cb.checked ? chosen.add(cb.value) : chosen.delete(cb.value);
    show($('n-msg-out'), ''); renderPicks();
  });
  $('f-nova').addEventListener('submit', async ev => {
    ev.preventDefault();
    const cliente = $('n-cliente').value.trim();
    if (!cliente) { show($('n-msg-out'), 'Informe o nome do cliente.', 'error'); return; }
    if (!chosen.size) { show($('n-msg-out'), 'Escolha pelo menos um empreendimento.', 'error'); return; }
    const b = $('n-go'); b.disabled = true; show($('n-msg-out'), '');
    const row = {parceiro_id: me.user_id, cliente_nome: cliente, mensagem: $('n-msg').value.trim() || null, itens: [...chosen], mes: base.mes || null};
    const {data: r, error} = await db.from('paginas_cliente').insert(row).select('id').single();
    b.disabled = false;
    if (error) { show($('n-msg-out'), 'Não foi possível criar a página agora. Tente de novo em instantes.', 'error'); return; }
    result(r.id, cliente);
    $('f-nova').reset(); chosen.clear(); renderPicks(); loadPages();
  });
  const waText = (id, cliente) => `Olá ${cliente}! Separei algumas opções de imóveis Vitacon para você. Veja aqui: ${linkFor(id)}`;
  function result(id, cliente) {
    $('r-box').hidden = false;
    $('r-title').textContent = `Página de ${cliente}`;
    $('r-link').textContent = linkFor(id);
    $('r-wa').href = 'https://wa.me/?text=' + encodeURIComponent(waText(id, cliente));
    $('r-open').href = linkFor(id) + '?previa=1';
    $('r-copy').onclick = ev => copy(linkFor(id), ev.currentTarget, $('r-link'));
    $('r-box').scrollIntoView({behavior: 'smooth', block: 'center'});
  }

  async function loadPages() {
    const {data: rows, error} = await db.from('paginas_cliente').select('id,cliente_nome,itens,created_at,visualizacoes,ultima_visualizacao').eq('parceiro_id', me.user_id).order('created_at', {ascending: false}).limit(100);
    if (error) { $('p-list').innerHTML = '<div class="empty">Não foi possível carregar as suas páginas agora.</div>'; return; }
    if (!rows.length) { $('p-list').innerHTML = '<div class="empty">Você ainda não enviou nenhuma página. Monte a primeira acima.</div>'; return; }
    const nome = id => base?.itens.find(i => i.id === id)?.nome || id;
    $('p-list').innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Cliente</th><th>Empreendimentos</th><th>Aberturas</th><th>Última abertura</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr data-id="${r.id}">
        <td><b>${esc(r.cliente_nome)}</b><div class="muted">criada em ${data(r.created_at)}</div></td>
        <td>${r.itens.map(i => esc(nome(i))).join('<br>')}</td>
        <td class="views"><b>${r.visualizacoes}</b></td>
        <td>${r.ultima_visualizacao ? data(r.ultima_visualizacao) : '<span class="muted">ainda não abriu</span>'}</td>
        <td><div class="row">
          <a class="btn btn-ghost btn-small" href="https://wa.me/?text=${encodeURIComponent(waText(r.id, r.cliente_nome))}" target="_blank" rel="noopener">Reenviar</a>
          <button class="btn btn-ghost btn-small" type="button" data-act="copy">Copiar link</button>
          <button class="btn btn-danger btn-small" type="button" data-act="del">Excluir</button>
        </div></td></tr>`).join('')}</tbody></table></div>`;
  }
  $('p-reload').addEventListener('click', loadPages);
  $('p-list').addEventListener('click', async ev => {
    const b = ev.target.closest('button[data-act]'); if (!b) return;
    const id = b.closest('tr').dataset.id;
    if (b.dataset.act === 'copy') { copy(linkFor(id), b); return; }
    if (b.dataset.act === 'del') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Confirmar exclusão'; setTimeout(() => { b.dataset.confirm = ''; b.textContent = 'Excluir'; }, 4000); return; }
      b.disabled = true;
      await db.from('paginas_cliente').delete().eq('id', id);
      loadPages();
    }
  });

  route();
})();
