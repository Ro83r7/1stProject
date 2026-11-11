-- Lena's TriLab – Bezahlung (Stufe 2). Nach supabase.sql ausführen.
-- Schreibzugriff auf orders nur durch die Edge Functions (Service-Role). Die App darf nur lesen.

create table public.products (
  id text primary key check (char_length(id) <= 40),
  name text not null,
  kind text not null check (kind in ('service','digital','support')),
  amount_cents int not null check (amount_cents between 50 and 10000),   -- 0,50 € … 100 €
  active boolean not null default true,
  once boolean not null default false                                     -- nur einmal kaufbar (z. B. Garmin-Anbindung)
);
alter table public.products enable row level security;
create policy products_read on public.products for select using (active);
grant select on public.products to anon, authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,   -- bei Konto-Löschung anonymisieren, Beleg bleibt (Aufbewahrungspflicht)
  product_id text not null references public.products(id),
  qty int not null default 1 check (qty = 1),
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','refunded','canceled')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_user on public.orders (user_id, created_at desc);
alter table public.orders enable row level security;
create policy orders_read on public.orders for select using (user_id = auth.uid() or public.is_admin());
grant select on public.orders to authenticated;

-- Freischaltungen (z. B. Garmin-Anbindung) für die App
create view public.my_entitlements with (security_invoker = true) as
  select distinct product_id from public.orders where user_id = auth.uid() and status in ('paid','fulfilled');
grant select on public.my_entitlements to authenticated;

insert into public.products (id, name, kind, amount_cents, once) values
  ('plan-personal','Persönlicher Trainingsplan','service',4900,false),
  ('plan-3m','Coaching-Paket 3 Monate','service',9900,false),
  ('consult-30','Beratungsgespräch 30 min','service',3900,false),
  ('ask-express','Ask Lena Express','service',490,false),
  ('garmin-setup','Garmin-Anbindung','digital',1900,true),
  ('coffee','Kaffee für Lena','support',300,false);
