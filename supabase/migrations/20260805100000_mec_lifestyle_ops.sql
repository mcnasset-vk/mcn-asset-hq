-- MEC Lifestyle — Operations Manager desk.
--
-- Four modules: CEC onboarding, event coordination, media handoff, and the
-- monthly service-fee invoice.
--
-- Two deliberate choices worth stating up front:
--
--   * The monthly fee is a COST to MEC, not revenue. It lives in its
--     own table and never touches `mec_records`, so it can never be summed
--     into the RM6,690,000 revenue target.
--
--   * `owner_id` is a plain uuid, NOT a foreign key to auth.users. Attribution
--     does not need referential integrity, and a cross-schema reference is the
--     kind of thing that fails on a hosted SQL editor and takes a whole
--     migration down with it.

/* -------------------------------------------------------------------------- */
/* Job title                                                                   */
/* -------------------------------------------------------------------------- */

alter table public.profiles
  drop constraint if exists profiles_job_title_check;

alter table public.profiles
  add constraint profiles_job_title_check
    check (job_title in (
      'chief_strategic_partnership_director',
      'operations_manager_lifestyle'
    ));

/* -------------------------------------------------------------------------- */
/* Module 1 — Community Engagement Champions                                   */
/* -------------------------------------------------------------------------- */

create table if not exists public.cec_champions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_details text not null default '',
  -- The four-step onboarding checklist, each independently auditable.
  briefing_done   boolean not null default false,
  photo_captured  boolean not null default false,
  profile_secured boolean not null default false,
  -- Handoff to the Ops Admin Associate for the Facebook upload.
  handed_to_admin boolean not null default false,
  onboarded_at    date,
  notes           text,
  owner_id        uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.cec_champions is
  'CEC personal data. Confidentiality is enforced by RLS plus Supabase''s '
  'encryption at rest. Application-level encryption is deliberately NOT used: '
  'it would make names and contacts unsearchable and undisplayable, defeating '
  'the dashboard while adding no protection against the actual threat, which '
  'is an unauthorised authenticated user.';

/* -------------------------------------------------------------------------- */
/* Module 2 — event coordination                                               */
/* -------------------------------------------------------------------------- */

create table if not exists public.lifestyle_events (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  activity_type  text not null default '',
  lead_cec_id    uuid references public.cec_champions (id) on delete set null,
  event_date     date,
  location       text not null default '',
  support_status text not null default 'planning'
                   check (support_status in ('planning', 'on_ground',
                                             'completed')),
  notes          text,
  owner_id       uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists lifestyle_events_status_idx
  on public.lifestyle_events (support_status);

-- There are no fixed working hours, so each call-out is logged separately
-- rather than being flattened into a single flag on the event.
create table if not exists public.event_service_calls (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.lifestyle_events (id)
               on delete cascade,
  called_at  timestamptz not null default now(),
  note       text,
  owner_id   uuid,
  created_at timestamptz not null default now()
);

create index if not exists event_service_calls_event_idx
  on public.event_service_calls (event_id);

/* -------------------------------------------------------------------------- */
/* Module 3 — media capture and handoff                                        */
/* -------------------------------------------------------------------------- */

create table if not exists public.event_media (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.lifestyle_events (id)
                   on delete cascade,
  has_photos     boolean not null default false,
  has_videos     boolean not null default false,
  media_url      text,
  -- The handoff to the Ops Admin Associate. `handed_off_at` is set by trigger
  -- so the timestamp cannot be back-dated from the form.
  handed_off     boolean not null default false,
  handed_off_at  timestamptz,
  notes          text,
  owner_id       uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists event_media_event_idx on public.event_media (event_id);

/* -------------------------------------------------------------------------- */
/* Module 4 — monthly service fee invoice                                      */
/* -------------------------------------------------------------------------- */

create table if not exists public.lifestyle_invoices (
  id            uuid primary key default gen_random_uuid(),
  period_year   int not null check (period_year between 2020 and 2100),
  period_month  int not null check (period_month between 1 and 12),
  -- Contractual monthly service fee. The amount is supplied by the
  -- application from configuration, never defaulted in the schema.
  amount        numeric(12, 2) not null default 0 check (amount >= 0),
  document_url  text,
  status        text not null default 'draft'
                  check (status in ('draft', 'submitted')),
  submitted_at  timestamptz,
  notes         text,
  owner_id      uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One invoice per person per month.
  constraint lifestyle_invoices_period_key unique (owner_id, period_year, period_month)
);

/* -------------------------------------------------------------------------- */
/* RLS — every table belongs to the mec module                                 */
/* -------------------------------------------------------------------------- */

alter table public.cec_champions       enable row level security;
alter table public.lifestyle_events    enable row level security;
alter table public.event_service_calls enable row level security;
alter table public.event_media         enable row level security;
alter table public.lifestyle_invoices  enable row level security;

drop policy if exists cec_champions_access on public.cec_champions;
create policy cec_champions_access on public.cec_champions
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

drop policy if exists lifestyle_events_access on public.lifestyle_events;
create policy lifestyle_events_access on public.lifestyle_events
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

drop policy if exists event_service_calls_access on public.event_service_calls;
create policy event_service_calls_access on public.event_service_calls
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

drop policy if exists event_media_access on public.event_media;
create policy event_media_access on public.event_media
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

drop policy if exists lifestyle_invoices_access on public.lifestyle_invoices;
create policy lifestyle_invoices_access on public.lifestyle_invoices
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

/* -------------------------------------------------------------------------- */
/* Timestamps that cannot be forged from the form                              */
/* -------------------------------------------------------------------------- */

create or replace function private.stamp_handoff()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.handed_off and not coalesce(old.handed_off, false) then
    new.handed_off_at := now();
  elsif not new.handed_off then
    new.handed_off_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists event_media_stamp on public.event_media;
create trigger event_media_stamp
  before insert or update on public.event_media
  for each row execute function private.stamp_handoff();

create or replace function private.stamp_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'submitted' and coalesce(old.status, 'draft') <> 'submitted' then
    new.submitted_at := now();
  elsif new.status <> 'submitted' then
    new.submitted_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists lifestyle_invoices_stamp on public.lifestyle_invoices;
create trigger lifestyle_invoices_stamp
  before insert or update on public.lifestyle_invoices
  for each row execute function private.stamp_submission();

drop trigger if exists cec_champions_touch on public.cec_champions;
create trigger cec_champions_touch
  before update on public.cec_champions
  for each row execute function private.touch_updated_at();

drop trigger if exists lifestyle_events_touch on public.lifestyle_events;
create trigger lifestyle_events_touch
  before update on public.lifestyle_events
  for each row execute function private.touch_updated_at();

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                 */
/* -------------------------------------------------------------------------- */

drop trigger if exists cec_champions_audit on public.cec_champions;
create trigger cec_champions_audit
  after insert or update or delete on public.cec_champions
  for each row execute function private.write_audit();

drop trigger if exists lifestyle_events_audit on public.lifestyle_events;
create trigger lifestyle_events_audit
  after insert or update or delete on public.lifestyle_events
  for each row execute function private.write_audit();

drop trigger if exists event_media_audit on public.event_media;
create trigger event_media_audit
  after insert or update or delete on public.event_media
  for each row execute function private.write_audit();

drop trigger if exists lifestyle_invoices_audit on public.lifestyle_invoices;
create trigger lifestyle_invoices_audit
  after insert or update or delete on public.lifestyle_invoices
  for each row execute function private.write_audit();
