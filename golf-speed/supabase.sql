-- Speed Lab: zentraler Speicher (einmal im Supabase SQL-Editor ausführen)
-- Der Zugriff läuft ausschließlich über zwei Funktionen und einen langen geheimen Sync-Code.
create table if not exists public.speedlab (
  code text primary key check (length(code) >= 24),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.speedlab enable row level security;      -- keine Policies = kein Direktzugriff
revoke all on public.speedlab from anon, authenticated;

create or replace function public.speedlab_get(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select data from public.speedlab where code = p_code;
$$;

create or replace function public.speedlab_put(p_code text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(p_code) < 24 then raise exception 'code too short'; end if;
  if octet_length(p_data::text) > 5000000 then raise exception 'data too large'; end if;
  insert into public.speedlab(code, data, updated_at) values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now();
end $$;

revoke all on function public.speedlab_get(text), public.speedlab_put(text, jsonb) from public;
grant execute on function public.speedlab_get(text), public.speedlab_put(text, jsonb) to anon;
