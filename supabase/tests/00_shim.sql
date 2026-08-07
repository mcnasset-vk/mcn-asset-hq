-- Stand-ins for what Supabase provides, so db/*.sql can run on stock Postgres.
-- Test harness only; never shipped.

-- Roles are cluster-wide, so guard them for re-runs against a fresh database.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Real auth.uid() reads the JWT. Here it reads a GUC so tests can impersonate.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create table storage.buckets (
  id     text primary key,
  name   text not null,
  public boolean not null default false
);

create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name      text not null,
  owner     uuid
);
alter table storage.objects enable row level security;

-- Supabase's helper: every path segment except the filename.
create or replace function storage.foldername(name text)
returns text[] language plpgsql immutable as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end;
$$;

grant usage on schema auth, storage, extensions to anon, authenticated, service_role;

-- Supabase grants the API roles access to everything in `public` via default
-- privileges. Stock Postgres does not, and without it every query fails with
-- "permission denied for table" before RLS is ever consulted — which would
-- make the policy tests below pass for entirely the wrong reason.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant select on storage.objects, storage.buckets to authenticated;
