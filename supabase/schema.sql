-- HISAAB — cross-device sync schema
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- Design notes
--  * One row set per shop. A shop is identified by an unguessable uuid which
--    acts as the sync key: whoever holds the link holds the ledger.
--  * The tables are NOT reachable from the browser. Row level security is on
--    and no policy grants anon anything, so a direct REST call returns nothing.
--    All access goes through the three security-definer functions below, each
--    of which requires the shop uuid. That is what stops the publishable key,
--    which ships in the page, from being able to list other people's shops.
--  * Sync is snapshot based and last-write-wins, which matches the product
--    decision recorded in docs/12: it is for one shopkeeper's own devices, not
--    for two people editing at once.

create extension if not exists pgcrypto;

create table if not exists public.hisaab_shops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'My Shop',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.hisaab_customers (
  shop_id     uuid not null references public.hisaab_shops(id) on delete cascade,
  id          text not null,
  phone       text not null,
  name        text not null,
  notes       text not null default '',
  seq         integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (shop_id, id)
);

create table if not exists public.hisaab_entries (
  shop_id       uuid not null references public.hisaab_shops(id) on delete cascade,
  id            text not null,
  customer_id   text not null,
  type          text not null check (type in ('credit', 'payment')),
  kind          text,
  amount_paise  bigint not null check (amount_paise > 0),
  date          date not null,
  note          text not null default '',
  status        text not null default 'active' check (status in ('active', 'cancelled')),
  cancel_reason text,
  source        text,
  import_key    text,
  created_at    timestamptz not null default now(),
  primary key (shop_id, id)
);

create index if not exists hisaab_entries_shop_customer on public.hisaab_entries (shop_id, customer_id);

-- Lock the tables. No policies are created, so RLS denies everything to anon.
alter table public.hisaab_shops     enable row level security;
alter table public.hisaab_customers enable row level security;
alter table public.hisaab_entries   enable row level security;

revoke all on public.hisaab_shops     from anon, authenticated;
revoke all on public.hisaab_customers from anon, authenticated;
revoke all on public.hisaab_entries   from anon, authenticated;

-- Creates a shop and returns its uuid, which becomes the sync key.
create or replace function public.hisaab_create_shop(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.hisaab_shops (name)
  values (coalesce(nullif(btrim(p_name), ''), 'My Shop'))
  returning id into v_id;
  return v_id;
end;
$$;

-- Returns the whole ledger for one shop, or null when the uuid is unknown.
create or replace function public.hisaab_pull(p_shop uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shop public.hisaab_shops%rowtype;
begin
  select * into v_shop from public.hisaab_shops where id = p_shop;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'shop', jsonb_build_object('id', v_shop.id, 'name', v_shop.name, 'updatedAt', v_shop.updated_at),
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'phone', c.phone, 'name', c.name, 'notes', c.notes,
        'seq', c.seq, 'createdAt', c.created_at
      ) order by c.seq)
      from public.hisaab_customers c where c.shop_id = p_shop
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'customerId', e.customer_id, 'type', e.type, 'kind', e.kind,
        'amountPaise', e.amount_paise, 'date', e.date, 'note', e.note,
        'status', e.status, 'cancelReason', e.cancel_reason,
        'source', e.source, 'importKey', e.import_key, 'createdAt', e.created_at
      ) order by e.created_at)
      from public.hisaab_entries e where e.shop_id = p_shop
    ), '[]'::jsonb)
  );
end;
$$;

-- Replaces a shop's ledger with the snapshot given. Runs in one transaction,
-- so a failure part way leaves the stored ledger exactly as it was.
create or replace function public.hisaab_push(
  p_shop uuid,
  p_name text,
  p_customers jsonb,
  p_entries jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  if not exists (select 1 from public.hisaab_shops where id = p_shop) then
    raise exception 'unknown shop';
  end if;

  update public.hisaab_shops
     set name = coalesce(nullif(btrim(p_name), ''), name), updated_at = v_now
   where id = p_shop;

  delete from public.hisaab_entries   where shop_id = p_shop;
  delete from public.hisaab_customers where shop_id = p_shop;

  insert into public.hisaab_customers (shop_id, id, phone, name, notes, seq, created_at)
  select p_shop,
         c->>'id',
         c->>'phone',
         c->>'name',
         coalesce(c->>'notes', ''),
         coalesce((c->>'seq')::int, 0),
         coalesce((c->>'createdAt')::timestamptz, v_now)
    from jsonb_array_elements(coalesce(p_customers, '[]'::jsonb)) as c;

  insert into public.hisaab_entries (
    shop_id, id, customer_id, type, kind, amount_paise, date, note,
    status, cancel_reason, source, import_key, created_at
  )
  select p_shop,
         e->>'id',
         e->>'customerId',
         e->>'type',
         nullif(e->>'kind', ''),
         (e->>'amountPaise')::bigint,
         (e->>'date')::date,
         coalesce(e->>'note', ''),
         coalesce(e->>'status', 'active'),
         nullif(e->>'cancelReason', ''),
         nullif(e->>'source', ''),
         nullif(e->>'importKey', ''),
         coalesce((e->>'createdAt')::timestamptz, v_now)
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) as e;

  return v_now;
end;
$$;

-- The browser may call only these three, and each needs the shop uuid.
grant execute on function public.hisaab_create_shop(text) to anon, authenticated;
grant execute on function public.hisaab_pull(uuid)        to anon, authenticated;
grant execute on function public.hisaab_push(uuid, text, jsonb, jsonb) to anon, authenticated;
