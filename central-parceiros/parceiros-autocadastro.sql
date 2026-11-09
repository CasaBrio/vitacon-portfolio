-- Autocadastro do parceiro na Área do Parceiro (sem senha provisória enviada pelo Luigi).
-- Já aplicado no projeto reconecta-vitacon (migração area_do_parceiro_autocadastro).
-- O corretor cria o login com a própria senha e entra na hora. O Luigi vê os cadastros novos
-- marcados "a conferir" no painel /admin/parceiros/ e cruza com o Vitacon Partners.

alter table public.parceiros
 add column if not exists origem text not null default 'luigi' check (origem in ('luigi', 'cadastro')),
 add column if not exists conferido boolean not null default true,
 add column if not exists vitacon_partners boolean;

create or replace function public.parceiro_autocadastro(
 p_email text, p_senha text, p_nome text, p_whatsapp text,
 p_imobiliaria text default null, p_creci text default null, p_vitacon_partners boolean default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
 v_email text := lower(trim(coalesce(p_email, '')));
 v_nome text := trim(coalesce(p_nome, ''));
 v_zap text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
 v_imob text := nullif(trim(coalesce(p_imobiliaria, '')), '');
 v_creci text := nullif(trim(coalesce(p_creci, '')), '');
 v_id uuid := gen_random_uuid();
begin
 if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 160 then raise exception 'email_invalido'; end if;
 if length(coalesce(p_senha, '')) < 8 or length(p_senha) > 72 then raise exception 'senha_curta'; end if;
 if length(v_nome) not between 2 and 100 then raise exception 'nome_invalido'; end if;
 if length(v_zap) between 10 and 11 then v_zap := '55' || v_zap; end if;
 if v_zap !~ '^[0-9]{12,13}$' then raise exception 'whatsapp_invalido'; end if;
 if length(coalesce(v_imob, '')) > 100 or length(coalesce(v_creci, '')) > 30 then raise exception 'dados_longos'; end if;

 -- Freio contra cadastros em massa.
 if (select count(*) from public.parceiros where origem = 'cadastro' and created_at > now() - interval '10 minutes') >= 20 then
  raise exception 'muitos_cadastros';
 end if;

 if exists (select 1 from auth.users where lower(email) = v_email) then return 'email_existente'; end if;

 insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
   reauthentication_token, phone_change, phone_change_token)
 values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
   extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   jsonb_build_object('sub', v_id::text, 'nome', v_nome, 'email', v_email, 'email_verified', true, 'phone_verified', false),
   now(), now(), '', '', '', '', '', '', '', '');

 insert into auth.identities (user_id, provider_id, provider, identity_data, created_at, updated_at)
 values (v_id, v_id::text, 'email',
   jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false), now(), now());

 insert into public.parceiros (user_id, nome, email, whatsapp, imobiliaria, creci, ativo, trocar_senha, origem, conferido, vitacon_partners)
 values (v_id, v_nome, v_email, v_zap, v_imob, v_creci, true, false, 'cadastro', false, p_vitacon_partners);

 return 'ok';
end;
$$;
revoke all on function public.parceiro_autocadastro(text, text, text, text, text, text, boolean) from public;
grant execute on function public.parceiro_autocadastro(text, text, text, text, text, text, boolean) to anon, authenticated;
