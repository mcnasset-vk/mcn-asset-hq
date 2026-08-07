-- ===========================================================================
-- Micana Innovation Co-Living & HealthTech
-- ===========================================================================
-- Written for THIS database's access model, which differs from the one in
-- mcn-asset-hq's repo: there is no `cio` role and no profiles.module. The
-- division is the role (mdna | mec) and business_line is a sub-scope.
--
-- Micana joins as a role of its own, mirroring `mec`, with a null
-- business_line. The business_line CHECK already permits null for any role,
-- so only the role CHECK needs widening.
-- ===========================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['super_admin','mdna','mec','micana','pending']));

alter table public.documents drop constraint if exists documents_entity_type_check;
alter table public.documents add constraint documents_entity_type_check
  check (entity_type = any (array['factory','mdna','nasdaq','commissions','mec','micana']));

-- can_access has no micana arm, so without this every policy below would deny
-- a micana user. Mirrors the mec arm exactly: the role grants its own module
-- and nothing else. The mdna division arm deliberately does not reach micana.
create or replace function private.can_access(target_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_role() = 'super_admin'
    or (private.current_role() = 'mdna'
        and target_module in ('mdna','factory','nasdaq','commissions')
        and (private.current_line() is null or private.current_line() = target_module))
    or (private.current_role() = 'mec' and target_module = 'mec')
    or (private.current_role() = 'micana' and target_module = 'micana'),
    false);
$$;

-- Storage needs no change: the bucket policies pass the first path segment
-- through can_access, so micana/<id>/<file> is covered by the arm above.


-- ===========================================================================
-- SECTION 1 — TABLES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Bungalows: sourcing and renovation on one row.
--
-- A bungalow has exactly one sourcing lifecycle and exactly one renovation
-- project, so splitting them would buy a 1:1 join and nothing else. This is
-- the same shape as factory_deals: a stage, the dates that stage passed
-- through, and the amounts.
-- ---------------------------------------------------------------------------
create table if not exists public.micana_bungalows (
  id                     uuid primary key default gen_random_uuid(),

  -- Sourcing ---------------------------------------------------------------
  bungalow_name          text not null,
  address                text not null default '',
  owner_name             text not null,
  owner_phone            text not null default '',
  sourced_by             text not null default '',
  stage                  text not null default 'identified'
                           check (stage in ('identified','negotiating',
                                            'agreed','renovating','operating')),
  identified_at          date not null default current_date,
  negotiation_started_at date,
  agreed_at              date,
  -- Leaving the programme is a DATE, not a stage. Keeping it out of the stage
  -- ladder is what lets the sourcing funnel narrow monotonically.
  exited_at              date,

  -- Renovation -------------------------------------------------------------
  renovation_started_at  date,
  target_completion_at   date,
  actual_completion_at   date,
  renovation_budget      numeric(14,2) not null default 0
                           check (renovation_budget >= 0),
  renovation_actual      numeric(14,2) not null default 0
                           check (renovation_actual >= 0),
  -- Positive means overspent.
  renovation_variance    numeric(14,2)
                           generated always as (renovation_actual - renovation_budget) stored,
  contractor             text not null default '',

  -- Operating --------------------------------------------------------------
  room_count             integer not null default 0 check (room_count >= 0),
  operating_since        date,

  -- House policy: the defaults tenants and readings inherit ----------------
  owner_share_pct              numeric(5,2) not null default 30
                                 check (owner_share_pct >= 0 and owner_share_pct <= 100),
  default_aircon_allowance_kwh numeric(10,2) not null default 100
                                 check (default_aircon_allowance_kwh >= 0),
  default_aircon_rate_per_kwh  numeric(10,4) not null default 0.6000
                                 check (default_aircon_rate_per_kwh >= 0),

  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tenants: many per bungalow, one room each.
--
-- bungalow_name is denormalised and trigger-maintained. Commit 4e1a6c5 learnt
-- this the hard way on the commission ledger: a scoped user who cannot read
-- the parent table gets blank rows from an embedded join, and the CSV export
-- comes out empty.
-- ---------------------------------------------------------------------------
create table if not exists public.micana_tenants (
  id                   uuid primary key default gen_random_uuid(),
  bungalow_id          uuid not null
                         references public.micana_bungalows(id) on delete cascade,
  bungalow_name        text not null default '',
  tenant_name          text not null,
  phone                text not null default '',
  room_label           text not null,
  status               text not null default 'enquiry'
                         check (status in ('enquiry','reserved','occupied',
                                           'notice','moved_out')),
  monthly_rent         numeric(12,2) not null default 0 check (monthly_rent >= 0),
  deposit              numeric(12,2) not null default 0 check (deposit >= 0),
  -- null = inherit the bungalow's house allowance at reading time.
  aircon_allowance_kwh numeric(10,2) check (aircon_allowance_kwh >= 0),
  moved_in_at          date,
  moved_out_at         date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint micana_tenants_dates_ordered
    check (moved_out_at is null or moved_in_at is null or moved_out_at >= moved_in_at)
);

create index if not exists micana_tenants_bungalow_idx
  on public.micana_tenants (bungalow_id);

-- ---------------------------------------------------------------------------
-- Aircon readings: the IoT tie-in. One row per room per month.
--
-- allowance_kwh and rate_per_kwh are SNAPSHOTS taken when the reading lands.
-- Raising the house rate next year must not silently rewrite last year's
-- bills, so the rate that applied is stored on the reading itself.
--
-- The unique constraint makes device ingest idempotent: a device that retries
-- upserts its own row rather than double-billing the tenant.
-- ---------------------------------------------------------------------------
create table if not exists public.micana_aircon_readings (
  id            uuid primary key default gen_random_uuid(),
  bungalow_id   uuid not null
                  references public.micana_bungalows(id) on delete cascade,
  -- Nullable: a metered room can sit empty between tenancies.
  tenant_id     uuid references public.micana_tenants(id) on delete set null,
  bungalow_name text not null default '',
  tenant_name   text not null default '',
  room_label    text not null,
  period_month  date not null
                  check (period_month = date_trunc('month', period_month)::date),
  hours_run     numeric(10,2) not null default 0 check (hours_run >= 0),
  kwh_used      numeric(10,2) not null default 0 check (kwh_used >= 0),

  -- Trigger-filled snapshots. Never hand-entered.
  allowance_kwh numeric(10,2) not null default 0 check (allowance_kwh >= 0),
  rate_per_kwh  numeric(10,4) not null default 0 check (rate_per_kwh >= 0),

  billable_kwh  numeric(10,2)
                  generated always as (greatest(kwh_used - allowance_kwh, 0::numeric)) stored,
  -- The expression is repeated rather than referring to billable_kwh:
  -- PostgreSQL forbids a generated column referencing another generated column.
  billed_amount numeric(12,2)
                  generated always as
                    (round(greatest(kwh_used - allowance_kwh, 0::numeric) * rate_per_kwh, 2)) stored,

  source        text not null default 'manual' check (source in ('manual','iot')),
  device_id     text not null default '',
  recorded_at   timestamptz not null default now(),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint micana_aircon_one_per_room_month
    unique (bungalow_id, room_label, period_month)
);

create index if not exists micana_aircon_month_idx
  on public.micana_aircon_readings (period_month);
create index if not exists micana_aircon_bungalow_idx
  on public.micana_aircon_readings (bungalow_id);
create index if not exists micana_aircon_tenant_idx
  on public.micana_aircon_readings (tenant_id);

-- ---------------------------------------------------------------------------
-- Owner payouts: the profit-share ledger, one line per bungalow per month.
--
-- Unlike a commission, this has two genuine human inputs — gross_revenue and
-- opex — so insert stays open. What is closed is the DERIVATION: net_profit
-- and owner_amount are generated columns that reject writes outright, and
-- owner_share_pct and due_at are overwritten by the trigger. The split cannot
-- be typed in wrong, and a settled month cannot be quietly re-split.
--
-- A loss month pays the owner nothing and the loss stays with Micana. That is
-- the `greatest(..., 0)` below, and it is a real business rule — not a guard
-- against negative numbers.
-- ---------------------------------------------------------------------------
create table if not exists public.micana_owner_payouts (
  id              uuid primary key default gen_random_uuid(),
  bungalow_id     uuid not null
                    references public.micana_bungalows(id) on delete cascade,
  bungalow_name   text not null default '',
  owner_name      text not null default '',
  owner_phone     text not null default '',
  period_month    date not null
                    check (period_month = date_trunc('month', period_month)::date),

  gross_revenue   numeric(14,2) not null default 0 check (gross_revenue >= 0),
  opex            numeric(14,2) not null default 0 check (opex >= 0),
  owner_share_pct numeric(5,2)  not null default 0,   -- trigger snapshot

  net_profit      numeric(14,2)
                    generated always as (gross_revenue - opex) stored,
  owner_amount    numeric(14,2)
                    generated always as
                      (round(greatest(gross_revenue - opex, 0::numeric)
                             * owner_share_pct / 100, 2)) stored,

  status          text not null default 'accrued' check (status in ('accrued','paid')),
  due_at          date not null default current_date,   -- trigger overwrites
  paid_at         date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint micana_payout_one_per_bungalow_month
    unique (bungalow_id, period_month),
  constraint micana_payout_paid_has_date
    check ((status = 'paid'    and paid_at is not null)
        or (status = 'accrued' and paid_at is null))
);

create index if not exists micana_payout_month_idx
  on public.micana_owner_payouts (period_month);
create index if not exists micana_payout_status_idx
  on public.micana_owner_payouts (status);

-- ---------------------------------------------------------------------------
-- Device registry for the IoT ingest endpoint (app/api/iot/aircon).
--
-- Only the SHA-256 of each device key is stored, so a database leak does not
-- hand over working credentials. Drop this table and the function in Section 2
-- if readings will only ever be entered by hand.
-- ---------------------------------------------------------------------------
create table if not exists public.micana_devices (
  id          uuid primary key default gen_random_uuid(),
  device_id   text not null unique,
  key_hash    text not null,
  bungalow_id uuid not null references public.micana_bungalows(id) on delete cascade,
  room_label  text not null,
  label       text not null default '',
  active      boolean not null default true,
  last_seen_at timestamptz,
  created_at  timestamptz not null default now()
);


-- ===========================================================================
-- SECTION 2 — TRIGGERS
-- ===========================================================================
-- Every function here is micana_-prefixed so it cannot collide with the
-- helpers the earlier migrations put in `private`.

create schema if not exists private;

create or replace function private.micana_touch_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Fills the denormalised bungalow name on a tenancy.
create or replace function private.micana_fill_tenant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select b.bungalow_name into new.bungalow_name
  from public.micana_bungalows b where b.id = new.bungalow_id;
  return new;
end;
$$;

-- Fills the denormalised names, and snapshots the allowance and rate.
--
-- The two halves behave differently on purpose, and the difference matters:
--
--   Display names ALWAYS track the parent, so renaming a bungalow propagates
--   here rather than being reverted. An earlier version preserved old.name on
--   update to protect the snapshot, which silently undid the rename trigger
--   below — the names went stale and the CSV export disagreed with the app.
--
--   The money snapshot is taken ONCE, on insert or when the reading is
--   repointed at a different bungalow or tenant. Correcting a mistyped
--   kwh_used therefore re-bills at the rate that applied at the time, not
--   at today's.
create or replace function private.micana_fill_reading()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_bungalow_name    text;
  v_house_allowance  numeric;
  v_house_rate       numeric;
  v_tenant_name      text;
  v_tenant_allowance numeric;
begin
  select b.bungalow_name, b.default_aircon_allowance_kwh, b.default_aircon_rate_per_kwh
    into v_bungalow_name, v_house_allowance, v_house_rate
  from public.micana_bungalows b where b.id = new.bungalow_id;

  if new.tenant_id is not null then
    select t.tenant_name, t.aircon_allowance_kwh
      into v_tenant_name, v_tenant_allowance
    from public.micana_tenants t where t.id = new.tenant_id;
  end if;

  new.bungalow_name := coalesce(v_bungalow_name, '');
  new.tenant_name   := coalesce(v_tenant_name, '');

  if tg_op = 'UPDATE'
     and new.bungalow_id is not distinct from old.bungalow_id
     and new.tenant_id   is not distinct from old.tenant_id then
    new.allowance_kwh := old.allowance_kwh;
    new.rate_per_kwh  := old.rate_per_kwh;
  else
    new.rate_per_kwh := coalesce(v_house_rate, 0);
    -- A tenancy may carry its own contractual allowance; otherwise house policy.
    new.allowance_kwh := coalesce(v_tenant_allowance, v_house_allowance, 0);
  end if;

  return new;
end;
$$;

-- Fills the owner details onto a payout, snapshots the share, sets the due date.
--
-- Same split as the reading trigger above: the display fields track the parent
-- so a rename propagates, while the SHARE is snapshotted on insert and frozen.
-- Renegotiating a bungalow's split must never retroactively change what was
-- owed for a month that has already been ledgered.
create or replace function private.micana_fill_payout()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_bungalow_name text;
  v_owner_name    text;
  v_owner_phone   text;
  v_share         numeric;
begin
  select b.bungalow_name, b.owner_name, b.owner_phone, b.owner_share_pct
    into v_bungalow_name, v_owner_name, v_owner_phone, v_share
  from public.micana_bungalows b where b.id = new.bungalow_id;

  new.bungalow_name := coalesce(v_bungalow_name, '');
  new.owner_name    := coalesce(v_owner_name, '');
  new.owner_phone   := coalesce(v_owner_phone, '');

  if tg_op = 'INSERT' then
    new.owner_share_pct := coalesce(v_share, 0);
  else
    new.owner_share_pct := old.owner_share_pct;
  end if;

  -- Payable by the 15th of the month after the period being settled.
  new.due_at := (new.period_month + interval '1 month')::date + 14;

  -- Keep paid_at coherent with status so the CHECK cannot be tripped by a
  -- form that only sends one of the two.
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := current_date;
  elsif new.status = 'accrued' then
    new.paid_at := null;
  end if;

  return new;
end;
$$;

-- Renaming a bungalow, or its owner, propagates to every ledger that carries
-- a denormalised copy. Without this the copies drift and the CSV export lies.
create or replace function private.micana_propagate_rename()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.micana_tenants
     set bungalow_name = new.bungalow_name
   where bungalow_id = new.id and bungalow_name is distinct from new.bungalow_name;

  update public.micana_aircon_readings
     set bungalow_name = new.bungalow_name
   where bungalow_id = new.id and bungalow_name is distinct from new.bungalow_name;

  update public.micana_owner_payouts
     set bungalow_name = new.bungalow_name,
         owner_name    = new.owner_name,
         owner_phone   = new.owner_phone
   where bungalow_id = new.id
     and (bungalow_name is distinct from new.bungalow_name
       or owner_name    is distinct from new.owner_name
       or owner_phone   is distinct from new.owner_phone);

  return null;
end;
$$;

-- Renaming a tenant propagates to their readings.
create or replace function private.micana_propagate_tenant_rename()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.micana_aircon_readings
     set tenant_name = new.tenant_name
   where tenant_id = new.id and tenant_name is distinct from new.tenant_name;
  return null;
end;
$$;

drop trigger if exists micana_bungalows_touch on public.micana_bungalows;
create trigger micana_bungalows_touch before update on public.micana_bungalows
  for each row execute function private.micana_touch_updated_at();

drop trigger if exists micana_tenants_touch on public.micana_tenants;
create trigger micana_tenants_touch before update on public.micana_tenants
  for each row execute function private.micana_touch_updated_at();

drop trigger if exists micana_readings_touch on public.micana_aircon_readings;
create trigger micana_readings_touch before update on public.micana_aircon_readings
  for each row execute function private.micana_touch_updated_at();

drop trigger if exists micana_payouts_touch on public.micana_owner_payouts;
create trigger micana_payouts_touch before update on public.micana_owner_payouts
  for each row execute function private.micana_touch_updated_at();

drop trigger if exists micana_tenants_fill on public.micana_tenants;
create trigger micana_tenants_fill before insert or update on public.micana_tenants
  for each row execute function private.micana_fill_tenant();

drop trigger if exists micana_readings_fill on public.micana_aircon_readings;
create trigger micana_readings_fill
  before insert or update on public.micana_aircon_readings
  for each row execute function private.micana_fill_reading();

drop trigger if exists micana_payouts_fill on public.micana_owner_payouts;
create trigger micana_payouts_fill
  before insert or update on public.micana_owner_payouts
  for each row execute function private.micana_fill_payout();

drop trigger if exists micana_bungalows_rename on public.micana_bungalows;
create trigger micana_bungalows_rename
  after update of bungalow_name, owner_name, owner_phone on public.micana_bungalows
  for each row execute function private.micana_propagate_rename();

drop trigger if exists micana_tenants_rename on public.micana_tenants;
create trigger micana_tenants_rename
  after update of tenant_name on public.micana_tenants
  for each row execute function private.micana_propagate_tenant_rename();


-- ===========================================================================
-- SECTION 3 — ROW LEVEL SECURITY
-- ===========================================================================
-- Access helpers: none defined here.
--
-- private.can_access and private.is_super_admin already exist (see
-- 20260803134202_rls.sql and 20260804090000_mdna_division_scope.sql), and
-- every other module routes through them. Defining a micana-only pair would
-- fork the access rule in two, so the policies below call the shared ones.
-- A CIO scoped to 'micana' matches can_access's own-module branch already;
-- the mdna division arm deliberately does not cover micana.

-- No schema-level grant on `private` here: 20260803134202_rls.sql revokes it
-- from authenticated on purpose and hands out EXECUTE on the four helpers
-- individually. Re-granting usage would quietly widen that.

-- Table grants match what the other module tables get.
grant select, insert, update, delete
  on public.micana_bungalows,
     public.micana_tenants,
     public.micana_aircon_readings,
     public.micana_owner_payouts,
     public.micana_devices
  to authenticated;

alter table public.micana_bungalows        enable row level security;
alter table public.micana_tenants          enable row level security;
alter table public.micana_aircon_readings  enable row level security;
alter table public.micana_owner_payouts    enable row level security;
alter table public.micana_devices          enable row level security;

-- Bungalows -----------------------------------------------------------------
drop policy if exists micana_bungalows_select on public.micana_bungalows;
create policy micana_bungalows_select on public.micana_bungalows
  for select to authenticated using (private.can_access('micana'));

drop policy if exists micana_bungalows_insert on public.micana_bungalows;
create policy micana_bungalows_insert on public.micana_bungalows
  for insert to authenticated with check (private.can_access('micana'));

drop policy if exists micana_bungalows_update on public.micana_bungalows;
create policy micana_bungalows_update on public.micana_bungalows
  for update to authenticated
  using (private.can_access('micana')) with check (private.can_access('micana'));

-- Delete stays super-admin only across the module, matching commissions.
drop policy if exists micana_bungalows_delete on public.micana_bungalows;
create policy micana_bungalows_delete on public.micana_bungalows
  for delete to authenticated using (private.is_super_admin());

-- Tenants -------------------------------------------------------------------
drop policy if exists micana_tenants_select on public.micana_tenants;
create policy micana_tenants_select on public.micana_tenants
  for select to authenticated using (private.can_access('micana'));

drop policy if exists micana_tenants_insert on public.micana_tenants;
create policy micana_tenants_insert on public.micana_tenants
  for insert to authenticated with check (private.can_access('micana'));

drop policy if exists micana_tenants_update on public.micana_tenants;
create policy micana_tenants_update on public.micana_tenants
  for update to authenticated
  using (private.can_access('micana')) with check (private.can_access('micana'));

drop policy if exists micana_tenants_delete on public.micana_tenants;
create policy micana_tenants_delete on public.micana_tenants
  for delete to authenticated using (private.is_super_admin());

-- Aircon readings -----------------------------------------------------------
drop policy if exists micana_readings_select on public.micana_aircon_readings;
create policy micana_readings_select on public.micana_aircon_readings
  for select to authenticated using (private.can_access('micana'));

drop policy if exists micana_readings_insert on public.micana_aircon_readings;
create policy micana_readings_insert on public.micana_aircon_readings
  for insert to authenticated with check (private.can_access('micana'));

drop policy if exists micana_readings_update on public.micana_aircon_readings;
create policy micana_readings_update on public.micana_aircon_readings
  for update to authenticated
  using (private.can_access('micana')) with check (private.can_access('micana'));

drop policy if exists micana_readings_delete on public.micana_aircon_readings;
create policy micana_readings_delete on public.micana_aircon_readings
  for delete to authenticated using (private.is_super_admin());

-- Owner payouts -------------------------------------------------------------
drop policy if exists micana_payouts_select on public.micana_owner_payouts;
create policy micana_payouts_select on public.micana_owner_payouts
  for select to authenticated using (private.can_access('micana'));

drop policy if exists micana_payouts_insert on public.micana_owner_payouts;
create policy micana_payouts_insert on public.micana_owner_payouts
  for insert to authenticated with check (private.can_access('micana'));

drop policy if exists micana_payouts_update on public.micana_owner_payouts;
create policy micana_payouts_update on public.micana_owner_payouts
  for update to authenticated
  using (private.can_access('micana')) with check (private.can_access('micana'));

drop policy if exists micana_payouts_delete on public.micana_owner_payouts;
create policy micana_payouts_delete on public.micana_owner_payouts
  for delete to authenticated using (private.is_super_admin());

-- Devices — the key hashes are super-admin only. A Micana CIO manages
-- bungalows and tenants, not credentials.
drop policy if exists micana_devices_all on public.micana_devices;
create policy micana_devices_all on public.micana_devices
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());


-- ===========================================================================
-- SECTION 3b — IoT INGEST RPC  (skip if readings are entered by hand only)
-- ===========================================================================
-- app/api/iot/aircon posts here. The function authenticates the device
-- itself, which is why no service-role key ever has to enter the app: the
-- publishable key is enough, because the secret being checked is the device
-- key, not the caller's session.
--
-- Register a device with, e.g.:
--   insert into public.micana_devices (device_id, key_hash, bungalow_id, room_label)
--   values ('ac-01', encode(digest('<the-key>','sha256'),'hex'),
--           '<bungalow-uuid>', 'Room 1');
--
-- There is no rate limiting here. Keys must be long random values (32 bytes
-- of base64url or better) — see the README note.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.micana_record_aircon_reading(
  p_device_id    text,
  p_device_key   text,
  p_period_month date,
  p_hours_run    numeric,
  p_kwh_used     numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  v_tenant uuid;
  v_id     uuid;
begin
  select * into d
  from public.micana_devices
  where device_id = p_device_id and active
  limit 1;

  if d is null
     or d.key_hash is distinct from
        encode(extensions.digest(p_device_key, 'sha256'), 'hex') then
    -- Same error either way: do not reveal whether the device id exists.
    raise exception 'unauthorised device' using errcode = '28000';
  end if;

  if p_hours_run < 0 or p_kwh_used < 0 then
    raise exception 'readings cannot be negative' using errcode = '22023';
  end if;

  -- Attribute the reading to whoever is in that room for that month.
  select t.id into v_tenant
  from public.micana_tenants t
  where t.bungalow_id = d.bungalow_id
    and t.room_label  = d.room_label
    and t.status in ('occupied','notice')
  order by t.moved_in_at desc nulls last
  limit 1;

  insert into public.micana_aircon_readings as r
    (bungalow_id, tenant_id, room_label, period_month,
     hours_run, kwh_used, source, device_id, recorded_at)
  values
    (d.bungalow_id, v_tenant, d.room_label,
     date_trunc('month', p_period_month)::date,
     p_hours_run, p_kwh_used, 'iot', d.device_id, now())
  -- A device that retries updates its own row instead of double-billing.
  on conflict (bungalow_id, room_label, period_month) do update
    set hours_run   = excluded.hours_run,
        kwh_used    = excluded.kwh_used,
        tenant_id   = excluded.tenant_id,
        source      = 'iot',
        device_id   = excluded.device_id,
        recorded_at = now()
  returning r.id into v_id;

  update public.micana_devices set last_seen_at = now() where id = d.id;

  return v_id;
end;
$$;

-- The endpoint is unauthenticated at the HTTP layer, so `anon` must be able
-- to call this. The function's own device-key check is the boundary.
revoke all on function public.micana_record_aircon_reading(text, text, date, numeric, numeric) from public;
grant execute on function public.micana_record_aircon_reading(text, text, date, numeric, numeric)
  to anon, authenticated;
