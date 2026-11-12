-- Phase 2: interior 3D model metadata.
--
-- One row per venue. A venue with no row, or a row in not_available, simply has
-- no model. Files live in the existing venue-photos bucket under
-- venue-models/{venue_id}/{version}/ so no new bucket or storage policy is needed.
--
-- Publishing is a deliberate administrator action. Nothing here is seeded.

create table if not exists venue_models (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references venues (id) on delete cascade,
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  preview_path text check (preview_path is null or char_length(preview_path) <= 500),
  status text not null default 'not_available'
    check (status in ('not_available', 'draft', 'under_review', 'published', 'rejected')),
  accuracy text not null default 'conceptual'
    check (accuracy in ('conceptual', 'approximate', 'verified')),
  version integer not null default 1 check (version >= 1),
  file_bytes bigint check (file_bytes is null or file_bytes > 0),
  notes text not null default '' check (char_length(notes) <= 4000),
  uploaded_by uuid references profiles (id) on delete set null,
  uploaded_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A model cannot claim to be reviewable or published without a file.
  constraint venue_models_file_required check (
    status in ('not_available') or storage_path is not null
  ),
  constraint venue_models_published_needs_timestamp check (
    status <> 'published' or published_at is not null
  )
);

create index if not exists venue_models_status_idx on venue_models (status, updated_at desc);

drop trigger if exists venue_models_set_updated_at on venue_models;
create trigger venue_models_set_updated_at before update on venue_models
for each row execute function set_updated_at();

alter table venue_models enable row level security;

-- Customers may read a model only when it is published and its venue is approved.
drop policy if exists venue_models_select on venue_models;
create policy venue_models_select on venue_models for select
using (
  public.is_admin()
  or (
    status = 'published'
    and exists (select 1 from venues v where v.id = venue_id and v.status = 'approved')
  )
);

-- Only administrators may write. There is no owner write path by design: venue
-- owners are not trusted with publication, and the service role is server-only.
drop policy if exists venue_models_admin_insert on venue_models;
create policy venue_models_admin_insert on venue_models for insert
with check (public.is_admin());

drop policy if exists venue_models_admin_update on venue_models;
create policy venue_models_admin_update on venue_models for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists venue_models_admin_delete on venue_models;
create policy venue_models_admin_delete on venue_models for delete
using (public.is_admin());
