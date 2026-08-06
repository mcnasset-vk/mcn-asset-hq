-- Private document storage.
--
-- Objects are laid out as  <module>/<record-id>/<filename>  and the policy
-- checks the FIRST path segment, so a CIO can only reach files belonging to
-- their own module. Nothing is publicly addressable; the app requests
-- one-hour signed URLs at render time.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_bucket_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and private.can_access((storage.foldername(name))[1])
  );

create policy documents_bucket_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and private.can_access((storage.foldername(name))[1])
  );

create policy documents_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and private.can_access((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'documents'
    and private.can_access((storage.foldername(name))[1])
  );

create policy documents_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and private.can_access((storage.foldername(name))[1])
  );
