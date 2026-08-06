-- Let the super admin manage roles from the app instead of the SQL editor.
--
-- Until now `profiles` had a SELECT policy and nothing else: roles were set
-- only through `private.assign_role` in the SQL editor. That is safe but it
-- has proved error-prone in practice — a pasted block runs as one transaction,
-- so a single failure silently rolls back every assignment before it.
--
-- This adds a narrow UPDATE path for the super admin, with the two mistakes
-- that actually matter blocked in the database rather than the UI, so they
-- hold no matter what calls them.

/* -------------------------------------------------------------------------- */
/* A title only means something inside the MEC module                          */
/* -------------------------------------------------------------------------- */

alter table public.profiles
  drop constraint if exists profiles_job_title_requires_mec;

alter table public.profiles
  add constraint profiles_job_title_requires_mec
    check (job_title is null or module = 'mec');

/* -------------------------------------------------------------------------- */
/* Never allow the last super admin to be demoted                              */
/* -------------------------------------------------------------------------- */
-- Without this, one wrong dropdown locks every account out of role management
-- permanently, recoverable only from the SQL editor. The count excludes the
-- row being changed, so demoting yourself is fine as long as someone else
-- still holds the role.

create or replace function private.guard_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'super_admin' and new.role is distinct from 'super_admin' then
    if (select count(*) from public.profiles
         where role = 'super_admin' and id <> old.id) = 0 then
      raise exception
        'Cannot change the last super admin: no one else could manage roles.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_super_admin on public.profiles;
create trigger profiles_guard_super_admin
  before update on public.profiles
  for each row execute function private.guard_last_super_admin();

/* -------------------------------------------------------------------------- */
/* The narrow UPDATE path                                                      */
/* -------------------------------------------------------------------------- */
-- Both USING and WITH CHECK require super admin, so a CIO can neither read a
-- row into an update nor write one. `id` and `email` are still effectively
-- immutable: id is the primary key referencing auth.users, and email is kept
-- in step by the auth trigger.

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

/* -------------------------------------------------------------------------- */
/* Audit                                                                       */
/* -------------------------------------------------------------------------- */
-- Role changes are exactly the kind of thing that needs a trail.

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function private.write_audit();

/* -------------------------------------------------------------------------- */
/* Repair: adopt any auth user that never got a profile row                    */
/* -------------------------------------------------------------------------- */
-- A user created before the signup trigger existed has a login but no profile,
-- which presents as "not been assigned a role yet" and cannot be fixed from
-- the UI, because there is no row to update.

insert into public.profiles (id, full_name, email, role, module)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', ''),
       u.email,
       'pending',
       null
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null
on conflict (id) do nothing;
