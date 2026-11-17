-- HISAAB — cross-device sync schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It is safe to run again: nothing is dropped that holds data.
--
-- Design notes
--  * The tables live in their own schema, hisaab_cust_schema, not in public.
--  * That schema is deliberately NOT exposed to the REST API. The three
--    functions below sit in public (which is exposed) and are security
--    definer, so the browser can call them but cannot touch a table directly.
--    This also means no change is needed under Settings -> API -> Exposed
--    schemas: it works as soon as this file has run.
--  * One row set per shop. A shop is an unguessable uuid which acts as the
--    sync key: whoever holds the link holds the ledger. There are no accounts
--    yet, and docs/12 records that as a known limitation.
--  * Sync is snapshot based and last-write-wins, which matches the product
--    decision: it is for one shopkeeper's own devices, not for two people
--    editing the same customer at once.

create extension if not exists pgcrypto;

create schema if not exists hisaab_cust_schema;

-- The browser must never reach the tables directly.
revoke all on schema hisaab_cust_schema from anon, authenticated;
grant usage on schema hisaab_cust_schema to postgres;

create table if not exists hisaab_cust_schema.shops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'My Shop',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists hisaab_cust_schema.customers (
  shop_id     uuid not null references hisaab_cust_schema.shops(id) on delete cascade,
  id          text not null,
  phone       text not null,
  name        text not null,
  notes       text not null default '',
  seq         integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (shop_id, id)
);

create table if not exists hisaab_cust_schema.entries (
  shop_id       uuid not null references hisaab_cust_schema.shops(id) on delete cascade,
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

create index if not exists entries_shop_customer
  on hisaab_cust_schema.entries (shop_id, customer_id);

-- Belt and braces: RLS on, and no policy, so even a direct connection with the
-- anon role is refused.
alter table hisaab_cust_schema.shops     enable row level security;
alter table hisaab_cust_schema.customers enable row level security;
alter table hisaab_cust_schema.entries   enable row level security;

revoke all on all tables in schema hisaab_cust_schema from anon, authenticated;

-- Creates a shop and returns its uuid, which becomes the sync key.
create or replace function public.hisaab_create_shop(p_name text)
returns uuid
language plpgsql
security definer
set search_path = hisaab_cust_schema, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into hisaab_cust_schema.shops (name)
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
set search_path = hisaab_cust_schema, pg_temp
as $$
declare
  v_shop hisaab_cust_schema.shops%rowtype;
begin
  select * into v_shop from hisaab_cust_schema.shops where id = p_shop;
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
      from hisaab_cust_schema.customers c where c.shop_id = p_shop
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'customerId', e.customer_id, 'type', e.type, 'kind', e.kind,
        'amountPaise', e.amount_paise, 'date', e.date, 'note', e.note,
        'status', e.status, 'cancelReason', e.cancel_reason,
        'source', e.source, 'importKey', e.import_key, 'createdAt', e.created_at
      ) order by e.created_at)
      from hisaab_cust_schema.entries e where e.shop_id = p_shop
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
set search_path = hisaab_cust_schema, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  if not exists (select 1 from hisaab_cust_schema.shops where id = p_shop) then
    raise exception 'unknown shop';
  end if;

  update hisaab_cust_schema.shops
     set name = coalesce(nullif(btrim(p_name), ''), name), updated_at = v_now
   where id = p_shop;

  delete from hisaab_cust_schema.entries   where shop_id = p_shop;
  delete from hisaab_cust_schema.customers where shop_id = p_shop;

  insert into hisaab_cust_schema.customers (shop_id, id, phone, name, notes, seq, created_at)
  select p_shop,
         c->>'id',
         c->>'phone',
         c->>'name',
         coalesce(c->>'notes', ''),
         coalesce((c->>'seq')::int, 0),
         coalesce((c->>'createdAt')::timestamptz, v_now)
    from jsonb_array_elements(coalesce(p_customers, '[]'::jsonb)) as c;

  insert into hisaab_cust_schema.entries (
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

-- An earlier version of this file put the tables in public. Clear those away,
-- but only if they are empty, so a ledger that is already stored is never lost.
do $$
begin
  if to_regclass('public.hisaab_shops') is not null
     and not exists (select 1 from public.hisaab_shops)
  then
    drop table if exists public.hisaab_entries cascade;
    drop table if exists public.hisaab_customers cascade;
    drop table if exists public.hisaab_shops cascade;
    raise notice 'Removed the empty tables left in public by the earlier version.';
  end if;
end
$$;

-- Confirms the setup. Expect three rows.
select routine_name, 'ready' as status
  from information_schema.routines
 where routine_schema = 'public'
   and routine_name in ('hisaab_create_shop', 'hisaab_pull', 'hisaab_push')
 order by routine_name;
