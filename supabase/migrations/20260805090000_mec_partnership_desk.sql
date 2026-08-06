-- MEC Asset (HR): job titles, the partnership desk, and an audit trail.
--
-- Until now every CIO scoped to `mec` saw the same page. MEC has three staff
-- with genuinely different jobs, so `profiles.job_title` layers a role *within*
-- the module. It never widens access — `private.can_access` is untouched, so a
-- title only decides which dashboard renders, never which rows are visible.
--
-- Module 1 (corporate sponsorship) extends `mec_records` rather than forming a
-- new table: sponsorship IS MEC revenue and already lives in the
-- `corporate_sponsor` stream. A parallel table would silently drop it out of
-- the RM6,690,000 roll-up.
--
-- Modules 2 and 3 are new tables precisely because they are NOT revenue and
-- must never reach a money total.

/* -------------------------------------------------------------------------- */
/* Job titles                                                                  */
/* -------------------------------------------------------------------------- */

alter table public.profiles
  add column if not exists job_title text
    check (job_title in ('chief_strategic_partnership_director'));

comment on column public.profiles.job_title is
  'Role *within* a module. Decides which dashboard renders; never affects '
  'row access, which is private.can_access() alone. Null = the standard '
  'module view.';

/* -------------------------------------------------------------------------- */
/* Module 1 — corporate sponsorship, on the existing revenue table             */
/* -------------------------------------------------------------------------- */

alter table public.mec_records
  -- Who owns the deal. Attribution for personal quotas only, NOT access.
  add column if not exists owner_id uuid references auth.users (id)
    on delete set null,

  add column if not exists project_tier text
    check (project_tier in ('tier_1', 'tier_2', 'tier_3')),

  -- The professional-service-fee ladder. Distinct from `status`, which tracks
  -- the sponsor's own payment; this tracks what MEC has earned.
  add column if not exists fee_stage text
    check (fee_stage in ('proposal', 'contract_signed', 'delivered'));

create index if not exists mec_records_owner_idx on public.mec_records (owner_id);

comment on column public.mec_records.fee_stage is
  'Stage 1 proposal = nothing earned. Stage 2 contract_signed = 50% of the '
  '10% service fee earned. Stage 3 delivered = the full 10% earned. The fee '
  'amount is DERIVED in lib/metrics.ts from amount x rate, never stored, so '
  'it cannot drift from the contract value.';

/* -------------------------------------------------------------------------- */
/* Module 2 — strategic partnership & ESG alignment                            */
/* -------------------------------------------------------------------------- */

create table if not exists public.partnership_initiatives (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  collaborator text not null default '',
  focus_area   text not null default 'corporate_esg'
                 check (focus_area in ('corporate_esg', 'senior_coliving',
                                       'community_wellness',
                                       'capital_collaboration')),
  status       text not null default 'in_progress'
                 check (status in ('in_progress', 'active_collaboration',
                                   'completed', 'under_review')),
  -- Qualitative audit trail, deliberately free text.
  milestone_notes text,
  owner_id     uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* Module 3 — stakeholder & group synergy                                      */
/* -------------------------------------------------------------------------- */

create table if not exists public.synergy_logs (
  id            uuid primary key default gen_random_uuid(),
  subsidiary    text not null,
  -- Stakeholders or corporations engaged. A count, never money.
  reach_metric  int not null default 0 check (reach_metric >= 0),
  status        text not null default 'in_progress'
                  check (status in ('in_progress', 'active_collaboration',
                                    'completed', 'under_review')),
  notes         text,
  owner_id      uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* RLS — both new tables belong to the mec module                              */
/* -------------------------------------------------------------------------- */

alter table public.partnership_initiatives enable row level security;
alter table public.synergy_logs            enable row level security;

drop policy if exists partnership_initiatives_access on public.partnership_initiatives;
create policy partnership_initiatives_access on public.partnership_initiatives
  for all to authenticated
  using (private.can_access('mec'))
  with check (private.can_access('mec'));

drop policy if exists synergy_logs_access on public.synergy_logs;
create policy synergy_logs_access on public.synergy_logs
  for all to authenticated
  using (private.can_access('mec'))
  with check (private.can_access('mec'));

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                 */
/* -------------------------------------------------------------------------- */
-- Append-only: who changed what, when. Rows are written by a SECURITY DEFINER
-- trigger, so no client can forge or amend an entry.
--
-- On encryption: Supabase already encrypts the database at rest. Encrypting
-- these rows in the application on top of that would make the trail unreadable
-- to the very governance monitors it exists for, so it is deliberately not
-- done. Confidentiality here comes from RLS — super admin reads only.

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('insert', 'update', 'delete')),
  actor_id    uuid,
  actor_email text,
  changed_at  timestamptz not null default now(),
  snapshot    jsonb
);

create index if not exists audit_log_record_idx on public.audit_log (record_id);
create index if not exists audit_log_changed_idx on public.audit_log (changed_at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log
  for select to authenticated
  using (private.is_super_admin());

-- No insert/update/delete policy: the trigger below is the only writer, and
-- being SECURITY DEFINER it bypasses RLS. The trail cannot be edited over the
-- API by anyone, super admin included.

create or replace function private.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject   record;
  act       text;
  who_email text;
begin
  if tg_op = 'DELETE' then
    subject := old;
    act := 'delete';
  elsif tg_op = 'UPDATE' then
    subject := new;
    act := 'update';
  else
    subject := new;
    act := 'insert';
  end if;

  select p.email into who_email
    from public.profiles p
   where p.id = (select auth.uid());

  insert into public.audit_log (
    table_name, record_id, action, actor_id, actor_email, snapshot
  )
  values (
    tg_table_name, subject.id, act, (select auth.uid()), who_email,
    to_jsonb(subject)
  );

  return subject;
end;
$$;

drop trigger if exists mec_records_audit on public.mec_records;
create trigger mec_records_audit
  after insert or update or delete on public.mec_records
  for each row execute function private.write_audit();

drop trigger if exists partnership_initiatives_audit on public.partnership_initiatives;
create trigger partnership_initiatives_audit
  after insert or update or delete on public.partnership_initiatives
  for each row execute function private.write_audit();

drop trigger if exists synergy_logs_audit on public.synergy_logs;
create trigger synergy_logs_audit
  after insert or update or delete on public.synergy_logs
  for each row execute function private.write_audit();

/* -------------------------------------------------------------------------- */
/* Keep updated_at honest                                                      */
/* -------------------------------------------------------------------------- */

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists partnership_initiatives_touch on public.partnership_initiatives;
create trigger partnership_initiatives_touch
  before update on public.partnership_initiatives
  for each row execute function private.touch_updated_at();

drop trigger if exists synergy_logs_touch on public.synergy_logs;
create trigger synergy_logs_touch
  before update on public.synergy_logs
  for each row execute function private.touch_updated_at();

/* -------------------------------------------------------------------------- */
/* Title assignment — SQL editor only, same pattern as assign_role             */
/* -------------------------------------------------------------------------- */

create or replace function private.assign_job_title(
  user_email    text,
  new_job_title text
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
     set job_title = new_job_title
   where lower(email) = lower(user_email)
  returning * into updated;

  if updated.id is null then
    raise exception 'No profile found for %. Create the auth user first.',
      user_email;
  end if;

  if updated.role <> 'cio' or updated.module <> 'mec' then
    raise exception
      'Job titles are only meaningful for a cio scoped to mec. % is % / %.',
      user_email, updated.role, coalesce(updated.module, 'no module');
  end if;

  return updated;
end;
$$;
