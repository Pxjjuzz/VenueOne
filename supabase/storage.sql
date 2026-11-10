-- Supabase Storage setup for venue photographs.
-- Run once in the Supabase SQL editor after creating the project.
--
-- The bucket is public because approved venue photographs are public content.
-- Uploads and deletions are performed only by the server using the service
-- role after authorization and image validation. No client-side write policy
-- is granted.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-photos',
  'venue-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
