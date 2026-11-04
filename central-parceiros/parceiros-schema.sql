-- Área do parceiro e páginas enviadas aos clientes.
-- Já aplicado no projeto reconecta-vitacon (migrações area_do_parceiro e area_do_parceiro_admin_acesso).
-- O administrador (Luigi) é o mesmo usuário do painel de analytics.

create table if not exists public.parceiros (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nome text not null check (length(nome) between 2 and 100),
 email text not null check (length(email) <= 160),
 creci text check (length(creci) <= 30),
 imobiliaria text check (length(imobiliaria) <= 100),
 whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
 ativo boolean not null default true,
 trocar_senha boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.parceiros enable row level security;
revoke all on public.parceiros from anon, authenticated;
grant select, insert, update, delete on public.parceiros to authenticated;

drop policy if exists parceiros_admin on public.parceiros;
create policy parceiros_admin on public.parceiros for all to authenticated
 using ((select auth.uid()) = 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid)
 with check ((select auth.uid()) = 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid);
drop policy if exists parceiros_self_read on public.parceiros;
create policy parceiros_self_read on public.parceiros for select to authenticated
 using (user_id = (select auth.uid()));

create table if not exists public.paginas_cliente (
 id text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
 parceiro_id uuid not null references public.parceiros(user_id) on delete cascade,
 cliente_nome text not null check (length(cliente_nome) between 1 and 80),
 mensagem text check (length(mensagem) <= 600),
 itens text[] not null check (array_length(itens, 1) between 1 and 6),
 mes text check (length(mes) <= 30),
 created_at timestamptz not null default now(),
 visualizacoes integer not null default 0,
 ultima_visualizacao timestamptz
);
create index if not exists paginas_cliente_parceiro_idx on public.paginas_cliente (parceiro_id, created_at desc);
alter table public.paginas_cliente enable row level security;
revoke all on public.paginas_cliente from anon, authenticated;
grant select, delete on public.paginas_cliente to authenticated;
grant insert (parceiro_id, cliente_nome, mensagem, itens, mes) on public.paginas_cliente to authenticated;

drop policy if exists paginas_insert on public.paginas_cliente;
create policy paginas_insert on public.paginas_cliente for insert to authenticated
 with check (parceiro_id = (select auth.uid())
   and exists (select 1 from public.parceiros p where p.user_id = (select auth.uid()) and p.ativo));
drop policy if exists paginas_read on public.paginas_cliente;
create policy paginas_read on public.paginas_cliente for select to authenticated
 using (parceiro_id = (select auth.uid()) or (select auth.uid()) = 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid);
drop policy if exists paginas_delete on public.paginas_cliente;
create policy paginas_delete on public.paginas_cliente for delete to authenticated
 using (parceiro_id = (select auth.uid()) or (select auth.uid()) = 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid);

-- Página pública do cliente: devolve só o que o cliente pode ver e conta a visualização.
create or replace function public.pagina_cliente(p_id text, p_contar boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
 if p_id !~ '^[0-9a-f]{10}$' then return null; end if;
 if p_contar then
  update public.paginas_cliente set visualizacoes = visualizacoes + 1, ultima_visualizacao = now() where id = p_id;
 end if;
 select jsonb_build_object(
   'cliente', pc.cliente_nome, 'mensagem', pc.mensagem, 'itens', to_jsonb(pc.itens), 'mes', pc.mes, 'criadaEm', pc.created_at,
   'corretor', jsonb_build_object('nome', p.nome, 'creci', p.creci, 'imobiliaria', p.imobiliaria, 'whatsapp', p.whatsapp))
 into r
 from public.paginas_cliente pc join public.parceiros p on p.user_id = pc.parceiro_id
 where pc.id = p_id and p.ativo;
 return r;
end;
$$;
revoke all on function public.pagina_cliente(text, boolean) from public;
grant execute on function public.pagina_cliente(text, boolean) to anon, authenticated;

-- O parceiro marca que já trocou a senha provisória.
create or replace function public.parceiro_senha_trocada()
returns void language sql security definer set search_path = '' as $$
 update public.parceiros set trocar_senha = false where user_id = (select auth.uid());
$$;
revoke all on function public.parceiro_senha_trocada() from public, anon;
grant execute on function public.parceiro_senha_trocada() to authenticated;

-- Só o administrador: confirma o e-mail do login recém-criado do parceiro (dispensa o e-mail de confirmação).
create or replace function public.admin_ativar_login(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if (select auth.uid()) is distinct from 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid then
  raise exception 'Acesso administrativo não autorizado' using errcode = '42501';
 end if;
 update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_user;
end;
$$;
revoke all on function public.admin_ativar_login(uuid) from public, anon;
grant execute on function public.admin_ativar_login(uuid) to authenticated;

-- Só o administrador: define uma nova senha provisória para um parceiro (ele troca no próximo login).
create or replace function public.admin_nova_senha(p_user uuid, p_senha text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if (select auth.uid()) is distinct from 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid then
  raise exception 'Acesso administrativo não autorizado' using errcode = '42501';
 end if;
 if length(coalesce(p_senha, '')) < 8 then raise exception 'Senha muito curta'; end if;
 if not exists (select 1 from public.parceiros where user_id = p_user) then raise exception 'Parceiro não encontrado'; end if;
 update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
   email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = p_user;
 update public.parceiros set trocar_senha = true where user_id = p_user;
end;
$$;
revoke all on function public.admin_nova_senha(uuid, text) from public, anon;
grant execute on function public.admin_nova_senha(uuid, text) to authenticated;
