-- MEC Lifestyle — Ops Admin Associate desk.
--
-- Compensation is deliverable-based, so the unit of record is a single logged
-- deliverable and the monthly invoice is an aggregate of them.
--
-- One decision worth stating: `rate_applied` is STORED on each deliverable,
-- unlike the sponsorship service fee which is derived. The difference is that
-- a sponsorship fee follows the contract value on its own row, whereas this
-- rate comes from an external rate card that can be renegotiated. Deriving it
-- would silently restate every historical invoice the day a rate changes.
-- The constant in lib/constants.ts is the *current* rate; this column is the
-- rate that was actually agreed when the work was done.

/* -------------------------------------------------------------------------- */
/* Job title                                                                   */
/* -------------------------------------------------------------------------- */

alter table public.profiles
  drop constraint if exists profiles_job_title_check;

alter table public.profiles
  add constraint profiles_job_title_check
    check (job_title in (
      'chief_strategic_partnership_director',
      'operations_manager_lifestyle',
      'ops_admin_associate'
    ));

/* -------------------------------------------------------------------------- */
/* Module 1 — deliverable log                                                  */
/* -------------------------------------------------------------------------- */

create table if not exists public.deliverables (
  id            uuid primary key default gen_random_uuid(),
  category      text not null check (category in
                  ('edm_landing', 'facebook_event',
                   'cec_profile', 'digital_access')),
  -- Campaign title, event title, CEC name or member name depending on category.
  title         text not null,
  occurred_on   date not null default current_date,

  -- EDM / Facebook: the live URL. Null for the other categories.
  link_url      text,
  -- Facebook: the professional write-up that accompanied the post.
  write_up      text,
  -- CEC profile: which platforms it was published to.
  platforms     text,
  -- CEC profile / digital access: the champion this relates to, when known.
  cec_id        uuid references public.cec_champions (id) on delete set null,
  -- Digital access: the two integration steps.
  calendar_invited     boolean not null default false,
  whatsapp_integrated  boolean not null default false,

  -- The rate agreed when the work was done. See the note at the top.
  rate_applied  numeric(10, 2) not null check (rate_applied >= 0),

  -- Set once the deliverable has been rolled into a submitted invoice, which
  -- is what stops it being counted twice.
  invoice_id    uuid references public.lifestyle_invoices (id) on delete set null,

  notes         text,
  owner_id      uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists deliverables_category_idx on public.deliverables (category);
create index if not exists deliverables_occurred_idx on public.deliverables (occurred_on);
create index if not exists deliverables_invoice_idx on public.deliverables (invoice_id);

/* -------------------------------------------------------------------------- */
/* Module 2 — collaboration and sync with the Operations Manager               */
/* -------------------------------------------------------------------------- */

create table if not exists public.ops_sync_logs (
  id           uuid primary key default gen_random_uuid(),
  -- What was handed over. `media` and `cec` point at the Operations Manager's
  -- records; `other` covers anything not yet modelled.
  handoff_type text not null default 'other'
                 check (handoff_type in ('media', 'cec', 'other')),
  handoff_ref  uuid,
  week_of      date not null default current_date,
  status_note  text,
  owner_id     uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ops_sync_logs_week_idx on public.ops_sync_logs (week_of);

/* -------------------------------------------------------------------------- */
/* RLS                                                                         */
/* -------------------------------------------------------------------------- */

alter table public.deliverables  enable row level security;
alter table public.ops_sync_logs enable row level security;

drop policy if exists deliverables_access on public.deliverables;
create policy deliverables_access on public.deliverables
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

drop policy if exists ops_sync_logs_access on public.ops_sync_logs;
create policy ops_sync_logs_access on public.ops_sync_logs
  for all to authenticated
  using (private.can_access('mec')) with check (private.can_access('mec'));

/* -------------------------------------------------------------------------- */
/* Timestamps and audit                                                        */
/* -------------------------------------------------------------------------- */

drop trigger if exists deliverables_touch on public.deliverables;
create trigger deliverables_touch
  before update on public.deliverables
  for each row execute function private.touch_updated_at();

drop trigger if exists ops_sync_logs_touch on public.ops_sync_logs;
create trigger ops_sync_logs_touch
  before update on public.ops_sync_logs
  for each row execute function private.touch_updated_at();

drop trigger if exists deliverables_audit on public.deliverables;
create trigger deliverables_audit
  after insert or update or delete on public.deliverables
  for each row execute function private.write_audit();

drop trigger if exists ops_sync_logs_audit on public.ops_sync_logs;
create trigger ops_sync_logs_audit
  after insert or update or delete on public.ops_sync_logs
  for each row execute function private.write_audit();
