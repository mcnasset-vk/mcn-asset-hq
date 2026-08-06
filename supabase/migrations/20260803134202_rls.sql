-- Row level security and the role helpers.
--
-- Helpers live in a `private` schema, NOT `public`: PostgREST exposes every
-- function in `public` as an RPC endpoint, which would make assign_role
-- callable by anyone holding only the publishable key.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

-- SECURITY DEFINER so reading `profiles` here does not recurse into the RLS
-- policy that calls it. `search_path = ''` forces fully-qualified names.
create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function private.current_module()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.module from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_role() = 'super_admin', false);
$$;

-- The single predicate every business table uses: a super admin sees
-- everything, a CIO sees exactly their own module, everyone else sees nothing.
create or replace function private.can_access(target_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_role() = 'super_admin'
    or (private.current_role() = 'cio'
        and private.current_module() = target_module),
    false
  );
$$;

grant execute on function private.current_role() to authenticated;
grant execute on function private.current_module() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.can_access(text) to authenticated;

/* -------------------------------------------------------------------------- */
/* New sign-ups land as `pending` with no module                               */
/* -------------------------------------------------------------------------- */

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role, module)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'pending',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

/* -------------------------------------------------------------------------- */
/* Role assignment — SQL editor only, never reachable over the API             */
/* -------------------------------------------------------------------------- */

create or replace function private.assign_role(
  user_email    text,
  new_role      text,
  new_module    text default null
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
     set role   = new_role,
         module = case when new_role = 'cio' then new_module else null end
   where lower(email) = lower(user_email)
  returning * into updated;

  if updated.id is null then
    raise exception 'No profile found for %. Create the auth user first.',
      user_email;
  end if;

  return updated;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Profiles policies                                                           */
/* -------------------------------------------------------------------------- */

alter table public.profiles enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_super_admin());

-- Deliberately no insert/update/delete policy. Profiles are created by the
-- auth trigger and roles are changed only through private.assign_role in the
-- SQL editor, so there is no path to self-promotion over the API.

/* -------------------------------------------------------------------------- */
/* Business tables — one predicate, applied to every command                   */
/* -------------------------------------------------------------------------- */

alter table public.factory_deals     enable row level security;
alter table public.mdna_members      enable row level security;
alter table public.nasdaq_companies  enable row level security;
alter table public.commissions       enable row level security;
alter table public.mec_records       enable row level security;
alter table public.documents         enable row level security;

create policy factory_deals_access on public.factory_deals
  for all to authenticated
  using (private.can_access('factory'))
  with check (private.can_access('factory'));

create policy mdna_members_access on public.mdna_members
  for all to authenticated
  using (private.can_access('mdna'))
  with check (private.can_access('mdna'));

create policy nasdaq_companies_access on public.nasdaq_companies
  for all to authenticated
  using (private.can_access('nasdaq'))
  with check (private.can_access('nasdaq'));

create policy mec_records_access on public.mec_records
  for all to authenticated
  using (private.can_access('mec'))
  with check (private.can_access('mec'));

create policy commissions_access on public.commissions
  for all to authenticated
  using (private.can_access('commissions'))
  with check (private.can_access('commissions'));

-- Documents inherit the access of whatever module owns them.
create policy documents_access on public.documents
  for all to authenticated
  using (private.can_access(entity_type))
  with check (private.can_access(entity_type));
