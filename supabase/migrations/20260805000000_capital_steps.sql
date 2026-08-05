-- ---------------------------------------------------------------------------
-- 成交资本7步 — the seven steps to closing capital
--
-- Framework: 《创造企业价值～成交资本7步》, OE Edugroup 杰青商学院.
--
-- This table stores the *plan* against each step — who owns it and what they
-- are doing next. It deliberately holds no score and no status: a step's
-- standing is computed in lib/metrics.ts from the same records that produce
-- the RM20,000,000 figure, so the scorecard cannot be talked up independently
-- of the pipeline.
--
-- Apply in the Supabase SQL editor, or with `supabase db push`.
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

-- Full access = super admin. Named for this feature so it cannot collide with,
-- or silently redefine, a helper another policy already depends on.
create or replace function private.is_capital_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  );
$$;

revoke all on function private.is_capital_admin() from public, anon;
grant execute on function private.is_capital_admin() to authenticated;

create table if not exists public.capital_steps (
  key text primary key
    check (key in (
      'trust', 'brand', 'organisation', 'system',
      'value', 'ecosystem', 'legacy'
    )),
  step smallint not null unique check (step between 1 and 7),
  -- Who is accountable for this step.
  owner_name text not null default '',
  -- The single next action that would move it.
  focus text not null default '',
  target_date date,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

comment on table public.capital_steps is
  'Plan (owner, next action, target date) for each of the seven 成交资本7步 steps. Scores are computed from the pipeline, never stored here.';

-- Exactly seven rows, forever. Titles live in lib/constants.ts so the wording
-- on screen and the arithmetic behind it stay in one file.
insert into public.capital_steps (key, step) values
  ('trust', 1),
  ('brand', 2),
  ('organisation', 3),
  ('system', 4),
  ('value', 5),
  ('ecosystem', 6),
  ('legacy', 7)
on conflict (key) do nothing;

-- Stamp the audit columns server-side so the client cannot claim authorship.
create or replace function public.touch_capital_step()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  -- The seven rows are fixed; an update may not renumber or rename them.
  new.key := old.key;
  new.step := old.step;
  return new;
end;
$$;

drop trigger if exists capital_steps_touch on public.capital_steps;
create trigger capital_steps_touch
  before update on public.capital_steps
  for each row execute function public.touch_capital_step();

alter table public.capital_steps enable row level security;

-- The seven scores are computed across every module at once. A CIO reading
-- them through their own row filter would see a misleading index, so the
-- scorecard is super-admin only — enforced here, not just in the navigation.
drop policy if exists "capital steps readable by super admin" on public.capital_steps;
create policy "capital steps readable by super admin"
  on public.capital_steps
  for select
  to authenticated
  using (private.is_capital_admin());

drop policy if exists "capital steps editable by super admin" on public.capital_steps;
create policy "capital steps editable by super admin"
  on public.capital_steps
  for update
  to authenticated
  using (private.is_capital_admin())
  with check (private.is_capital_admin());

-- No insert or delete policy: seven steps in, seven steps out.
grant select, update on public.capital_steps to authenticated;
