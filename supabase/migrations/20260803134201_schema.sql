-- MCN Asset HQ — core schema
--
-- Five business lines plus the document index. Column names are the snake_case
-- of the domain types in lib/types.ts; lib/data.ts maps between the two.

create extension if not exists pgcrypto;

/* -------------------------------------------------------------------------- */
/* Profiles — one row per auth user, created by trigger                        */
/* -------------------------------------------------------------------------- */

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  email      text not null,
  role       text not null default 'pending'
               check (role in ('super_admin', 'cio', 'pending')),
  -- null for super_admin and pending; set for a CIO.
  module     text check (module in
               ('factory', 'mdna', 'nasdaq', 'commissions', 'mec')),
  created_at timestamptz not null default now(),

  -- A CIO must be scoped to exactly one module; nobody else may hold one.
  constraint profiles_module_matches_role check (
    (role = 'cio' and module is not null)
    or (role <> 'cio' and module is null)
  )
);

create unique index profiles_email_key on public.profiles (lower(email));

/* -------------------------------------------------------------------------- */
/* Factory Cosif                                                               */
/* -------------------------------------------------------------------------- */

create table public.factory_deals (
  id                       uuid primary key default gen_random_uuid(),
  company_name             text not null,
  contact_person           text not null default '',
  phone                    text not null default '',
  introducer_name          text not null default '',
  introducer_phone         text not null default '',
  stage                    text not null default 'submitted'
                             check (stage in ('submitted', 'processing',
                                              'disbursed', 'invested')),
  submitted_at             date not null default current_date,
  processing_started_at    date,
  -- End of the expected 2–3 month window. Past this date = stalled.
  expected_disbursement_at date,
  disbursed_at             date,
  invested_at              date,
  disbursement_amount      numeric(14, 2) not null default 4000000
                             check (disbursement_amount >= 0),
  hq_investment_amount     numeric(14, 2) not null default 1000000
                             check (hq_investment_amount >= 0),
  notes                    text,
  created_at               timestamptz not null default now()
);

create index factory_deals_stage_idx on public.factory_deals (stage);

/* -------------------------------------------------------------------------- */
/* MDNA Senior Co-Living                                                       */
/* -------------------------------------------------------------------------- */

create table public.mdna_members (
  id                   uuid primary key default gen_random_uuid(),
  member_name          text not null,
  phone                text not null default '',
  status               text not null default 'prospect'
                         check (status in ('prospect', 'signed',
                                           'paid', 'invested')),
  package_amount       numeric(14, 2) not null default 500000
                         check (package_amount >= 0),
  hq_investment_amount numeric(14, 2) not null default 50000
                         check (hq_investment_amount >= 0),
  signed_at            date,
  paid_at              date,
  invested_at          date,
  referrer             text not null default '',
  notes                text,
  created_at           timestamptz not null default now()
);

create index mdna_members_status_idx on public.mdna_members (status);

/* -------------------------------------------------------------------------- */
/* Nasdaq listing M&A — measured in PAT, never in capital                      */
/* -------------------------------------------------------------------------- */

create table public.nasdaq_companies (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  contact_person   text not null default '',
  phone            text not null default '',
  sector           text not null default '',
  status           text not null default 'in_discussion'
                     check (status in ('in_discussion', 'loi_signed',
                                       'due_diligence', 'agreed', 'onboarded')),
  pat_contribution numeric(14, 2) not null default 0
                     check (pat_contribution >= 0),
  agreed_at        date,
  notes            text,
  created_at       timestamptz not null default now()
);

create index nasdaq_companies_status_idx on public.nasdaq_companies (status);

/* -------------------------------------------------------------------------- */
/* Introducer commissions — generated by trigger, never entered by hand        */
/* -------------------------------------------------------------------------- */

create table public.commissions (
  id               uuid primary key default gen_random_uuid(),
  factory_deal_id  uuid not null references public.factory_deals (id)
                     on delete cascade,
  factory_name     text not null default '',
  introducer_name  text not null default '',
  introducer_phone text not null default '',
  trigger_event    text not null
                     check (trigger_event in ('disbursement', 'investment')),
  amount           numeric(14, 2) not null default 5000 check (amount >= 0),
  status           text not null default 'accrued'
                     check (status in ('accrued', 'paid')),
  due_at           date not null,
  paid_at          date,
  created_at       timestamptz not null default now(),

  -- One accrual per trigger per factory; the trigger relies on this.
  constraint commissions_deal_trigger_key unique (factory_deal_id, trigger_event)
);

create index commissions_status_idx on public.commissions (status);

/* -------------------------------------------------------------------------- */
/* MEC Asset (HR) — revenue, tracked separately from the RM20M raise           */
/* -------------------------------------------------------------------------- */

create table public.mec_records (
  id             uuid primary key default gen_random_uuid(),
  stream         text not null check (stream in
                   ('cec_ticketing', 'corporate_sponsor', 'subscription',
                    'advisory', 'training', 'esos', 'outsource', 'payroll')),
  client_name    text not null,
  contact_person text not null default '',
  phone          text not null default '',
  status         text not null default 'enquiry'
                   check (status in ('enquiry', 'contracted', 'invoiced',
                                     'received', 'lost')),
  amount         numeric(14, 2) not null default 0 check (amount >= 0),
  units          numeric(10, 2),
  unit_label     text,
  contracted_at  date,
  invoiced_at    date,
  received_at    date,
  period_year    int not null default 2026
                   check (period_year between 2020 and 2100),
  notes          text,
  created_at     timestamptz not null default now()
);

create index mec_records_stream_idx on public.mec_records (stream);
create index mec_records_status_idx on public.mec_records (status);
create index mec_records_period_idx on public.mec_records (period_year);

/* -------------------------------------------------------------------------- */
/* Documents — metadata only; files live in the private storage bucket         */
/* -------------------------------------------------------------------------- */

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  -- The owning module. Storage policies check this as the first path segment.
  entity_type  text not null check (entity_type in
                 ('factory', 'mdna', 'nasdaq', 'commissions', 'mec')),
  entity_id    uuid not null,
  name         text not null,
  category     text not null check (category in
                 ('Official Letter', 'Agreement', 'Bank Slip',
                  'Company Profile', 'Financial Statement', 'Identity')),
  -- A path beginning with "/" is a bundled sample served by the app;
  -- anything else is an object in the private bucket.
  storage_path text not null,
  mime_type    text not null default 'application/pdf'
                 check (mime_type in ('application/pdf', 'image/png',
                                      'image/jpeg')),
  size_kb      int not null default 0 check (size_kb >= 0),
  uploaded_at  date not null default current_date,
  created_at   timestamptz not null default now()
);

create index documents_entity_idx on public.documents (entity_id);
create index documents_type_idx on public.documents (entity_type);
