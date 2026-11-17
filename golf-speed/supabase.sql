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

-- ============================================================================
-- Härtung (2026-11-17): Versionsprüfung, Schutz vor Datenverlust, zentrale Sicherungen
-- ============================================================================
create table if not exists public.speedlab_history(
  id bigserial primary key, code text not null, data jsonb not null, saved_at timestamptz not null default now());
create index if not exists speedlab_history_code_idx on public.speedlab_history(code, saved_at desc);
alter table public.speedlab_history enable row level security;
revoke all on public.speedlab_history from anon, authenticated;

-- Zählt Einheiten, die im neuen Stand fehlen und nicht als gelöscht markiert sind
create or replace function public.speedlab_lost_sessions(p_old jsonb, p_new jsonb)
returns int language sql immutable set search_path = public as $$
  select count(*)::int from jsonb_array_elements(coalesce(p_old->'sessions','[]'::jsonb)) o
  where not exists (select 1 from jsonb_array_elements(coalesce(p_new->'sessions','[]'::jsonb)) n where n->>'id' = o->>'id')
    and not (coalesce(p_new->'deleted','{}'::jsonb) ? (o->>'id'));
$$;

-- Vorherigen Stand sichern, die letzten 30 je Code behalten
create or replace function public.speedlab_keep_history(p_code text, p_old jsonb)
returns void language sql security definer set search_path = public as $$
  insert into speedlab_history(code, data) values (p_code, p_old);
  delete from speedlab_history where code = p_code
     and id not in (select id from speedlab_history where code = p_code order by saved_at desc, id desc limit 30);
$$;

-- Laden mit Versionskennung
create or replace function public.speedlab_load(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('data', data, 'rev', updated_at::text) from speedlab where code = p_code and length(p_code) >= 24;
$$;

-- Speichern nur mit aktueller Version (sonst 'conflict'), nie mit Einheitenverlust
create or replace function public.speedlab_save(p_code text, p_data jsonb, p_rev text)
returns text language plpgsql security definer set search_path = public as $$
declare cur record; new_rev text;
begin
  if p_code is null or length(p_code) < 24 then raise exception 'code too short'; end if;
  if octet_length(p_data::text) > 5000000 then raise exception 'data too large'; end if;
  if jsonb_typeof(p_data->'sessions') is distinct from 'array' then raise exception 'invalid data'; end if;
  select data, updated_at into cur from speedlab where code = p_code for update;
  if found then
    if p_rev is distinct from cur.updated_at::text then raise exception 'conflict'; end if;  -- kein errcode 40001: PostgREST würde endlos wiederholen
    if speedlab_lost_sessions(cur.data, p_data) > 0 then raise exception 'would lose sessions'; end if;
    perform speedlab_keep_history(p_code, cur.data);
    update speedlab set data = p_data, updated_at = now() where code = p_code returning updated_at::text into new_rev;
  else
    insert into speedlab(code, data, updated_at) values (p_code, p_data, now()) returning updated_at::text into new_rev;
  end if;
  return new_rev;
end $$;

-- Alte App-Versionen (speedlab_put) erhalten denselben Schutz
create or replace function public.speedlab_put(p_code text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cur record;
begin
  if length(p_code) < 24 then raise exception 'code too short'; end if;
  if octet_length(p_data::text) > 5000000 then raise exception 'data too large'; end if;
  if jsonb_typeof(p_data->'sessions') is distinct from 'array' then raise exception 'invalid data'; end if;
  select data into cur from speedlab where code = p_code for update;
  if found then
    if speedlab_lost_sessions(cur.data, p_data) > 0 then raise exception 'would lose sessions'; end if;
    perform speedlab_keep_history(p_code, cur.data);
    update speedlab set data = p_data, updated_at = now() where code = p_code;
  else
    insert into speedlab(code, data, updated_at) values (p_code, p_data, now());
  end if;
end $$;

create or replace function public.speedlab_history_list(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'saved_at', saved_at,
           'sessions', jsonb_array_length(coalesce(data->'sessions','[]'::jsonb))) order by saved_at desc), '[]'::jsonb)
  from speedlab_history where code = p_code and length(p_code) >= 24;
$$;
create or replace function public.speedlab_history_get(p_code text, p_id bigint)
returns jsonb language sql security definer set search_path = public as $$
  select data from speedlab_history where code = p_code and id = p_id and length(p_code) >= 24;
$$;

revoke all on function public.speedlab_lost_sessions(jsonb, jsonb), public.speedlab_keep_history(text, jsonb) from public, anon, authenticated;
revoke all on function public.speedlab_get(text), public.speedlab_put(text, jsonb), public.speedlab_load(text),
  public.speedlab_save(text, jsonb, text), public.speedlab_history_list(text), public.speedlab_history_get(text, bigint) from public, authenticated;
grant execute on function public.speedlab_get(text), public.speedlab_put(text, jsonb), public.speedlab_load(text),
  public.speedlab_save(text, jsonb, text), public.speedlab_history_list(text), public.speedlab_history_get(text, bigint) to anon;
