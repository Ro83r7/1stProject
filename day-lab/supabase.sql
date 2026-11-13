-- Day Lab: zentraler Speicher (Projekt "speed-lab"). Zugriff nur über RPC mit langem geheimem Sync-Code.
create table if not exists public.daylab (
  code text primary key check (length(code) >= 24),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
-- Kalender-Zwischenspeicher: wird NUR serverseitig befüllt (Edge Function / service role), App liest nur.
create table if not exists public.daylab_cal (
  code text primary key check (length(code) >= 24),
  events jsonb not null default '[]',
  fetched_at timestamptz not null default now()
);
alter table public.daylab enable row level security;
alter table public.daylab_cal enable row level security;
revoke all on public.daylab, public.daylab_cal from anon, authenticated;

create or replace function public.daylab_get(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select data from public.daylab where code = p_code;
$$;
create or replace function public.daylab_put(p_code text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(p_code) < 24 then raise exception 'code too short'; end if;
  if octet_length(p_data::text) > 2000000 then raise exception 'data too large'; end if;
  insert into public.daylab(code, data, updated_at) values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now();
end $$;
create or replace function public.daylab_cal_get(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('events', events, 'fetched_at', fetched_at) from public.daylab_cal where code = p_code;
$$;
revoke all on function public.daylab_get(text), public.daylab_put(text, jsonb), public.daylab_cal_get(text) from public;
grant execute on function public.daylab_get(text), public.daylab_put(text, jsonb), public.daylab_cal_get(text) to anon;
