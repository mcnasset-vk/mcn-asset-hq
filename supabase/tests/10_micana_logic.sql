\set ON_ERROR_STOP on
\pset format aligned

-- ===========================================================================
-- Fixtures
-- ===========================================================================
insert into public.micana_bungalows
  (id, bungalow_name, owner_name, owner_phone, stage, room_count,
   renovation_budget, renovation_actual, target_completion_at,
   owner_share_pct, default_aircon_allowance_kwh, default_aircon_rate_per_kwh)
values
  ('11111111-1111-1111-1111-111111111111', 'Bungalow A', 'Encik Rahman',
   '012-345 6789', 'operating', 5, 180000, 195000, '2026-06-30', 30, 100, 0.6000),
  ('22222222-2222-2222-2222-222222222222', 'Bungalow B', 'Puan Siti',
   '019-888 1234', 'renovating', 4, 180000, 186000, '2026-12-31', 30, 100, 0.6000);

insert into public.micana_tenants (id, bungalow_id, tenant_name, phone, room_label, status, monthly_rent)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111', 'Lim Wei', '011-222 3333', 'Room 1', 'occupied', 1200);

\echo '=== 1. Renovation variance (generated) — expect 15000 and 6000 ==='
select bungalow_name, renovation_variance from public.micana_bungalows order by bungalow_name;

\echo '=== 2. Tenant denormalised bungalow_name — expect "Bungalow A" ==='
select tenant_name, bungalow_name from public.micana_tenants;

-- ===========================================================================
-- Aircon
-- ===========================================================================
insert into public.micana_aircon_readings
  (bungalow_id, tenant_id, room_label, period_month, hours_run, kwh_used)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Room 1', '2026-06-01', 128.5, 140),
  ('11111111-1111-1111-1111-111111111111', null,
   'Room 2', '2026-06-01', 60, 80);

\echo '=== 3. Aircon billing — expect Room 1: 40 billable / 24.00 billed; Room 2: 0 / 0.00 ==='
select room_label, kwh_used, allowance_kwh, rate_per_kwh, billable_kwh, billed_amount,
       tenant_name, bungalow_name
from public.micana_aircon_readings order by room_label;

\echo '=== 4. Snapshot immutability: raise the house rate to 0.90, old bill must NOT move ==='
update public.micana_bungalows set default_aircon_rate_per_kwh = 0.9000
where id = '11111111-1111-1111-1111-111111111111';
select room_label, rate_per_kwh, billed_amount from public.micana_aircon_readings
where room_label = 'Room 1';

\echo '=== 5. Correcting kWh re-bills at the ORIGINAL rate — 150 kWh at 0.60 = 30.00, not 45.00 ==='
update public.micana_aircon_readings set kwh_used = 150 where room_label = 'Room 1';
select room_label, kwh_used, rate_per_kwh, billable_kwh, billed_amount
from public.micana_aircon_readings where room_label = 'Room 1';

\echo '=== 6. A NEW reading picks up the new 0.90 rate ==='
insert into public.micana_aircon_readings (bungalow_id, room_label, period_month, hours_run, kwh_used)
values ('11111111-1111-1111-1111-111111111111', 'Room 3', '2026-07-01', 100, 140);
select room_label, rate_per_kwh, billable_kwh, billed_amount
from public.micana_aircon_readings where room_label = 'Room 3';

-- ===========================================================================
-- Owner payouts
-- ===========================================================================
insert into public.micana_owner_payouts (bungalow_id, period_month, gross_revenue, opex)
values
  ('11111111-1111-1111-1111-111111111111', '2026-06-01', 12000, 4500),
  ('11111111-1111-1111-1111-111111111111', '2026-07-01',  3000, 4000);

\echo '=== 7. Profit split — Jun: net 7500, owner 2250. Jul (loss): net -1000, owner 0.00 ==='
select period_month, gross_revenue, opex, net_profit, owner_share_pct, owner_amount,
       net_profit - owner_amount as micana_retained, due_at, status
from public.micana_owner_payouts order by period_month;

\echo '=== 8. due_at — expect 2026-07-15 and 2026-08-15 ==='
select period_month, due_at from public.micana_owner_payouts order by period_month;

\echo '=== 9. Renegotiating the bungalow must NOT re-split a ledgered month ==='
update public.micana_bungalows set owner_share_pct = 50
where id = '11111111-1111-1111-1111-111111111111';
update public.micana_owner_payouts set opex = 4500 where period_month = '2026-06-01';
select period_month, owner_share_pct, owner_amount from public.micana_owner_payouts
where period_month = '2026-06-01';

\echo '=== 10. Generated columns reject writes (both must ERROR) ==='
\set ON_ERROR_STOP off
update public.micana_owner_payouts set owner_amount = 999999;
update public.micana_aircon_readings set billed_amount = 0;
\set ON_ERROR_STOP on

\echo '=== 11. Rename propagation — all children must read "Bungalow A (renamed)" / "Datuk Rahman" ==='
update public.micana_bungalows
   set bungalow_name = 'Bungalow A (renamed)', owner_name = 'Datuk Rahman'
 where id = '11111111-1111-1111-1111-111111111111';
select 'tenant'  as src, bungalow_name, ''         as owner from public.micana_tenants
union all
select 'reading', bungalow_name, '' from public.micana_aircon_readings where room_label='Room 1'
union all
select 'payout',  bungalow_name, owner_name from public.micana_owner_payouts where period_month='2026-06-01';

\echo '=== 12. One reading per room per month (must ERROR) ==='
\set ON_ERROR_STOP off
insert into public.micana_aircon_readings (bungalow_id, room_label, period_month, hours_run, kwh_used)
values ('11111111-1111-1111-1111-111111111111', 'Room 1', '2026-06-01', 10, 10);
\set ON_ERROR_STOP on
