'use strict';
// Gestão de parceiros (só o administrador): criar acessos, ativar/desativar e ver as páginas enviadas.
(() => {
  const $ = id => document.getElementById(id);
  const {esc, data, show, copy, zap, fone} = window.VP;
  const ADMIN = 'e6a450e9-32b0-4a67-80a8-e2c32c24e627';
  const cfg = window.CENTRAL_CONFIG;
  const db = window.supabase.createClient(cfg.url, cfg.key, {auth: {storageKey: 'central-admin-session', storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false}});
  const view = v => { $('v-login').hidden = v !== 'login'; $('v-app').hidden = v !== 'app'; $('btn-sair').hidden = v !== 'app'; };
  let parceiros = [], paginas = [], tab = 'pag', nomes = {};

  async function route() {
    const {data: {session}} = await db.auth.getSession();
    if (!session) { view('login'); return; }
    if (session.user.id !== ADMIN) { view('login'); show($('l-msg'), 'Este usuário não tem acesso administrativo.', 'error'); await db.auth.signOut({scope: 'local'}); return; }
    view('app');
    try { const b = await window.VP.oportunidades(); b.itens.forEach(i => { nomes[i.id] = i.nome; }); } catch (_) {}
    load();
  }
  $('f-login').addEventListener('submit', async ev => {
    ev.preventDefault(); $('l-go').disabled = true;
    const {error} = await db.auth.signInWithPassword({email: $('l-email').value.trim(), password: $('l-senha').value});
    $('l-go').disabled = false;
    if (error) { show($('l-msg'), 'E-mail ou senha incorretos.', 'error'); return; }
    route();
  });
  $('btn-sair').addEventListener('click', async () => { await db.auth.signOut({scope: 'local'}); view('login'); });

  async function load() {
    const [a, b] = await Promise.all([
      db.from('parceiros').select('*').order('created_at', {ascending: false}),
      db.from('paginas_cliente').select('id,parceiro_id,cliente_nome,itens,created_at,visualizacoes,ultima_visualizacao').order('created_at', {ascending: false}).limit(500)
    ]);
    if (a.error || b.error) {
      $('list').innerHTML = '<div class="empty">Não foi possível carregar os dados. Confira se o script <b>parceiros-schema.sql</b> já foi executado no Supabase.</div>';
      return;
    }
    parceiros = a.data; paginas = b.data;
    parceiros.sort((x, y) => (x.conferido - y.conferido) || (new Date(y.created_at) - new Date(x.created_at)));
    kpis(); avisoNovos(); render();
  }
  const aConferir = () => parceiros.filter(p => !p.conferido);
  function avisoNovos() {
    const n = aConferir().length;
    document.title = (n ? `(${n}) ` : '') + 'Parceiros e páginas | Central Vitacon';
    $('t-conf').textContent = `A conferir (${n})`; $('t-conf').hidden = !n;
    $('novos').hidden = !n;
    if (n) $('novos-txt').innerHTML = `<b>${n} ${n === 1 ? 'novo cadastro' : 'novos cadastros'}</b> pela Área do Parceiro. Confira no Vitacon Partners e marque como conferido.`;
  }
  function kpis() {
    const since = Date.now() - 30 * 864e5;
    const ativos = parceiros.filter(p => p.ativo).length;
    const pag30 = paginas.filter(p => new Date(p.created_at) > since).length;
    const ab = paginas.reduce((s, p) => s + p.visualizacoes, 0);
    const usando = new Set(paginas.filter(p => new Date(p.created_at) > since).map(p => p.parceiro_id)).size;
    $('kpis').innerHTML = [[ativos, 'parceiros com acesso'], [usando, 'parceiros que enviaram páginas (30 dias)'], [pag30, 'páginas criadas (30 dias)'], [ab, 'aberturas pelos clientes (total)']]
      .map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join('');
  }
  const pName = id => parceiros.find(p => p.user_id === id);
  function render() {
    $('t-pag').setAttribute('aria-pressed', tab === 'pag'); $('t-par').setAttribute('aria-pressed', tab === 'par'); $('t-conf').setAttribute('aria-pressed', tab === 'conf');
    if (tab === 'pag') {
      $('list').innerHTML = paginas.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Criada em</th><th>Parceiro</th><th>Cliente</th><th>Empreendimentos</th><th>Aberturas</th><th>Última abertura</th><th></th></tr></thead>
        <tbody>${paginas.map(r => { const p = pName(r.parceiro_id) || {}; return `<tr>
          <td>${data(r.created_at)}</td>
          <td><b>${esc(p.nome || '—')}</b><div class="muted">${esc(p.imobiliaria || '')}</div></td>
          <td>${esc(r.cliente_nome)}</td>
          <td>${r.itens.map(i => esc(nomes[i] || i)).join('<br>')}</td>
          <td><b style="font-family:var(--f-mono);color:var(--pronto)">${r.visualizacoes}</b></td>
          <td>${r.ultima_visualizacao ? data(r.ultima_visualizacao) : '<span class="muted">não abriu</span>'}</td>
          <td><a class="btn btn-ghost btn-small" href="/c/${r.id}?previa=1" target="_blank" rel="noopener">Ver</a></td></tr>`; }).join('')}</tbody></table></div>`
        : '<div class="empty">Nenhuma página enviada ainda.</div>';
    } else {
      const lista = tab === 'conf' ? aConferir() : parceiros;
      $('list').innerHTML = lista.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Parceiro</th><th>Contato</th><th>Páginas</th><th>Aberturas</th><th>Status</th><th></th></tr></thead>
        <tbody>${lista.map(p => { const mine = paginas.filter(r => r.parceiro_id === p.user_id); return `<tr data-id="${p.user_id}">
          <td><b>${esc(p.nome)}</b><div class="muted">${esc([p.imobiliaria, p.creci && 'CRECI ' + p.creci].filter(Boolean).join(' · '))}</div><div class="muted">${p.origem === 'cadastro' ? 'cadastrou-se' : 'acesso criado'} em ${data(p.created_at)}</div>${p.origem === 'cadastro' ? `<div class="muted">Vitacon Partners: ${p.vitacon_partners ? 'diz que já é cadastrado' : 'diz que ainda não é'}</div>` : ''}</td>
          <td>${esc(p.email)}<div class="muted">${esc(fone(p.whatsapp))}</div></td>
          <td>${mine.length}</td>
          <td>${mine.reduce((s, r) => s + r.visualizacoes, 0)}</td>
          <td>${p.ativo ? '<span class="pill pronto">Ativo</span>' : '<span class="pill off">Desativado</span>'}${p.conferido ? '' : ' <span class="pill novo">A conferir</span>'}${p.trocar_senha ? '<div class="muted">ainda não trocou a senha</div>' : ''}</td>
          <td><div class="row">${p.conferido ? '' : '<button class="btn btn-primary btn-small" type="button" data-act="conf">Conferido</button>'}<button class="btn btn-ghost btn-small" type="button" data-act="senha">Nova senha</button><button class="btn ${p.ativo ? 'btn-danger' : 'btn-ghost'} btn-small" type="button" data-act="toggle">${p.ativo ? 'Desativar' : 'Reativar'}</button></div></td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty">${tab === 'conf' ? 'Nenhum cadastro novo para conferir.' : 'Nenhum parceiro com acesso ainda.'}</div>`;
    }
  }
  $('t-pag').addEventListener('click', () => { tab = 'pag'; render(); });
  $('t-par').addEventListener('click', () => { tab = 'par'; render(); });
  $('t-conf').addEventListener('click', () => { tab = 'conf'; render(); });
  $('novos-ver').addEventListener('click', () => { tab = 'conf'; render(); $('list').scrollIntoView({behavior: 'smooth'}); });
  /* Exportar parceiros (para cruzar com o Vitacon Partners) */
  $('t-csv').addEventListener('click', () => {
    const cols = [['Nome', p => p.nome], ['E-mail', p => p.email], ['WhatsApp', p => fone(p.whatsapp)], ['Imobiliária', p => p.imobiliaria || ''], ['CRECI', p => p.creci || ''],
      ['Origem', p => p.origem === 'cadastro' ? 'Cadastrou-se no site' : 'Criado pelo Luigi'], ['Diz estar no Vitacon Partners', p => p.vitacon_partners == null ? '' : (p.vitacon_partners ? 'Sim' : 'Não')],
      ['Conferido', p => p.conferido ? 'Sim' : 'Não'], ['Status', p => p.ativo ? 'Ativo' : 'Desativado'], ['Data', p => data(p.created_at)],
      ['Páginas enviadas', p => paginas.filter(r => r.parceiro_id === p.user_id).length]];
    const cell = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\ufeff' + [cols.map(c => cell(c[0])).join(';'), ...parceiros.map(p => cols.map(c => cell(c[1](p))).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = `parceiros-area-vitacon-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('t-reload').addEventListener('click', load);
  $('list').addEventListener('click', async ev => {
    const b = ev.target.closest('button[data-act]'); if (!b) return;
    const id = b.closest('tr').dataset.id, p = pName(id);
    b.disabled = true;
    if (b.dataset.act === 'conf') { await db.from('parceiros').update({conferido: true}).eq('user_id', id); load(); return; }
    if (b.dataset.act === 'senha') {
      const nova = gerar();
      const {error} = await db.rpc('admin_nova_senha', {p_user: id, p_senha: nova});
      b.disabled = false;
      if (error) { show($('p-msg'), 'Não foi possível gerar a nova senha. Tente de novo.', 'error'); return; }
      show($('p-msg'), '');
      sendBox(p.nome, p.email, nova, p.whatsapp, true);
      load(); return;
    }
    await db.from('parceiros').update({ativo: !p.ativo}).eq('user_id', id);
    load();
  });

  /* Mensagem de acesso para o parceiro */
  function sendBox(nome, email, senha, whatsapp, nova) {
    const txt = nova
      ? `Olá ${nome.split(' ')[0]}! Sua nova senha provisória da Área do Parceiro Vitacon:\n\nAcesse: ${location.origin}/parceiro/\nE-mail: ${email}\nSenha provisória: ${senha}\n\nNo próximo acesso você cria uma senha só sua.\n\nLuigi · Vitacon`
      : `Olá ${nome.split(' ')[0]}! Seu acesso à Área do Parceiro Vitacon está liberado.\n\nAcesse: ${location.origin}/parceiro/\nE-mail: ${email}\nSenha provisória: ${senha}\n\nNo primeiro acesso você cria a sua senha. Lá você monta páginas com os empreendimentos para enviar aos seus clientes, com o seu nome e contato.\n\nLuigi · Vitacon`;
    $('p-text').textContent = txt;
    $('p-send').querySelector('.eyebrow').textContent = nova ? `Nova senha de ${nome}: envie ao parceiro` : 'Acesso criado: envie ao parceiro';
    $('p-wa').href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(txt)}`;
    $('p-copy').onclick = e => copy(txt, e.currentTarget, $('p-text'));
    $('p-send').hidden = false;
    $('p-send').scrollIntoView({behavior: 'smooth', block: 'center'});
  }

  /* Novo parceiro */
  const gerar = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint32Array(10)); return 'Vtc-' + [...r].map(n => a[n % a.length]).join(''); };
  $('p-gerar').addEventListener('click', () => { $('p-senha').value = gerar(); });
  $('p-senha').value = gerar();
  $('f-novo').addEventListener('submit', async ev => {
    ev.preventDefault();
    const nome = $('p-nome').value.trim(), email = $('p-email').value.trim().toLowerCase(), senha = $('p-senha').value;
    let whatsapp = zap($('p-zap').value); if (whatsapp.length <= 11) whatsapp = '55' + whatsapp;
    if (whatsapp.length < 12 || whatsapp.length > 13) { show($('p-msg'), 'Confira o WhatsApp: informe o DDD e o número.', 'error'); return; }
    if (senha.length < 8) { show($('p-msg'), 'A senha provisória precisa ter pelo menos 8 caracteres.', 'error'); return; }
    if (parceiros.some(p => p.email === email)) { show($('p-msg'), 'Já existe um parceiro com esse e-mail.', 'error'); return; }
    $('p-go').disabled = true; show($('p-msg'), ''); $('p-send').hidden = true;
    // Cria o login do parceiro sem trocar a sessão do administrador.
    const tmp = window.supabase.createClient(cfg.url, cfg.key, {auth: {storageKey: 'vp-signup-tmp', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
    const {data: su, error: e1} = await tmp.auth.signUp({email, password: senha, options: {data: {nome}}});
    const uid = su?.user?.id;
    if (e1 || !uid || (su.user.identities && su.user.identities.length === 0)) {
      $('p-go').disabled = false;
      show($('p-msg'), e1 && /already|registered/i.test(e1.message) || (su?.user?.identities?.length === 0)
        ? 'Esse e-mail já tem login. Se for um parceiro antigo, ele pode usar "Esqueci a senha" na Área do Parceiro.'
        : 'Não foi possível criar o login. Confira se o cadastro por e-mail está habilitado no Supabase.', 'error');
      return;
    }
    const {error: e2} = await db.from('parceiros').insert({user_id: uid, nome, email, whatsapp, imobiliaria: $('p-imob').value.trim() || null, creci: $('p-creci').value.trim() || null});
    if (!e2) await db.rpc('admin_ativar_login', {p_user: uid});
    $('p-go').disabled = false;
    if (e2) { show($('p-msg'), 'O login foi criado, mas não foi possível registrar o parceiro. Tente de novo.', 'error'); return; }
    sendBox(nome, email, senha, whatsapp, false);
    $('f-novo').querySelectorAll('input').forEach(i => { i.value = ''; }); $('p-senha').value = gerar();
    tab = 'par'; load();
  });

  route();
})();
