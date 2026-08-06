-- Keep public.profiles.email in step with auth.users.email.
--
-- The signup trigger copies the email once, at insert. Changing a user's
-- address in the Auth dashboard therefore left `profiles.email` stale — and
-- since `private.assign_role` and `private.assign_job_title` both look the
-- account up by that column, a renamed user silently became unassignable
-- while the dashboard still displayed the old address.

create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = new.email
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_profile_email();

-- Repair any row that has already drifted.
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email is distinct from u.email;
