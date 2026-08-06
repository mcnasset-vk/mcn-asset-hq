-- MDNA Admin becomes a division-wide scope.
--
-- Until now a CIO saw exactly one module. MDNA Admin runs the whole MDNA
-- division, so that scope now covers all four of its lines — Factory Cosif,
-- MDNA Admin, Nasdaq M&A and Fees — with full read and write on each.
--
-- MEC Asset (HR) is deliberately excluded: it is a separate division, and a
-- scope that quietly grew to cover everything would be no scope at all.
--
-- Only `private.can_access` changes. Every table policy already routes through
-- it, so nothing else needs touching — including `documents`, which passes its
-- `entity_type` (the same five values as `profiles.module`) straight in.

create or replace function private.can_access(target_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    -- Super admin: everything.
    private.current_role() = 'super_admin'
    -- A CIO's own module.
    or (private.current_role() = 'cio'
        and private.current_module() = target_module)
    -- MDNA Admin additionally covers the rest of the MDNA division.
    or (private.current_role() = 'cio'
        and private.current_module() = 'mdna'
        and target_module in ('factory', 'nasdaq', 'commissions')),
    false
  );
$$;

comment on function private.can_access(text) is
  'Single access predicate for every business table. Super admin sees all; a '
  'CIO sees their own module; the mdna scope spans the whole MDNA division '
  '(factory, mdna, nasdaq, commissions) but never mec.';
