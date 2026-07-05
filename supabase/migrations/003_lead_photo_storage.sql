-- Lead photo storage pipeline
-- Dedicated, private bucket for customer-submitted lead photos. The public
-- lead form uploads anonymously; only logged-in techs can read (via signed
-- URLs in the rep app).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-photos',
  'lead-photos',
  false,
  5242880, -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous visitors may upload, but only into lead-photos, only matching
-- the {uuid}/{uuid}.{ext} path the form generates, and only while fewer
-- than 5 objects already exist under that submission's folder — a
-- server-enforced backstop for the "max 5 photos" rule, independent of
-- whatever the client sends.
drop policy if exists "anon upload lead photos" on storage.objects;
create policy "anon upload lead photos"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'lead-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]+\.(jpg|jpeg|png|webp|heic|heif)$'
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'lead-photos'
        and o.name like split_part(name, '/', 1) || '/%'
    ) < 5
  );

-- Only logged-in techs can read — required to mint signed URLs in the rep app.
-- No anon/public select policy exists, so the bucket stays private.
drop policy if exists "authenticated read lead photos" on storage.objects;
create policy "authenticated read lead photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lead-photos');
