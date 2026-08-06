-- Roles become divisions; business lines nest inside them.
--
-- Until now `role` was 'cio' and `module` named a single business line, with
-- `job_title` bolted on to distinguish the three MEC desks. That conflated two
-- different ideas. The model is really two levels:
--
--   role           the division:  mdna  |  mec   (plus super_admin, pending)
--   business_line  optional narrowing inside that division; null = the whole
--                  division, which is what an MDNA admin holds
--
--   mdna lines:  mdna (Senior Co-Living) · factory · nasdaq · commissions
--   mec  lines:  strategic_partnership · operations_manager · operations_executive
--
-- `job_title` disappears: what it expressed is now simply the MEC business
-- line, so there is one concept instead of two.
--
-- Written to be safely re-runnable: every step checks the state it expects,
-- so a failed attempt can be corrected and run again from the top.

/* -------------------------------------------------------------------------- */
/* Clear every existing CHECK on profiles                                      */
/* -------------------------------------------------------------------------- */
-- Dropping by name is not enough. `module` and `role` were declared with
-- inline CHECKs, which Postgres auto-names (`profiles_module_check`) and
-- carries along when the column is renamed — so the old constraint would go
-- on validating the new column against the old list of values. Clearing them
-- all and re-adding exactly what we want is the only way to be certain.

do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.profiles'::regclass
       and contype = 'c'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

/* -------------------------------------------------------------------------- */
/* Rename the column, if it has not been renamed already                       */
/* -------------------------------------------------------------------------- */

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles'
                and column_name = 'module')
     and not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'profiles'
                        and column_name = 'business_line')
  then
    alter table public.profiles rename column module to business_line;
  end if;
end $$;

/* -------------------------------------------------------------------------- */
/* Migrate existing rows                                                       */
/* -------------------------------------------------------------------------- */
-- Guarded on job_title still existing, so a second run skips this cleanly.

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles'
                and column_name = 'job_title')
  then
    update public.profiles
       set business_line = case
             -- MDNA Admin ran the whole division, so it holds no single line.
             when role = 'cio' and business_line = 'mdna' then null
             when role = 'cio' and business_line = 'mec' then
               case job_title
                 when 'chief_strategic_partnership_director' then 'strategic_partnership'
                 when 'operations_manager_lifestyle'         then 'operations_manager'
                 when 'ops_admin_associate'                  then 'operations_executive'
                 else null
               end
             when role = 'cio' then business_line
             else null
           end,
           role = case
                    when role = 'cio' and business_line = 'mec' then 'mec'
                    when role = 'cio'                           then 'mdna'
                    else role
                  end;

    alter table public.profiles drop column job_title;
  end if;
end $$;

/* -------------------------------------------------------------------------- */
/* New constraints                                                             */
/* -------------------------------------------------------------------------- */

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('super_admin', 'mdna', 'mec', 'pending'));

alter table public.profiles
  add constraint profiles_business_line_check
    check (
      business_line is null
      or (role = 'mdna' and business_line in
            ('mdna', 'factory', 'nasdaq', 'commissions'))
      or (role = 'mec' and business_line in
            ('strategic_partnership', 'operations_manager',
             'operations_executive'))
    );

/* -------------------------------------------------------------------------- */
/* Access                                                                      */
/* -------------------------------------------------------------------------- */
-- Every table policy still passes the module key it has always passed
-- ('factory', 'mdna', 'nasdaq', 'commissions', 'mec'), so no policy changes.
-- Only the predicate behind them changes.
--
-- MDNA: a null line means the whole division; a set line narrows to it.
-- MEC:  the line selects which dashboard renders, not which rows are visible,
--       because the three desks collaborate on the same records.

create or replace function private.current_line()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.business_line from public.profiles p where p.id = (select auth.uid());
$$;

grant execute on function private.current_line() to authenticated;

create or replace function private.can_access(target_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_role() = 'super_admin'
    or (
      private.current_role() = 'mdna'
      and target_module in ('mdna', 'factory', 'nasdaq', 'commissions')
      and (private.current_line() is null
           or private.current_line() = target_module)
    )
    or (private.current_role() = 'mec' and target_module = 'mec'),
    false
  );
$$;

comment on function private.can_access(text) is
  'Single access predicate for every business table. Super admin sees all. '
  'The mdna role spans its four lines, or exactly one when business_line is '
  'set. The mec role sees the mec module; its business_line chooses a '
  'dashboard rather than restricting rows.';

/* -------------------------------------------------------------------------- */
/* Role assignment helper                                                      */
/* -------------------------------------------------------------------------- */

drop function if exists private.assign_job_title(text, text);

create or replace function private.assign_role(
  user_email    text,
  new_role      text,
  new_line      text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated public.profiles;
begin
  update public.profiles
     set role = new_role,
         business_line = case
           when new_role in ('mdna', 'mec') then new_line else null
         end
   where lower(email) = lower(user_email)
  returning * into updated;

  if updated.id is null then
    raise exception 'No profile found for %. Create the auth user first.',
      user_email;
  end if;

  return updated;
end;
$$;
