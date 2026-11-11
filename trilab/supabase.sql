-- Lena's TriLab – Datenbankschema (einmal im Supabase SQL-Editor ausführen).
-- Sicherheitsmodell: Row-Level-Security auf allem. Nutzer:innen sehen/ändern nur ihre eigenen Zeilen.
-- Lena (is_admin) darf zusätzlich Fragen lesen und beantworten. Öffentliche FAQ laufen über eine View ohne Autor.

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  goal         text not null default 'olympic' check (goal in ('sprint','olympic','half')),
  is_admin     boolean not null default false,
  tier         text not null default 'free' check (tier in ('free','supporter')),  -- Basis für spätere Bezahlstufe
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (display_name, goal) on public.profiles to authenticated;   -- is_admin / tier nur per Service-Role

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create policy profiles_admin_select on public.profiles for select using (public.is_admin());  -- Namen im Posteingang

-- Zeitstempel: updated_at = Client-Uhr (last-write-wins), synced_at = Server-Uhr (Cursor für den inkrementellen Pull)
create function public.touch_sync() returns trigger language plpgsql as $$
begin
  if new.updated_at > now() + interval '1 day' then new.updated_at := now(); end if;
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then return null; end if;  -- veralteter Schreibzugriff verliert
  new.synced_at := now(); return new;
end $$;

create table public.workouts (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null,
  sport      text not null check (sport in ('swim','bike','run','strength','mobility','brick','other')),
  dur_min    int  not null check (dur_min between 1 and 1440),
  dist_km    numeric(7,2) check (dist_km between 0 and 1000),
  rpe        smallint check (rpe between 1 and 10),
  note       text not null default '' check (char_length(note) <= 1000),
  source     text not null default 'manual' check (source in ('manual','plan','gpx','tcx','garmin')),
  plan_ref   text check (char_length(plan_ref) <= 40),
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  synced_at  timestamptz not null default now()
);
create index workouts_user_sync on public.workouts (user_id, synced_at);
create index workouts_user_date on public.workouts (user_id, date desc);
create trigger workouts_touch before insert or update on public.workouts for each row execute function public.touch_sync();

create table public.races (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  date       date not null,
  type       text not null check (type in ('sprint','olympic','half','full','other')),
  location   text not null default '' check (char_length(location) <= 80),
  goal_s     int check (goal_s between 0 and 172800), tot_s  int check (tot_s  between 0 and 172800),
  swim_s     int check (swim_s between 0 and 172800), t1_s   int check (t1_s   between 0 and 172800),
  bike_s     int check (bike_s between 0 and 172800), t2_s   int check (t2_s   between 0 and 172800),
  run_s      int check (run_s  between 0 and 172800),
  place      text not null default '' check (char_length(place) <= 40),
  note       text not null default '' check (char_length(note) <= 1000),
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  synced_at  timestamptz not null default now()
);
create index races_user_sync on public.races (user_id, synced_at);
create trigger races_touch before insert or update on public.races for each row execute function public.touch_sync();

alter table public.workouts enable row level security;
alter table public.races    enable row level security;
create policy workouts_own on public.workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy races_own    on public.races    for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ask Lena
create table public.questions (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text        text not null check (char_length(text) between 3 and 500),
  answer      text check (char_length(answer) <= 4000),
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  updated_at  timestamptz not null default now(),
  synced_at   timestamptz not null default now()
);
create index questions_user_sync on public.questions (user_id, synced_at);
create index questions_open on public.questions (created_at) where answer is null;

create function public.questions_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    if not public.is_admin() and (select count(*) from public.questions where user_id = new.user_id and created_at > now() - interval '1 day') >= 5
      then raise exception 'Maximal 5 Fragen pro Tag'; end if;
  end if;
  new.updated_at := now(); new.synced_at := now(); return new;
end $$;
create trigger questions_guard before insert or update on public.questions for each row execute function public.questions_guard();

alter table public.questions enable row level security;
create policy q_read   on public.questions for select using (user_id = auth.uid() or public.is_admin());
create policy q_insert on public.questions for insert with check (user_id = auth.uid() and answer is null and is_public = false);
create policy q_answer on public.questions for update using (public.is_admin()) with check (public.is_admin());

create view public.public_faq as
  select id, text, answer, answered_at from public.questions where is_public and answer is not null;   -- ohne Autor
grant select on public.public_faq to anon, authenticated;

-- Garmin (optional): Status der Verknüpfung. Tokens liegen NICHT hier, sondern nur serverseitig (Edge Function / Vault).
create table public.garmin_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  garmin_user_id text not null, connected_at timestamptz not null default now()
);
alter table public.garmin_links enable row level security;
create policy garmin_own_read on public.garmin_links for select using (user_id = auth.uid());

-- DSGVO: Konto + alle Daten löschen (Cascade)
create function public.delete_my_account() returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid() $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke all on public.workouts, public.races, public.questions, public.profiles, public.garmin_links from anon;
grant select, insert, update, delete on public.workouts, public.races to authenticated;
grant select, insert on public.questions to authenticated;  grant update (answer, is_public, answered_at) on public.questions to authenticated;
grant select on public.profiles, public.garmin_links to authenticated;

-- Lena zur Admin machen (E-Mail anpassen, nach ihrer ersten Anmeldung):
--   update public.profiles set is_admin = true where id = (select id from auth.users where email = 'lena@example.com');
