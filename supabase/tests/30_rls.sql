\pset format aligned
-- Each check runs inside a transaction so SET LOCAL actually takes effect.
-- Outside one it is silently a no-op, auth.uid() comes back null, and every
-- count reads zero — which looks like a pass and is not.

-- Three accounts, one per scope. Under the divisions model the role IS the
-- division: micana is a division of its own, and a factory user is an mdna
-- role narrowed to the factory line by business_line.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'boss@example.com'),
  ('b0000000-0000-0000-0000-00000000000b', 'micana-cio@example.com'),
  ('c0000000-0000-0000-0000-00000000000c', 'factory-cio@example.com')
on conflict (id) do nothing;

select private.assign_role('boss@example.com',        'super_admin');
select private.assign_role('micana-cio@example.com',  'micana');
select private.assign_role('factory-cio@example.com', 'mdna', 'factory');

\echo '=== R0. assign_role is not callable by a client role — expect ERROR ==='
set role authenticated;
select private.assign_role('micana-cio@example.com','super_admin');
reset role;

\echo '=== R1. Micana role — expect bungalows 2, factory 0, mdna 0, commissions 0 ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'b0000000-0000-0000-0000-00000000000b';
  select (select count(*) from public.micana_bungalows) as bungalows,
         (select count(*) from public.factory_deals)    as factory,
         (select count(*) from public.mdna_members)     as mdna,
         (select count(*) from public.commissions)      as commissions,
         (select count(*) from public.micana_owner_payouts) as payouts;
commit;

\echo '=== R2. Factory line (mdna) — expect bungalows 0, factory 1 ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'c0000000-0000-0000-0000-00000000000c';
  select (select count(*) from public.micana_bungalows) as bungalows,
         (select count(*) from public.factory_deals)    as factory,
         (select count(*) from public.micana_aircon_readings) as readings;
commit;

\echo '=== R3. Super admin — expect bungalows 2, factory 1, commissions 1 ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'a0000000-0000-0000-0000-00000000000a';
  select (select count(*) from public.micana_bungalows) as bungalows,
         (select count(*) from public.factory_deals)    as factory,
         (select count(*) from public.commissions)      as commissions;
commit;

\echo '=== R4. Micana role DELETE — expect deleted 0 (super admin only) ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'b0000000-0000-0000-0000-00000000000b';
  with d as (delete from public.micana_bungalows returning 1) select count(*) as deleted from d;
rollback;

\echo '=== R5. Micana role CAN update its own module — expect updated 2 ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'b0000000-0000-0000-0000-00000000000b';
  with u as (update public.micana_bungalows set notes='ok' returning 1)
  select count(*) as updated from u;
rollback;

\echo '=== R6. Factory line cannot write to Micana — expect updated 0 ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'c0000000-0000-0000-0000-00000000000c';
  with u as (update public.micana_bungalows set notes='hijack' returning 1)
  select count(*) as updated from u;
rollback;

\echo '=== R7. Factory line INSERT into Micana — expect ERROR (policy violation) ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'c0000000-0000-0000-0000-00000000000c';
  insert into public.micana_bungalows (bungalow_name, owner_name) values ('Sneaky','Nobody');
rollback;

\echo '=== R8. Self-promotion — expect escalated 0 ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'b0000000-0000-0000-0000-00000000000b';
  with u as (update public.profiles set role='super_admin'
             where id='b0000000-0000-0000-0000-00000000000b' returning 1)
  select count(*) as escalated from u;
rollback;

-- Seed the private bucket. Without objects, R9/R10 select from an empty table
-- and pass no matter what the policy says. Inserted as the superuser, which
-- bypasses RLS, so the reads below are the only thing under test.
insert into storage.objects (bucket_id, name) values
  ('documents', 'micana/11111111-1111-1111-1111-111111111111/lease.pdf'),
  ('documents', 'factory/33333333-3333-3333-3333-333333333333/slip.pdf');

\echo '=== R9. Storage — micana role sees ONLY the micana/ object ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'b0000000-0000-0000-0000-00000000000b';
  select name from storage.objects order by name;
commit;

\echo '=== R10. Storage — factory line sees ONLY the factory/ object ==='
begin;
  set local role authenticated;
  set local "test.uid" = 'c0000000-0000-0000-0000-00000000000c';
  select name from storage.objects order by name;
commit;

\echo '=== R11. Documents are scoped by entity_type ==='
insert into public.documents (entity_type, entity_id, name, category, storage_path)
values ('micana','11111111-1111-1111-1111-111111111111','Lease.pdf','Agreement','micana/x/lease.pdf'),
       ('factory','33333333-3333-3333-3333-333333333333','Slip.pdf','Bank Slip','factory/y/slip.pdf');
begin;
  set local role authenticated;
  set local "test.uid" = 'b0000000-0000-0000-0000-00000000000b';
  select name from public.documents order by name;
commit;
