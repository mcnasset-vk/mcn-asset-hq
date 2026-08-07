\set ON_ERROR_STOP on
\pset format aligned

-- ===========================================================================
-- Commission trigger (see 20260803134203_commissions_trigger.sql)
-- ===========================================================================
insert into public.factory_deals
  (id, company_name, contact_person, phone, introducer_name, introducer_phone,
   stage, submitted_at)
values ('33333333-3333-3333-3333-333333333333', 'Kilang Sdn Bhd', 'Mr Tan',
        '03-1234 5678', 'Encik Yusof', '012-999 0000', 'processing', '2026-01-10');

\echo '=== C1. No dates yet — expect 0 commission lines ==='
select count(*) from public.commissions;

\echo '=== C2. Disbursed 2026-03-01 — expect 1 line, due 2026-03-31 ==='
update public.factory_deals set stage='disbursed', disbursed_at='2026-03-01'
where id='33333333-3333-3333-3333-333333333333';
select trigger_event, amount, due_at, status, factory_name, introducer_name
from public.commissions order by trigger_event;

\echo '=== C3. Invested 2026-05-01 — expect 2 lines, second due 2026-05-31 ==='
update public.factory_deals set stage='invested', invested_at='2026-05-01'
where id='33333333-3333-3333-3333-333333333333';
select trigger_event, amount, due_at, status from public.commissions order by trigger_event;

\echo '=== C4. Pay the disbursement leg, then correct the stage BACKWARDS. ==='
\echo '===     The paid line must SURVIVE; the accrued one must go. ==='
update public.commissions set status='paid', paid_at='2026-04-02'
where trigger_event='disbursement';
update public.factory_deals set stage='processing', disbursed_at=null, invested_at=null
where id='33333333-3333-3333-3333-333333333333';
select trigger_event, status, paid_at from public.commissions order by trigger_event;

\echo '=== C5. Rename the factory — factory_name must follow into the ledger ==='
update public.factory_deals set company_name='Kilang Bersatu Sdn Bhd'
where id='33333333-3333-3333-3333-333333333333';
select trigger_event, factory_name from public.commissions;

