
create table public.central_analytics_events (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 visitor_key uuid not null,
 event_name text not null check(event_name in ('Visita','Secao aberta','Condicao consultada','Pedido de tabelas e espelhos','Clique no WhatsApp','Projeto consultado','Material consultado','Materiais externos','Cadastro de parceiro','Mapa consultado','Video iniciado')),
 project_name text check(length(project_name)<=100),
 material text check(length(material)<=100),
 action_name text check(length(action_name)<=40),
 device text not null check(device in ('Celular','Tablet','Computador')),
 referrer_host text check(length(referrer_host)<=100 and referrer_host !~ '[/@?\\#]'),
 source text check(length(source)<=50),
 is_test boolean not null default false
);
alter table public.central_analytics_events enable row level security;
revoke all on public.central_analytics_events from anon, authenticated;
grant insert (id,visitor_key,event_name,project_name,material,action_name,device,referrer_host,source) on public.central_analytics_events to anon, authenticated;
grant select on public.central_analytics_events to authenticated;
create policy central_ingest on public.central_analytics_events for insert to anon, authenticated with check (
 created_at between now()-interval '1 minute' and now()+interval '1 minute' and is_test=false
);
create policy central_owner_read on public.central_analytics_events for select to authenticated using ((select auth.uid())='e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid);
create index central_analytics_created_idx on public.central_analytics_events (created_at desc);
create function public.central_dashboard(p_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare report jsonb;
begin
 if auth.uid() is distinct from 'e6a450e9-32b0-4a67-80a8-e2c32c24e627'::uuid then
  raise exception 'Acesso administrativo não autorizado' using errcode='42501';
 end if;
 if p_days not in (1,7,30,90) then raise exception 'Período inválido'; end if;
 with events as (
 select * from public.central_analytics_events where not is_test and created_at >= (date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') - make_interval(days=>p_days-1)
 ), daily as (
 select (created_at at time zone 'America/Sao_Paulo')::date as day, count(*) filter(where event_name='Visita') as visits from events group by 1
 ), projects as (
 select project_name as name,count(*) as total from events where project_name is not null and event_name in ('Projeto consultado','Condicao consultada') group by 1 order by 2 desc limit 10
 ), materials as (
 select material as name,count(*) as total from events where material is not null and event_name='Material consultado' group by 1 order by 2 desc limit 10
 ), actions as (
 select event_name as name,count(*) as total from events where event_name<>'Visita' group by 1 order by 2 desc
 ), devices as (
 select device as name,count(*) as total from events where event_name='Visita' group by 1 order by 2 desc
 ), sources as (
 select coalesce(source,nullif(referrer_host,''),'Direto / não informado') as name,count(*) as total from events where event_name='Visita' group by 1 order by 2 desc limit 10
 )
 select jsonb_build_object(
 'days',p_days,'updatedAt',now(),
 'visits',(select count(*) from events where event_name='Visita'),
 'visitors',(select count(distinct visitor_key) from events where event_name='Visita'),
 'whatsapp',(select count(*) from events where event_name in ('Clique no WhatsApp','Pedido de tabelas e espelhos')),
 'requests',(select count(*) from events where event_name='Pedido de tabelas e espelhos'),
 'materialsCount',(select count(*) from events where event_name='Material consultado'),
 'daily',coalesce((select jsonb_agg(jsonb_build_object('day',d::date,'visits',coalesce(daily.visits,0)) order by d) from generate_series((now() at time zone 'America/Sao_Paulo')::date-(p_days-1),(now() at time zone 'America/Sao_Paulo')::date,interval '1 day') d left join daily on daily.day=d::date),'[]'::jsonb),
 'projects',coalesce((select jsonb_agg(to_jsonb(projects)) from projects),'[]'::jsonb),
 'materials',coalesce((select jsonb_agg(to_jsonb(materials)) from materials),'[]'::jsonb),
 'actions',coalesce((select jsonb_agg(to_jsonb(actions)) from actions),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(to_jsonb(devices)) from devices),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(sources)) from sources),'[]'::jsonb)
 ) into report;
 return report;
end;
$$;
revoke all on function public.central_dashboard(integer) from public,anon;
grant execute on function public.central_dashboard(integer) to authenticated;

